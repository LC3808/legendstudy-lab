import argparse,ast,json,os,pathlib,subprocess,tempfile
parser=argparse.ArgumentParser()
for name in ['app-root','candidate','registry','pg-bin']:parser.add_argument('--'+name,type=pathlib.Path,required=True)
args=parser.parse_args()
A=args.app_root;C=args.candidate;P=args.pg_bin
versions=next(ast.literal_eval(n.value) for n in ast.parse((A/'tool/test_math_ownership_bootstrap.py').read_text()).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='VERSIONS' for t in n.targets))
env={k:v for k,v in os.environ.items() if not k.startswith('PG')};env['LC_ALL']='C'
def run(cmd,**kw):return subprocess.run(list(map(str,cmd)),env=env,text=True,capture_output=True,**kw)
with tempfile.TemporaryDirectory(prefix='task20-pg-',dir='/private/tmp') as td:
 root=pathlib.Path(td);sock=root/'sock';sock.mkdir();data=root/'db';started=False
 try:
  z=run([P/'initdb','-D',data,'-U','postgres','--auth=trust','--no-locale','--encoding=UTF8']);assert z.returncode==0,z.stderr
  z=run([P/'pg_ctl','-D',data,'-l',root/'log','-o',f"-k {sock} -p 5432 -c listen_addresses=''",'-w','start']);assert z.returncode==0,z.stderr;started=True
  def sql(s,error=None):
   z=run([P/'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-h',sock,'-U','postgres','-d','postgres'],input=s)
   if error:assert z.returncode!=0 and error in z.stderr,z.stderr;return
   assert z.returncode==0,z.stderr;return z.stdout.strip()
  sql("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,created_at timestamptz default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;alter default privileges in schema public grant all on functions to anon,authenticated,service_role;")
  for v in versions:sql(next((A/'supabase/migrations').glob(v+'_*.sql')).read_text())
  sql("insert into public.universities(id,slug,name) values('c4fa65ac-bbc6-5897-b4d8-f12f5a8f222b','sookmyung','숙명여자대학교')")
  rows=[e for e in json.load(args.registry.open()) if e['university_id']=='c4fa65ac-bbc6-5897-b4d8-f12f5a8f222b']
  quote=lambda v:'null' if v is None else "'"+str(v).replace("'","''")+"'"
  for e in rows:
   sql('insert into public.essay_exams(id,university_id,admission_year,exam_key,exam_name,exam_kind,field_or_division,session_label) values('+','.join(quote(e[k]) for k in ['exam_id','university_id','admission_year','exam_key','exam_name','exam_kind','field_or_division','session_label'])+')')
   for q in e['questions']:sql('insert into public.essay_questions(id,essay_exam_id,question_key,label,display_order,metadata_version) values('+','.join(quote(v) for v in [q['id'],e['exam_id'],q['question_key'],q['label'],q['display_order'],'fixture-v1'])+')')
  before=sql('select jsonb_agg(to_jsonb(e) order by id) from public.essay_exams e');beforeq=sql('select jsonb_agg(to_jsonb(q) order by id) from public.essay_questions q')
  security=sql("select jsonb_agg(to_jsonb(p) order by tablename,policyname) from pg_policies p where schemaname='public' and tablename in ('essay_exams','essay_questions')")
  install=(C/'register-review-only.sql').read_text();rollback=(C/'rollback-review-only.sql').read_text();plan=json.load(open(C/'registration-plan.json'));ids=','.join(quote(e['examId']) for e in plan['exams'])
  sql(install);sql(install)
  assert sql('select count(*) from public.essay_exams')=='38';assert sql('select count(*) from public.essay_questions')=='92'
  assert sql('select jsonb_agg(to_jsonb(e) order by id) from public.essay_exams e where id not in ('+ids+')')==before
  assert sql('select jsonb_agg(to_jsonb(q) order by id) from public.essay_questions q where essay_exam_id not in ('+ids+')')==beforeq
  assert sql("select jsonb_agg(to_jsonb(p) order by tablename,policyname) from pg_policies p where schemaname='public' and tablename in ('essay_exams','essay_questions')")==security
  for role in ['anon','authenticated']:
   assert sql(f'set role {role};select count(*) from public.essay_questions')=='0'
   sql(f'set role {role};update public.essay_questions set is_published=true','permission denied')
  assert sql('select count(*) from public.essay_questions where is_published')=='0'
  # State drift refuses rollback instead of deleting modified rows.
  qid=plan['exams'][0]['questions'][0]['id'];sql(f"update public.essay_questions set is_published=true where id='{qid}'");sql(rollback,'QUESTION_STATE_CHANGED');sql(f"update public.essay_questions set is_published=false where id='{qid}'")
  sql('create table public.synthetic_review_dependency(exam_id uuid references public.essay_exams(id) on delete cascade)');sql("insert into public.synthetic_review_dependency values ('"+plan['exams'][0]['examId']+"')");sql(rollback,'DEPENDENT_RECORDS_EXIST');sql('truncate public.synthetic_review_dependency')
  sql(rollback);assert sql('select jsonb_agg(to_jsonb(e) order by id) from public.essay_exams e')==before;assert sql('select jsonb_agg(to_jsonb(q) order by id) from public.essay_questions q')==beforeq
  e=plan['exams'][0];sql('insert into public.essay_exams(id,university_id,admission_year,exam_key,exam_name,exam_kind,field_or_division,session_label) values('+','.join(quote(v) for v in ['00000000-0000-4000-8000-000000000001',e['universityId'],e['year'],'source-other','synthetic collision',e['kind'],e['track'],e['session']])+')');sql(install,'SEMANTIC_EXAM_DUPLICATE')
  result=dict(localPG17='PASS',new_exams=30,new_questions=70,existing_exams=8,existing_questions=22,idempotent_replay='PASS',same_identity_different_id_block='PASS',existing_rows_preserved='PASS',rls_unchanged='PASS',unpublished_and_user_write_denied='PASS',rollback_state_drift_block='PASS',cascade_dependency_block='PASS',rollback_restore='PASS',production_applied=False)
  (C/'local-test-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
 finally:
  if started:run([P/'pg_ctl','-D',data,'-m','fast','-w','stop'])
