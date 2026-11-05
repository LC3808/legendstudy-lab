import json,pathlib,tempfile,subprocess,os,hashlib
root=pathlib.Path.cwd();c=root/'supabase/candidates/task20_private_catalog_guard_20261106';c.mkdir(exist_ok=True)
i=json.load(open('/private/tmp/task20-catalog-guard-input.json'));defs=i['original'];candidate=i['candidate'];ids=i['excluded_exam_ids'];uidset=set()
old=json.load(open('/private/tmp/task20-live-exams.json'));meta=json.load(open('/private/tmp/task20-audit-input.json'))['rows'];plans=[]
for p in root.glob('supabase/candidates/task20_*recovery_20261106/registration-plan.json'):plans+=json.load(open(p))['exams']
P=pathlib.Path('/opt/homebrew/opt/postgresql@17/bin');env={k:v for k,v in os.environ.items() if not k.startswith('PG')};env['LC_ALL']='C'
def run(cmd,**kw):return subprocess.run(list(map(str,cmd)),text=True,capture_output=True,env=env,**kw)
quote=lambda x:'null' if x is None else "'"+str(x).replace("'","''")+"'"
with tempfile.TemporaryDirectory(prefix='task20-catalog-pg-',dir='/private/tmp') as td:
 t=pathlib.Path(td);s=t/'s';s.mkdir();d=t/'d';started=False
 try:
  r=run([P/'initdb','-D',d,'-U','postgres','--auth=trust','--no-locale','--encoding=UTF8']);assert r.returncode==0,r.stderr
  r=run([P/'pg_ctl','-D',d,'-l',t/'log','-o',f"-k {s} -p 5432 -c listen_addresses=''",'-w','start']);assert r.returncode==0,r.stderr;started=True
  def sql(q):
   z=run([P/'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-h',s,'-U','postgres'],input=q);assert z.returncode==0,z.stderr;return z.stdout.strip()
  sql('create role anon;create role authenticated;create table public.universities(id uuid,slug text,name text);create table public.essay_exams(id uuid,university_id uuid,admission_year int,exam_kind text,field_or_division text,admission_track text,exam_name text);create table public.essay_questions(id uuid,essay_exam_id uuid,label text,display_order int);')
  for x in meta:
   if x['university_id'] in uidset:continue
   uidset.add(x['university_id']);sql('insert into public.universities values('+','.join(quote(x[k]) for k in ['university_id','slug','university'])+')')
  for e in old:
   sql('insert into public.essay_exams values('+','.join(quote(v) for v in [e['exam_id'],e['university_id'],e['admission_year'],e['exam_kind'],e['field_or_division'],None,e['exam_name']])+')')
   for q in e['questions']:sql('insert into public.essay_questions values('+','.join(quote(v) for v in [q['id'],e['exam_id'],q['label'],q['display_order']])+')')
  sql(defs);sql('revoke all on function public.essay_browse_catalog(text) from public;grant execute on function public.essay_browse_catalog(text) to anon,authenticated;')
  acl=sql("select proacl::text from pg_proc where oid='public.essay_browse_catalog(text)'::regprocedure")
  # Query every source alias actually present in the immutable function definition.
  import re
  aliases=re.findall(r"\('([^']+)',(?:null|'[0-9a-f-]+'),'",defs)
  snapshot=lambda:json.loads(sql("set role authenticated;select jsonb_object_agg(x,public.essay_browse_catalog(x)) from unnest(array["+','.join(quote(x) for x in aliases)+"]) x;reset role;"))
  before=snapshot()
  for e in plans:
   sql('insert into public.essay_exams values('+','.join(quote(v) for v in [e['examId'],e['universityId'],e['year'],e['kind'],e['track'],None,e['name']])+')')
   for q in e['questions']:sql('insert into public.essay_questions values('+','.join(quote(v) for v in [q['id'],e['examId'],q['label'],q['order']])+')')
  visible=snapshot();assert sum(e['examId'] in ids for v in visible.values() for e in v)==86
  sql(candidate)
  assert snapshot()==before,'EXISTING_PUBLIC_METADATA_CHANGED'
  assert sql("select proacl::text from pg_proc where oid='public.essay_browse_catalog(text)'::regprocedure")==acl
  afterdef=sql("select pg_get_functiondef('public.essay_browse_catalog(text)'::regprocedure)")+'\n'
  afterhash=sql("select md5(pg_get_functiondef('public.essay_browse_catalog(text)'::regprocedure))")
  sql(defs);assert snapshot()==visible,'ROLLBACK_FAILED'
  guard=lambda md5:"do $$begin if md5(pg_get_functiondef('public.essay_browse_catalog(text)'::regprocedure))<> '"+md5+"' then raise exception 'CATALOG_DEFINITION_DRIFT';end if;end$$;\n"
  (c/'apply.sql').write_text('begin;\n'+guard('7a5d5ee547e406222a67d51fe310c7d8')+candidate.rstrip().rstrip(';')+';\ncommit;\n')
  (c/'rollback.sql').write_text('begin;\n'+guard(afterhash)+defs.rstrip().rstrip(';')+';\ncommit;\n')
  sql((c/'apply.sql').read_text());assert snapshot()==before
  sql((c/'rollback.sql').read_text());assert snapshot()==visible
  result={'exact_transaction_files_tested':True,'local_postgres':'PASS','source_aliases':len(aliases),'new_metadata_hidden':86,'existing_catalog_exact_preservation':True,'acl_unchanged':True,'rollback_exact_restore':True,'production_applied':False,'expected_post_definition_md5':afterhash}
  (c/'local-test-result.json').write_text(json.dumps(result,indent=2)+'\n');(c/'role-readback.json').write_text(json.dumps(i['catalog_role_check'],indent=2)+'\n');print(result)
 finally:
  if started:run([P/'pg_ctl','-D',d,'-m','fast','-w','stop'])
