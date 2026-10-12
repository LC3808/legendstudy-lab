"""Local PG17, canonical APP prerequisites, synthetic metadata fixtures only."""
import argparse,ast,json,os,subprocess,tempfile
from pathlib import Path
from prepare_registration import prepare,sql_document,rollback_document
ROOT=Path(__file__).resolve().parents[2]
def main():
 p=argparse.ArgumentParser();p.add_argument('--app-root',required=True,type=Path);p.add_argument('--pg-bin',required=True,type=Path);a=p.parse_args()
 env={k:v for k,v in os.environ.items() if not k.startswith('PG')};env['LC_ALL']='C'
 def run(cmd,**kw):return subprocess.run(list(map(str,cmd)),env=env,text=True,capture_output=True,**kw)
 versions=next(ast.literal_eval(n.value) for n in ast.parse((a.app_root/'tool/test_math_ownership_bootstrap.py').read_text()).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='VERSIONS' for t in n.targets))
 db=json.loads(Path(__file__).with_name('db-catalog-preflight-20261012.json').read_text());reg=json.loads((ROOT/'src/data/essay-source-registry.json').read_text());plan=prepare(reg,db)
 def quote(v):return 'null' if v is None else "'"+str(v).replace("'","''")+"'"
 with tempfile.TemporaryDirectory(prefix='essay-registration-',dir='/private/tmp') as td:
  root=Path(td);sock=root/'sock';sock.mkdir();data=root/'db';started=False
  z=run([a.pg_bin/'initdb','-D',data,'-U','postgres','--auth=trust','--no-locale','--encoding=UTF8']);assert z.returncode==0,z.stderr
  try:
   z=run([a.pg_bin/'pg_ctl','-D',data,'-l',root/'log','-o',f"-k {sock} -p 5432 -c listen_addresses=''",'-w','start']);assert z.returncode==0,z.stderr;started=True
   def sql(s,error=None):
    z=run([a.pg_bin/'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-h',sock,'-U','postgres','-d','postgres'],input=s)
    if error:assert z.returncode!=0 and error in z.stderr,z.stderr;return
    assert z.returncode==0,z.stderr;return z.stdout.strip()
   sql("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,created_at timestamptz default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;alter default privileges in schema public grant all on functions to anon,authenticated,service_role;")
   for version in versions:sql(next((a.app_root/'supabase/migrations').glob(version+'_*.sql')).read_text())
   for u in db['universities']:sql('insert into public.universities(id,slug,name) values('+','.join(quote(u[k]) for k in ['id','slug','name'])+')')
   for e in db['exams']:sql('insert into public.essay_exams(id,university_id,admission_year,exam_key,exam_name,exam_kind,campus,field_or_division,session_label) values('+','.join(quote(e[k]) for k in ['id','universityId','year'])+",'fixture-"+e['id']+"','fixture',"+','.join(quote(e[k]) for k in ['kind','campus','track','session'])+')')
   before=sql('select jsonb_agg(to_jsonb(e) order by id) from public.essay_exams e')
   sql(sql_document(plan));sql(sql_document(plan))
   assert sql('select count(*) from public.essay_questions')=='234'
   assert sql('select count(*) from public.essay_exams')=='96'
   assert sql('select count(*) from public.essay_questions where is_published')=='0'
   q=plan['exams'][0]['questions'][0]
   # Canonical immutable question trigger rejects edits; publication changes must
   # also keep rollback conservative. Simulate review state by controlled fixture.
   sql(f"alter table public.essay_questions disable trigger user;update public.essay_questions set label='edited' where id='{q['id']}';alter table public.essay_questions enable trigger user;")
   sql(rollback_document(plan),'QUESTION_STATE_CHANGED')
   assert sql('select count(*) from public.essay_questions')=='234'
   sql(f"alter table public.essay_questions disable trigger user;update public.essay_questions set label={quote(q['label'])} where id='{q['id']}';alter table public.essay_questions enable trigger user;")
   sql(rollback_document(plan))
   assert sql('select count(*) from public.essay_questions')=='0'
   assert sql('select jsonb_agg(to_jsonb(e) order by id) from public.essay_exams e')==before
   print(json.dumps({'database':'local PostgreSQL17','registrationRecords':76,'questions':234,'heldExams':1,'applyReplay':'PASS','noPublication':'PASS','editedRollbackDenied':'PASS','exactBaselineRestored':'PASS','productionApplied':False}))
  finally:
   if started:run([a.pg_bin/'pg_ctl','-D',data,'-m','fast','-w','stop'])
if __name__=='__main__':main()
