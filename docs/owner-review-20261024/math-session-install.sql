-- Owner execution package; generated from locally verified source.
begin;
do $$begin
 if current_user<>'postgres' or (select rolsuper from pg_roles where rolname=current_user) then raise exception 'NON_SUPERUSER_POSTGRES_REQUIRED';end if;
 if has_schema_privilege('essay_executor','math_private','CREATE') or exists(select 1 from pg_auth_members where roleid='essay_executor'::regrole and member='postgres'::regrole and (inherit_option or set_option)) then raise exception 'UNEXPECTED_OWNER_TOPOLOGY';end if;
if not exists(select 1 from pg_proc where oid='math_private.authorize_billing(uuid)'::regprocedure and proowner='essay_executor'::regrole and md5(regexp_replace(prosrc,'[[:space:]]','','g'))='ef7c0b100f9ed7fece7c0a47436ca355') then raise exception 'UNEXPECTED_AUTHORIZE_BILLING';end if;
if not exists(select 1 from pg_proc where oid='math_private.settle_billing(uuid)'::regprocedure and proowner='essay_executor'::regrole and md5(regexp_replace(prosrc,'[[:space:]]','','g'))='4b9ac54236fc9d1cd3ca3fd9d44320c2') then raise exception 'UNEXPECTED_SETTLE_BILLING';end if;
if not exists(select 1 from pg_proc where oid='math_private.release_billing(uuid)'::regprocedure and proowner='essay_executor'::regrole and md5(regexp_replace(prosrc,'[[:space:]]','','g'))='c64041c2e515eb5c26ce32eff584ec72') then raise exception 'UNEXPECTED_RELEASE_BILLING';end if;
if not exists(select 1 from pg_proc where oid='public.math_learning(jsonb)'::regprocedure and proowner='postgres'::regrole and md5(regexp_replace(prosrc,'[[:space:]]','','g'))='8458754cd89db46c56f3e1a67df107b7') then raise exception 'UNEXPECTED_MATH_LEARNING';end if;
if not exists(select 1 from pg_proc where oid='math_private.learning_eligibility(uuid,timestamptz)'::regprocedure and proowner='postgres'::regrole and md5(regexp_replace(prosrc,'[[:space:]]','','g'))='2cb3e0578e3930f2989f83df35b6e23b') then raise exception 'UNEXPECTED_LEARNING_ELIGIBILITY';end if;
end$$;
create table math_private.session_function_backup(signature text primary key,definition text not null,owner_id oid not null,acl text,installed_hash text);
alter table math_private.session_function_backup enable row level security;
revoke all on math_private.session_function_backup from public,anon,authenticated,service_role;
insert into math_private.session_function_backup(signature,definition,owner_id,acl)
select p.oid::regprocedure::text,pg_get_functiondef(p.oid),p.proowner,p.proacl::text from pg_proc p where p.oid=any(array[
'math_private.authorize_billing(uuid)'::regprocedure,'math_private.settle_billing(uuid)'::regprocedure,'math_private.release_billing(uuid)'::regprocedure,'public.math_learning(jsonb)'::regprocedure,'math_private.learning_eligibility(uuid,timestamptz)'::regprocedure]);
-- Additive session contract; installation performs no financial row updates.
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

grant essay_executor to postgres with admin false,inherit false,set true granted by postgres;
grant create on schema math_private to essay_executor;
set role essay_executor;
create or replace function math_private.authorize_billing(uuid) returns uuid language plpgsql volatile security DEFINER set search_path='' as $math_fn$
declare e public.math_evaluations; a public.math_attempts; account uuid; parent public.essay_billing_decisions; decision uuid; selected_grant uuid; quantity integer=1; reason text='paid_cycle';
begin
 decision=math_private.session_finance($1,'authorize'); if decision is not null then return decision;end if;
 select * into e from public.math_evaluations where id=$1;
 account=math_private.lock_account_attempt(e.attempt_id);
 select * into e from public.math_evaluations where id=$1 for update;
 select * into a from public.math_attempts where id=e.attempt_id;
 if exists(select 1 from public.math_billing_bindings where math_evaluation_id=e.id) then raise unique_violation using message='BINDING_ALREADY_EXISTS';end if;
 if e.state<>'REQUESTED' then raise invalid_parameter_value;end if;
 if e.request_kind='MATH_REEVALUATION' then
  select d.* into parent from public.essay_billing_decisions d
  join public.math_billing_bindings b on b.billing_decision_id=d.id
  join public.math_evaluations pe on pe.id=b.math_evaluation_id
  join public.math_attempts pa on pa.id=pe.attempt_id
  where d.account_id=account and d.status='settled' and d.reason='paid_cycle' and d.policy_key='essay_cycle' and d.policy_version='v2'
   and pa.lineage_id=a.lineage_id and pa.student_id=a.student_id and pa.id<>a.id and pa.created_at<a.created_at
   and pe.state='COMPLETED' and pe.request_kind='MATH_INITIAL_EVALUATION' and clock_timestamp()<pe.completed_at+interval '336 hours'
   and not exists(select 1 from public.essay_billing_decisions ch where ch.included_by_decision_id=d.id and ch.status in ('authorized','reserved','settled'))
   and not exists(select 1 from public.credit_transactions t where t.decision_id=d.id and t.transaction_type='refund')
  order by pe.completed_at desc,pe.id desc limit 1;
  if parent.id is not null then quantity=0;reason='included_revision';end if;
 end if;
 if quantity=1 then
  select g.id into selected_grant from public.credit_grants g where g.account_id=account
   and (g.expires_at is null or g.expires_at>clock_timestamp())
   and (select coalesce(sum(t.balance_delta-t.reserved_delta),0) from public.credit_transactions t where t.grant_id=g.id)>=1
  order by g.expires_at nulls last,g.created_at,g.id limit 1;
  if selected_grant is null then raise sqlstate 'PT402' using message='INSUFFICIENT_CREDIT';end if;
 end if;
 insert into public.essay_billing_decisions(account_id,evaluation_id,idempotency_key,policy_key,policy_version,reason,credits_required,status,included_by_decision_id)
 values(account,null,e.idempotency_key,'essay_cycle','v2',reason,quantity,'authorized',parent.id) returning id into decision;
 insert into public.math_billing_bindings(math_evaluation_id,billing_decision_id,account_id) values(e.id,decision,account);
 if quantity=1 then
  insert into public.credit_transactions(account_id,grant_id,decision_id,transaction_type,balance_delta,reserved_delta,idempotency_key,reason_code)
  values(account,selected_grant,decision,'reserve',0,1,'reserve/'||decision::text,'essay_cycle_v2');
  update public.essay_billing_decisions set status='reserved',reserved_at=clock_timestamp() where id=decision;
 end if;
 return decision;
end$math_fn$;
create or replace function math_private.settle_billing(uuid) returns void language plpgsql volatile security DEFINER set search_path='' as $math_fn$
declare e public.math_evaluations; b public.essay_billing_decisions; account uuid; t public.credit_transactions;
begin
 if math_private.session_finance($1,'settle') is not null then return;end if;
 select * into e from public.math_evaluations where id=$1;
 account=math_private.lock_account_attempt(e.attempt_id);
 select * into e from public.math_evaluations where id=$1 for update;
 select d.* into b from public.essay_billing_decisions d join public.math_billing_bindings m on m.billing_decision_id=d.id and m.account_id=d.account_id where m.math_evaluation_id=e.id for update of d;
 if b.id is null or b.account_id<>account or b.evaluation_id is not null then raise invalid_parameter_value;end if;
 if b.status='settled' and e.state='COMPLETED' then return;end if;
 if e.state<>'PROCESSING' or b.status not in ('authorized','reserved') then raise invalid_parameter_value;end if;
 if b.credits_required>0 then
  if b.status<>'reserved' or (select coalesce(sum(reserved_delta),0) from public.credit_transactions where decision_id=b.id)<>b.credits_required then raise check_violation using message='INVALID_RESERVATION';end if;
  for t in select * from public.credit_transactions where decision_id=b.id and transaction_type='reserve' order by grant_id loop
   insert into public.credit_transactions(account_id,grant_id,decision_id,transaction_type,balance_delta,reserved_delta,idempotency_key,reason_code)
   values(account,t.grant_id,b.id,'consume',-t.reserved_delta,-t.reserved_delta,'consume/'||b.id::text||'/'||t.grant_id::text,'evaluation_completed');
  end loop;
 end if;
 update public.essay_billing_decisions set status='settled',settled_at=clock_timestamp() where id=b.id;
end$math_fn$;
create or replace function math_private.release_billing(uuid) returns void language plpgsql volatile security DEFINER set search_path='' as $math_fn$
declare e public.math_evaluations; b public.essay_billing_decisions; account uuid; t public.credit_transactions;
begin
 if math_private.session_finance($1,'release') is not null then return;end if;
 select * into e from public.math_evaluations where id=$1;
 account=math_private.lock_account_attempt(e.attempt_id);
 select * into e from public.math_evaluations where id=$1 for update;
 select d.* into b from public.essay_billing_decisions d join public.math_billing_bindings m on m.billing_decision_id=d.id and m.account_id=d.account_id where m.math_evaluation_id=e.id for update of d;
 if b.id is null or b.account_id<>account or b.evaluation_id is not null then raise invalid_parameter_value;end if;
 if b.status in ('settled','released','rejected') then return;end if;
 if b.status='reserved' then
  for t in select * from public.credit_transactions where decision_id=b.id and transaction_type='reserve' order by grant_id loop
   insert into public.credit_transactions(account_id,grant_id,decision_id,transaction_type,balance_delta,reserved_delta,idempotency_key,reason_code)
   values(account,t.grant_id,b.id,'release',0,-t.reserved_delta,'release/'||b.id::text||'/'||t.grant_id::text,'evaluation_failed');
  end loop;
 end if;
 update public.essay_billing_decisions set status='released',released_at=clock_timestamp() where id=b.id;
end$math_fn$;
reset role;
create or replace function public.math_learning(p_request jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare v jsonb=p_request->'payload';action text=p_request->>'action';u uuid;allowed text[];e public.math_evaluations;a public.math_attempts;h public.math_hints;s public.math_canonical_solutions;exposure public.math_solution_exposures;
 answer jsonb;key uuid;target text;sid uuid;gh text;newid uuid;lim integer;before_at timestamptz;before_id uuid;page jsonb;item record;last_at timestamptz;last_id uuid;basis uuid;decision public.essay_billing_decisions;
begin
 u=math_private.current_subject();perform math_private.require_active(array[u]);
 if p_request is null or jsonb_typeof(p_request)<>'object' or octet_length(p_request::text)>70000 or p_request-array['dto_version','action','payload']<>'{}' or p_request->>'dto_version' is distinct from 'math-learning-v1' or jsonb_typeof(v) is distinct from 'object' then raise invalid_parameter_value using message='INVALID_LEARNING_CONTRACT';end if;
 allowed=case action when 'read_learning_state' then array['evaluation_id'] when 'reveal_hint' then array['evaluation_id','hint_id','level','client_submission_id'] when 'reveal_solution' then array['evaluation_id','target','solution_id','client_submission_id'] when 'create_resolve_attempt' then array['client_submission_id','leaf_id','kind','predecessor_id','prior_evaluation_id','target_step_id','typed_answer','input_kind'] when 'request_reevaluation' then array['attempt_id','client_submission_id'] when 'read_learning_history' then array['evaluation_id','limit','before_at','before_id'] else null end;
 if allowed is null or v-allowed<>'{}' then raise invalid_parameter_value;end if;
 if action in ('read_learning_state','read_learning_history','reveal_hint','reveal_solution') then
  select er.* into e from public.math_evaluations er join public.math_attempts ar on ar.id=er.attempt_id where er.id=(v->>'evaluation_id')::uuid and ar.student_id=u;
  if not found then raise no_data_found;end if;select * into a from public.math_attempts where id=e.attempt_id;
 end if;
 case action
 when 'read_learning_state' then answer=math_private.learning_state(e.id);
 when 'reveal_hint' then
  if jsonb_typeof(v->'level') is distinct from 'number' or v->>'level' not in ('0','1','2') then raise invalid_parameter_value;end if;
  select * into h from public.math_hints where id=(v->>'hint_id')::uuid and evaluation_id=e.id and level=(v->>'level')::integer and validated;
  if not found then raise invalid_parameter_value using message='HINT_UNAVAILABLE';end if;
  answer=public.math_reveal_hint(h.id,(v->>'client_submission_id')::uuid);
 when 'reveal_solution' then
  if e.state<>'COMPLETED' then raise invalid_parameter_value;end if;
  key=(v->>'client_submission_id')::uuid;target=v->>'target';sid=(v->>'solution_id')::uuid;
  if key is null or target is null or target not in ('REFERENCE','GENERATED') then raise invalid_parameter_value;end if;
  if target='REFERENCE' then
   select sr.* into s from public.math_canonical_solutions sr join public.math_considered_references cr on cr.solution_id=sr.id where cr.evaluation_id=e.id and sr.id=sid;
   if not found then raise invalid_parameter_value using message='SOLUTION_UNAVAILABLE';end if;
  else
   if sid is not null or e.result->'generated_solution' is null or e.result->'generated_solution'='null' then raise invalid_parameter_value using message='SOLUTION_UNAVAILABLE';end if;gh=e.output_sha256;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(key::text,735));
  select * into exposure from public.math_solution_exposures where client_key=key;
  if found then
   if exposure.evaluation_id<>e.id or exposure.solution_id is distinct from sid or exposure.generated_output_sha256 is distinct from gh then raise unique_violation using message='REVEAL_RETRY_CONFLICT';end if;
  else
   insert into public.math_solution_exposures(evaluation_id,solution_id,generated_output_sha256,client_key) values(e.id,sid,gh,key) returning * into exposure;
  end if;
  answer=jsonb_build_object('exposure_id',exposure.id,'evaluation_id',e.id,'solution_id',sid,'target',target,'delivered_at',exposure.delivered_at,'provenance',case when target='GENERATED' or s.origin='AI_PROPOSED' then 'AI_GENERATED_REFERENCE' when s.origin='OFFICIAL' then 'OFFICIAL_SOLUTION' else 'VERIFIED_INTERNAL_SOLUTION' end,'physical_origin',case when target='GENERATED' then 'AI_GENERATED' else s.origin end,'body',case when target='GENERATED' then e.result->'generated_solution'->>'body' else s.body end,'learning_context','REFERENCE_SOLUTION_REVEALED');
 when 'create_resolve_attempt' then
  if v->>'kind' is null or v->>'kind' not in ('STEP_RETRY','FULL_RESOLVE','SHORT_ANSWER_RESOLVE') then raise invalid_parameter_value using message='INVALID_RESOLVE_KIND';end if;
  -- Reuse immutable attempt + exact canonical lineage validation and idempotency.
  newid=public.math_submit_attempt(v);answer=jsonb_build_object('attempt_id',newid);
 when 'request_reevaluation' then
  select * into a from public.math_attempts where id=(v->>'attempt_id')::uuid and student_id=u;
  if not found or a.kind='INITIAL' then raise invalid_parameter_value;end if;
  -- The canonical request owns lifecycle -> account -> attempt -> evaluation -> decision locking.
  -- A paid fallback is rejected atomically here; existing math_input is the separately explicit ordinary route.
  newid=coalesce(math_private.session_reevaluation(a.id,(v->>'client_submission_id')::uuid),public.math_request_evaluation(a.id,(v->>'client_submission_id')::uuid));
  select d.* into decision from public.essay_billing_decisions d where d.id in (select billing_decision_id from public.math_billing_bindings where math_evaluation_id=newid union all select sr.decision_id from math_private.session_evaluations x join math_private.session_members sm on sm.attempt_id=x.attempt_id join math_private.session_runs sr on sr.id=sm.run_id where x.evaluation_id=newid);
  if decision.reason<>'included_revision' or decision.credits_required<>0 then raise invalid_parameter_value using message='INCLUDED_REEVALUATION_UNAVAILABLE';end if;
  answer=jsonb_build_object('evaluation_id',newid,'commercial_context','INCLUDED_REEVALUATION','additional_credit',0);
 when 'read_learning_history' then
  lim=coalesce((v->>'limit')::integer,20);before_at=(v->>'before_at')::timestamptz;before_id=(v->>'before_id')::uuid;
  if lim not between 1 and 50 or (before_at is null)<>(before_id is null) then raise invalid_parameter_value;end if;
  page='[]';
  for item in select ar.*,er.id as current_evaluation_id,er.state as evaluation_state,er.result->'progression' as progression,er.completed_at
   from public.math_attempts ar left join lateral(select id,state,result,completed_at from public.math_evaluations where attempt_id=ar.id order by requested_at desc,id desc limit 1) er on true
   where ar.student_id=u and ar.lineage_id=a.lineage_id and (before_at is null or (ar.created_at,ar.id)<(before_at,before_id)) order by ar.created_at desc,ar.id desc limit lim loop
   page=page||jsonb_build_array(jsonb_build_object('attempt_id',item.id,'created_at',item.created_at,'resolve_kind',item.kind,'prior_attempt_id',item.predecessor_id,'prior_evaluation_id',item.prior_evaluation_id,'target_step_id',item.target_step_id,'submitted_scope',case when item.kind='STEP_RETRY' then 'TARGET_STEP' else 'WHOLE_LEAF' end,'evaluation_id',item.current_evaluation_id,'evaluation_state',item.evaluation_state,'completed_at',item.completed_at,'reevaluation_delta',item.progression,
    'core_ids',(select coalesce(jsonb_agg(id order by position),'[]') from public.math_core where evaluation_id=item.current_evaluation_id),
    'exposed_hint_levels',(select coalesce(jsonb_agg(distinct hint_row.level),'[]') from public.math_hint_exposures x join public.math_hints hint_row on hint_row.id=x.hint_id where hint_row.evaluation_id=item.current_evaluation_id),
    'solution_revealed',exists(select 1 from public.math_solution_exposures where evaluation_id=item.current_evaluation_id),
    'reference_solution_revealed_before_resolve',exists(select 1 from public.math_solution_exposures where evaluation_id=item.prior_evaluation_id and delivered_at<=item.created_at)));
   last_at=item.created_at;last_id=item.id;
  end loop;
  answer=jsonb_build_object('lineage_id',a.lineage_id,'attempts',page,'included_reevaluation',math_private.learning_eligibility(e.id,clock_timestamp()),'next_cursor',case when jsonb_array_length(page)=lim then jsonb_build_object('created_at',last_at,'attempt_id',last_id) else null end);
 end case;
 if octet_length(answer::text)>2097152 then raise program_limit_exceeded using message='LEARNING_RESPONSE_BOUND';end if;
 return jsonb_build_object('dto_version','math-learning-v1','action',action,'result',answer);
end$$;
create or replace function math_private.learning_eligibility(p_evaluation_id uuid,p_at timestamptz) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare initial public.math_evaluations; decision public.essay_billing_decisions; lineage uuid; student uuid; eligibility_status text; expires timestamptz;
begin
 if math_private.session_eligibility($1,$2) is not null then return math_private.session_eligibility($1,$2);end if;
 select a.lineage_id,a.student_id into lineage,student from public.math_attempts a join public.math_evaluations e on e.attempt_id=a.id where e.id=p_evaluation_id;
 select e.* into initial from public.math_evaluations e join public.math_attempts a on a.id=e.attempt_id where a.lineage_id=lineage and a.student_id=student and e.request_kind='MATH_INITIAL_EVALUATION' and e.state='COMPLETED' order by e.completed_at desc,e.id desc limit 1;
 select d.* into decision from public.essay_billing_decisions d join public.math_billing_bindings b on b.billing_decision_id=d.id where b.math_evaluation_id=initial.id;
 expires=initial.completed_at+interval '336 hours';
 eligibility_status=case when initial.id is null or decision.id is null or decision.status<>'settled' or decision.reason<>'paid_cycle' or decision.policy_key<>'essay_cycle' or decision.policy_version<>'v2' or exists(select 1 from public.credit_transactions where decision_id=decision.id and transaction_type='refund') then 'UNAVAILABLE'
 when exists(select 1 from public.essay_billing_decisions where included_by_decision_id=decision.id and status='settled') then 'CONSUMED'
 when exists(select 1 from public.essay_billing_decisions where included_by_decision_id=decision.id and status in ('authorized','reserved')) then 'AUTHORIZED_PENDING'
 when p_at>=expires then 'EXPIRED' else 'AVAILABLE' end;
 return jsonb_build_object('status',eligibility_status,'eligible',eligibility_status='AVAILABLE','included_count',1,'initial_evaluation_id',initial.id,'expires_at',expires,'as_of',p_at,'request_route',case when eligibility_status='AVAILABLE' then 'math_learning.request_reevaluation' else 'math_input.request_evaluation' end);
end$$;
revoke create on schema math_private from essay_executor;
revoke essay_executor from postgres granted by postgres;
update math_private.session_function_backup b set installed_hash=md5(pg_get_functiondef(b.signature::regprocedure));
-- CREATE OR REPLACE must preserve every pre-existing ACL and owner, including
-- the Production-only postgres EXECUTE grant on release_billing.
do $$begin
 if exists(select 1 from math_private.session_function_backup b join pg_proc p on p.oid=b.signature::regprocedure where p.proowner<>b.owner_id or p.proacl::text is distinct from b.acl) then raise exception 'OWNER_ACL_CHANGED';end if;
end$$;
commit;
