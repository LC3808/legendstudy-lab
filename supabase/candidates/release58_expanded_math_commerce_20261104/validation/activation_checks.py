"""Synthetic 72-leaf expanded behavior fixtures; no Provider/network/real student data.
Scope/package guards are separately supported by Production read-only 213-package validation; no quality PASS inference.
"""
from pathlib import Path
import json,hashlib,uuid,concurrent.futures
import psycopg
from psycopg.types.json import Jsonb
O=Path(__file__).resolve().parents[1]

def verify(c,rpc,new,scalar,A,B,finish):
 contract=json.loads((O/'beta-contract.json').read_text());fs=json.load(open('/tmp/legendstudy-release57-production-activation-functions.json'))
 univ=scalar('select id from public.universities limit 1');question_map={}
 exams=list(contract['exams'])+[{'examId':'25dc068b-4672-56e1-b8df-08ee8800e2f6','questionIds':['cea40cf3-dc05-507a-a6eb-fd5e1e1847bb'],'mathQuestions':{'cea40cf3-dc05-507a-a6eb-fd5e1e1847bb':'3bab07d3-c047-53c2-89ad-9fa20ec7b3f3'},'legacy':True}]
 for exam in exams:
  c.execute("insert into public.essay_exams(id,university_id,admission_year,exam_key,exam_name,exam_kind,provenance,verification_status,verified_at,official_source_url,evidence_note,is_active) values(%s,%s,2026,%s,'Synthetic release scope only','admission','official','verified',now(),'https://example.edu/synthetic','No actual Provider or source evidence test',true)",(exam['examId'],univ,'release57-'+exam['examId']))
  setid=new();problem=new()
  c.execute("insert into public.math_problem_sets(id,essay_exam_id,logical_id,version,label,state) values(%s,%s,%s,1,'Synthetic release scope only','ACTIVE')",(setid,exam['examId'],new()))
  c.execute("insert into public.math_problems(id,problem_set_id,logical_id,version,display_order,statement,state) values(%s,%s,%s,1,1,'Synthetic question','ACTIVE')",(problem,setid,new()))
  for i,q in enumerate(exam['questionIds']):
   c.execute("insert into public.essay_questions(id,essay_exam_id,question_key,label,display_order,metadata_version,is_published) values(%s,%s,%s,'Synthetic question',%s,'v1',true)",(q,exam['examId'],'release57-'+q,i))
  for i,(q,leaf) in enumerate(exam['mathQuestions'].items()):
   c.execute("insert into public.math_subproblems(id,problem_id,leaf_key,display_order,statement,response_format,essay_question_id) values(%s,%s,%s,%s,'Synthetic','SHORT_ANSWER',%s)",(leaf,problem,'release57-'+q,i,None if exam.get('legacy') else q))
   c.execute("insert into public.math_evaluation_profiles(id,logical_id,version,scope,leaf_id,response_format,rubric_version,required_dimensions,reasoning_required,state) values(%s,%s,1,'LEAF',%s,'SHORT_ANSWER','math-rubric-v1',array['final_conclusion'],false,'ACTIVE')",(new(),new(),leaf))
   question_map[leaf]=(exam['examId'],q)
 # Execute the exact whole-question-set guard predicate; Registry drift must fail closed.
 question_guard=(O/'full-question-guard-fragment.sql').read_text()
 guard_sql="do $probe$ declare e jsonb;begin for e in select value from jsonb_array_elements($pins$"+json.dumps(contract['exams'])+"$pins$::jsonb) loop\n"+question_guard+"end loop;end $probe$;"
 c.execute(guard_sql)
 class GuardRollback(Exception):pass
 try:
  with c.transaction():
   c.execute("insert into public.essay_questions(id,essay_exam_id,question_key,label,display_order,metadata_version,is_published) values(%s,%s,'unapproved-new-question','Synthetic drift',99,'v1',true)",(new(),contract['exams'][0]['examId']))
   try:c.execute(guard_sql)
   except psycopg.errors.RaiseException as ex:
    assert 'EXPANDED_COMPLETE_QUESTION_SET_DRIFT' in str(ex)
    raise GuardRollback()
   raise AssertionError('new Registry question admitted with stale complete-exam pin')
 except GuardRollback:pass
 c.execute(guard_sql)
 print('EXPANDED_EXACT_FULL_QUESTION_GUARD_NEW_REGISTRY_QUESTION_FAIL_CLOSED PASS',flush=True)
 # Exact new executable bodies; migration's source/review/digest guards remain separately reported.
 for f in fs:
  if f['proname']=='math_catalog':
   c.execute(f['definition']);c.execute('revoke all on function public.math_catalog(integer) from public,anon,authenticated,service_role');c.execute('grant execute on function public.math_catalog(integer) to authenticated')
 before=scalar("select jsonb_agg(jsonb_build_array(proowner,proacl::text,proconfig) order by proname) from pg_proc where oid in('public.math_catalog(integer)'::regprocedure,'math_private.evaluation_admission()'::regprocedure)")
 c.execute((O/'scope-function-bodies.sql').read_text())
 after=scalar("select jsonb_agg(jsonb_build_array(proowner,proacl::text,proconfig) order by proname) from pg_proc where oid in('public.math_catalog(integer)'::regprocedure,'math_private.evaluation_admission()'::regprocedure)");assert before==after
 catalog=rpc('math_catalog',[50]);assert len(catalog)==72 and {x['leaf_id'] for x in catalog}==set(question_map)
 assert all((x['essay_exam_id'],x['essay_question_id'])==question_map[x['leaf_id']] for x in catalog)
 assert len(rpc('math_catalog',[20]))==20
 assert len(rpc('math_catalog',[1]))==1 and len(rpc('math_catalog',[49]))==49
 assert len(rpc('math_catalog',[51]))==51 and len(rpc('math_catalog',[512]))==72
 tail=catalog[-1];assert tail['leaf_id'] not in {x['leaf_id'] for x in rpc('math_catalog',[49])}
 for role in ['authenticated','anon','service_role']:
  assert not scalar("select has_function_privilege(%s,'math_private.release_catalog(uuid)','EXECUTE')",(role,))
 print('EXPANDED_CATALOG_72_APP58_COMPLETE_SMALLER_LIMITS_PRESERVED_PRIVATE_HELPER_DENIED PASS',flush=True)
 for lim in [None,0,513]:
  try:rpc('math_catalog',[lim])
  except psycopg.errors.InvalidParameterValue:pass
  else:raise AssertionError('catalog bad limit allowed')
 c.execute('create table if not exists math_private.runtime_control(singleton boolean primary key,evaluations_enabled boolean not null);insert into math_private.runtime_control values(true,true) on conflict(singleton) do update set evaluations_enabled=true')
 c.execute('create temp table release57_admission_probe(leaf_id uuid,attempt_id uuid);create trigger probe before insert on release57_admission_probe for each row execute function math_private.evaluation_admission()')
 exam=contract['exams'][0]['examId'];leaf=list(contract['exams'][0]['mathQuestions'].values())[0]
 def attempt(predecessor=None,prior=None):return str(rpc('math_submit_attempt',[{'client_submission_id':new(),'leaf_id':leaf,'kind':'FULL_RESOLVE' if predecessor else 'INITIAL','input_kind':'TYPED','typed_answer':'2','predecessor_id':predecessor,'prior_evaluation_id':prior}]))
 a=attempt()
 with c.transaction():
  c.execute("select set_config('request.jwt.claim.sub',%s,true)",(A,));c.execute('insert into release57_admission_probe values(%s,%s)',(leaf,a))
 for badleaf,baduser,enabled in [(new(),A,True),(leaf,B,True),(leaf,A,False)]:
  c.execute('update math_private.runtime_control set evaluations_enabled=%s where singleton',(enabled,))
  try:
   with c.transaction():
    c.execute("select set_config('request.jwt.claim.sub',%s,true)",(baduser,));c.execute('insert into release57_admission_probe values(%s,%s)',(badleaf,a))
  except psycopg.Error as ex:assert ex.sqlstate=='55000'
  else:raise AssertionError('admission invalid request allowed')
 c.execute('update math_private.runtime_control set evaluations_enabled=true where singleton')
 print('EXPANDED_SCOPE_72_CANONICAL_LEGACY_MAPPING_OWNER_RUNTIME_HOLD_GATES PASS',flush=True)
 # Reuse exact Production beta selector and eligible functions; synthetic campaign/grants only.
 c.execute('drop view essay_beta_private.daily_grants')
 c.execute('create table essay_beta_private.campaigns(id uuid primary key,starts_on date,ends_on date,enabled boolean,daily_limit integer,policy_version text);create table essay_beta_private.daily_grants(user_id uuid,grant_day date,campaign_id uuid,grant_id uuid primary key,revision_cutoff timestamptz);create table essay_beta_private.exam_scope(campaign_id uuid,exam_id uuid,runtime_policy jsonb,question_ids uuid[],has_math boolean,owner_math_qa_reference text,approval_reference text);create table if not exists public.payment_orders(grant_id uuid,state text)')
 policy=next(x['definition'] for x in json.load(open('/tmp/legendstudy-release57-production-preflight-defs.json')) if x['proname']=='runtime_policy');c.execute(policy)
 beta=json.load(open('/tmp/legendstudy-release57-production-beta-connection-functions.json'))
 for f in beta:
  if f['name'] in ['eligible','credit_source']:
   c.execute(f['definition'])
   signature='essay_beta_private.'+f['name']+'(uuid,uuid)'
   c.execute('revoke all on function '+signature+' from public,anon,authenticated,service_role')
   c.execute('grant execute on function '+signature+' to postgres')
   assert scalar('select proacl::text from pg_proc where oid=%s::regprocedure',(signature,))==f['acl']
 campaign='cfc56a2b-8fbd-4c2a-a200-e55b509ad972';c.execute("insert into essay_beta_private.campaigns values(%s,'2026-11-01','2026-11-10',true,1,'daily-v2')",(campaign,))
 for e in contract['exams']:c.execute('insert into essay_beta_private.exam_scope values(%s,%s,%s,%s,%s,%s,%s)',(campaign,e['examId'],Jsonb(e['runtimePolicy']),e['questionIds'],bool(e['mathQuestions']),'Synthetic proof only','Owner scope'))
 c.execute((O/'beta-function-bodies.sql').read_text())
 account=scalar('select id from public.credit_accounts where user_id=%s',(A,))
 beforeledger=scalar('select jsonb_agg(to_jsonb(t) order by id) from public.credit_transactions t')
 paidquote=rpc('math_session_quote_source',[exam,None]);paidgrant=paidquote['credit_source']['grant_id'];assert paidquote['credits_required']==1 and paidgrant
 assert scalar('select jsonb_agg(to_jsonb(t) order by id) from public.credit_transactions t')==beforeledger
 # Existing finance RPC seeds a synthetic usable grant, then mark as current-day beta in fixture only.
 rpc('essay_admin_grant',[A,1,'admin_grant',new(),'test_account',scalar("select ((essay_private.clock() at time zone 'Asia/Seoul')::date+1)::timestamp at time zone 'Asia/Seoul'")],uid=B,role='essay_finance')
 bg=scalar("select id from public.credit_grants where account_id=%s order by created_at desc,id desc limit 1",(account,))
 c.execute("insert into essay_beta_private.daily_grants values(%s,(essay_private.clock() at time zone 'Asia/Seoul')::date,%s,%s,'2026-11-11 00:00:00+09')",(A,campaign,bg))
 quote=rpc('math_session_quote_source',[exam,None]);assert quote['credit_source']['source']=='beta' and quote['credit_source']['grant_id']==str(bg)
 assert scalar('select essay_beta_private.eligible(%s,%s)',(bg,'1862463a-bf97-580a-ad33-694375db5d50'))
 assert not scalar('select essay_beta_private.eligible(%s,%s)',(bg,'a6667288-75ad-50d4-b237-d2a08e2bff8b'))
 print('EXPANDED_BUSINESS_ESSAY_NO_MATH_ELIGIBLE_PARTIAL_EXAM_EXCLUDED PASS',flush=True)
 beforeledger=scalar('select jsonb_agg(to_jsonb(t) order by id) from public.credit_transactions t')
 try:rpc('math_session_continue_source',[exam,new(),[a],None,1,paidgrant])
 except psycopg.errors.InvalidParameterValue as ex:assert 'CHARGE_SOURCE_CHANGED' in str(ex)
 else:raise AssertionError('stale paid quote silently charged')
 assert scalar('select jsonb_agg(to_jsonb(t) order by id) from public.credit_transactions t')==beforeledger
 key=new();run=str(rpc('math_session_continue_source',[exam,key,[a],None,1,str(bg)]));rows=rpc('math_session_read',[run])['questions']
 assert str(rpc('math_session_continue_source',[exam,key,[a],None,1,str(bg)]))==run
 finish(rows[0]['evaluation_id']);assert scalar("select count(*) from public.credit_transactions where grant_id=%s and transaction_type='consume'",(bg,))==1
 assert rpc('math_session_quote_source',[exam,None])['credit_source']['grant_id']!=str(bg)
 # Unknown-response retry keeps original source even after beta was consumed.
 assert str(rpc('math_session_continue_source',[exam,key,[a],None,1,str(bg)]))==run
 assert str(rpc('math_session_continue_source',[exam,key,[a],None,1,None]))==run
 try:rpc('math_session_continue_source',[exam,new(),[a],None,1,None])
 except psycopg.errors.InvalidParameterValue as ex:assert 'EXPECTED_CREDIT_SOURCE_REQUIRED' in str(ex)
 else:raise AssertionError('legacy missing source created new charge')
 print('RELEASE57_LEGACY_MISSING_GRANT_EXISTING_REPLAY_ONLY_NO_NEW_CHARGE PASS',flush=True)
 freequote=rpc('math_session_quote_source',[exam,run]);assert freequote['credits_required']==0 and freequote['credit_source']['grant_id'] is None and freequote['credit_source']['source']=='included'
 ar=rows[0];child=attempt(ar['attempt_id'],ar['evaluation_id']);fr=str(rpc('math_session_continue_source',[exam,new(),[child],run,0,None]));finish(rpc('math_session_read',[fr])['questions'][0]['evaluation_id'])
 assert rpc('math_session_read',[fr])['credits_required']==0
 nextquote=rpc('math_session_quote_source',[exam,fr]);assert nextquote['credits_required']==1 and nextquote['credit_source']['grant_id']!=str(bg)
 # Once beta is spent, an earlier beta quote cannot silently spend a paid grant on a fresh request.
 extra=attempt();beforeledger=scalar('select jsonb_agg(to_jsonb(t) order by id) from public.credit_transactions t')
 try:rpc('math_session_continue_source',[exam,new(),[extra],None,1,str(bg)])
 except psycopg.errors.InvalidParameterValue as ex:assert 'CHARGE_SOURCE_CHANGED' in str(ex)
 else:raise AssertionError('silent paid fallback allowed')
 assert scalar('select jsonb_agg(to_jsonb(t) order by id) from public.credit_transactions t')==beforeledger
 for fn,args in [('math_session_quote_source',[exam,None]),('math_session_continue_source',[exam,new(),[extra],None,1,paidgrant])]:
  try:rpc(fn,args,role='anon')
  except psycopg.errors.InsufficientPrivilege:pass
  else:raise AssertionError('anon beta source allowed')
 # Same daily grant cannot move to an unapproved Math exam or an old grant day.
 assert not scalar('select essay_beta_private.eligible(%s,%s)',(bg,new()))
 c.execute("update essay_beta_private.daily_grants set grant_day=grant_day-1 where grant_id=%s",(bg,));assert not scalar('select essay_beta_private.eligible(%s,%s)',(bg,exam))
 c.execute("update essay_beta_private.daily_grants set grant_day=grant_day+1 where grant_id=%s",(bg,))
 # Check immutable campaign cutoff was not altered by any connector.
 assert scalar("select ends_on='2026-11-10'::date and daily_limit=1 and policy_version='daily-v2' from essay_beta_private.campaigns where id=%s",(campaign,))
 print('RELEASE57_BETA_EXISTING_SOURCE_PRIORITIZED_STALE_SOURCE_DENIED_RETRY_ONE_CHARGE_FREE_ONCE_NEXT_PAID_SCOPE_DAY_BOUNDARY PASS',flush=True)
 # Concurrent identical source-confirmed paid requests must reserve exactly once.
 concurrent_attempt=attempt();concurrent_key=new();concurrent_grant=rpc('math_session_quote_source',[exam,None])['credit_source']['grant_id']
 def same_source_request(_):
  with psycopg.connect(host=c.info.host,user='postgres',dbname='postgres',autocommit=True) as cc:
   with cc.transaction():
    cc.execute("set local role authenticated;set local statement_timeout='10s'")
    cc.execute("select set_config('request.jwt.claim.sub',%s,true)",(A,))
    return str(cc.execute('select public.math_session_continue_source(%s,%s,%s::uuid[],null,1,%s)',(exam,concurrent_key,[concurrent_attempt],concurrent_grant)).fetchone()[0])
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:concurrent_runs=list(pool.map(same_source_request,range(8)))
 assert len(set(concurrent_runs))==1
 decision=scalar('select decision_id from math_private.session_runs where id=%s',(concurrent_runs[0],))
 assert scalar("select count(*) from public.credit_transactions where decision_id=%s and transaction_type='reserve'",(decision,))==1
 finish(rpc('math_session_read',[concurrent_runs[0]])['questions'][0]['evaluation_id'])
 assert scalar("select count(*) from public.credit_transactions where decision_id=%s and transaction_type='consume'",(decision,))==1
 print('RELEASE57_SOURCE_CONFIRMED_EIGHT_CONCURRENT_RETRIES_ONE_RESERVE_ONE_CONSUME PASS',flush=True)


 rows=c.execute("select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),pg_get_userbyid(p.proowner),p.proacl::text,p.proconfig,md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in('math_catalog','math_session_submit','math_session_quote_source','math_session_continue_source')) or (n.nspname='math_private' and p.proname in('evaluation_admission','release_catalog')) or (n.nspname='essay_beta_private' and p.proname='eligible') order by 1,2").fetchall()
 (O/'expected-activation-postflight.json').write_text(json.dumps([dict(zip(['schema','name','args','owner','acl','config','definition_md5'],r)) for r in rows],indent=2))

 # Catalog's presentation pagination must not authorize or reject server submissions.
 catalog_def=scalar("select pg_get_functiondef('public.math_catalog(integer)'::regprocedure)")
 c.execute("create or replace function public.math_catalog(p_limit integer default 20) returns jsonb language plpgsql security definer set search_path='' as $$begin return '[]'::jsonb;end$$")
 original_exam,original_leaf=exam,leaf
 exam,leaf=tail['essay_exam_id'],tail['leaf_id']
 try:
  tailquote=rpc('math_session_quote_source',[exam,None]);assert tailquote['credits_required']==1
  tailattempt=attempt();tailrun=str(rpc('math_session_continue_source',[exam,new(),[tailattempt],None,1,tailquote['credit_source']['grant_id']]))
  tailrow=rpc('math_session_read',[tailrun])['questions'][0];assert tailrow['question_id']==tail['essay_question_id']
  finish(tailrow['evaluation_id'])
  assert rpc('math_session_read',[tailrun])['state']=='completed'
 finally:
  c.execute(catalog_def);exam,leaf=original_exam,original_leaf
 print('EXPANDED_LAST_CATALOG_ITEM_QUOTE_SUBMIT_COMPLETE_INDEPENDENT_OF_UI_LIMIT PASS',flush=True)
 # Unchanged isolated TEST upgrade proof belongs to the original package and was already PASS.
 # This expanded package does not apply TEST-specific source patches.

 # Narrow mixed-only full-set reserve guard, exact migration transaction.
 from mixed_guard_checks import verify as mixed_guard_verify
 mixed_guard_verify(c,rpc,new,scalar,A)
