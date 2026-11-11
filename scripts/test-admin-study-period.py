"""Socket-only synthetic PostgreSQL regression; never accepts a production URL."""
import json,os,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PG=Path('/opt/homebrew/opt/postgresql@17/bin')
C=ROOT/'supabase/candidates/admin_study_period_20261111'
env={k:v for k,v in os.environ.items() if not k.startswith('PG')};env['LC_ALL']='C'
with tempfile.TemporaryDirectory(prefix='study-period-',dir='/private/tmp') as tmp:
 def run(args,**kw):
  r=subprocess.run([str(a) for a in args],text=True,capture_output=True,env=env,**kw)
  if r.returncode: raise AssertionError(r.stderr)
  return r.stdout.strip()
 run([PG/'initdb','-D',tmp+'/db','-U','postgres','--auth=trust','--no-locale','--encoding=UTF8'])
 run([PG/'pg_ctl','-D',tmp+'/db','-l',tmp+'/log','-o',f"-h '' -k {tmp}",'-w','start'])
 try:
  def sql(s):return run([PG/'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-h',tmp,'-U','postgres'],input=s)
  def file(p):return sql(p.read_text())
  file(ROOT/'scripts/withdrawal/schema-fixture.sql')
  sql('CREATE TABLE student_private.school_display_cache(office_code text,school_code text,school_name text); CREATE TABLE universities(id uuid,name text); CREATE TABLE content_items(id uuid,title text);')
  file(C/'baseline.sql');file(C/'related-fixture.sql')
  sql("REVOKE ALL ON FUNCTION admin_dashboard_study(timestamptz,timestamptz) FROM PUBLIC; GRANT EXECUTE ON FUNCTION admin_dashboard_study(timestamptz,timestamptz) TO authenticated;")
  sql('''INSERT INTO auth.users SELECT ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'2020-01-01Z' FROM generate_series(1,8)i;
INSERT INTO admin_users(user_id) VALUES('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000005');
INSERT INTO profiles(id,academic_status,grade_level,neis_office_code,neis_school_code)
SELECT id,CASE WHEN right(id::text,1)='3' THEN 'retaker' ELSE 'student' END,1,'B10',CASE WHEN right(id::text,1)='4' THEN NULL ELSE 'school1' END FROM auth.users WHERE right(id::text,1)<>'6';
INSERT INTO account_deletion_requests(subject_id,state) VALUES('00000000-0000-0000-0000-000000000005','DELETION_PENDING');
INSERT INTO study_sessions(user_id,started_at,ended_at,include_in_study_total,active_segments) VALUES
('00000000-0000-0000-0000-000000000002','2020-01-01Z','2020-01-01 01:00Z',true,'[[0,3600000]]'),
('00000000-0000-0000-0000-000000000002','2026-11-10 23:30+09','2026-11-11 00:30+09',true,'[[0,3600000]]'),
('00000000-0000-0000-0000-000000000002','2026-11-11 00:00+09','2026-11-11 01:00+09',true,'[[0,3600000]]'),
('00000000-0000-0000-0000-000000000002','2026-11-11 02:00+09','2026-11-11 04:00+09',true,'[[0,1800000],[5400000,7200000]]'),
('00000000-0000-0000-0000-000000000003','2026-11-11 00:00+09','2026-11-11 01:00+09',true,'[[0,3600000]]'),
('00000000-0000-0000-0000-000000000004','2026-11-11 01:00+09','2026-11-11 01:30+09',true,'[[0,1800000]]'),
('00000000-0000-0000-0000-000000000005','2026-11-11 00:00+09','2026-11-11 01:00+09',true,'[[0,3600000]]'),
('00000000-0000-0000-0000-000000000006','2026-11-11 00:00+09','2026-11-11 01:00+09',true,'[[0,3600000]]'),
('00000000-0000-0000-0000-000000000007','2026-11-11 00:00+09','2026-11-11 01:00+09',false,'[[0,3600000]]'),
('00000000-0000-0000-0000-000000000008','2026-11-11 00:00+09',NULL,true,'[[0,3600000]]'),
('00000000-0000-0000-0000-000000000002',now()+interval '100 years',now()+interval '100 years 1 hour',true,'[[0,3600000]]');''')
  def context(user=1,role='authenticated'):
   return f"SELECT set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-0000-0000-{user:012}','role','authenticated','exp',extract(epoch FROM now())+300)::text,false); SET ROLE {role};"
  def report(args,fn='admin_dashboard_study'):
   return json.loads(sql(context()+f'SELECT public.{fn}({args});').splitlines()[-1])
  def error(args,user=1,role='authenticated'):
   try:sql(context(user,role)+f'SELECT public.admin_dashboard_study({args});')
   except AssertionError as e:return str(e)
   raise AssertionError('Expected rejection: '+args)
  windows=["'2026-10-13 00:00+09','2026-11-12 00:00+09'","'2026-11-11 00:00+09','2026-11-12 00:00+09'","'2026-11-10 23:30+09','2026-11-11 00:00+09'","'2024-01-01Z','2024-01-02Z'","'2025-01-01Z','2026-02-05Z'"]
  before=[{k:v for k,v in report(w).items() if k!='as_of'} for w in windows]
  fingerprints="SELECT md5(string_agg(n.nspname||p.proname||pg_get_functiondef(p.oid),'' ORDER BY n.nspname,p.proname)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','account_private','student_private') AND p.proname<>'admin_dashboard_study'"
  old_functions=sql(fingerprints)
  data_sql="SELECT md5(string_agg(s::text,'' ORDER BY s::text)) FROM study_sessions s"
  data_hash=sql(data_sql)
  assert 'INVALID_PERIOD' in error('NULL,NULL')
  file(C/'preflight.sql');file(C/'apply.sql');file(C/'verify.sql')
  actual_hash=sql("SELECT md5(pg_get_functiondef('admin_dashboard_study(timestamptz,timestamptz)'::regprocedure))")
  assert actual_hash=='2a74d4b3612953760d4ae73403cb3f96',actual_hash
  assert old_functions==sql(fingerprints)
  for w,expected in zip(windows,before):assert {k:v for k,v in report(w).items() if k!='as_of'}==expected
  assert report(windows[0])['total']=={'users':3,'ms':14400000}
  assert report(windows[1])['total']=={'users':3,'ms':12600000}
  assert report(windows[2])['total']=={'users':1,'ms':1800000}
  assert report(windows[3])['total']=={'users':0,'ms':0}
  all_time=report('NULL,NULL');assert all_time['total']=={'users':3,'ms':18000000},all_time
  assert sum(g['ms'] for g in all_time['grades'])==18000000
  assert sum(g['users'] for g in all_time['grades'])==3
  school=report(windows[0]+',NULL,1','admin_study_by_school')
  assert school['total']==report(windows[0])['total']
  assert sum(s['ms'] for s in school['schools'])+school['unregistered']['ms']==14400000
  # All-time school source grouping is compared without changing the school's bounded RPC.
  assert school['unregistered']['ms']==1800000
  audited=[row.split('|') for row in sql((C/'source-audit.sql').read_text().replace('statement_timestamp()', "'2026-11-11 12:00+00'::timestamptz")).splitlines()]
  assert audited[0][0]=='all' and audited[0][3:9]==['3','18000000','18000000','16200000','1800000','1'],audited
  assert audited[1][3:9]==['3','14400000','14400000','12600000','1800000','1'],audited
  for args in ["NULL,now()","now(),NULL","now(),now()","now(),now()-interval '1 day'","'-infinity',now()","now(),'infinity'","now()-interval '401 days',now()"]:
   assert 'INVALID_PERIOD' in error(args)
  for user,role in [(2,'authenticated'),(5,'authenticated'),(1,'anon'),(1,'service_role')]:assert '42501' in error('NULL,NULL',user,role)
  assert sql("SELECT proacl::text FROM pg_proc WHERE oid='admin_dashboard_study(timestamptz,timestamptz)'::regprocedure")== '{postgres=X/postgres,authenticated=X/postgres}'
  assert data_hash==sql(data_sql)
  # Empty source and stale/missing actor contexts return empty or deny, never fabricate time.
  sql('BEGIN; DELETE FROM study_sessions; COMMIT;')
  assert report('NULL,NULL')['total']=={'users':0,'ms':0}
  for claims in ["'{}'", "jsonb_build_object('sub','00000000-0000-0000-0000-000000000001','role','authenticated','exp',0)::text"]:
   try:sql("SELECT set_config('request.jwt.claims',"+claims+",false);SET ROLE authenticated; SELECT admin_dashboard_study(NULL,NULL);")
   except AssertionError as e:assert '42501' in str(e)
   else:raise AssertionError('Invalid actor accepted')
  file(C/'rollback.sql')
  assert sql("SELECT md5(pg_get_functiondef('admin_dashboard_study(timestamptz,timestamptz)'::regprocedure))")=='755d8e824f53a2c82a2cc90cbdf660d1'
  assert old_functions==sql(fingerprints)
  assert 'INVALID_PERIOD' in error('NULL,NULL')
  print('PASS: old/new bounded reports identical; all-time 2020 history, overlap, pauses, KST bounds, empty, school sum, role/expiry gates, ACL/data/other functions, rollback')
 finally:run([PG/'pg_ctl','-D',tmp+'/db','-m','immediate','-w','stop'])
