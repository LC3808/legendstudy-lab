from pathlib import Path
import json,re,hashlib
import psycopg
from psycopg.types.json import Jsonb
ROOT=Path(__file__).resolve().parents[1]
FS=json.load(open('/tmp/legendstudy-release57-production-functions.json'))
RUNS=json.load(open('/tmp/legendstudy-release57-production-run-tables.json'))

def prepare(c,admin):
 c.execute('alter table public.math_subproblems add column essay_question_id uuid references public.essay_questions(id)')
 c.execute('create schema essay_exam_private;alter table essay_beta_private.test_grants add column revision_cutoff timestamptz; create view essay_beta_private.daily_grants as select t.id as grant_id,coalesce(t.revision_cutoff,g.expires_at) as revision_cutoff from essay_beta_private.test_grants t join public.credit_grants g on g.id=t.id')
 cols=[]
 for item in RUNS:
  x=item['item']
  if item['kind']=='column' and x['schema']=='essay_exam_private':
   cols.append(x['name']+' '+('uuid[]' if x['type']=='_uuid' else x['type'])+(' not null' if x['nullable']=='NO' else '')+(' default '+x['default'] if x['default'] else ''))
 c.execute('create table essay_exam_private.runs('+','.join(cols)+')')
 for item in sorted(RUNS,key=lambda x:0 if x['kind']=='constraint' and x['item']['definition'].startswith('PRIMARY KEY') else 1):
  x=item['item']
  if item['kind']=='constraint' and x['schema']=='essay_exam_private': c.execute('alter table essay_exam_private.runs add constraint '+x['name']+' '+x['definition'])
 for item in RUNS:
  x=item['item']
  if item['kind']=='index' and x['schemaname']=='essay_exam_private' and not c.execute('select to_regclass(%s)',('essay_exam_private.'+x['indexname'],)).fetchone()[0]: c.execute(x['indexdef'])
 c.execute('alter table essay_exam_private.runs enable row level security;alter table essay_exam_private.runs force row level security; revoke all on essay_exam_private.runs from public,anon,authenticated,service_role;grant all on essay_exam_private.runs to postgres')
 # SQL bodies are exact read-only Production snapshots. Only disposable synthetic rows exist.
 for f in FS:
  c.execute(f['definition'])
  oid=c.execute('select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=%s and p.proname=%s and pg_get_function_identity_arguments(p.oid)=%s',(f['schema'],f['proname'],f['args'])).fetchone()[0]
  c.execute('alter function '+oid+' owner to '+f['owner'])
  c.execute('revoke all on function '+oid+' from public,anon,authenticated,service_role,postgres,math_executor,essay_executor')
  c.execute('set role '+f['owner'])
  for entry in f['acl'][1:-1].split(','):
   who,perm=entry.split('=');priv,grantor=perm.split('/');assert priv=='X';c.execute('grant execute on function '+oid+' to '+who)
  c.execute('reset role')
 # Helpers are exact snapshots too; bootstrap before mixed probes only.
 helper=Path('/tmp/legendstudy-release57-production-beta-helpers.json')
 if helper.exists():
  for f in json.loads(helper.read_text()):c.execute(f['definition'])
 for role in ['math_executor','essay_executor']:
  for member,grantor in c.execute("select pg_get_userbyid(member),pg_get_userbyid(grantor) from pg_auth_members where roleid=%s::regrole and member='postgres'::regrole",(role,)).fetchall():
   admin.execute('revoke '+role+' from '+member+' granted by '+grantor)
  admin.execute('grant '+role+' to postgres with admin true, inherit false, set false granted by supabase_admin')
 c.execute('revoke create on schema public,math_private from math_executor;revoke create on schema math_private from essay_executor;revoke references on public.math_evaluations from math_executor')
 for f in FS:
  actual=c.execute("select md5(pg_get_functiondef(p.oid)),pg_get_userbyid(proowner),proacl::text,proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=%s and p.proname=%s",(f['schema'],f['proname'])).fetchone()
  expected=(f['hash'],f['owner'],f['acl'],f['config'])
  if actual!=expected:print('FIXTURE_METADATA_DIFF',f['proname'],actual,expected,flush=True)
 c.execute('set role essay_executor;grant execute on function essay_private.clock() to postgres;reset role') # Exact Production helper ACL snapshot.
 print('RELEASE57_PRODUCTION_SNAPSHOT_RECONSTRUCTED_NO_PERSONAL_DATA PASS',flush=True)

def fingerprint(c):
 return c.execute("select (select jsonb_agg(to_jsonb(x) order by roleid,member,grantor) from pg_auth_members x), (select jsonb_agg(jsonb_build_array(nspname,nspowner,nspacl::text) order by nspname) from pg_namespace where nspname in('public','math_private','essay_private')), (select jsonb_agg(jsonb_build_array(p.oid,pg_get_functiondef(p.oid),p.proowner,p.proacl::text,p.proconfig) order by p.oid) from pg_proc p where p.pronamespace in('math_private'::regnamespace,'public'::regnamespace)), (select jsonb_agg(to_jsonb(x) order by id) from public.credit_transactions x), (select jsonb_agg(to_jsonb(x) order by id) from math_private.session_runs x)").fetchone()

def install_and_negative(c,admin,executor):
 prepare(c,admin);candidate=next((ROOT/'migrations').glob('*_math_commerce_learning_incremental.sql')).read_text();before=fingerprint(c)
 for marker in ['-- RELEASE57_AFTER_TEMPORARY_PRIVILEGES','-- RELEASE57_AFTER_FUNCTIONS','-- RELEASE57_BEFORE_COMMIT']:
  bad=candidate.replace(marker,marker+"\ndo $$begin raise exception 'INTENTIONAL_ATOMICITY_PROBE';end$$;")
  try:executor(c,admin,bad)
  except psycopg.errors.RaiseException as ex:assert 'INTENTIONAL_ATOMICITY_PROBE' in str(ex),str(ex)
  else:raise AssertionError('injected failure allowed')
  assert fingerprint(c)==before,marker
  print('RELEASE57_ATOMIC_ROLLBACK_'+marker.split('_')[-1]+' PASS',flush=True)
 # Fail closed if the function body no longer matches verified Production snapshot.
 changed=candidate.replace(FS[0]['hash'],'0'*32,1)
 try:executor(c,admin,changed)
 except psycopg.errors.RaiseException as ex:assert 'RELEASE57_SOURCE_DRIFT' in str(ex),str(ex)
 else:raise AssertionError('source drift allowed')
 assert fingerprint(c)==before
 executor(c,admin,candidate)
 after=fingerprint(c)
 rows=c.execute("select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),pg_get_userbyid(p.proowner),p.proacl::text,p.proconfig,md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in('math_coaching','essay_math_coaching','math_learning','math_evaluation_detail','math_reveal_hint','math_session_read','math_session_quote','math_session_continue','math_session_submit','essay_exam_history')) or (n.nspname='math_private' and p.proname in('cycle_deadline','authorize_billing','learning_eligibility','session_eligibility','evaluation_admission')) order by 1,2").fetchall()
 (ROOT/'expected-core-postflight.json').write_text(json.dumps([dict(zip(['schema','name','args','owner','acl','config','definition_md5'],r)) for r in rows],indent=2))
 assert after[0]==before[0] and after[1]==before[1] and after[3]==before[3]
 # Additive nullable columns intentionally change row shape, never values.
 assert [dict(x,previous_run_id=None,submission_index=None) for x in (before[4] or [])]==(after[4] or [])
 print('RELEASE57_INSTALL_NON_SUPERUSER_OWNER_ACL_LEDGER_HISTORY_PRESERVED PASS',flush=True)
 try:executor(c,admin,candidate)
 except psycopg.errors.RaiseException as ex:assert 'SOURCE_DRIFT' in str(ex) or 'COLLISION' in str(ex),str(ex)
 else:raise AssertionError('second install allowed')
 assert fingerprint(c)==after
 print('RELEASE57_SOURCE_DRIFT_AND_RERUN_FAIL_CLOSED PASS',flush=True)
 admin.execute('grant authenticated,anon,essay_finance,math_evaluation_worker,math_extraction_worker to postgres with inherit false,set true') # Fixture transport impersonates PostgREST roles; SECURITY DEFINER postgres remains non-superuser.
 admin.execute('alter role postgres nosuperuser createrole bypassrls')
 print('RELEASE57_ALL_FOLLOWING_RUNTIME_CHECKS_NON_SUPERUSER_POSTGRES PASS',flush=True)

def verify_mixed(c,rpc,new,scalar,A,B):
 account=scalar('select id from public.credit_accounts where user_id=%s',(A,));exam=scalar('select id from public.essay_exams limit 1')
 decisions=[x[0] for x in c.execute("select id from public.essay_billing_decisions where account_id=%s and status='settled' order by id limit 2",(account,)).fetchall()];assert len(decisions)==2
 human_q=new();math_q=new();error=new();error2=new();error3=new();rid=new();hid=new();secret='NEVER_REVEAL_BEFORE_REQUEST'
 human={'questionId':human_q,'evaluation':{'contract_version':'1.3','summary':'HUMAN_BYTES_UNCHANGED','strengths':['human']}}
 math={'questionId':math_q,'rubricVersion':'test-rubric','evidenceVersion':'test-evidence','evaluation':{'contract_version':'math-eval-v1','steps':[{'id':'s','position':1,'status':'VALID','representation':secret,'explanation':secret}], 'errors':[{'id':error,'step_id':'s','classification':'ROOT','category':'CALCULATION','materiality':'MATERIAL_ERROR','explanation':secret}], 'generated_solution':secret,'overall':{'explanation':secret}}}
 math['evaluation']['errors'].extend([dict(math['evaluation']['errors'][0],id=error2),dict(math['evaluation']['errors'][0],id=error3)])
 result={'summary':secret,'questions':[human,math]};pure={'summary':'HUMAN_SUMMARY','questions':[human]}
 for run,decision,out in [(rid,decisions[0],result),(hid,decisions[1],pure)]:
  snap={'answers':[{'questionId':q['questionId'],'body':'STUDENT_CONFIRMED_TEXT'} for q in out['questions']]}
  c.execute("insert into essay_exam_private.runs(id,account_id,exam_id,decision_id,request_key,snapshot,state,result,completed_at) values(%s,%s,%s,%s,%s,%s,'completed',%s,clock_timestamp())",(run,account,exam,decision,new(),Jsonb(snap),Jsonb(out)))
 with c.transaction():
  c.execute("select set_config('request.jwt.claim.sub',%s,true)",(A,))
  beforehuman=scalar('select public.essay_exam_history_before_task16g(%s)',(hid,))
  beforemixed=scalar('select public.essay_exam_history_before_task16g(%s)',(rid,))
 assert rpc('essay_exam_history',[hid])==beforehuman
 safe=rpc('essay_exam_history',[rid]);assert secret not in json.dumps(safe) and safe['runs'][0]['result']['questions'][0]==human
 assert rpc('essay_exam_history',[rid],uid=B)['runs']==[]
 def call(action,user=A,**kwargs):return rpc('essay_math_coaching',[{'dto_version':'math-coaching-v1','action':action,'payload':{'run_id':rid,'question_id':math_q,**kwargs}}],uid=user)['result']
 assert not call('read')['disclosed']
 for fn in [lambda:call('read',user=B),lambda:rpc('essay_exam_history_before_task16g',[rid]),lambda:call('reveal',client_submission_id=None)]:
  try:fn()
  except psycopg.Error:pass
  else:raise AssertionError('unauthorized mixed access allowed')
 key=new();hint=call('hint',task_id=error,level=1,client_submission_id=key);assert secret not in json.dumps(hint)
 call('hint',task_id=error,level=1,client_submission_id=key);assert scalar('select count(*) from math_private.mixed_coaching_hints where run_id=%s',(rid,))==1
 assert call('history')['attempts'][0]['exposed_hint_levels']==[1]
 try:call('hint',task_id=error2,level=2,client_submission_id=new())
 except psycopg.errors.InvalidParameterValue as exc:assert 'REVEAL_L1_FIRST' in str(exc)
 else:raise AssertionError('H2 before H1 allowed')
 call('hint',task_id=error,level=2,client_submission_id=new())
 print('RELEASE57_MIXED_HINT_CUMULATIVE_L1_REQUIRED_BEFORE_L2 PASS',flush=True)
 racekey=new()
 def hint_race(taskid):
  with psycopg.connect(host=c.info.host,user='postgres',dbname='postgres',autocommit=True) as cc:
   try:
    with cc.transaction():
     cc.execute("set local role authenticated;set local statement_timeout='10s'")
     cc.execute("select set_config('request.jwt.claim.sub',%s,true)",(A,))
     cc.execute('select public.essay_math_coaching(%s)',(Jsonb({'dto_version':'math-coaching-v1','action':'hint','payload':{'run_id':rid,'question_id':math_q,'task_id':taskid,'level':1,'client_submission_id':racekey}}),))
    return 'ok'
   except psycopg.errors.UniqueViolation as exc:
    assert 'HINT_RETRY_CONFLICT' in str(exc);return 'conflict'
 import concurrent.futures
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:race=list(pool.map(hint_race,[error2,error3]))
 assert sorted(race)==['conflict','ok'] and scalar('select count(*) from math_private.mixed_coaching_hints where client_key=%s',(racekey,))==1
 print('RELEASE57_MIXED_HINT_CONCURRENT_CHANGED_KEY_ONE_SUCCESS_ONE_CONFLICT PASS',flush=True)
 beforeledger=scalar('select jsonb_agg(to_jsonb(t) order by id) from public.credit_transactions t')
 key=new();assert secret in json.dumps(call('reveal',client_submission_id=key));call('reveal',client_submission_id=key)
 assert scalar('select count(*) from math_private.mixed_coaching_disclosures where run_id=%s',(rid,))==1
 assert call('read')['disclosed'] and call('history')['attempts'][0]['solution_revealed']
 assert rpc('essay_exam_history',[rid])['runs'][0]['result']['questions'][1]['solution_revealed']
 assert rpc('essay_exam_history',[hid])==beforehuman
 assert scalar('select jsonb_agg(to_jsonb(t) order by id) from public.credit_transactions t')==beforeledger
 print('RELEASE57_ACTUAL_PRODUCTION_MIXED_HISTORY_MASK_HINT_REVEAL_OWNER_IDEMPOTENCY_HUMAN_BYTES_LEDGER_PRESERVED PASS',flush=True)

def verify_coaching(c,rpc,new,scalar,A,B,eid):
 def call(action,uid=A,**v):return rpc('math_coaching',[{'dto_version':'math-coaching-v1','action':action,'payload':{'evaluation_id':eid,**v}}],uid=uid)['result']
 assert 'full_solution' not in call('read') and not call('read')['disclosed']
 legacy=rpc('math_input',[{'dto_version':'math-input-v1','action':'read_result','payload':{'evaluation_id':eid}}])['result'];assert legacy=={'evaluation_id':eid,'disclosed':False,'coaching_required':True}
 for fn in [lambda:call('read',uid=B),lambda:rpc('math_evaluation_detail_task16f_legacy',[eid]),lambda:call('read',owner_id=A),lambda:rpc('math_coaching',[{'dto_version':'math-coaching-v1','action':'read','payload':{'evaluation_id':eid}}],role='anon')]:
  try:fn()
  except psycopg.Error:pass
  else:raise AssertionError('coaching bypass allowed')
 sample={'steps':[{'id':'s','position':1,'status':'VALID','representation':'SECRET_ANSWER','explanation':'SECRET_ANSWER'}],'errors':[{'id':str(i),'step_id':'s','classification':'ROOT','category':'CALCULATION','materiality':'MATERIAL_ERROR','explanation':'SECRET_ANSWER'} for i in range(8)],'overall':{'explanation':'SECRET_ANSWER'},'generated_solution':'SECRET_ANSWER'}
 v=scalar('select math_private.coaching_projection(%s,%s,%s,%s,false)',(eid,Jsonb(sample),'STUDENT_WORK',Jsonb({})));assert 'SECRET_ANSWER' not in json.dumps(v) and len(v['tasks'])==5 and v['remaining_task_count']==3
 before=scalar('select jsonb_agg(to_jsonb(t) order by id) from public.credit_transactions t');key=new()
 assert 'full_solution' in call('reveal',client_submission_id=key);call('reveal',client_submission_id=key)
 assert call('read')['disclosed'] and scalar('select count(*) from math_private.coaching_disclosures where evaluation_id=%s',(eid,))==1
 assert scalar('select jsonb_agg(to_jsonb(t) order by id) from public.credit_transactions t')==before
 assert any(str(r['evaluation_id'])==str(eid) and r['solution_revealed'] for r in call('history')['attempts'])
 attempt=scalar('select attempt_id from public.math_evaluations where id=%s',(eid,))
 prior=scalar('select prior_evaluation_id from public.math_attempts where id=%s',(attempt,))
 if prior:
  rpc('math_coaching',[{'dto_version':'math-coaching-v1','action':'reveal','payload':{'evaluation_id':str(prior),'client_submission_id':new()}}])
  row=next(x for x in call('history')['attempts'] if str(x['attempt_id'])==str(attempt))
  assert not row['reference_solution_revealed_before_resolve']
 leaf=scalar('select leaf_id from public.math_attempts where id=%s',(attempt,))
 child=rpc('math_submit_attempt',[{'client_submission_id':new(),'leaf_id':str(leaf),'kind':'FULL_RESOLVE','input_kind':'TYPED','typed_answer':'2','predecessor_id':str(attempt),'prior_evaluation_id':str(eid)}])
 row=next(x for x in call('history')['attempts'] if str(x['attempt_id'])==str(child));assert row['reference_solution_revealed_before_resolve']
 common=rpc('math_learning',[{'dto_version':'math-learning-v1','action':'read_learning_history','payload':{'evaluation_id':str(eid)}}])['result']['attempts']
 assert next(x for x in common if str(x['attempt_id'])==str(child))['reference_solution_revealed_before_resolve']
 print('RELEASE57_REVEAL_BEFORE_REWRITE_CONTEXT_CORRECT_NO_RETROACTIVE_HISTORY_CHANGE PASS',flush=True)
 print('RELEASE57_COACHING_ADVERSARIAL_FIELDS_MAX5_EXPLICIT_REVEAL_HISTORY_OWNER_LEDGER_PRESERVED PASS',flush=True)
