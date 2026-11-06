"""Private three-question Sookmyung candidate against canonical Math SQL in disposable PG17.
Mock output verifies persistence/billing contracts, NOT Provider quality or publication.
"""
import inspect,json,os,sys
from pathlib import Path
APP=Path(os.environ['TASK20_APP_REPO'])
sys.path.insert(0,str(APP/'tool'))
import test_math_persistence as m
from psycopg import sql
P=Path(os.environ['TASK20_SOOKMYUNG_PRIVATE_DIR']); rows=json.loads((P/'rows.private.json').read_text())

def content_case(c,rpc,new,scalar,A,B):
 checks=[]
 def ok(name,value=True):
  assert value,name
  checks.append(name)
 # Reproduce the existing canonical binding column without changing its runtime policy.
 c.execute('alter table public.math_subproblems add column essay_question_id uuid references public.essay_questions(id)')
 university=new();c.execute("insert into public.universities(id,slug,name,is_active) values(%s,'task20c-local','TASK20C local',false)",(university,))
 exams={x['essay_exam_id'] for x in rows['math_problem_sets']}
 for e in exams:
  c.execute("insert into public.essay_exams(id,university_id,admission_year,exam_key,exam_name,exam_kind,verification_status,provenance,is_active) values(%s,%s,2026,%s,'Local official fixture','admission','review','official',false)",(e,university,e))
 for x in rows['math_subproblems']:
  ps=next(s for s in rows['math_problem_sets'] if s['id']==next(p['problem_set_id'] for p in rows['math_problems'] if p['id']==x['problem_id']))
  c.execute("insert into public.essay_questions(id,essay_exam_id,question_key,label,display_order,metadata_version,is_published) values(%s,%s,%s,%s,%s,'task20c',false)",(x['essay_question_id'],ps['essay_exam_id'],x['leaf_key'],x['leaf_key'],int(x['leaf_key'][1:])))
 before=scalar("select jsonb_agg(to_jsonb(t) order by id) from public.essay_evaluations t")
 registry=scalar("select jsonb_agg(to_jsonb(t) order by id) from public.essay_questions t")
 apply=(P/'register.private.sql').read_text();rollback=(P/'rollback.private.sql').read_text()
 c.execute(apply);c.execute(apply)
 for t in rows:ok(t+'_exact_count',scalar(sql.SQL('select count(*) from public.{}').format(sql.Identifier(t)))==len(rows[t]))
 ok('official_numeric_points_not_invented',scalar('select count(*) from public.math_scoring_criteria where official_points is not null')==0)
 ok('registry_unchanged',registry==scalar("select jsonb_agg(to_jsonb(t) order by id) from public.essay_questions t"))
 for role in ['anon','authenticated']:
  ok(role+'_no_direct_content_read',all(not scalar("select has_table_privilege(%s,%s,'SELECT')",(role,'public.'+t)) for t in rows))
 c.execute(rollback);ok('unused_candidate_rollback',all(scalar(sql.SQL('select count(*) from public.{}').format(sql.Identifier(t)))==0 for t in rows));c.execute(apply)
 for x in rows['math_subproblems']:
  try:rpc('math_submit_attempt',[dict(client_submission_id=new(),leaf_id=x['id'],kind='INITIAL',input_kind='TYPED',typed_answer='synthetic')]);raise AssertionError('DRAFT accepted')
  except m.psycopg.Error:ok('draft_denied_'+x['leaf_key']+'_'+x['id'])
 # Local-only fixtures exercise existing RPCs; no hosted wallet or provider calls.
 for table in ['math_problem_sets','math_problems','math_evaluation_profiles','math_canonical_solutions']:c.execute(sql.SQL("update public.{} set state='ACTIVE'").format(sql.Identifier(table)))
 rpc('essay_admin_grant',[A,3,'admin_grant',new(),'test_account',None],uid=B,role='essay_finance')
 for leaf in rows['math_subproblems']:
  previous=[]
  for revision in [1,2]:
   p=dict(client_submission_id=new(),leaf_id=leaf['id'],kind='INITIAL' if revision==1 else 'FULL_RESOLVE',input_kind='TYPED',typed_answer='Synthetic transport fixture, not a student solution')
   if previous:p.update(predecessor_id=previous[0][0],prior_evaluation_id=previous[0][1])
   attempt=str(rpc('math_submit_attempt',[p]));ok('attempt_replay',str(rpc('math_submit_attempt',[p]))==attempt)
   key=new();ev=str(rpc('math_request_evaluation',[attempt,key]));ok('request_replay',str(rpc('math_request_evaluation',[attempt,key]))==ev)
   claim=rpc('math_evaluation',[dict(dto_version='math-worker-v1',action='claim',payload=dict(evaluation_id=ev))],role='math_evaluation_worker')['result']
   cr=[v for v in rows['math_scoring_criteria'] if v['leaf_id']==leaf['id']]
   ctx=claim['context'];ok('claim_official_criteria',len(ctx['criteria'])==len(cr));ok('claim_official_solution',len(ctx['solutions'])==1)
   out=dict(contract_version='math-eval-v1',extraction_id=None,steps=[dict(id=new(),position=1,kind='COMPUTATION',representation='Synthetic',status='VALID',explanation='Mock only',regions=[])],edges=[],errors=[],causes=[],core=[],hints=[],references=[],paths=[],criteria=[dict(criterion_id=v['id'],verdict='satisfied',explanation='Mock contract only') for v in cr],rubric={v:'ADEQUATE' for v in ctx['profile']['required_dimensions']},overall=dict(status='ANSWER_CORRECT_AND_REASONING_SUFFICIENT',answer_status='CORRECT',coverage='ATTEMPTED',explanation='Mock only'),provenance=dict(provider='synthetic',model='mock',model_version='1',prompt_version='1'),progression=None if revision==1 else dict(prior_evaluation_id=previous[0][1],target_step_id=None,downstream='REASSESSED',summary='Mock rewrite'),generated_solution=None)
   rpc('math_finalize_evaluation',[ev,claim['lease_token'],out],role='math_evaluation_worker')
   charge=scalar('select d.credits_required from public.essay_billing_decisions d join public.math_billing_bindings b on b.billing_decision_id=d.id where b.math_evaluation_id=%s',(ev,))
   ok('initial_one_rewrite_zero',charge==(1 if revision==1 else 0));ok('history_readback',rpc('math_evaluation_detail',[ev])['output']['contract_version']=='math-eval-v1')
   try:rpc('math_evaluation_detail',[ev],uid=B);raise AssertionError('foreign allowed')
   except m.psycopg.Error:ok('foreign_denied')
   previous.append((attempt,ev))
  ok('same_lineage',scalar('select count(distinct lineage_id) from public.math_attempts where leaf_id=%s',(leaf['id'],))==1)
 try:c.execute(rollback);raise AssertionError('referenced content deleted')
 except m.psycopg.Error:
  c.execute('rollback');ok('referenced_rollback_denied')
 ok('legacy_evaluations_exact',before==scalar("select jsonb_agg(to_jsonb(t) order by id) from public.essay_evaluations t"))
 replayed=[]
 if os.environ.get('TASK20_SOOKMYUNG_REPLAY_PROVIDER')=='1':
  result_files=sorted(P.parent.glob('sookmyung-general-q*.result.json'))
  assert len(result_files)==6,'EXACT_SIX_ACTUAL_OUTPUTS_REQUIRED'
  for file in result_files:
   result=json.loads(file.read_text());inp=result['input'];out=result['physical']
   assert result['validation']['ok'], 'ACTUAL_DOMAIN_VALIDATION_FAILED'
   rpc('essay_admin_grant',[A,1,'admin_grant',new(),'test_account',None],uid=B,role='essay_finance')
   attempt=str(rpc('math_submit_attempt',[dict(client_submission_id=new(),leaf_id=inp['leafId'],kind='INITIAL',input_kind='TYPED',typed_answer=inp['canonicalPackage']['attempt']['typed_answer'])]))
   ev=str(rpc('math_request_evaluation',[attempt,new()]));claim=rpc('math_claim_evaluation',[ev],role='math_evaluation_worker')
   rpc('math_finalize_evaluation',[ev,claim['lease_token'],out],role='math_evaluation_worker')
   detail=rpc('math_evaluation_detail',[ev]);ok('actual_provider_output_readback_'+file.name,detail['output']['contract_version']=='math-eval-v1')
   ok('actual_verdict_preserved_'+file.name,detail['output']['overall']==out['overall'])
   ok('actual_criteria_preserved_'+file.name,detail['output']['criteria']==out['criteria'])
   replayed.append(dict(case=file.name,status='PASS'))
 report=dict(status='PASS',checks=len(checks),details=checks,questions=3,mock_evaluations=6,actual_provider_replays=replayed,actual_provider_calls=0,production_writes=0,scope='disposable canonical SQL only; hosted runtime/publication not verified')
 (P/'local-test-result.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))

source=inspect.getsource(m.verify).split(" print('MATH_FULL_NON_SUPERUSER_INSTALL_PASS')")[0]+"\n o.execute_as_production(c,admin,(R/'supabase/migrations/20261002000200_math_runtime_surface.sql').read_text())\n content_case(c,rpc,new,scalar,A,B)\n"
source=source.replace(' content_case(c,rpc,new,scalar,A,B)'," o.execute_as_production(c,admin,(R/'supabase/migrations/20261002000300_math_learning_runtime.sql').read_text())\n content_case(c,rpc,new,scalar,A,B)")
ns=dict(m.__dict__);ns['content_case']=content_case;exec(source,ns);m.h.verify_hqp=ns['verify'];m.h.main(bootstrap_user='supabase_admin')
