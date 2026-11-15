import tempfile,subprocess,json,pathlib,hashlib
ROOT=pathlib.Path(__file__).resolve().parent
BIN='/opt/homebrew/opt/postgresql@17/bin/'
def uid(n):return f'00000000-0000-4000-8000-{n:012d}'
with tempfile.TemporaryDirectory(prefix='ls-lab-admin-') as t:
 p=pathlib.Path(t)
 def cmd(*a):return subprocess.run(a,check=True,capture_output=True,text=True).stdout
 cmd(BIN+'initdb','-D',str(p/'data'),'-U','postgres','-A','trust')
 cmd(BIN+'pg_ctl','-D',str(p/'data'),'-l',str(p/'log'),'-o',f'-k {t} -p 55494 -h ""','start')
 def sql(s):
  r=subprocess.run([BIN+'psql','-h',t,'-p','55494','-U','postgres','-v','ON_ERROR_STOP=1','-Atq'],input=s,text=True,capture_output=True)
  if r.returncode:raise RuntimeError(r.stderr)
  return r.stdout.strip()
 gate=f"set request.jwt.claim.sub='{uid(999)}';set test.admin='true';set role authenticated;"
 def query(s):return json.loads(sql(gate+s))
 try:
  sql('''create role anon;create role authenticated;create role service_role;
create schema auth;create schema account_private;create schema essay_exam_private;create schema essay_ops_private;create schema essay_beta_private;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function public.admin_operator() returns boolean language sql as $$select coalesce(current_setting('test.admin',true),'false')='true'$$;
create function account_private.allowed(uuid) returns boolean language sql as $$select $1 is not null and $1::text is distinct from nullif(current_setting('test.denied',true),'')$$;
create function essay_ops_private.require_admin() returns void language plpgsql as $$begin if auth.uid() is null or public.admin_operator() is not true or account_private.allowed(auth.uid()) is not true then raise insufficient_privilege;end if;end$$;
create table auth.users(id uuid primary key,email text,created_at timestamptz,last_sign_in_at timestamptz);
create table credit_accounts(id uuid primary key,user_id uuid);
create table credit_grants(id uuid primary key,account_id uuid,origin text,created_at timestamptz);
create table credit_transactions(id uuid,account_id uuid,grant_id uuid,decision_id uuid,transaction_type text,balance_delta int,reserved_delta int,created_at timestamptz,reversal_of uuid);
create function public.admin_credit_snapshot(uuid) returns jsonb language sql as $$select jsonb_build_object('spendable',7,'reserved',0,'paid',0,'free',7,'other',0)$$;
create table public.universities(id uuid primary key,name text);
create table public.essay_exams(id uuid primary key,university_id uuid,exam_name text,admission_year int);
create table essay_exam_private.runs(id uuid primary key,account_id uuid,exam_id uuid,parent_id uuid,decision_id uuid,snapshot jsonb,state text,result jsonb,created_at timestamptz,completed_at timestamptz,previous_paid_run_id uuid,submission_index int);
create table essay_billing_decisions(id uuid primary key,reason text,credits_required int,status text,created_at timestamptz,reserved_at timestamptz,settled_at timestamptz,released_at timestamptz);
create table essay_ops_private.calls(call_id text,evaluation_id uuid,called_at timestamptz,provider text,model text,cost_usd numeric);
create table essay_exam_private.retry_requests(run_id uuid,generation int,created_at timestamptz);
create table essay_exam_private.checkpoints(run_id uuid,state text,payload jsonb);
create table human_quality_judgments(exam_run_id uuid,exam_question_id text);
create table essay_beta_private.daily_grants(grant_id uuid);
''')
  sql((ROOT/'apply.sql').read_text())
  sql(f"insert into universities values('{uid(80)}','A 대학'),('{uid(81)}','B 대학');insert into essay_exams values('{uid(90)}','{uid(80)}','A',2026),('{uid(91)}','{uid(81)}','B',2026);insert into credit_accounts values('{uid(1)}','{uid(1)}'),('{uid(2)}','{uid(2)}');")
  for i,account,exam,state,parent,reason,cost,at in [(1,1,90,'completed',None,'paid_cycle',1,'2026-11-08 15:00Z'),(2,1,90,'completed',101,'included_revision',0,'2026-11-09 15:00Z'),(3,2,91,'failed',None,'paid_cycle',1,'2026-11-09 15:00Z'),(4,2,91,'reserved',None,'paid_cycle',1,'2026-11-15 15:00Z')]:
   parent_sql="null" if parent is None else "'"+uid(parent)+"'"
   sql(f"insert into essay_exam_private.runs(id,account_id,exam_id,parent_id,decision_id,state,created_at,completed_at) values('{uid(100+i)}','{uid(account)}','{uid(exam)}',{parent_sql},'{uid(200+i)}','{state}','{at}','{at}'::timestamptz+interval '120 seconds');insert into essay_billing_decisions(id,reason,credits_required) values('{uid(200+i)}','{reason}',{cost});")
  sql(f"insert into credit_grants(id) values('{uid(300)}');insert into essay_beta_private.daily_grants values('{uid(300)}');insert into credit_transactions(id,grant_id,decision_id) values('{uid(400)}','{uid(300)}','{uid(201)}'),('{uid(401)}','{uid(300)}','{uid(201)}');")
  args="p_from=>'2026-11-08 15:00Z',p_to=>'2026-11-15 15:00Z'"
  x=query(f'select public.admin_lab_dashboard_summary({args});')
  assert x['students']==2 and x['duration_samples']==2 and x['avg_seconds']==120
  assert [u['requests'] for u in x['universities']]==[2,1]
  assert x['universities'][0]['students']==1 and x['universities'][0]['free_revisions']==1 and x['universities'][0]['beta_requests']==2
  assert sum(u['requests'] for u in query('select public.admin_lab_dashboard_summary();')['universities'])==4
  assert query(f"select public.admin_lab_dashboard_summary({args},p_source=>'beta');")['students']==1
  assert query(f"select public.admin_lab_dashboard_summary({args},p_source=>'other');")['students']==1
  empty=query("select public.admin_lab_dashboard_summary('2020-01-01','2020-01-02');")
  assert empty['students']==0 and empty['universities']==[] and empty['avg_seconds'] is None
  for args in ["p_source=>'invalid'","p_from=>'2026-11-01'","p_from=>'2026-11-02',p_to=>'2026-11-01'","p_from=>'2020-01-01',p_to=>'2026-11-01'"]:
   try:query(f'select public.admin_lab_dashboard_summary({args});');raise AssertionError('invalid accepted')
   except RuntimeError:pass
  for role,admin in [('anon','true'),('service_role','true'),('authenticated','false')]:
   try:sql(f"set request.jwt.claim.sub='{uid(999)}';set test.admin='{admin}';set role {role};select public.admin_lab_dashboard_summary();");raise AssertionError('unauthorized')
   except RuntimeError:pass
  try:sql(gate+f"set test.denied='{uid(999)}';select public.admin_lab_dashboard_summary();");raise AssertionError('restricted account')
  except RuntimeError:pass
  before=sql('select md5(string_agg(row_to_json(r)::text,chr(10) order by id)) from essay_exam_private.runs r;')
  sql((ROOT/'rollback.sql').read_text());sql((ROOT/'apply.sql').read_text())
  assert before==sql('select md5(string_agg(row_to_json(r)::text,chr(10) order by id)) from essay_exam_private.runs r;')
  print('PASS distinct/cohort/KST boundaries/beta parent+duplicate ledger/free revision/empty/validation/roles/account gate/rollback+reapply/data preservation')
 finally:cmd(BIN+'pg_ctl','-D',str(p/'data'),'stop','-m','immediate')
