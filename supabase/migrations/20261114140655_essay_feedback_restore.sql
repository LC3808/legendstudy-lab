-- Existing TASK05 contract restored under Owner PHASE 2 authorization (2026-11-14).
begin;
set local lock_timeout='3s';
set local statement_timeout='10s';
create schema feedback_private;
revoke all on schema feedback_private from public,anon,authenticated,service_role;
-- Existing feedback_submissions remains the only content/source-of-truth table.
create table feedback_private.essay_context (
 feedback_id uuid primary key references public.feedback_submissions(id),
 user_id uuid references auth.users(id) on delete set null, request_key uuid not null,
 request_hash text not null, kind text not null check(kind in ('quality','bug')),
 satisfaction text check(satisfaction in ('helpful','unhelpful')),
 detail_category text, evaluation_ref text, run_id uuid, question_id uuid, exam_id uuid, university_id uuid,
 error_code text, occurred_at timestamptz not null, recorded_at timestamptz not null default now(),
 unique(user_id,request_key)
);
create index essay_feedback_user_time on feedback_private.essay_context(user_id,recorded_at desc);
create table feedback_private.actions (
 id bigint generated always as identity primary key,
 feedback_id uuid not null references public.feedback_submissions(id),
 actor uuid not null, old_status text not null, new_status text not null,
 note text not null check(length(note)<=3000), recorded_at timestamptz not null default now()
);
create function feedback_private.audit_status() returns trigger language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
begin
 if new.status is distinct from old.status and exists(select 1 from feedback_private.essay_context where feedback_id=new.id) then
 insert into feedback_private.actions(feedback_id,actor,old_status,new_status,note) values(new.id,auth.uid(),old.status,new.status,'');
 end if;
 return new;
end $$;
revoke all on function feedback_private.audit_status() from public,anon,authenticated,service_role;
create trigger essay_feedback_status_audit after update of status on public.feedback_submissions for each row execute function feedback_private.audit_status();
alter table feedback_private.essay_context enable row level security;
alter table feedback_private.actions enable row level security;
alter table public.feedback_submissions drop constraint feedback_submissions_status_check;
alter table public.feedback_submissions add constraint feedback_submissions_status_check check(status in ('new','reviewing','resolved','closed'));

create function public.essay_feedback_submit(p jsonb) returns uuid
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare u uuid=auth.uid(); k uuid; f uuid; prior text; kind text=p->>'kind'; sat text=p->>'satisfaction';
 cat text=p->>'category'; msg text=btrim(coalesce(p->>'message','')); ref text=nullif(p->>'evaluation_ref','');
 rid uuid; qid uuid; eid uuid; vid uuid; at_time timestamptz;
begin
 if u is null or account_private.allowed(u) is not true then raise sqlstate '42501';end if;
 if jsonb_typeof(p)<>'object' or p is null or exists(select 1 from jsonb_object_keys(p) x where x not in
 ('request_key','kind','satisfaction','category','message','evaluation_ref','platform','app_version','error_code','occurred_at')) then raise exception 'INVALID_INPUT';end if;
 k=(p->>'request_key')::uuid;
 if k is null or kind is null or kind not in ('quality','bug') or length(msg)>5000
 or p->>'platform' is null or p->>'platform' not in ('ios','android','web','macos','windows','linux','fuchsia')
 or length(coalesce(p->>'app_version','')) not between 1 and 40
 or (p->>'error_code' is not null and p->>'error_code' !~ '^[A-Z0-9_]{1,80}$') then raise exception 'INVALID_INPUT';end if;
 if kind='quality' and (sat is null or sat not in ('helpful','unhelpful') or (cat is not null and cat not in
 ('helpful','inaccurate','rubric','score','unclear','function','other'))) then raise exception 'INVALID_INPUT';end if;
 if kind='bug' and (sat is not null or msg='' or cat is null or cat not in
 ('submission','ocr','evaluation','result','rewrite','credit','display','other')) then raise exception 'INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended('essay-feedback/'||u::text,0));
 select c.feedback_id,c.request_hash into f,prior from feedback_private.essay_context c where c.user_id=u and c.request_key=k;
 if f is not null then
  if prior<>md5(p::text) then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return f;
 end if;
 if (select count(*) from feedback_private.essay_context where user_id=u and recorded_at>clock_timestamp()-interval '1 hour')>=10 then raise exception 'RATE_LIMIT';end if;
 if ref is not null then
  if ref !~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}$' then raise exception 'RESULT_REFERENCE_UNAVAILABLE';end if;
  rid=split_part(ref,'/',1)::uuid;qid=split_part(ref,'/',2)::uuid;
  select r.exam_id,e.university_id into eid,vid from essay_exam_private.runs r
   join public.credit_accounts a on a.id=r.account_id join public.essay_exams e on e.id=r.exam_id
   where r.id=rid and a.user_id=u and exists(select 1 from jsonb_array_elements(r.snapshot->'answers') x where x->>'questionId'=qid::text);
  if eid is null then raise sqlstate '42501';end if;
 end if;
 at_time=coalesce((p->>'occurred_at')::timestamptz,clock_timestamp());
 if at_time>clock_timestamp()+interval '5 minutes' then raise exception 'INVALID_TIME';end if;
 insert into public.feedback_submissions(user_id,category,title,body,app_version,build_number,platform,os_version)
 values(u,case when kind='bug' then 'bug' else 'suggestion' end,
 case when kind='bug' then '논술 LAB 오류 신고' else '논술 LAB 첨삭 의견' end,
 case when msg<>'' then msg when sat='helpful' then '도움이 되었어요' else '아쉬워요' end,p->>'app_version','unknown',p->>'platform','not-collected') returning id into f;
 insert into feedback_private.essay_context(feedback_id,user_id,request_key,request_hash,kind,satisfaction,detail_category,evaluation_ref,run_id,question_id,exam_id,university_id,error_code,occurred_at)
 values(f,u,k,md5(p::text),kind,sat,cat,ref,rid,qid,eid,vid,p->>'error_code',at_time);
 return f;
end $$;

create function public.essay_feedback_mine(p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
begin
 if auth.uid() is null or account_private.allowed(auth.uid()) is not true then raise sqlstate '42501';end if;
 if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'INVALID_INPUT';end if;
 return (select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb)) from (
 select s.id,s.title,s.body,s.status,s.created_at,c.kind,c.satisfaction,c.detail_category,c.evaluation_ref
 from public.feedback_submissions s join feedback_private.essay_context c on c.feedback_id=s.id
 where s.user_id=auth.uid() order by s.created_at desc,s.id desc limit 25 offset p_offset) x);
end $$;

create function public.admin_essay_feedback(p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare out jsonb; off integer=coalesce((p->>'offset')::integer,0);
begin
 if auth.uid() is null or public.admin_operator() is not true or account_private.allowed(auth.uid()) is not true then raise sqlstate '42501';end if;
 if off<0 or off>100000 then raise exception 'INVALID_INPUT';end if;
 with filtered as (
 select s.*,c.kind,c.satisfaction,c.detail_category,c.evaluation_ref,c.run_id,c.question_id,c.exam_id,c.university_id,c.error_code,c.occurred_at
 from public.feedback_submissions s join feedback_private.essay_context c on c.feedback_id=s.id
 where (p->>'id' is null or s.id=(p->>'id')::uuid) and (p->>'user_id' is null or s.user_id=(p->>'user_id')::uuid)
 and (p->>'kind' is null or c.kind=p->>'kind') and (p->>'status' is null or s.status=p->>'status')
 and (p->>'category' is null or c.detail_category=p->>'category')
 and (p->>'from' is null or s.created_at>=(p->>'from')::timestamptz)
 and (p->>'to' is null or s.created_at<(p->>'to')::timestamptz)
 ), counts as (select count(*) total,count(*) filter(where satisfaction='helpful') positive,
 count(*) filter(where satisfaction='unhelpful') negative,count(*) filter(where kind='bug') bugs,
 count(*) filter(where status in ('new','reviewing')) pending,count(*) filter(where status='resolved') resolved from filtered)
 select jsonb_build_object('rows',(select coalesce(jsonb_agg(x),'[]'::jsonb) from(select * from filtered order by created_at desc,id desc limit 25 offset off)x),
 'stats',(select to_jsonb(counts) from counts),'categories',(select coalesce(jsonb_object_agg(key,n),'{}'::jsonb) from(select coalesce(detail_category,'unspecified') key,count(*) n from filtered group by detail_category)x),
 'actions',(select coalesce(jsonb_agg(a order by a.recorded_at),'[]'::jsonb) from feedback_private.actions a where p->>'id' is not null and a.feedback_id=(p->>'id')::uuid)) into out;
 return out;
end $$;

create function public.admin_essay_feedback_update(p_id uuid,p_status text,p_note text,p_expected timestamptz) returns void
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare s public.feedback_submissions;
begin
 if auth.uid() is null or public.admin_operator() is not true or account_private.allowed(auth.uid()) is not true then raise sqlstate '42501';end if;
 if p_status is null or p_status not in ('new','reviewing','resolved','closed') or p_note is null or length(p_note)>3000 then raise exception 'INVALID_INPUT';end if;
 select f.* into s from public.feedback_submissions f join feedback_private.essay_context c on c.feedback_id=f.id where f.id=p_id for update of f;
 if s.id is null then raise sqlstate 'PT404';end if;
 if s.updated_at is distinct from p_expected then raise exception 'STALE_FEEDBACK';end if;
 if btrim(p_note)<>'' then
 insert into feedback_private.actions(feedback_id,actor,old_status,new_status,note) values(p_id,auth.uid(),s.status,s.status,p_note);
 end if;
 update public.feedback_submissions set status=p_status where id=p_id;
end $$;
-- Only the reported question and its same-owner parent are exposed to the
-- existing Owner review renderer. No impersonation, service key or broad scan.
create function public.admin_essay_feedback_result(p_feedback uuid) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare c feedback_private.essay_context; result jsonb;
begin
 if auth.uid() is null or public.admin_operator() is not true or account_private.allowed(auth.uid()) is not true then raise sqlstate '42501';end if;
 select * into c from feedback_private.essay_context where feedback_id=p_feedback;
 if c.user_id is not null and account_private.allowed(c.user_id) is not true then raise sqlstate '42501';end if;
 if c.run_id is null then raise sqlstate 'PT404';end if;
 select jsonb_build_object('version','essay-exam-history-v1','runs',coalesce(jsonb_agg(x.row),'[]'::jsonb)) into result from (
 select jsonb_build_object('id',r.id,'parent_id',r.parent_id,'exam_id',r.exam_id,'state',r.state,'university',v.name,'title',e.exam_name,'created_at',r.created_at,
 'answers',(select jsonb_agg(a) from jsonb_array_elements(r.snapshot->'answers') a where a->>'questionId'=c.question_id::text),
 'result',jsonb_build_object('questions',(select jsonb_agg(jsonb_set(q-'telemetry','{evaluation}',(q->'evaluation')-'local_reviews')) from jsonb_array_elements(r.result->'questions') q where q->>'questionId'=c.question_id::text))) row
 from essay_exam_private.runs r join public.credit_accounts a on a.id=r.account_id join public.essay_exams e on e.id=r.exam_id join public.universities v on v.id=e.university_id
 where a.user_id=c.user_id and r.state='completed' and (r.id=c.run_id or r.id=(select parent_id from essay_exam_private.runs where id=c.run_id))
 ) x;
 return result;
end $$;
revoke all on function public.essay_feedback_submit(jsonb),public.essay_feedback_mine(integer),public.admin_essay_feedback(jsonb),public.admin_essay_feedback_update(uuid,text,text,timestamptz),public.admin_essay_feedback_result(uuid) from public,anon,authenticated,service_role;
grant execute on function public.essay_feedback_submit(jsonb),public.essay_feedback_mine(integer),public.admin_essay_feedback(jsonb),public.admin_essay_feedback_update(uuid,text,text,timestamptz),public.admin_essay_feedback_result(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
