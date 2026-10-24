"""Disposable PG17 proof; no remote DSN, Provider or Production mutation.
Uses canonical APP fixtures without changing their files.
"""
import sys, inspect, tempfile, re, copy, concurrent.futures, json, time
from psycopg.types.json import Jsonb
from pathlib import Path
ROOT=Path(__file__).resolve().parent
APP=Path('/Users/woojinchang/development/legendstudy-service-app-20261022')
sys.path.insert(0,str(APP/'tool'))
import test_math_persistence as m
import psycopg

def cases(c,rpc,new,scalar,A,B,OP,ev,at,cl,out,p,leaf,pr,profile,sock):
 # Baseline record must remain byte-identical across local candidate installation.
 baseline=scalar('select to_jsonb(e) from public.math_evaluations e where id=%s',(ev,))
 ledger=scalar('select jsonb_agg(to_jsonb(t) order by id) from public.credit_transactions t')
 # Match the additional Production release helper grant reported by Owner.
 c.execute('grant execute on function math_private.release_billing(uuid) to postgres')
 metadata=scalar("select jsonb_agg(jsonb_build_array(pg_get_functiondef(oid),proowner,proacl::text) order by proname) from pg_proc where pronamespace='math_private'::regnamespace and proname in ('authorize_billing','settle_billing','release_billing')")
 with psycopg.connect(host=str(sock),user='supabase_admin',dbname='postgres',autocommit=True) as admin:
  m.o.execute_as_production(c,admin,(ROOT/'install.local.sql').read_text())
  m.o.execute_as_production(c,admin,(ROOT/'rollback.local.sql').read_text())
  assert metadata==scalar("select jsonb_agg(jsonb_build_array(pg_get_functiondef(oid),proowner,proacl::text) order by proname) from pg_proc where pronamespace='math_private'::regnamespace and proname in ('authorize_billing','settle_billing','release_billing')")
  m.o.execute_as_production(c,admin,(ROOT/'install.local.sql').read_text())
 print('NON_SUPERUSER_INSTALL_ROLLBACK_OWNER_ACL_PRESERVED PASS',flush=True)
 assert baseline==scalar('select to_jsonb(e) from public.math_evaluations e where id=%s',(ev,))
 assert ledger==scalar('select jsonb_agg(to_jsonb(t) order by id) from public.credit_transactions t')
 print('INSTALL_PRESERVES_EXISTING_FACTS PASS',flush=True)
 rpc('essay_admin_grant',[A,30,'admin_grant',new(),'test_account',None],uid=B,role='essay_finance')
 exam=str(scalar('select s.essay_exam_id from public.math_problem_sets s join public.math_problems p on p.problem_set_id=s.id where p.id=%s',(pr,)))
 leaves=[leaf]
 for i in range(3):
  lf=new();leaves.append(lf)
  c.execute("insert into public.math_subproblems(id,problem_id,leaf_key,display_order,statement,response_format) values(%s,%s,%s,%s,'Synthetic','SHORT_ANSWER')",(lf,pr,'q'+str(i+2),i+20))
  c.execute("insert into public.math_evaluation_profiles(id,logical_id,version,scope,leaf_id,response_format,rubric_version,required_dimensions,reasoning_required,state) values(%s,%s,1,'LEAF',%s,'SHORT_ANSWER','math-rubric-v1',array['final_conclusion'],false,'ACTIVE')",(new(),new(),lf))
 # Synthetic catalog projection only; actual Production mapping remains unchanged.
 mapping=[]
 for i,lf in enumerate(leaves):
  q=new();c.execute("insert into public.essay_questions(id,essay_exam_id,question_key,label,display_order,metadata_version,is_published) values(%s,%s,%s,'Synthetic',%s,'v1',true)",(q,exam,'session-'+str(i),i+10))
  mapping.append(dict(essay_exam_id=exam,essay_question_id=q,leaf_id=lf))
 c.execute("create function public.math_catalog(p_limit integer default 20) returns jsonb language sql as $$select '"+json.dumps(mapping)+"'::jsonb$$")
 def attempt(lf=leaf,**kwargs):
  return str(rpc('math_submit_attempt',[dict(client_submission_id=new(),leaf_id=lf,kind='INITIAL',input_kind='TYPED',typed_answer='2')|kwargs]))
 def read(r,user=A):return rpc('math_session_read',[r],uid=user)
 def charge():return scalar("select coalesce(-sum(balance_delta),0) from public.credit_transactions where transaction_type='consume'")
 def finish(e):
  claim=rpc('math_claim_evaluation',[e],role='math_evaluation_worker')
  payload=copy.deepcopy(out)
  payload['extraction_id']=str(claim['selected_extraction_id']) if claim['selected_extraction_id'] else None
  prior=scalar('select a.prior_evaluation_id from public.math_attempts a join public.math_evaluations e on e.attempt_id=a.id where e.id=%s',(e,))
  if prior:payload['progression']=dict(prior_evaluation_id=str(prior),target_step_id=None,downstream='REASSESSED',summary='Synthetic')
  rpc('math_finalize_evaluation',[e,claim['lease_token'],payload],role='math_evaluation_worker')
  rpc('math_finalize_evaluation',[e,claim['lease_token'],payload],role='math_evaluation_worker')
  return claim
 def deny(fn):
  try:fn()
  except psycopg.Error as ex:
   assert ex.sqlstate in ('22023','42501','23505','23514','P0002','PT402'),(ex.sqlstate,str(ex))
   return
  raise AssertionError('unexpected allow')
 roots=[]
 for n in [1,2,4]:
  inputs=[attempt(lf) for lf in leaves[:n]];key=new();before=charge()
  r=str(rpc('math_session_submit',[exam,key,inputs,None]))
  assert str(rpc('math_session_submit',[exam,key,list(reversed(inputs)),None]))==r
  deny(lambda:rpc('math_session_submit',[exam,key,[attempt()],None]))
  deny(lambda:read(r,B))
  roots.append(r)
  rows=read(r)['questions']
  for q in rows: finish(q['evaluation_id'])
  assert charge()==before+1 and read(r)['state']=='completed'
  assert scalar('select count(*) from public.math_billing_bindings where math_evaluation_id=any(%s::uuid[])',([q['evaluation_id'] for q in rows],))==0
  print(f'{n}_QUESTIONS_ONE_CREDIT_REPLAY_OWNERSHIP PASS',flush=True)
  if n==2:
   free=[attempt(q['leaf_id'],kind='FULL_RESOLVE',predecessor_id=q['attempt_id'],prior_evaluation_id=q['evaluation_id']) for q in rows]
   fr=str(rpc('math_session_submit',[exam,new(),free,r]));before=charge()
   for q in read(fr)['questions']:finish(q['evaluation_id'])
   assert charge()==before
   print('FROZEN_FREE_REWRITE_ZERO PASS',flush=True)
 deny(lambda:rpc('math_session_submit',[exam,new(),[],None]))
 print('EMPTY_BLOCKED PASS',flush=True)
 before=scalar('select count(*) from public.credit_transactions')
 deny(lambda:rpc('math_session_submit',[exam,new(),[attempt(leaves[1])],roots[0]]))
 c.execute("update math_private.session_runs set completed_at=clock_timestamp()-interval '337 hours' where id=%s",(roots[0],))
 parentq=read(roots[0])['questions'][0]
 rewrite=attempt(parentq['leaf_id'],kind='FULL_RESOLVE',predecessor_id=parentq['attempt_id'],prior_evaluation_id=parentq['evaluation_id'])
 deny(lambda:rpc('math_session_submit',[exam,new(),[rewrite],roots[0]]))
 assert before==scalar('select count(*) from public.credit_transactions')
 own=rpc('math_session_history',[])['runs']
 assert len(own)==4 and all(q['question_id'] for rr in own for q in rr['questions'])
 assert rpc('math_session_history',[],uid=B)['runs']==[]
 print('FROZEN_SET_EXPIRY_OWNED_HISTORY_CANONICAL_IDS PASS',flush=True)
 before=charge();ids=[attempt(x) for x in leaves[:2]];r=str(rpc('math_session_submit',[exam,new(),ids,None]));rows=read(r)['questions']
 finish(rows[0]['evaluation_id'])
 success=scalar('select to_jsonb(e) from public.math_evaluations e where id=%s',(rows[0]['evaluation_id'],))
 failed=rows[1]['evaluation_id'];claim=rpc('math_claim_evaluation',[failed],role='math_evaluation_worker')
 rpc('math_fail_evaluation',[failed,claim['lease_token'],'PROCESSING_FAILED'],role='math_evaluation_worker')
 assert charge()==before and read(r)['state']=='reserved'
 retry_key=new();retry_ids=rpc('math_session_retry',[r,retry_key]);retry=str(retry_ids[0])
 assert rpc('math_session_retry',[r,retry_key])==retry_ids
 finish(retry)
 assert charge()==before+1 and read(r)['state']=='completed'
 assert success==scalar('select to_jsonb(e) from public.math_evaluations e where id=%s',(rows[0]['evaluation_id'],))
 print('FAILED_ONLY_RETRY_SAME_DECISION_SUCCESS_PRESERVED PASS',flush=True)
 # Same request races: one run, one reserve, one set of leaf evaluations.
 ids=[attempt(x) for x in leaves[:2]];key=new()
 def concurrent_submit(_):
  with psycopg.connect(host=str(sock),user='postgres',dbname='postgres',autocommit=True) as cc:
   with cc.transaction():
    cc.execute("set local role authenticated;set local statement_timeout='10s'")
    cc.execute("select set_config('request.jwt.claim.sub',%s,true)",(A,))
    return str(cc.execute('select public.math_session_submit(%s,%s,%s::uuid[],null)',(exam,key,ids)).fetchone()[0])
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:runs=list(pool.map(concurrent_submit,range(8)))
 assert len(set(runs))==1
 rr=runs[0];dd=scalar('select decision_id from math_private.session_runs where id=%s',(rr,))
 assert scalar("select count(*) from public.credit_transactions where decision_id=%s and transaction_type='reserve'",(dd,))==1
 assert len(read(rr)['questions'])==2
 deny(lambda:rpc('math_session_retry',[rr,new()]))
 for q in read(rr)['questions']:finish(q['evaluation_id'])
 print('EIGHT_CONCURRENT_SUBMITS_ONE_RESERVE_UNKNOWN_RETRY_DENIED PASS',flush=True)
 # Image metadata/confirmation uses the existing immutable extraction contract.
 img=attempt(input_kind='EVIDENCE',typed_answer=None)
 before=scalar('select count(*) from public.credit_transactions')
 deny(lambda:rpc('math_session_submit',[exam,new(),[img],None]))
 assert before==scalar('select count(*) from public.credit_transactions')
 artifact=rpc('math_register_artifact',[img,dict(position=1,media_type='image/png',byte_size=100,width=20,height=20,orientation=0)])['artifact_id']
 # Synthetic storage receipt only. This is not live upload verification.
 c.execute("update public.math_attempt_artifacts set storage_state='PRESENT' where id=%s",(artifact,))
 ex=rpc('math_claim_extraction',[img],role='math_extraction_worker')
 raw=dict(regions=[dict(artifact_id=artifact,page=1,reading_order=1,raw_text='2',normalized_math='2',confidence=.8,uncertain=True,x=0,y=0,width=.5,height=.5)],provider='synthetic',model='mock',model_version='1')
 rpc('math_finalize_extraction',[ex['run_id'],ex['lease_token'],raw],role='math_extraction_worker')
 deny(lambda:rpc('math_session_submit',[exam,new(),[img],None]))
 region=str(scalar('select id from public.math_extraction_regions where run_id=%s',(ex['run_id'],)))
 confirmed=rpc('math_input',[dict(dto_version='math-input-v1',action='confirm_extraction',payload=dict(attempt_id=img,run_id=ex['run_id'],regions=[dict(region_id=region,raw_text='2',normalized_math='2')]))])
 assert before==scalar('select count(*) from public.credit_transactions')
 ir=str(rpc('math_session_submit',[exam,new(),[img],None]));before_charge=charge()
 for q in read(ir)['questions']:finish(q['evaluation_id'])
 assert charge()==before_charge+1
 assert scalar('select count(*) from public.math_extraction_runs where attempt_id=%s',(img,))==2
 print('IMAGE_CONFIRMATION_ZERO_ROUND_ONE_ORIGINAL_PRESERVED PASS',flush=True)
 for fn in ['math_session_submit(uuid,uuid,uuid[],uuid)','math_session_read(uuid)','math_session_retry(uuid,uuid)']:
  for role in ['anon','service_role','math_evaluation_worker']:
   assert not scalar("select has_function_privilege(%s,%s,'EXECUTE')",(role,'public.'+fn))
 for table in ['session_runs','session_members','session_evaluations','session_retries']:
  for role in ['anon','authenticated','service_role','math_evaluation_worker']:
   assert not scalar("select has_table_privilege(%s,%s,'SELECT,INSERT,UPDATE,DELETE')",(role,'math_private.'+table))
 print('PRIVATE_TABLE_AND_RPC_ROLE_BOUNDARY PASS',flush=True)
 # Existing single-leaf route still reserves/settles exactly once.
 before=charge();legacy=str(rpc('math_request_evaluation',[attempt(),new()]));finish(legacy)
 assert charge()==before+1
 print('LEGACY_ROUTE_PRESERVED PASS',flush=True)
 # Deletion of a pending session releases its reservation, never old settled history.
 pending=str(rpc('math_session_submit',[exam,new(),[attempt()],None]))
 decision=scalar('select decision_id from math_private.session_runs where id=%s',(pending,))
 c.execute('delete from math_private.session_runs where id=%s',(pending,))
 assert scalar('select status from public.essay_billing_decisions where id=%s',(decision,))=='released'
 assert scalar('select sum(reserved_delta) from public.credit_transactions where decision_id=%s',(decision,))==0
 assert baseline==scalar('select to_jsonb(e) from public.math_evaluations e where id=%s',(ev,))
 print('PENDING_SESSION_DELETE_RELEASES_LEDGER_PRESERVED PASS',flush=True)
 single=str(rpc('math_session_submit',[exam,new(),[attempt()],None]))
 sq=read(single)['questions'][0];finish(sq['evaluation_id'])
 learning=rpc('math_learning',[dict(dto_version='math-learning-v1',action='read_learning_state',payload=dict(evaluation_id=sq['evaluation_id']))])['result']
 assert learning['included_reevaluation']['eligible']
 rewrite=attempt(sq['leaf_id'],kind='FULL_RESOLVE',predecessor_id=sq['attempt_id'],prior_evaluation_id=sq['evaluation_id'])
 before=charge();rr=rpc('math_learning',[dict(dto_version='math-learning-v1',action='request_reevaluation',payload=dict(attempt_id=rewrite,client_submission_id=new()))])['result']
 finish(rr['evaluation_id']);assert charge()==before and rr['additional_credit']==0
 print('EXISTING_APP_LEARNING_ROUTE_SESSION_FREE_REWRITE PASS',flush=True)
 with psycopg.connect(host=str(sock),user='supabase_admin',dbname='postgres',autocommit=True) as admin:
  try:m.o.execute_as_production(c,admin,(ROOT/'rollback.local.sql').read_text())
  except psycopg.Error as ex:assert 'NONEMPTY_MATH_SESSION_ROLLBACK_DENIED' in str(ex)
  else:raise AssertionError('history rollback allowed')
 print('USED_INSTALL_ROLLBACK_DENIED PASS',flush=True)
 legacy_checks=m.verify_math_cases(c,rpc,new,scalar,A,B,OP,ev,at,cl,out,p,leaf,pr,profile,sock)
 print('LEGACY_MATH_REGRESSION_COUNT',len(legacy_checks),'PASS',flush=True)
 return ['local_math_session_prototype']+legacy_checks

with tempfile.TemporaryDirectory(prefix='math-session-evidence-') as tmp:
 source=inspect.getsource(m.verify)
 needle=" o.execute_as_production(c,admin,(R/'supabase/migrations/20261002000100_math_essay_persistence.sql').read_text())"
 source=source.replace(needle,needle+"\n o.execute_as_production(c,admin,(R/'supabase/migrations/20261002000200_math_runtime_surface.sql').read_text())\n o.execute_as_production(c,admin,(R/'supabase/migrations/20261002000300_math_learning_runtime.sql').read_text())")
 source=source.replace("R/'supabase/verification/math_essay/behavior_validation.json'","Path("+repr(tmp)+")/'validation.json'")
 ns=dict(m.__dict__);ns['verify_math_cases']=cases
 exec(source,ns)
 m.h.verify_hqp=ns['verify'];m.h.main(bootstrap_user='supabase_admin')
