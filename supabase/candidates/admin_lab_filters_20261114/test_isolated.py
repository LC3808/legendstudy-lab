import tempfile,subprocess,json,pathlib,hashlib
ROOT=pathlib.Path(__file__).resolve().parent
BIN='/opt/homebrew/opt/postgresql@17/bin/'
def uid(n):return f'00000000-0000-4000-8000-{n:012d}'
with tempfile.TemporaryDirectory(prefix='ls-lab-admin-') as t:
 p=pathlib.Path(t)
 def cmd(*a):return subprocess.run(a,check=True,capture_output=True,text=True).stdout
 cmd(BIN+'initdb','-D',str(p/'data'),'-U','postgres','-A','trust')
 cmd(BIN+'pg_ctl','-D',str(p/'data'),'-l',str(p/'log'),'-o',f'-k {t} -p 55491 -h ""','start')
 def sql(s):
  r=subprocess.run([BIN+'psql','-h',t,'-p','55491','-U','postgres','-v','ON_ERROR_STOP=1','-Atq'],input=s,text=True,capture_output=True)
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
  sql((ROOT/'baseline.sql').read_text())
  sql(f"insert into universities values('{uid(80)}','성균관대학교');insert into essay_exams values('{uid(90)}','{uid(80)}','시험',2023);")
  for i in range(1,32):
   sql(f"insert into auth.users values('{uid(i)}','user{i}@example.test','2026-11-01',null);insert into credit_accounts values('{uid(i)}','{uid(i)}');")
   if i<31:
    snap=json.dumps({'answers':[{'questionId':uid(81),'body':'synthetic answer','rubricVersion':'v1'}]});result=json.dumps({'questions':[{'questionId':uid(81),'criteria':[],'evaluation':{'contract_version':'1.3','local_reviews':'PRIVATE'},'telemetry':{'secret':'PRIVATE'}}]})
    sql(f"insert into essay_exam_private.runs values('{uid(100+i)}','{uid(i)}','{uid(90)}',null,'{uid(200+i)}','{snap}','completed','{result}','2026-11-01'::timestamptz+interval '{i} hours','2026-11-02',null,1);insert into essay_billing_decisions values('{uid(200+i)}','paid_cycle',1,'settled',now(),now(),now(),null);")
  sql((ROOT/'apply.sql').read_text())
  try:sql((ROOT/'apply.sql').read_text());raise AssertionError('replay accepted')
  except RuntimeError:pass
  assert query("select public.admin_lab_runs_filtered();")['total']==30
  assert len(query("select public.admin_lab_runs_filtered(p_offset=>25);")['items'])==5
  assert query("select public.admin_lab_runs_filtered(p_query=>'user2@');")['total']==1
  assert query("select public.admin_lab_runs_filtered(p_query=>'%');")['total']==0
  assert query(f"select public.admin_lab_runs_filtered(p_query=>'{uid(3)}');")['total']==1
  assert query(f"select public.admin_lab_runs_filtered(p_user=>'{uid(3)}',p_query=>'user2@');")['total']==0
  assert query("select public.admin_lab_runs_filtered(p_from=>'2026-11-01 02:00Z',p_to=>'2026-11-01 03:00Z');")['total']==1
  assert query(f"select public.admin_lab_runs_filtered(p_exam=>'{uid(91)}');")['total']==0
  assert query("select public.admin_lab_runs_filtered();")['exams'][0]['exam_id']==uid(90)
  for args in ["p_offset=>-1","p_from=>'2026-11-01'","p_from=>'2026-11-02',p_to=>'2026-11-01'","p_from=>'2020-01-01',p_to=>'2026-11-01'","p_query=>repeat('x',255)"]:
   try:query(f'select public.admin_lab_runs_filtered({args});');raise AssertionError('bad filter accepted')
   except RuntimeError:pass
  for role,admin in [('anon','true'),('service_role','true'),('authenticated','false')]:
   try:sql(f"set role {role};set test.admin='{admin}';select public.admin_lab_runs_filtered();");raise AssertionError('unauthorized read')
   except RuntimeError:pass
  before=sql('select md5(string_agg(to_jsonb(r)::text,id::text order by id)) from essay_exam_private.runs r;')
  sql((ROOT/'rollback.sql').read_text())
  assert before==sql('select md5(string_agg(to_jsonb(r)::text,id::text order by id)) from essay_exam_private.runs r;')
  assert query("select public.admin_lab_runs();")['total']==30
  print('PASS: filtered global pagination, literal email/UUID search, member isolation, half-open date bounds, exam, roles, invalid inputs, replay guard, rollback, data preservation')

 finally:cmd(BIN+'pg_ctl','-D',str(p/'data'),'stop','-m','fast')
