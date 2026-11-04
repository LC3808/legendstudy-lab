"""Disposable synthetic PostgreSQL. No remote DB or financial actions."""
import json,os,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];PG=Path('/opt/homebrew/opt/postgresql@17/bin')
def main():
 env={k:v for k,v in os.environ.items() if not k.startswith('PG')};env['LC_ALL']='C'
 with tempfile.TemporaryDirectory(prefix='member-dashboard-',dir='/private/tmp') as tmp:
  p=Path(tmp);sock=p/'socket';sock.mkdir()
  def run(args,**kw):return subprocess.run(list(map(str,args)),env=env,text=True,capture_output=True,**kw)
  def command(args):
   r=run(args);assert not r.returncode,r.stderr
  command([PG/'initdb','-D',p/'db','-U','postgres','--auth=trust','--no-locale','--encoding=UTF8'])
  command([PG/'pg_ctl','-D',p/'db','-l',p/'log','-o',f"-k {sock} -c listen_addresses=''",'-w','start'])
  try:
   def sql(s,error=None):
    r=run([PG/'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-h',sock,'-U','postgres'],input=s)
    if error:assert r.returncode and error in r.stderr,r.stderr;return
    assert not r.returncode,r.stderr
    return r.stdout.strip()
   sql('''create role anon;create role authenticated;create role service_role;
create schema auth;create schema account_private;create schema essay_exam_private;create schema student_private;
create function auth.uid() returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$;
create function public.admin_operator() returns boolean language sql as $$select coalesce(current_setting('test.operator',true),'')='yes'$$;
create function account_private.allowed(uuid) returns boolean language sql as $$select coalesce(current_setting('test.blocked',true),'')<>'yes'$$;
create table auth.users(id uuid,created_at timestamptz);
create table profiles(id uuid,grade_level smallint,academic_status text,neis_office_code text,neis_school_code text);
create table student_private.school_display_cache(office_code text,school_code text,school_name text);
create table study_sessions(id uuid default gen_random_uuid(),user_id uuid,started_at timestamptz,ended_at timestamptz,include_in_study_total boolean,active_segments jsonb);
create table student_target_universities(user_id uuid,university_id uuid,created_at timestamptz);
create table student_applications(user_id uuid,university_id uuid,created_at timestamptz);
create table bookmarks(user_id uuid,content_item_id uuid,created_at timestamptz);
create table recent_views(user_id uuid,content_item_id uuid,viewed_at timestamptz);
create table universities(id uuid,name text);create table content_items(id uuid,title text);
create table credit_accounts(id uuid,user_id uuid);
create table essay_exams(id uuid,exam_name text,university_id uuid);
create table essay_billing_decisions(id uuid,reason text,credits_required int);
create table essay_exam_private.runs(id uuid,account_id uuid,exam_id uuid,parent_id uuid,decision_id uuid,snapshot jsonb,state text,created_at timestamptz,completed_at timestamptz);
insert into auth.users select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'2026-11-04 00:00+09' from generate_series(1,4)n;
insert into profiles select id,case when right(id::text,1)='1' then 1 else 2 end,'student','B10','school' from auth.users;
insert into student_private.school_display_cache values('B10','school','TEST 학교');
insert into universities values('00000000-0000-0000-0000-000000000100','TEST 대학');
insert into student_target_universities select id,'00000000-0000-0000-0000-000000000100','2026-11-04 00:00+09' from auth.users;
insert into study_sessions(user_id,started_at,ended_at,include_in_study_total,active_segments) select id,'2026-11-03 23:30+09','2026-11-04 00:30+09',true,'[[0,3600000]]' from auth.users;
insert into study_sessions(user_id,started_at,ended_at,include_in_study_total,active_segments) select id,'2026-11-04 00:00+09','2026-11-04 00:30+09',true,'[[0,1800000]]' from auth.users;
insert into credit_accounts select id,id from auth.users;
insert into essay_exams values('00000000-0000-0000-0000-000000000200','TEST 시험','00000000-0000-0000-0000-000000000100');
insert into essay_exam_private.runs select id,id,'00000000-0000-0000-0000-000000000200',null,null,'{"answers":[{"questionId":"q1"}]}','completed','2026-11-04 01:00+09','2026-11-04 02:00+09' from auth.users;
''')
   sql((ROOT/'supabase/migrations/20261104095925_admin_member_dashboard_readouts.sql').read_text())
   sql((ROOT/'supabase/migrations/20261104101135_admin_member_composition_school_identity.sql').read_text())
   sql("alter table bookmarks add column id uuid default gen_random_uuid();alter table recent_views add column id uuid default gen_random_uuid();alter table content_items add column source_url text;")
   sql((ROOT/'supabase/migrations/20261104102732_admin_member_recent_activity.sql').read_text())
   # Existing functions retain their ACL in production; emulate their original ACL here.
   for fn in ['admin_dashboard_study','admin_learning_analytics','admin_exam_learning']:
    sql(f'revoke all on function {fn}(timestamptz,timestamptz) from public,anon,service_role;grant execute on function {fn}(timestamptz,timestamptz) to authenticated;')
   prefix="set role authenticated;set test.operator='yes';"
   args="'2026-11-04 00:00+09','2026-11-05 00:00+09'"
   def report(fn,arguments=args):return json.loads(sql(prefix+f'select {fn}({arguments});'))
   sql("insert into content_items values('00000000-0000-0000-0000-000000000300','합성 자료','https://legendstudy.com/test');insert into bookmarks(user_id,content_item_id,created_at) select '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000300','2026-11-01'::timestamptz+n*interval '1 hour' from generate_series(1,8)n;insert into recent_views(user_id,content_item_id,viewed_at) select user_id,content_item_id,created_at from bookmarks;insert into bookmarks(user_id,content_item_id,created_at) values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000300','2026-10-01');")
   activity=report('admin_member_recent_activity',"'00000000-0000-0000-0000-000000000001'")
   assert activity['bookmarks_total']==8 and len(activity['bookmarks'])==5 and len(activity['recent'])==5,activity
   assert activity['bookmarks'][0]['at']>activity['bookmarks'][-1]['at']
   assert report('admin_member_recent_activity',"'00000000-0000-0000-0000-000000000002'")['bookmarks_total']==1
   assert report('admin_member_recent_activity',"'00000000-0000-0000-0000-000000000003'")['bookmarks']==[]
   for role in ['anon','service_role']:sql(f"set role {role};select admin_member_recent_activity('00000000-0000-0000-0000-000000000001');",'permission denied')
   sql("set role authenticated;select admin_member_recent_activity('00000000-0000-0000-0000-000000000001');",'insufficient_privilege')
   sql(prefix+"set test.blocked='yes';select admin_member_recent_activity('00000000-0000-0000-0000-000000000001');",'insufficient_privilege')
   fingerprint=sql('select md5(string_agg(row_to_json(s)::text,\'\' order by id)) from study_sessions s')
   s=report('admin_dashboard_study');assert s['total']=={'users':4,'ms':7200000},s
   assert [r['users'] for r in s['grades']]==[1,3]
   a=report('admin_learning_analytics');assert a['metrics']['targets']==4 and a['metrics']['target_records']==4 and a['metrics']['applications']==0 and a['rows'][0]['users']==4,a
   e=report('admin_exam_learning');assert e['metrics']['runs']==4 and e['exams'][0]['users']==4,e
   m=report('admin_member_composition');assert m['accounts']==4 and m['active']==4 and m['schools'][0]['count']==4 and m['schools'][0]['office_code']=='B10',m
   sql("update profiles set academic_status='retaker',grade_level=3 where id::text like '%000001'")
   assert any(r['label']=='N수·검정고시 등' and r['count']==1 for r in report('admin_member_composition')['grades'])
   assert any(r['grade']=='retaker' and r['users']==1 for r in report('admin_dashboard_study')['grades'])
   u=report('admin_member_university_activity',"'00000000-0000-0000-0000-000000000001'");assert u[0]['first_runs']==1,u
   assert report('admin_member_university_activity',"'00000000-0000-0000-0000-000000000099'")==[]
   for fn in ['admin_dashboard_study','admin_learning_analytics','admin_exam_learning','admin_member_composition']:
    empty=report(fn,"'2026-12-01','2026-12-02'")
    if fn=='admin_dashboard_study':assert empty['total']=={'users':0,'ms':0}
    if fn=='admin_learning_analytics':assert all(v==0 for v in empty['metrics'].values()),empty
    for role in ['anon','service_role']:sql(f'set role {role};select {fn}({args});','permission denied')
    sql(f'set role authenticated;select {fn}({args});','insufficient_privilege')
    sql(prefix+f"select {fn}('2020-01-01','2026-11-05');",'ERROR')
   sql('set role anon;select admin_member_university_activity(null);','permission denied')
   sql(prefix+"set test.blocked='yes';select admin_member_composition(null,null);",'insufficient_privilege')
   assert fingerprint==sql('select md5(string_agg(row_to_json(s)::text,\'\' order by id)) from study_sessions s')
   print('PASS: recent activity limit5/order/isolation/empty/ACL; 5 dashboard read RPCs, cohorts 1/3/4, zero, KST clipping, overlap, membership window, member isolation, ACL, period limits, preservation')
  finally:command([PG/'pg_ctl','-D',p/'db','-m','immediate','-w','stop'])
if __name__=='__main__':main()
