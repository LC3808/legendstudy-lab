import tempfile,subprocess,pathlib
root=pathlib.Path(__file__).resolve().parent;bin='/opt/homebrew/opt/postgresql@17/bin/'
with tempfile.TemporaryDirectory(prefix='ls-admin-') as t:
 p=pathlib.Path(t);d=p/'data'
 def cmd(*args):return subprocess.run(args,check=True,capture_output=True,text=True).stdout
 cmd(bin+'initdb','-D',str(d),'-U','postgres','-A','trust')
 cmd(bin+'pg_ctl','-D',str(d),'-l',str(p/'log'),'-o',f'-k {t} -p 55487 -h ""','start')
 def sql(s):return subprocess.run([bin+'psql','-h',t,'-p','55487','-U','postgres','-v','ON_ERROR_STOP=1','-At'],input=s,text=True,capture_output=True,check=True).stdout
 try:
  sql('''create role anon;create role authenticated;create role service_role;create schema auth;create schema account_private;create schema essay_exam_private;create schema math_private;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create function public.admin_operator() returns boolean language sql as $$select coalesce(current_setting('test.operator',true),'false')='true'$$;
create function account_private.allowed(uuid) returns boolean language sql as $$select $1 is not null$$;
create table auth.users(id uuid primary key);create table profiles(id uuid primary key);create table credit_accounts(id uuid,user_id uuid);create table essay_exam_private.runs(id uuid,account_id uuid,parent_id uuid,state text);create table math_private.session_runs(student_id uuid,parent_id uuid,state text);create table essay_exams(university_id uuid);create table essay_questions(is_published boolean);
insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');insert into profiles select id from auth.users limit 1;insert into credit_accounts select id,id from auth.users;
insert into essay_exam_private.runs select id,id,null,'completed' from auth.users;insert into essay_exam_private.runs values(null,'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','reserved');''')
  sql((root/'admin-learning-apply.sql').read_text())
  result=sql("set test.operator='true';set test.uid='00000000-0000-0000-0000-000000000001';set role authenticated; select public.admin_learning_summary()->'members'; select public.admin_learning_summary('00000000-0000-0000-0000-000000000001')->'essay';")
  assert '"accounts": 2' in result and '"without_profile": 1' in result and '"total": 2' in result and '"rewrites": 1' in result
  for role,operator in [('anon','true'),('service_role','true'),('authenticated','false')]:
   try:sql(f"set test.operator='{operator}';set role {role};select public.admin_learning_summary();");raise AssertionError('unexpected grant')
   except subprocess.CalledProcessError:pass
  assert 't|t|' in sql((root/'admin-learning-postcheck.sql').read_text())
  sql((root/'admin-learning-rollback.sql').read_text());print('PASS local PostgreSQL metadata counts, subject scope, operator/role gates, rollback')
 finally:cmd(bin+'pg_ctl','-D',str(d),'stop','-m','fast')
