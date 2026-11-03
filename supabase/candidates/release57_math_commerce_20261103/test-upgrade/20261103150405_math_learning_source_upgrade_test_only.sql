-- TEST ONLY: LegendStudy isolated existing TEST upgrade; never apply to Production.
-- Exact TEST hashes below prevent applying this to the Production baseline.
-- No seed/campaign/scope/credit issuance, no evaluation, no existing attempt/history update.
begin;
set local lock_timeout='5s';set local statement_timeout='120s';
select pg_advisory_xact_lock(hashtextextended('legendstudy-release57-test-source-upgrade',71660));
create temporary table release57_test_original_functions on commit drop as
select p.oid,p.proowner,p.proacl,p.proconfig,p.prosecdef from pg_proc p where false;
create temporary table release57_test_original_memberships on commit drop as select * from pg_auth_members;
do $guard$ declare e jsonb; a record; begin
 if current_user<>'postgres' or (select rolsuper or not rolbypassrls from pg_roles where rolname=current_user) then raise exception 'RELEASE57_TEST_ROLE_DRIFT';end if;
 for e in select value from jsonb_array_elements($test_snapshot$[{"schema": "public", "name": "math_catalog", "args": "p_limit integer", "owner": "postgres", "acl": "{postgres=X/postgres,authenticated=X/postgres}", "proconfig": ["search_path=\"\""], "hash": "afd580a4d43f1a2c2adfc3429b1541e8"}, {"schema": "public", "name": "math_session_quote", "args": "p_previous uuid", "owner": "postgres", "acl": "{postgres=X/postgres,authenticated=X/postgres}", "proconfig": ["search_path=\"\""], "hash": "d727dd4594da7bfc25fe691451c24392"}, {"schema": "public", "name": "math_session_continue", "args": "p_exam uuid, p_key uuid, p_attempts uuid[], p_previous uuid, p_expected_credits integer", "owner": "postgres", "acl": "{postgres=X/postgres,authenticated=X/postgres}", "proconfig": ["search_path=\"\""], "hash": "ce9af25b11352749414e592131455725"}, {"schema": "public", "name": "essay_math_coaching", "args": "p_request jsonb", "owner": "postgres", "acl": "{postgres=X/postgres,authenticated=X/postgres}", "proconfig": ["search_path=\"\""], "hash": "6c29322b0a79904f6670809916af8991"}, {"schema": "public", "name": "math_session_submit", "args": "p_exam uuid, p_key uuid, p_attempts uuid[], p_parent uuid", "owner": "postgres", "acl": "{postgres=X/postgres,authenticated=X/postgres}", "proconfig": ["search_path=\"\""], "hash": "03456f71b861151cfe523c06a075d8ca"}, {"schema": "public", "name": "math_learning", "args": "p_request jsonb", "owner": "postgres", "acl": "{postgres=X/postgres,authenticated=X/postgres,math_executor=X/postgres}", "proconfig": ["search_path=\"\""], "hash": "981dc3a9f6fa492af7fc505e55861f4f"}, {"schema": "math_private", "name": "cycle_deadline", "args": "p_decision uuid, p_completed timestamp with time zone", "owner": "postgres", "acl": "{postgres=X/postgres,essay_executor=X/postgres}", "proconfig": ["search_path=\"\""], "hash": "b05a9414315fb9b2d4ace69f9141c420"}, {"schema": "essay_beta_private", "name": "credit_source", "args": "p_account uuid, p_exam uuid", "owner": "postgres", "acl": "{postgres=X/postgres}", "proconfig": ["search_path=\"\""], "hash": "09fc9d66ee9286fac0f6bfed03046d3b"}, {"schema": "essay_beta_private", "name": "eligible", "args": "p_grant uuid, p_exam uuid", "owner": "postgres", "acl": "{postgres=X/postgres}", "proconfig": ["search_path=\"\""], "hash": "59584f530755641423a469c15080afcd"}]$test_snapshot$::jsonb) loop
 select p.oid,md5(pg_get_functiondef(p.oid)) hash,pg_get_userbyid(p.proowner) owner,p.proacl::text acl,to_jsonb(p.proconfig) config into a from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=e->>'schema' and p.proname=e->>'name' and pg_get_function_identity_arguments(p.oid)=e->>'args';
 if not found or a.hash is distinct from e->>'hash' or a.owner is distinct from e->>'owner' or a.acl is distinct from e->>'acl' or a.config is distinct from e->'proconfig' then raise exception 'RELEASE57_TEST_SOURCE_DRIFT: %',e->>'name';end if;
 insert into release57_test_original_functions select p.oid,p.proowner,p.proacl,p.proconfig,p.prosecdef from pg_proc p where p.oid=a.oid;
 end loop;
 if not exists(select 1 from pg_auth_members where roleid='math_executor'::regrole and member='postgres'::regrole and grantor='supabase_admin'::regrole and admin_option and not inherit_option and not set_option)
 or (select count(*) from pg_auth_members where roleid='math_executor'::regrole and member='postgres'::regrole)<>1 then raise exception 'RELEASE57_TEST_MEMBERSHIP_DRIFT';end if;
 if not exists(select 1 from pg_class where oid='math_private.coaching_disclosures'::regclass and relowner='math_executor'::regrole and relacl::text='{math_executor=arwdDxtm/math_executor}' and relrowsecurity and not relforcerowsecurity) then raise exception 'RELEASE57_TEST_TABLE_DRIFT';end if;
 if not exists(select 1 from pg_attribute where attrelid='essay_beta_private.daily_grants'::regclass and attname='revision_cutoff' and atttypid='timestamptz'::regtype and not attisdropped) then raise exception 'RELEASE57_TEST_CUTOFF_MISSING';end if;
 if exists(select 1 from essay_beta_private.campaigns) or exists(select 1 from essay_beta_private.exam_scope) then raise exception 'RELEASE57_TEST_CAMPAIGN_BASELINE_DRIFT';end if;
 if to_regprocedure('public.math_session_quote_source(uuid,uuid)') is not null or to_regprocedure('public.math_session_continue_source(uuid,uuid,uuid[],uuid,integer,uuid)') is not null then raise exception 'RELEASE57_TEST_NEW_RPC_COLLISION';end if;
end $guard$;
-- TEST_UPGRADE_AFTER_GUARDS
-- Temporary role bridge grants only postgres read access for common disclosure History projection.
grant math_executor to postgres with admin false,inherit false,set true granted by postgres;
set role math_executor;
grant select on math_private.coaching_disclosures to postgres;
reset role;
revoke math_executor from postgres granted by postgres;
CREATE OR REPLACE FUNCTION public.essay_math_coaching(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v jsonb=p_request->'payload'; action text=p_request->>'action'; r jsonb; q jsonb; key uuid; old math_private.mixed_coaching_disclosures; answer jsonb; task jsonb; old_hint math_private.mixed_coaching_hints; history_row jsonb; attempts jsonb;
begin
 if p_request->>'dto_version' is distinct from 'math-coaching-v1' or p_request-array['dto_version','action','payload']<>'{}' or jsonb_typeof(v) is distinct from 'object' or action not in ('read','reveal','hint','history') or action is null then raise invalid_parameter_value;end if;
 if v-(case when action='hint' then array['run_id','question_id','client_submission_id','task_id','level'] when action='reveal' then array['run_id','question_id','client_submission_id'] else array['run_id','question_id'] end)<>'{}' then raise invalid_parameter_value;end if;
 -- The existing History function enforces owner and account lifecycle before any access.
 r=public.essay_exam_history_before_task16g((v->>'run_id')::uuid)->'runs'->0;
 if r is null or r->>'state'<>'completed' then raise insufficient_privilege;end if;
 select value into q from jsonb_array_elements(r->'result'->'questions') where value->>'questionId'=v->>'question_id' and value->'evaluation'->>'contract_version'='math-eval-v1';
 if q is null then raise insufficient_privilege;end if;
 if action='reveal' then
  key=(v->>'client_submission_id')::uuid;if key is null then raise invalid_parameter_value;end if;
  perform pg_advisory_xact_lock(hashtextextended(r->>'id',717));
  select * into old from math_private.mixed_coaching_disclosures where client_key=key;
  if found and (old.run_id<>(r->>'id')::uuid or old.question_id<>(q->>'questionId')::uuid) then raise unique_violation using message='DISCLOSURE_RETRY_CONFLICT';end if;
  insert into math_private.mixed_coaching_disclosures(run_id,question_id,student_id,client_key) values((r->>'id')::uuid,(q->>'questionId')::uuid,auth.uid(),key) on conflict(run_id,question_id) do nothing;
 end if;
 answer=math_private.mixed_coaching_projection(r,q,exists(select 1 from math_private.mixed_coaching_disclosures where run_id=(r->>'id')::uuid and question_id=(q->>'questionId')::uuid and student_id=auth.uid()));
 if action='hint' then
  key=(v->>'client_submission_id')::uuid;
  if key is null or v->>'level' is null or (v->>'level')::integer not in (1,2) then raise invalid_parameter_value;end if;
  select value into task from jsonb_array_elements(answer->'tasks') where value->>'id'=v->>'task_id';
  if task is null then raise invalid_parameter_value using message='HINT_UNAVAILABLE';end if;
  perform pg_advisory_xact_lock(hashtextextended(key::text,718));
  select * into old_hint from math_private.mixed_coaching_hints where client_key=key;
  if found and (old_hint.run_id<>(r->>'id')::uuid or old_hint.question_id<>(q->>'questionId')::uuid or old_hint.task_id<>(v->>'task_id')::uuid or old_hint.level<>(v->>'level')::integer) then raise unique_violation using message='HINT_RETRY_CONFLICT';end if;
  if (v->>'level')::integer=2 and not exists(select 1 from math_private.mixed_coaching_hints where run_id=(r->>'id')::uuid and question_id=(q->>'questionId')::uuid and task_id=(v->>'task_id')::uuid and level=1 and student_id=auth.uid()) then raise invalid_parameter_value using message='REVEAL_L1_FIRST';end if;
  insert into math_private.mixed_coaching_hints values((r->>'id')::uuid,(q->>'questionId')::uuid,(v->>'task_id')::uuid,(v->>'level')::integer,auth.uid(),key,clock_timestamp()) on conflict(run_id,question_id,task_id,level) do nothing;
  answer=jsonb_build_object('level',(v->>'level')::integer,'body',case when v->>'level'='1' then '사용한 정의·정리의 적용 조건을 원래 문제의 조건과 대조하세요.' else task->>'direction' end);
 elsif action='history' then
  -- Reuse the existing bounded owner History, filtered to this exam/question.
  -- No raw evaluation prose or answer bodies enter this projection.
  attempts='[]';
  for history_row in select value from jsonb_array_elements(public.essay_exam_history_before_task16g(null)->'runs') loop
   if history_row->>'exam_id'=r->>'exam_id' and (history_row->'question_ids') ? (q->>'questionId') then
    attempts=attempts||jsonb_build_array(jsonb_build_object(
     'run_id',history_row->'id','evaluation_state',history_row->'state',
     'resolve_kind',case when history_row->>'parent_id' is null then 'INITIAL' else 'FULL_RESOLVE' end,
     'completed_at',history_row->'completed_at',
     'solution_revealed',exists(select 1 from math_private.mixed_coaching_disclosures where run_id=(history_row->>'id')::uuid and question_id=(q->>'questionId')::uuid and student_id=auth.uid()),
     'exposed_hint_levels',(select coalesce(jsonb_agg(distinct level),'[]') from math_private.mixed_coaching_hints where run_id=(history_row->>'id')::uuid and question_id=(q->>'questionId')::uuid and student_id=auth.uid())));
   end if;
  end loop;
  answer=jsonb_build_object('attempts',attempts);
 end if;
 return jsonb_build_object('dto_version','math-coaching-v1','action',action,'result',answer);
end$function$

;
CREATE OR REPLACE FUNCTION public.math_learning(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare answer jsonb; data jsonb; rows jsonb; item jsonb;
begin
 answer=public.math_learning_task16f_legacy(p_request);data=answer->'result';
 if p_request->>'action'='read_learning_state' then
  rows='[]';for item in select value from jsonb_array_elements(data->'core') loop
   rows=rows||jsonb_build_array(jsonb_build_object('core_id',item->'core_id','position',item->'position','error_id',item->'error_id','step_id',item->'step_id','title','풀이 단계 확인','diagnosis','조건과 계산을 대조하세요.','why','사용한 개념의 조건을 확인하세요.','next_action','직접 풀이를 수정하세요.'));
  end loop;data=(data-'reevaluation_delta')||jsonb_build_object('core',rows,'reevaluation_delta',null);
 elsif p_request->>'action'='read_learning_history' then
  rows='[]';for item in select value from jsonb_array_elements(data->'attempts') loop rows=rows||jsonb_build_array((item-'reevaluation_delta')||jsonb_build_object('solution_revealed',coalesce((item->>'solution_revealed')::boolean,false) or exists(select 1 from math_private.coaching_disclosures where evaluation_id=(item->>'evaluation_id')::uuid and student_id=auth.uid()),'reference_solution_revealed_before_resolve',coalesce((item->>'reference_solution_revealed_before_resolve')::boolean,false) or exists(select 1 from math_private.coaching_disclosures where evaluation_id=(item->>'prior_evaluation_id')::uuid and student_id=auth.uid() and delivered_at<=(item->>'created_at')::timestamptz)));end loop;
  data=jsonb_set(data,'{attempts}',rows);
 end if;
 return jsonb_set(answer,'{result}',data);
end$function$

;
CREATE OR REPLACE FUNCTION math_private.cycle_deadline(p_decision uuid, p_completed timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare expiry timestamptz;
begin
 -- Beta revision cutoff, not its daily spending expiry, limits the 14-day revision window.
 select min(bg.revision_cutoff) into expiry from public.credit_transactions t join public.credit_grants g on g.id=t.grant_id join essay_beta_private.daily_grants bg on bg.grant_id=g.id
 where t.decision_id=p_decision and t.transaction_type='consume' and essay_beta_private.is_beta(g.id);
 return least(p_completed+interval '336 hours',expiry);
end$function$

;
CREATE OR REPLACE FUNCTION public.math_session_submit(p_exam uuid, p_key uuid, p_attempts uuid[], p_parent uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid=auth.uid(); account uuid; r math_private.session_runs; parent math_private.session_runs;
 a public.math_attempts; ids uuid[]; leaves uuid[]; parent_leaves uuid[]; selected_grant uuid;
 rid uuid=gen_random_uuid(); did uuid=gen_random_uuid(); aid uuid; evaluation uuid; catalog jsonb;
begin
 perform math_private.require_active(array[u]);
 select id into account from public.credit_accounts where user_id=u for update;
 if account is null then raise insufficient_privilege;end if;
 if p_key is null or p_exam is null or coalesce(cardinality(p_attempts),0) not between 1 and 100 or array_position(p_attempts,null) is not null then raise invalid_parameter_value;end if;
 select array_agg(v order by v) into ids from unnest(p_attempts) v;
 if cardinality(ids)<>(select count(distinct v) from unnest(ids) v) then raise invalid_parameter_value;end if;
 select * into r from math_private.session_runs where student_id=u and request_key=p_key;
 if found then
  if r.exam_id<>p_exam or r.attempt_ids<>ids or r.parent_id is distinct from p_parent then raise unique_violation using message='SESSION_REPLAY_CONFLICT';end if;
  return r.id;
 end if;
 catalog=public.math_catalog(50);
 foreach aid in array ids loop
  select * into a from public.math_attempts where id=aid and student_id=u for update;
  if a.id is null or exists(select 1 from public.math_evaluations where attempt_id=aid) or exists(select 1 from math_private.session_members where attempt_id=aid) then raise invalid_parameter_value using message='SESSION_INPUT_UNAVAILABLE';end if;
  if (select count(*) from jsonb_array_elements(catalog) x where x->>'leaf_id'=a.leaf_id::text and x->>'essay_exam_id'=p_exam::text and exists(select 1 from public.essay_questions q where q.id=(x->>'essay_question_id')::uuid and q.essay_exam_id=p_exam))<>1 then raise invalid_parameter_value using message='QUESTION_NOT_RELEASED';end if;
  if not exists(select 1 from public.math_subproblems l join public.math_problems p on p.id=l.problem_id join public.math_problem_sets s on s.id=p.problem_set_id where l.id=a.leaf_id and s.essay_exam_id=p_exam and p.state='ACTIVE' and s.state='ACTIVE') then raise invalid_parameter_value using message='QUESTION_NOT_IN_EXAM';end if;
 end loop;
 select array_agg(leaf_id order by leaf_id) into leaves from public.math_attempts where id=any(ids);
 if cardinality(leaves)<>(select count(distinct v) from unnest(leaves) v) then raise invalid_parameter_value;end if;
 if p_parent is not null then
  select * into parent from math_private.session_runs where id=p_parent and student_id=u for update;
  if parent.id is null or parent.exam_id<>p_exam or parent.parent_id is not null or parent.state<>'completed' or clock_timestamp()>=math_private.cycle_deadline(parent.decision_id,parent.completed_at)
    or exists(select 1 from math_private.session_runs where parent_id=parent.id)
    or exists(select 1 from public.credit_transactions where decision_id=parent.decision_id and transaction_type='refund') then raise invalid_parameter_value using message='REEVALUATION_NOT_INCLUDED';end if;
  select array_agg(leaf_id order by leaf_id) into parent_leaves from math_private.session_members where run_id=parent.id;
  if leaves<>parent_leaves then raise invalid_parameter_value using message='FROZEN_QUESTION_SET';end if;
  if exists(select 1 from public.math_attempts child where child.id=any(ids) and not exists(
    select 1 from math_private.session_members pm join math_private.session_evaluations x on x.attempt_id=pm.attempt_id join public.math_evaluations pe on pe.id=x.evaluation_id
    where pm.run_id=parent.id and pm.leaf_id=child.leaf_id and child.predecessor_id=pm.attempt_id and child.prior_evaluation_id=pe.id and pe.state='COMPLETED')) then raise invalid_parameter_value using message='INVALID_REWRITE_SOURCE';end if;
 else
  selected_grant=(essay_beta_private.credit_source(account,p_exam)->>'grant_id')::uuid;
  if selected_grant is not null then perform 1 from public.credit_grants where id=selected_grant and account_id=account for update;end if;
  if selected_grant is null then raise sqlstate 'PT402' using message='INSUFFICIENT_CREDIT';end if;
 end if;
 insert into public.essay_billing_decisions(id,account_id,idempotency_key,policy_key,policy_version,reason,credits_required,status,included_by_decision_id)
 values(did,account,rid,'essay-exam-cycle','math-session-v1',case when p_parent is null then 'paid_cycle' else 'included_revision' end,case when p_parent is null then 1 else 0 end,'authorized',parent.decision_id);
 insert into math_private.session_runs(id,student_id,account_id,exam_id,request_key,parent_id,decision_id,attempt_ids) values(rid,u,account,p_exam,p_key,p_parent,did,ids);
 if selected_grant is not null then
  insert into public.credit_transactions(account_id,grant_id,decision_id,transaction_type,balance_delta,reserved_delta,idempotency_key,reason_code)
  values(account,selected_grant,did,'reserve',0,1,'math-session:'||rid||':reserve','essay_exam_initial');
  update public.essay_billing_decisions set status='reserved',reserved_at=clock_timestamp() where id=did;
 end if;
 insert into math_private.session_members select rid,ar.id,ar.leaf_id,(x->>'essay_question_id')::uuid from public.math_attempts ar join jsonb_array_elements(catalog) x on x->>'leaf_id'=ar.leaf_id::text where ar.id=any(ids);
 foreach aid in array ids loop
  -- Existing readiness, extraction confirmation, pins, admission and ownership checks.
  evaluation=public.math_request_evaluation(aid,gen_random_uuid());
 end loop;
 return rid;
end$function$
;
create function public.math_session_quote_source(p_exam uuid,p_previous uuid default null) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare account uuid; quote jsonb; source jsonb;
begin
 perform math_private.require_active(array[auth.uid()]);
 if p_exam is null then raise invalid_parameter_value;end if;
 select id into account from public.credit_accounts where user_id=auth.uid() for update;
 if account is null then raise insufficient_privilege;end if;
 if p_previous is null then
  if not exists(select 1 from jsonb_array_elements(public.math_catalog(50)) q where q->>'essay_exam_id'=p_exam::text) then raise invalid_parameter_value using message='QUESTION_NOT_RELEASED';end if;
  quote=jsonb_build_object('version','math-session-quote-v1','exam_id',p_exam,'previous_run_id',null,'credits_required',1,'submission_index',1);
 else
  quote=public.math_session_quote(p_previous);
  if quote->>'exam_id' is distinct from p_exam::text then raise insufficient_privilege;end if;
 end if;
 source=essay_beta_private.credit_source(account,p_exam);
 if (quote->>'credits_required')::integer=0 then source=source||jsonb_build_object('grant_id',null,'source','included');
 elsif source->>'grant_id' is null then raise sqlstate 'PT402' using message='INSUFFICIENT_CREDIT';end if;
 return quote||jsonb_build_object('credit_source',source);
end$$;
revoke all on function public.math_session_quote_source(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.math_session_quote_source(uuid,uuid) to authenticated;

create function public.math_session_continue_source(p_exam uuid,p_key uuid,p_attempts uuid[],p_previous uuid,p_expected_credits integer,p_expected_grant uuid) returns uuid
language plpgsql volatile security definer set search_path='' as $$
declare account uuid; existing uuid; source jsonb; run uuid; actual uuid; grant_count integer;
begin
 perform math_private.require_active(array[auth.uid()]);
 if p_expected_credits is null or p_expected_credits not in(0,1) or p_key is null or p_exam is null
  or (p_expected_credits=0 and p_expected_grant is not null) then raise invalid_parameter_value using message='EXPECTED_CREDIT_SOURCE_REQUIRED';end if;
 select id into account from public.credit_accounts where user_id=auth.uid() for update;
 if account is null then raise insufficient_privilege;end if;
 select id into existing from math_private.session_runs where student_id=auth.uid() and request_key=p_key;
 if existing is null and p_expected_credits=1 then
  if p_expected_grant is null then raise invalid_parameter_value using message='EXPECTED_CREDIT_SOURCE_REQUIRED';end if;
  source=essay_beta_private.credit_source(account,p_exam);
  if source->>'grant_id' is distinct from p_expected_grant::text then raise invalid_parameter_value using message='CHARGE_SOURCE_CHANGED';end if;
 end if;
 run=public.math_session_continue(p_exam,p_key,p_attempts,p_previous,p_expected_credits);
 select count(distinct t.grant_id),(array_agg(distinct t.grant_id))[1] into grant_count,actual from math_private.session_runs r
 join public.credit_transactions t on t.decision_id=r.decision_id and t.transaction_type='reserve' where r.id=run;
 if (p_expected_credits=1 and (grant_count<>1 or (p_expected_grant is not null and actual is distinct from p_expected_grant))) or (p_expected_credits=0 and grant_count<>0) then
  raise invalid_parameter_value using message='CHARGE_SOURCE_CHANGED';end if;
 return run;
end$$;
revoke all on function public.math_session_continue_source(uuid,uuid,uuid[],uuid,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.math_session_continue_source(uuid,uuid,uuid[],uuid,integer,uuid) to authenticated;

-- TEST_UPGRADE_AFTER_FUNCTIONS
do $post$ declare f text; begin
 if exists(select 1 from release57_test_original_functions b join pg_proc p using(oid) where p.proowner<>b.proowner or p.proacl is distinct from b.proacl or p.proconfig is distinct from b.proconfig or p.prosecdef<>b.prosecdef) then raise exception 'RELEASE57_TEST_OWNER_ACL_SECURITY_DRIFT';end if;
 if exists((select * from pg_auth_members except select * from release57_test_original_memberships) union all(select * from release57_test_original_memberships except select * from pg_auth_members)) then raise exception 'RELEASE57_TEST_MEMBERSHIP_RESIDUE';end if;
 if not exists(select 1 from pg_class where oid='math_private.coaching_disclosures'::regclass and relowner='math_executor'::regrole and relacl::text='{math_executor=arwdDxtm/math_executor,postgres=r/math_executor}' and relrowsecurity and not relforcerowsecurity) then raise exception 'RELEASE57_TEST_HISTORY_TABLE_ACL_DRIFT';end if;
 foreach f in array array['public.math_session_quote_source(uuid,uuid)','public.math_session_continue_source(uuid,uuid,uuid[],uuid,integer,uuid)'] loop
 if not has_function_privilege('authenticated',f,'EXECUTE') or has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('service_role',f,'EXECUTE') then raise exception 'RELEASE57_TEST_NEW_RPC_ACL_DRIFT';end if;
 end loop;
end $post$;
notify pgrst,'reload schema';
commit;
