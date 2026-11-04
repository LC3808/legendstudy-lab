CREATE OR REPLACE FUNCTION essay_beta_private.eligible(p_grant uuid, p_exam uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select exists(
  select 1 from essay_beta_private.daily_grants d
  join essay_beta_private.campaigns c on c.id=d.campaign_id
  join essay_beta_private.exam_scope s on s.campaign_id=c.id and s.exam_id=p_exam
  join public.credit_grants g on g.id=d.grant_id
  where d.grant_id=p_grant and c.enabled
  and (essay_private.clock() at time zone 'Asia/Seoul')::date between c.starts_on and c.ends_on
  and d.grant_day=(essay_private.clock() at time zone 'Asia/Seoul')::date
  and g.expires_at>essay_private.clock()
  and s.runtime_policy=essay_exam_private.runtime_policy(p_exam)
  and (select array_agg(q.id order by q.id) from public.essay_questions q where q.essay_exam_id=p_exam)
      =(select array_agg(q order by q) from unnest(s.question_ids) q)
  and ((not s.has_math and s.runtime_policy->>'evaluation_type'='humanities') or (p_exam=any(array['1131e065-951f-5aba-bbc4-85c15fb9f0b0'::uuid,'1862463a-bf97-580a-ad33-694375db5d50'::uuid,'19f4c1e7-a82a-53ad-9aa2-7c72594518f1'::uuid,'1a51f7f2-76c3-5d2f-a6f2-8020d00ff637'::uuid,'1f382418-b4b8-5562-82ec-0c2e5f3cfaef'::uuid,'2919c142-21d7-539d-952a-5382d16dbdf7'::uuid,'33af3caf-afc5-5243-b110-4ba4d6a6651a'::uuid,'3566b3a0-10a3-56ab-a7dc-5b9638706164'::uuid,'3dc612e2-15e0-51cc-9906-40a387f128a5'::uuid,'3e1a421d-0c40-5120-88ed-b1646f50e0fd'::uuid,'3e2526ee-14af-5c47-a5fc-76b70cc5bf8c'::uuid,'42c8d5be-6cdb-5528-8808-174d9785b9d4'::uuid,'45f76789-e20e-596f-9760-3850644d21a9'::uuid,'53bdd6f5-78be-548f-ac1b-23081f9bf74c'::uuid,'54d99cb2-f04e-598a-b5e9-9222d0b97bba'::uuid,'56a6be43-48eb-5aaa-a0ce-f646faaabe23'::uuid,'5a42333d-9def-5438-9baa-f46201f97fae'::uuid,'5ff20127-f5b6-5d4c-a6fd-f54c97a87130'::uuid,'6536445f-75b2-5f84-894a-f33382e8ea91'::uuid,'68996278-1e19-5560-ac94-cf43656bf684'::uuid,'70b0ddd5-0816-5395-8ac5-6a4e3664a282'::uuid,'7a00b094-234c-5376-b339-326a41abdeb9'::uuid,'7b2ba890-bb8d-5c00-b665-b926cdd5008f'::uuid,'7e232cd6-cbad-547f-bb34-2eb6cebb65f7'::uuid,'81b81d92-0a1a-54af-b4dd-2702222bc1f3'::uuid,'8931ed55-1c11-538a-b324-9765a60d3a75'::uuid,'8c5dc701-9b26-5935-9610-7b27256eb767'::uuid,'b4e457a5-0ce6-5973-bade-f4f43ecfa604'::uuid,'b59d5983-e977-52be-89cf-385d6ecc0403'::uuid,'c2f698b5-c617-57da-bc44-ee21b9df25e6'::uuid,'c3bb88cd-6a1d-54d0-bc84-4a4707202868'::uuid,'c5870bbe-a74f-5e7f-8767-8502166c56b4'::uuid,'c722ffa2-0ff4-5718-9748-186111a7c560'::uuid,'d4f1b0c4-98ef-5b28-999b-b369bb81d3ae'::uuid,'df220173-b0ef-5cd2-8a92-12a958fd669e'::uuid,'e5f1d7de-f69b-5d7b-85e6-8ded440ee94d'::uuid,'e8ea5bb3-0956-5fd6-b90e-4b7fb350b2f9'::uuid,'e9e7daf3-854c-57d3-a6dd-cc18fca0d8ea'::uuid,'ef5ca7d9-3a56-5068-933e-f7a2859ef438'::uuid,'f45667e4-bbd0-5372-b044-e5e9d3983521'::uuid,'f88663fb-a0d4-52ed-bead-ea11f2c2970e'::uuid,'fd82164c-936c-56b2-ab96-b576f0c3be40'::uuid]) and s.has_math=(p_exam=any(array['1131e065-951f-5aba-bbc4-85c15fb9f0b0'::uuid,'19f4c1e7-a82a-53ad-9aa2-7c72594518f1'::uuid,'1a51f7f2-76c3-5d2f-a6f2-8020d00ff637'::uuid,'1f382418-b4b8-5562-82ec-0c2e5f3cfaef'::uuid,'2919c142-21d7-539d-952a-5382d16dbdf7'::uuid,'33af3caf-afc5-5243-b110-4ba4d6a6651a'::uuid,'3566b3a0-10a3-56ab-a7dc-5b9638706164'::uuid,'3dc612e2-15e0-51cc-9906-40a387f128a5'::uuid,'3e1a421d-0c40-5120-88ed-b1646f50e0fd'::uuid,'3e2526ee-14af-5c47-a5fc-76b70cc5bf8c'::uuid,'42c8d5be-6cdb-5528-8808-174d9785b9d4'::uuid,'45f76789-e20e-596f-9760-3850644d21a9'::uuid,'53bdd6f5-78be-548f-ac1b-23081f9bf74c'::uuid,'54d99cb2-f04e-598a-b5e9-9222d0b97bba'::uuid,'56a6be43-48eb-5aaa-a0ce-f646faaabe23'::uuid,'5a42333d-9def-5438-9baa-f46201f97fae'::uuid,'5ff20127-f5b6-5d4c-a6fd-f54c97a87130'::uuid,'6536445f-75b2-5f84-894a-f33382e8ea91'::uuid,'68996278-1e19-5560-ac94-cf43656bf684'::uuid,'70b0ddd5-0816-5395-8ac5-6a4e3664a282'::uuid,'7a00b094-234c-5376-b339-326a41abdeb9'::uuid,'7b2ba890-bb8d-5c00-b665-b926cdd5008f'::uuid,'7e232cd6-cbad-547f-bb34-2eb6cebb65f7'::uuid,'81b81d92-0a1a-54af-b4dd-2702222bc1f3'::uuid,'8931ed55-1c11-538a-b324-9765a60d3a75'::uuid,'8c5dc701-9b26-5935-9610-7b27256eb767'::uuid,'b4e457a5-0ce6-5973-bade-f4f43ecfa604'::uuid,'b59d5983-e977-52be-89cf-385d6ecc0403'::uuid,'c2f698b5-c617-57da-bc44-ee21b9df25e6'::uuid,'c3bb88cd-6a1d-54d0-bc84-4a4707202868'::uuid,'c5870bbe-a74f-5e7f-8767-8502166c56b4'::uuid,'c722ffa2-0ff4-5718-9748-186111a7c560'::uuid,'d4f1b0c4-98ef-5b28-999b-b369bb81d3ae'::uuid,'df220173-b0ef-5cd2-8a92-12a958fd669e'::uuid,'e5f1d7de-f69b-5d7b-85e6-8ded440ee94d'::uuid,'e8ea5bb3-0956-5fd6-b90e-4b7fb350b2f9'::uuid,'e9e7daf3-854c-57d3-a6dd-cc18fca0d8ea'::uuid,'ef5ca7d9-3a56-5068-933e-f7a2859ef438'::uuid,'f45667e4-bbd0-5372-b044-e5e9d3983521'::uuid,'f88663fb-a0d4-52ed-bead-ea11f2c2970e'::uuid,'fd82164c-936c-56b2-ab96-b576f0c3be40'::uuid])) and s.runtime_policy->>'evaluation_type'='business' and s.owner_math_qa_reference is not null))
 )
$function$
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
 catalog=math_private.release_catalog(p_exam);
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
  if not exists(select 1 from jsonb_array_elements(math_private.release_catalog(p_exam)) q where q->>'essay_exam_id'=p_exam::text) then raise invalid_parameter_value using message='QUESTION_NOT_RELEASED';end if;
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
