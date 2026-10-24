-- LOCAL CANDIDATE ONLY. Not an Owner installation package.
-- One financial decision per round; existing leaf results/bindings are untouched.
create table math_private.session_runs (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.profiles(id) on delete cascade,
 account_id uuid not null references public.credit_accounts(id),
 exam_id uuid not null references public.essay_exams(id),
 request_key uuid not null,
 parent_id uuid references math_private.session_runs(id) on delete cascade,
 decision_id uuid not null unique references public.essay_billing_decisions(id),
 attempt_ids uuid[] not null,
 state text not null default 'reserved' check(state in ('reserved','completed','cancelled')),
 created_at timestamptz not null default clock_timestamp(), completed_at timestamptz,
 unique(student_id,request_key)
);
create table math_private.session_members (
 run_id uuid not null references math_private.session_runs(id) on delete cascade,
 attempt_id uuid primary key references public.math_attempts(id) on delete cascade,
 leaf_id uuid not null references public.math_subproblems(id),
 question_id uuid not null references public.essay_questions(id),
 unique(run_id,leaf_id)
);
create table math_private.session_evaluations (
 evaluation_id uuid primary key references public.math_evaluations(id) on delete cascade,
 attempt_id uuid not null references math_private.session_members(attempt_id) on delete cascade,
 generation integer not null check(generation>=0),
 unique(attempt_id,generation)
);
create table math_private.session_retries (
 run_id uuid not null references math_private.session_runs(id) on delete cascade,
 request_key uuid not null, evaluation_ids uuid[] not null,
 primary key(run_id,request_key)
);
alter table math_private.session_runs enable row level security;
alter table math_private.session_members enable row level security;
alter table math_private.session_evaluations enable row level security;
alter table math_private.session_retries enable row level security;
revoke all on math_private.session_runs,math_private.session_members,math_private.session_evaluations,math_private.session_retries from public,anon,authenticated,service_role,math_executor,essay_executor,math_evaluation_worker;

-- Called ONLY by the existing three financial helpers. No client-controlled GUC bypass.
-- NULL means a legacy evaluation, which follows the exact existing helper body.
create function math_private.session_finance(p_eval uuid,p_action text) returns uuid
language plpgsql security definer set search_path='' as $fn$
declare e public.math_evaluations; m math_private.session_members; r math_private.session_runs;
 d public.essay_billing_decisions; t public.credit_transactions; generation integer;
begin
 select * into e from public.math_evaluations where id=p_eval;
 select * into m from math_private.session_members where attempt_id=e.attempt_id;
 if m.run_id is null then return null;end if;
 select * into r from math_private.session_runs where id=m.run_id;
 if p_action<>'release' then perform math_private.require_active(array[r.student_id]);end if;
 perform 1 from public.credit_accounts where id=r.account_id and user_id=r.student_id for update;
 if not found then raise insufficient_privilege;end if;
 select * into r from math_private.session_runs where id=r.id for update;
 select * into e from public.math_evaluations where id=p_eval for update;
 select * into d from public.essay_billing_decisions where id=r.decision_id and account_id=r.account_id for update;
 if d.id is null or exists(select 1 from public.credit_transactions where decision_id=d.id and transaction_type='refund') then raise invalid_parameter_value;end if;
 if p_action='authorize' then
  if r.state<>'reserved' or d.status not in ('authorized','reserved') or e.state<>'REQUESTED' then raise invalid_parameter_value;end if;
  select coalesce(max(x.generation)+1,0) into generation from math_private.session_evaluations x where attempt_id=e.attempt_id;
  if generation>0 and exists(select 1 from math_private.session_evaluations x join public.math_evaluations old on old.id=x.evaluation_id where x.attempt_id=e.attempt_id and old.state<>'FAILED') then raise invalid_parameter_value;end if;
  insert into math_private.session_evaluations values(e.id,e.attempt_id,generation);
 elsif p_action='settle' then
  if not exists(select 1 from math_private.session_evaluations where evaluation_id=e.id) or e.state<>'PROCESSING' or r.state<>'reserved' then raise invalid_parameter_value;end if;
  -- This call is inside canonical finalize: all graph validation already passed.
  -- The current result and one round settlement commit in the same transaction.
  if not exists(select 1 from math_private.session_members sm left join lateral (
    select ev.id,ev.state from math_private.session_evaluations x join public.math_evaluations ev on ev.id=x.evaluation_id
    where x.attempt_id=sm.attempt_id order by x.generation desc limit 1
   ) latest on true where sm.run_id=r.id and (latest.id is null or latest.id<>e.id and latest.state<>'COMPLETED')) then
   if d.credits_required>0 then
    if d.status<>'reserved' or (select coalesce(sum(reserved_delta),0) from public.credit_transactions where decision_id=d.id)<>1 then raise check_violation;end if;
    for t in select * from public.credit_transactions where decision_id=d.id and transaction_type='reserve' loop
     insert into public.credit_transactions(account_id,grant_id,decision_id,transaction_type,balance_delta,reserved_delta,idempotency_key,reason_code)
     values(r.account_id,t.grant_id,d.id,'consume',-t.reserved_delta,-t.reserved_delta,'math-session:'||r.id||':consume','essay_exam_finalization');
    end loop;
   end if;
   update public.essay_billing_decisions set status='settled',settled_at=clock_timestamp() where id=d.id;
   update math_private.session_runs set state='completed',completed_at=clock_timestamp() where id=r.id;
  end if;
 elsif p_action='release' then
  if not account_private.allowed(r.student_id) then
   perform math_private.session_release(r.id);return r.decision_id;
  end if;
  if not exists(select 1 from math_private.session_evaluations where evaluation_id=e.id) or e.state not in ('PROCESSING','FAILED') or r.state<>'reserved' then raise invalid_parameter_value;end if;
  -- Canonical failure is retained; the round reserve remains for explicit failed-only retry.
 else raise invalid_parameter_value;
 end if;
 return r.decision_id;
end$fn$;
revoke all on function math_private.session_finance(uuid,text) from public,anon,authenticated,service_role;
grant execute on function math_private.session_finance(uuid,text) to essay_executor;

create function public.math_session_submit(p_exam uuid,p_key uuid,p_attempts uuid[],p_parent uuid default null) returns uuid
language plpgsql security definer set search_path='' as $fn$
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
  if parent.id is null or parent.exam_id<>p_exam or parent.parent_id is not null or parent.state<>'completed' or clock_timestamp()>=parent.completed_at+interval '336 hours'
    or exists(select 1 from math_private.session_runs where parent_id=parent.id)
    or exists(select 1 from public.credit_transactions where decision_id=parent.decision_id and transaction_type='refund') then raise invalid_parameter_value using message='REEVALUATION_NOT_INCLUDED';end if;
  select array_agg(leaf_id order by leaf_id) into parent_leaves from math_private.session_members where run_id=parent.id;
  if leaves<>parent_leaves then raise invalid_parameter_value using message='FROZEN_QUESTION_SET';end if;
  if exists(select 1 from public.math_attempts child where child.id=any(ids) and not exists(
    select 1 from math_private.session_members pm join math_private.session_evaluations x on x.attempt_id=pm.attempt_id join public.math_evaluations pe on pe.id=x.evaluation_id
    where pm.run_id=parent.id and pm.leaf_id=child.leaf_id and child.predecessor_id=pm.attempt_id and child.prior_evaluation_id=pe.id and pe.state='COMPLETED')) then raise invalid_parameter_value using message='INVALID_REWRITE_SOURCE';end if;
 else
  select g.id into selected_grant from public.credit_grants g where g.account_id=account and (g.expires_at is null or g.expires_at>clock_timestamp()) and
   (select coalesce(sum(balance_delta-reserved_delta),0) from public.credit_transactions where grant_id=g.id)>=1 order by g.expires_at nulls last,g.created_at,g.id limit 1 for update;
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
end$fn$;
revoke all on function public.math_session_submit(uuid,uuid,uuid[],uuid) from public,anon,authenticated,service_role;
grant execute on function public.math_session_submit(uuid,uuid,uuid[],uuid) to authenticated;

create function public.math_session_read(p_run uuid) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare r math_private.session_runs; rows jsonb;
begin
 perform math_private.require_active(array[auth.uid()]);
 select * into r from math_private.session_runs where id=p_run and student_id=auth.uid();
 if not found then raise insufficient_privilege;end if;
 select jsonb_agg(jsonb_build_object('attempt_id',m.attempt_id,'leaf_id',m.leaf_id,'question_id',m.question_id,'evaluation_id',latest.id,'state',latest.state) order by m.leaf_id) into rows
 from math_private.session_members m left join lateral (select e.id,e.state from math_private.session_evaluations x join public.math_evaluations e on e.id=x.evaluation_id where x.attempt_id=m.attempt_id order by x.generation desc limit 1) latest on true where m.run_id=r.id;
 return jsonb_build_object('version','math-session-v1','free_rewrite_available',r.state='completed' and r.parent_id is null and clock_timestamp()<r.completed_at+interval '336 hours' and not exists(select 1 from math_private.session_runs where parent_id=r.id) and not exists(select 1 from public.credit_transactions where decision_id=r.decision_id and transaction_type='refund'),'created_at',r.created_at,'completed_at',r.completed_at,'run_id',r.id,'exam_id',r.exam_id,'parent_id',r.parent_id,'state',r.state,'questions',rows);
end$fn$;
revoke all on function public.math_session_read(uuid) from public,anon,authenticated,service_role;
grant execute on function public.math_session_read(uuid) to authenticated;

create function public.math_session_retry(p_run uuid,p_key uuid) returns uuid[]
language plpgsql security definer set search_path='' as $fn$
declare r math_private.session_runs; prior math_private.session_retries; item record; ids uuid[]='{}'; eid uuid;
begin
 perform math_private.require_active(array[auth.uid()]);
 select * into r from math_private.session_runs where id=p_run and student_id=auth.uid();
 if r.id is null or p_key is null then raise insufficient_privilege;end if;
 perform 1 from public.credit_accounts where id=r.account_id for update;
 select * into r from math_private.session_runs where id=p_run for update;
 select * into prior from math_private.session_retries where run_id=p_run and request_key=p_key;
 if found then return prior.evaluation_ids;end if;
 if r.state<>'reserved' then raise invalid_parameter_value;end if;
 for item in select m.attempt_id,latest.state from math_private.session_members m left join lateral (
   select e.state from math_private.session_evaluations x join public.math_evaluations e on e.id=x.evaluation_id where x.attempt_id=m.attempt_id order by x.generation desc limit 1
  ) latest on true where m.run_id=p_run order by m.attempt_id loop
  if item.state is null or item.state not in ('COMPLETED','FAILED') then raise invalid_parameter_value using message='RECONCILIATION_REQUIRED';end if;
  if item.state='FAILED' then
   eid=public.math_request_evaluation(item.attempt_id,gen_random_uuid());ids=array_append(ids,eid);
  end if;
 end loop;
 if cardinality(ids)=0 then raise invalid_parameter_value using message='NO_FAILED_QUESTIONS';end if;
 insert into math_private.session_retries values(p_run,p_key,ids);
 return ids;
end$fn$;
revoke all on function public.math_session_retry(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.math_session_retry(uuid,uuid) to authenticated;


-- Erasure cancellation uses the same account/decision locks and preserves ledger facts.
create function math_private.session_release(p_run uuid,p_deleting boolean default false) returns void language plpgsql security definer set search_path='' as $fn$
declare r math_private.session_runs; d public.essay_billing_decisions; t public.credit_transactions;
begin
 select * into r from math_private.session_runs where id=p_run;
 perform 1 from public.credit_accounts where id=r.account_id for update;
 select * into r from math_private.session_runs where id=p_run for update;
 select * into d from public.essay_billing_decisions where id=r.decision_id for update;
 if d.status not in ('authorized','reserved') then return;end if;
 for t in select * from public.credit_transactions where decision_id=d.id and transaction_type='reserve' loop
  insert into public.credit_transactions(account_id,grant_id,decision_id,transaction_type,balance_delta,reserved_delta,idempotency_key,reason_code)
  values(r.account_id,t.grant_id,d.id,'release',0,-t.reserved_delta,'math-session:'||r.id||':release','account_erasure');
 end loop;
 update public.essay_billing_decisions set status='released',released_at=clock_timestamp() where id=d.id;
 if not p_deleting then update math_private.session_runs set state='cancelled' where id=r.id;end if;
end$fn$;
revoke all on function math_private.session_release(uuid,boolean) from public,anon,authenticated,service_role;
create function math_private.session_before_delete() returns trigger language plpgsql security definer set search_path='' as $fn$
begin perform math_private.session_release(old.id,true);return old;end$fn$;
revoke all on function math_private.session_before_delete() from public,anon,authenticated,service_role;
create trigger math_session_erasure before delete on math_private.session_runs for each row execute function math_private.session_before_delete();

create function public.math_session_history() returns jsonb language plpgsql security definer set search_path='' as $fn$
declare rows jsonb;
begin
 perform math_private.require_active(array[auth.uid()]);
 select coalesce(jsonb_agg(public.math_session_read(r.id) order by r.created_at desc,r.id desc),'[]') into rows from
 (select id,created_at from math_private.session_runs where student_id=auth.uid() order by created_at desc,id desc limit 50) r;
 return jsonb_build_object('version','math-session-history-v1','runs',rows);
end$fn$;
revoke all on function public.math_session_history() from public,anon,authenticated,service_role;
grant execute on function public.math_session_history() to authenticated;

-- Existing APP/single-leaf clients keep their included-revision route.
-- A legacy one-leaf caller cannot silently add/change a multi-leaf frozen round.
create function math_private.session_reevaluation(p_attempt uuid,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $fn$
declare a public.math_attempts; parent uuid; run uuid; result uuid;
begin
 select * into a from public.math_attempts where id=p_attempt and student_id=auth.uid();
 if a.id is null then raise insufficient_privilege;end if;
 select m.run_id into parent from math_private.session_evaluations x join math_private.session_members m on m.attempt_id=x.attempt_id where x.evaluation_id=a.prior_evaluation_id;
 if parent is null then return null;end if;
 run=public.math_session_submit((select exam_id from math_private.session_runs where id=parent),p_key,array[a.id],parent);
 select x.evaluation_id into result from math_private.session_members m join math_private.session_evaluations x on x.attempt_id=m.attempt_id where m.run_id=run order by x.generation desc limit 1;
 return result;
end$fn$;
revoke all on function math_private.session_reevaluation(uuid,uuid) from public,anon,authenticated,service_role;

create function math_private.session_eligibility(p_eval uuid,p_at timestamptz) returns jsonb
language plpgsql stable security definer set search_path='' as $fn$
declare r math_private.session_runs; root math_private.session_runs; status text; initial uuid;
begin
 select sr.* into r from math_private.session_evaluations x join math_private.session_members m on m.attempt_id=x.attempt_id join math_private.session_runs sr on sr.id=m.run_id where x.evaluation_id=p_eval and sr.student_id=auth.uid();
 if r.id is null then return null;end if;
 select * into root from math_private.session_runs where id=coalesce(r.parent_id,r.id);
 select e.id into initial from math_private.session_members m join math_private.session_evaluations x on x.attempt_id=m.attempt_id join public.math_evaluations e on e.id=x.evaluation_id
 where m.run_id=root.id and e.leaf_id=(select leaf_id from public.math_evaluations where id=p_eval) and e.state='COMPLETED';
 status=case when root.state<>'completed' or exists(select 1 from public.credit_transactions where decision_id=root.decision_id and transaction_type='refund') then 'UNAVAILABLE'
 when exists(select 1 from math_private.session_runs where parent_id=root.id and state='completed') then 'CONSUMED'
 when exists(select 1 from math_private.session_runs where parent_id=root.id) then 'AUTHORIZED_PENDING'
 when p_at>=root.completed_at+interval '336 hours' then 'EXPIRED' else 'AVAILABLE' end;
 return jsonb_build_object('status',status,'eligible',status='AVAILABLE','included_count',1,'initial_evaluation_id',initial,'expires_at',root.completed_at+interval '336 hours','as_of',p_at,'request_route','math_learning.request_reevaluation','session_run_id',root.id);
end$fn$;
revoke all on function math_private.session_eligibility(uuid,timestamptz) from public,anon,authenticated,service_role;
