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
  sql('create role anon;create role authenticated;create role service_role;')
  for name in ['local_fixture.sql','baseline.sql','install.sql','test.sql','result_test.sql','postcheck.sql']:
   sql((ROOT/name).read_text())
  sql((ROOT/'rollback.sql').read_text())
  assert sql("select has_function_privilege('authenticated','public.essay_feedback_submit(jsonb)','execute');")=='f'
  print('PASS feedback: idempotency, concurrent-safe user lock, role/owner isolation, result redaction, admin actions, rate limit, preservation, lossless rollback')
 finally:cmd(BIN+'pg_ctl','-D',str(p/'data'),'stop','-m','fast')
