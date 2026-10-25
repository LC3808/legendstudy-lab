import tempfile,subprocess,pathlib,json
root=pathlib.Path(__file__).resolve().parent
pg='/opt/homebrew/opt/postgresql@17/bin/'
with tempfile.TemporaryDirectory(prefix='ls-mobile-report-') as tmp:
 data=pathlib.Path(tmp)/'data'
 def run(*args):return subprocess.run(args,check=True,capture_output=True,text=True).stdout
 run(pg+'initdb','-D',str(data),'-U','postgres','-A','trust')
 run(pg+'pg_ctl','-D',str(data),'-l',tmp+'/log','-o',f'-k {tmp} -p 55487 -h ""','start')
 def sql(s):return subprocess.run([pg+'psql','-h',tmp,'-p','55487','-U','postgres','-v','ON_ERROR_STOP=1','-At'],input=s,text=True,capture_output=True,check=True).stdout
 try:
  sql("""create role anon;create role authenticated;create role service_role;create schema auth;create schema account_private;
create function auth.uid() returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$;
create function public.admin_operator() returns boolean language sql as $$select coalesce(current_setting('test.operator',true),'false')='true'$$;
create function account_private.allowed(uuid) returns boolean language sql as $$select true$$;
create table credit_grants(id integer,origin text);create table credit_transactions(grant_id integer,transaction_type text,reason_code text,balance_delta integer,created_at timestamptz);
insert into credit_grants values(1,'purchase'),(2,'purchase'),(3,'purchase');
insert into credit_transactions values(1,'purchase','iap_google_v1',1,'2026-10-01'),(2,'purchase','iap_apple_v1',1,'2026-10-02'),(3,'purchase','iap_apple_v1',3,'2026-10-03'),(1,'consume','evaluation_completed',-1,'2026-10-04');""")
  sql((root/'apply.sql').read_text())
  prefix="set test.operator='true';set role authenticated;"
  report=json.loads(sql(prefix+"select public.admin_mobile_purchase_report();").splitlines()[-1]);assert sum(p['granted_credits'] for p in report['platforms'])==5;assert sum(p['purchase_count'] for p in report['platforms'])==3;assert report['amount_available'] is False
  report=json.loads(sql(prefix+"select public.admin_mobile_purchase_report(null,null,3);").splitlines()[-1]);assert report['platforms']==[{'platform':'apple','purchase_count':1,'granted_credits':3}]
  report=json.loads(sql(prefix+"select public.admin_mobile_purchase_report('2026-10-01','2026-10-02',null);").splitlines()[-1]);assert report['platforms'][0]['platform']=='google'
  for role,op in [('anon','true'),('service_role','true'),('authenticated','false')]:
   try:sql(f"set test.operator='{op}';set role {role};select public.admin_mobile_purchase_report();")
   except subprocess.CalledProcessError:continue
   raise AssertionError('unexpected access')
  sql((root/'rollback.sql').read_text());print('PASS: 3 purchases/5 credits, consumption excluded, quantity/date boundaries, role gates, rollback')
 finally:run(pg+'pg_ctl','-D',str(data),'stop','-m','fast')
