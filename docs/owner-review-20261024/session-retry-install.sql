-- Owner-applied candidate: preserve runs, snapshots, decisions and all checkpoints.
-- Explicit retries of confirmed failures only. No ledger writes or evaluator changes.
begin;
create table essay_exam_private.retry_requests (
 run_id uuid not null references essay_exam_private.runs(id) on delete cascade,
 request_key uuid not null,
 generation integer not null check(generation>0),
 attempts jsonb not null check(jsonb_typeof(attempts)='object'),
 created_at timestamptz not null default clock_timestamp(),
 lease_until timestamptz not null default clock_timestamp()+interval '15 minutes',
 primary key(run_id,request_key), unique(run_id,generation)
);
alter table essay_exam_private.retry_requests enable row level security;
alter table essay_exam_private.retry_requests force row level security;
revoke all on essay_exam_private.retry_requests from public,anon,authenticated,service_role,essay_worker;

create function public.essay_exam_retry(p_subject uuid,p_run uuid,p_key uuid,p_exam uuid) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare r essay_exam_private.runs; account uuid; previous essay_exam_private.retry_requests;
 attempts jsonb='{}'; next_attempts jsonb='{}'; cp essay_exam_private.checkpoints;
 i integer; n integer; checkpoint_key text; failures integer=0;
begin
 perform math_private.require_active(array[p_subject]);
 select id into account from public.credit_accounts where user_id=p_subject for update;
 select * into r from essay_exam_private.runs where id=p_run and account_id=account for update;
 if r.id is null or p_key is null or p_exam is null or r.exam_id<>p_exam then raise sqlstate 'PT403';end if;
 select * into previous from essay_exam_private.retry_requests where run_id=p_run and request_key=p_key;
 if found then return jsonb_build_object('run_id',r.id,'generation',previous.generation);end if;
 if r.state<>'reserved' or r.lease_token is null or exists(select 1 from essay_exam_private.checkpoints where run_id=p_run and key='final') then
  raise sqlstate 'PT409' using message='RETRY_NOT_AVAILABLE';end if;
 select * into previous from essay_exam_private.retry_requests where run_id=p_run order by generation desc limit 1;
 attempts=coalesce(previous.attempts,'{}'::jsonb);next_attempts=attempts;
 for i in 0..jsonb_array_length(r.snapshot->'answers')-1 loop
  n=coalesce((attempts->>i::text)::integer,0);
  checkpoint_key='q'||i||case when n=0 then '' else '-retry-'||n end;
  select * into cp from essay_exam_private.checkpoints where run_id=p_run and key=checkpoint_key;
  if cp.run_id is null or cp.state<>'checkpoint' or coalesce(cp.payload->>'state','') not in ('completed','failed') then
   raise sqlstate 'PT409' using message='RECONCILIATION_REQUIRED';end if;
  if cp.payload->>'state'='failed' then
   failures=failures+1;next_attempts=jsonb_set(next_attempts,array[i::text],to_jsonb(n+1));
  end if;
 end loop;
 if failures=0 then raise sqlstate 'PT409' using message='RETRY_NOT_AVAILABLE';end if;
 insert into essay_exam_private.retry_requests(run_id,request_key,generation,attempts)
 values(p_run,p_key,coalesce(previous.generation,0)+1,next_attempts) returning * into previous;
 return jsonb_build_object('run_id',r.id,'generation',previous.generation);
end $fn$;

create function public.essay_exam_session_claim(p_subject uuid,p_run uuid,p_dispatch uuid) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare result jsonb; attempts jsonb;
begin
 -- Existing claim owns account lock, lifecycle, ownership and immutable lease token.
 result=public.essay_exam_claim(p_subject,p_run,p_dispatch);
 select r.attempts into attempts from essay_exam_private.retry_requests r where run_id=p_run order by generation desc limit 1;
 return result||jsonb_build_object('session_version','exam-session-v1','attempts',coalesce(attempts,'{}'::jsonb));
end $fn$;

create function public.essay_exam_session_checkpoint(p_subject uuid,p_run uuid,p_token uuid,p_key text,p_action text,p_writer uuid default null,p_payload jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare r essay_exam_private.runs; account uuid; inserted integer;
begin
 -- Original read/write authorization and immutable writer checks are unchanged.
 if p_action is distinct from 'begin' then
  return public.essay_exam_checkpoint(p_subject,p_run,p_token,p_key,p_action,p_writer,p_payload);
 end if;
 perform math_private.require_active(array[p_subject]);
 select id into account from public.credit_accounts where user_id=p_subject for update;
 select * into r from essay_exam_private.runs where id=p_run and account_id=account for update;
 if r.id is null or p_token is null or r.lease_token is distinct from p_token then raise sqlstate 'PT403';end if;
 if p_key is null or p_key !~ '^[a-zA-Z0-9_-]{1,100}$' or p_writer is null then raise sqlstate 'PT422';end if;
 if r.state<>'reserved' or not (r.lease_until>clock_timestamp() or exists(
  select 1 from essay_exam_private.retry_requests t where t.run_id=p_run and t.lease_until>clock_timestamp())) then
  raise sqlstate 'PT409' using message='DISPATCH_LEASE_EXPIRED';end if;
 -- Append-only keys; never steal a pending or overwrite a completed checkpoint.
 insert into essay_exam_private.checkpoints values(p_run,p_key,p_writer,'pending',null) on conflict do nothing;
 get diagnostics inserted=row_count;
 return jsonb_build_object('started',inserted=1);
end $fn$;
create function public.essay_exam_session_status(p_run uuid) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare u uuid=auth.uid(); r essay_exam_private.runs; attempts jsonb; rows jsonb; retryable boolean;
begin
 perform math_private.require_active(array[u]);
 select x.* into r from essay_exam_private.runs x join public.credit_accounts a on a.id=x.account_id where x.id=p_run and a.user_id=u;
 if r.id is null then raise sqlstate 'PT404';end if;
 select t.attempts into attempts from essay_exam_private.retry_requests t where t.run_id=p_run order by generation desc limit 1;
 select jsonb_agg(jsonb_build_object('question_id',a.answer->>'questionId','state',
  case when r.state='completed' then 'completed' when c.state='checkpoint' and c.payload->>'state' in ('completed','failed','reconciling') then c.payload->>'state' when c.state='pending' then 'processing' else 'waiting' end) order by a.idx) into rows
 from jsonb_array_elements(r.snapshot->'answers') with ordinality a(answer,idx)
 left join essay_exam_private.checkpoints c on c.run_id=p_run and c.key='q'||(a.idx-1)||
  case when coalesce((attempts->>(a.idx-1)::text)::integer,0)=0 then '' else '-retry-'||(attempts->>(a.idx-1)::text) end;
 retryable=r.state='reserved' and not exists(select 1 from essay_exam_private.checkpoints where run_id=p_run and key='final') and
  exists(select 1 from jsonb_array_elements(rows) q where q->>'state'='failed') and
  not exists(select 1 from jsonb_array_elements(rows) q where q->>'state' not in ('completed','failed'));
 return jsonb_build_object('version','exam-session-v1','run_id',r.id,'exam_id',r.exam_id,'state',r.state,'questions',rows,'retry_allowed',retryable);
end $fn$;
revoke all on function public.essay_exam_retry(uuid,uuid,uuid,uuid),public.essay_exam_session_claim(uuid,uuid,uuid),public.essay_exam_session_checkpoint(uuid,uuid,uuid,text,text,uuid,jsonb),public.essay_exam_session_status(uuid) from public,anon,authenticated,service_role;
grant execute on function public.essay_exam_retry(uuid,uuid,uuid,uuid),public.essay_exam_session_claim(uuid,uuid,uuid),public.essay_exam_session_checkpoint(uuid,uuid,uuid,text,text,uuid,jsonb) to essay_worker;
grant execute on function public.essay_exam_session_status(uuid) to authenticated;
create function public.essay_exam_session_ready() returns text language sql stable set search_path='' as $$select 'exam-session-v1'::text$$;
revoke all on function public.essay_exam_session_ready() from public,anon,authenticated,service_role;
grant execute on function public.essay_exam_session_ready() to essay_worker;
commit;
