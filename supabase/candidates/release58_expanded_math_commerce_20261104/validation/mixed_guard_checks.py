"""Exact fourth migration, synthetic rows; zero Provider/network/production writes."""
from pathlib import Path
import json,copy
import psycopg
from psycopg.types.json import Jsonb
O=Path(__file__).resolve().parents[1]
def verify(c,rpc,new,scalar,A):
 f=json.loads(Path('/tmp/legendstudy-expanded-production-originals-20261104/mixed-reserve-source.private.json').read_text());contract=json.loads((O/'mixed-guard-contract.json').read_text())
 c.execute(f['definition']);c.execute('revoke all on function essay_exam_private.reserve(uuid,uuid,uuid,jsonb,uuid) from public,anon,authenticated,service_role,essay_worker;grant execute on function essay_exam_private.reserve(uuid,uuid,uuid,jsonb,uuid) to postgres')
 assert scalar("select md5(pg_get_functiondef('essay_exam_private.reserve(uuid,uuid,uuid,jsonb,uuid)'::regprocedure))")==f['hash']
 account=scalar('select id from public.credit_accounts where user_id=%s',(A,));exam=next(iter(contract['question_pins']));questions=contract['question_pins'][exam]
 def snapshot(e,ids,rev=0):return {'version':'essay-exam-unit-v1','ownerId':A,'examId':e,'answers':[{'questionId':q,'body':'Synthetic confirmed answer '+str(rev),'revision':rev,'rubricVersion':'synthetic-r1','evidenceVersion':'synthetic-e1'} for q in ids]}
 def reserve(e,snap,key=None,parent=None):
  with c.transaction():
   source=scalar('select essay_beta_private.credit_source(%s,%s)',(account,e))
   c.execute("select set_config('legendstudy.confirmed_credit_grant',%s,true)",(source.get('grant_id') or '',));c.execute("select set_config('legendstudy.credit_confirmation_required','true',true)")
   return str(scalar('select essay_exam_private.reserve(%s,%s,%s,%s,%s)',(account,e,key or new(),Jsonb(snap),parent)))
 def facts():return scalar("select jsonb_build_array((select jsonb_agg(to_jsonb(x) order by id) from public.credit_transactions x),(select jsonb_agg(to_jsonb(x) order by id) from public.essay_billing_decisions x),(select jsonb_agg(to_jsonb(x) order by id) from essay_exam_private.runs x))")
 # Historical partial run accepted by the original function is immutable and replayable.
 oldkey=new();oldpartial=snapshot(exam,questions[:1]);oldrun=reserve(exam,oldpartial,key=oldkey);before=facts()
 candidate=next((O/'migrations').glob('*_mixed_complete_question_guard.sql')).read_text()
 for marker in ['-- EXPANDED_MIXED_AFTER_GUARDS','-- EXPANDED_MIXED_AFTER_FUNCTION']:
  try:c.execute(candidate.replace(marker,marker+"\ndo $$begin raise exception 'MIXED_GUARD_ATOMICITY_PROBE';end$$;"))
  except psycopg.errors.RaiseException as ex:
   c.execute('rollback');assert 'MIXED_GUARD_ATOMICITY_PROBE' in str(ex)
  else:raise AssertionError('atomic rollback injection did not reject')
  assert facts()==before and scalar("select md5(pg_get_functiondef('essay_exam_private.reserve(uuid,uuid,uuid,jsonb,uuid)'::regprocedure))")==f['hash']
 c.execute(candidate);assert facts()==before
 assert scalar("select md5(pg_get_functiondef('essay_exam_private.reserve(uuid,uuid,uuid,jsonb,uuid)'::regprocedure))")==contract['source_post_definition_md5']
 assert reserve(exam,oldpartial,key=oldkey)==oldrun and facts()==before
 try:reserve(exam,snapshot(exam,questions),key=oldkey)
 except psycopg.errors.RaiseException as ex:assert 'IDEMPOTENCY_CONFLICT' in str(ex)
 else:raise AssertionError('changed replay accepted')
 assert facts()==before
 print('EXPANDED_MIXED_FULL_DDL_ROLLBACK_OWNER_ACL_EXISTING_PARTIAL_REPLAY_HISTORY_PRESERVED PASS',flush=True)
 for ids in [questions[:1],questions[1:],questions[:-1],[],[questions[0]]*len(questions),questions[:-1]+[new()],[None]+questions[1:]]:
  before=facts();prior_settings=scalar("select current_setting('legendstudy.confirmed_credit_grant',true)")
  try:reserve(exam,snapshot(exam,ids))
  except psycopg.Error as ex:assert ex.sqlstate in ['PT422','P0001','22023','22P02'],(ex.sqlstate,str(ex))
  else:raise AssertionError('new partial/invalid set accepted')
  assert facts()==before and scalar("select current_setting('legendstudy.confirmed_credit_grant',true)")==prior_settings
 print('EXPANDED_MIXED_PARTIAL_NULL_DUPLICATE_FOREIGN_REJECT_BEFORE_LEDGER_SETTINGS_ROLLBACK PASS',flush=True)
 full=snapshot(exam,questions);key=new();run=reserve(exam,full,key=key);before=facts();assert reserve(exam,full,key=key)==run and facts()==before
 did=scalar('select decision_id from essay_exam_private.runs where id=%s',(run,));assert scalar("select count(*) from public.credit_transactions where decision_id=%s and transaction_type='reserve'",(did,))==1
 # Finalizer is outside this guard change. Mark synthetic parent complete; no Provider claim.
 c.execute("update essay_exam_private.runs set state='completed',result='{}',completed_at=clock_timestamp() where id=%s",(run,))
 free=reserve(exam,snapshot(exam,questions,1),parent=run);fd=scalar('select decision_id from essay_exam_private.runs where id=%s',(free,))
 assert scalar('select credits_required from public.essay_billing_decisions where id=%s',(fd,))==0 and scalar('select count(*) from public.credit_transactions where decision_id=%s',(fd,))==0
 before=facts()
 try:reserve(exam,snapshot(exam,questions,2),parent=run)
 except psycopg.errors.RaiseException as ex:assert 'REEVALUATION_ALREADY_USED' in str(ex)
 else:raise AssertionError('second included revision allowed')
 assert facts()==before
 print('EXPANDED_MIXED_FULL_SET_ONE_RESERVATION_FREE_REWRITE_ONCE PASS',flush=True)
 # Reconstruct one actual existing humanities exam's IDs/policy, no source content.
 h=next(x for x in json.loads(Path('/tmp/legendstudy-release58-expanded-sql/production-beta-scope-snapshot.json').read_text())['scope'] if x['runtime_policy']['evaluation_type']=='humanities' and len(x['question_ids'])>1)
 other=h['exam_id'];otherq=h['question_ids'][0];univ=scalar('select id from public.universities limit 1')
 c.execute("insert into public.essay_exams(id,university_id,admission_year,exam_key,exam_name,exam_kind,provenance,verification_status,verified_at,official_source_url,evidence_note,is_active) values(%s,%s,2026,%s,'Synthetic preserved humanities','admission','official','verified',now(),'https://example.edu/synthetic','Synthetic only',true)",(other,univ,'human-'+other))
 for i,q in enumerate(h['question_ids']):c.execute("insert into public.essay_questions(id,essay_exam_id,question_key,label,display_order,metadata_version,is_published) values(%s,%s,%s,'Synthetic humanities',%s,'v1',true)",(q,other,'human-'+q,i))
 assert scalar("select essay_exam_private.runtime_policy(%s)->>'evaluation_type'",(other,))=='humanities'
 assert reserve(other,snapshot(other,[otherq]))
 print('EXPANDED_EXISTING_HUMANITIES_POLICY_SELECTED_QUESTION_BEHAVIOR_PRESERVED PASS',flush=True)
 # A post-install Registry question addition cannot bypass the complete approved set.
 class DriftRollback(Exception):pass
 before=facts()
 try:
  with c.transaction():
   c.execute("insert into public.essay_questions(id,essay_exam_id,question_key,label,display_order,metadata_version,is_published) values(%s,%s,'drift-after-activation','Synthetic drift',99,'v1',true)",(new(),exam))
   try:reserve(exam,full)
   except psycopg.Error as ex:
    assert ex.sqlstate=='PT409' and 'MIXED_RELEASE_SCOPE_CHANGED' in str(ex);raise DriftRollback()
   raise AssertionError('post-install Registry question drift was admitted')
 except DriftRollback:pass
 assert facts()==before
 print('EXPANDED_MIXED_RUNTIME_REGISTRY_DRIFT_REJECTED_NO_LEDGER_CHANGE PASS',flush=True)
 # Existing partial parent cannot start a NEW partial free cycle under the new whole-exam policy.
 c.execute("update essay_exam_private.runs set state='completed',result='{}',completed_at=clock_timestamp() where id=%s",(oldrun,));before=facts()
 try:reserve(exam,snapshot(exam,questions[:1],1),parent=oldrun)
 except psycopg.Error as ex:assert ex.sqlstate=='PT422' and 'MIXED_COMPLETE_ANSWERS_REQUIRED' in str(ex)
 else:raise AssertionError('new partial grandfather rewrite accepted')
 assert facts()==before
 for role in ['authenticated','anon','service_role','essay_worker']:assert not scalar("select has_function_privilege(%s,'essay_exam_private.reserve(uuid,uuid,uuid,jsonb,uuid)','EXECUTE')",(role,))
 print('EXPANDED_MIXED_NEW_LEGACY_PARTIAL_REWRITE_REJECTED_PRIVATE_ACL_PRESERVED PASS',flush=True)
 actual=scalar("select jsonb_build_object('schema','essay_exam_private','name','reserve','args',pg_get_function_identity_arguments(oid),'definition_md5',md5(pg_get_functiondef(oid)),'owner',pg_get_userbyid(proowner),'acl',proacl::text,'config',proconfig,'security_definer',prosecdef) from pg_proc where oid='essay_exam_private.reserve(uuid,uuid,uuid,jsonb,uuid)'::regprocedure")
 (O/'expected-mixed-guard-postflight.json').write_text(json.dumps(actual,indent=2))
