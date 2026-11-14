import tempfile,subprocess,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parent
BIN='/opt/homebrew/opt/postgresql@17/bin/'
with tempfile.TemporaryDirectory(prefix='ls-nickname-') as t:
 p=pathlib.Path(t)
 def cmd(*a):return subprocess.run(a,check=True,capture_output=True,text=True).stdout
 cmd(BIN+'initdb','-D',str(p/'data'),'-U','postgres','-A','trust')
 cmd(BIN+'pg_ctl','-D',str(p/'data'),'-l',str(p/'log'),'-o',f'-k {t} -p 55492 -h ""','start')
 def sql(s):
  r=subprocess.run([BIN+'psql','-h',t,'-p','55492','-U','postgres','-v','ON_ERROR_STOP=1','-Atq'],input=s,text=True,capture_output=True)
  if r.returncode:raise RuntimeError(r.stderr)
  return r.stdout.strip()
 def quote(s):return "'"+s.replace("'","''")+"'"
 try:
  sql("create role anon;create role authenticated;create table profiles(id int primary key,display_name text check(display_name is null or char_length(btrim(display_name)) between 1 and 80),grade int);insert into profiles values(1,repeat('가',80),1);")
  before=sql('select md5(row(p.*)::text) from profiles p;')
  sql((ROOT/'apply.sql').read_text())
  assert before==sql('select md5(row(p.*)::text) from profiles p;')
  vectors=json.loads((ROOT/'unicode16-vectors.json').read_text())
  rows=','.join('('+quote(v)+','+str(n)+')' for v,n in vectors)
  failures=sql('select count(*) from (values '+rows+') v(s,n) where nickname_private.grapheme_length(s)<>n;')
  assert failures=='0',failures
  assert sql("select nickname_private.grapheme_length('');")=='0'
  sql("update profiles set grade=2 where id=1;update profiles set display_name=display_name where id=1;insert into profiles values(1,repeat('가',80),3) on conflict(id) do update set grade=excluded.grade;")
  for name in ['가','a','👨‍👩‍👧‍👦','👍🏽','🇰🇷','e\u0301','가']:
   sql('insert into profiles values(2,'+quote(name*20)+',1) on conflict(id) do update set display_name=excluded.display_name;')
   try:sql('update profiles set display_name='+quote(name*21)+' where id=2;');raise AssertionError('21 accepted')
   except RuntimeError:pass
  sql('update profiles set display_name='+quote('👨‍👩‍👧‍👦'*20)+' where id=2;')
  try:sql((ROOT/'rollback.sql').read_text());raise AssertionError('unsafe rollback accepted')
  except RuntimeError:pass
  sql("update profiles set display_name='가' where id=2;")
  sql((ROOT/'rollback.sql').read_text())
  sql((ROOT/'apply.sql').read_text())
  sql("grant select,insert,update on profiles to authenticated;alter table profiles enable row level security;create policy own on profiles to authenticated using(id=1) with check(id=1);")
  sql("set role authenticated;update profiles set grade=4 where id=1;")
  try:sql("set role authenticated;insert into profiles values(3,'valid',1);");raise AssertionError('RLS bypass')
  except RuntimeError:pass
  print('PASS: 1093 official Unicode cases, 20/21 boundaries, legacy insert/update, data preservation, rollback/reapply, RLS')
 finally:cmd(BIN+'pg_ctl','-D',str(p/'data'),'stop','-m','fast')
