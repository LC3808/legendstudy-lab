begin;
do $guard$ begin
if to_regprocedure('public.admin_learning_analytics(timestamptz,timestamptz)') is not null and md5(pg_get_functiondef(to_regprocedure('public.admin_learning_analytics(timestamptz,timestamptz)'))) <> '9713a691e143310e05835d7aa0516e4b' then raise exception 'READ_RPC_BASELINE_DRIFT: admin_learning_analytics'; end if;
if to_regprocedure('public.admin_exam_learning(timestamptz,timestamptz)') is not null and md5(pg_get_functiondef(to_regprocedure('public.admin_exam_learning(timestamptz,timestamptz)'))) <> 'f7faaca0ee4a145db65ac82b3931d2fa' then raise exception 'READ_RPC_BASELINE_DRIFT: admin_exam_learning'; end if;
if to_regprocedure('public.admin_dashboard_study(timestamptz,timestamptz)') is not null and md5(pg_get_functiondef(to_regprocedure('public.admin_dashboard_study(timestamptz,timestamptz)'))) <> 'd798c632de665cb054d69c5fe051cb48' then raise exception 'READ_RPC_BASELINE_DRIFT: admin_dashboard_study'; end if;
end $guard$;
-- Owner 2026-11-04: internal admin statistics show all recorded cohorts. ACLs unchanged.
CREATE OR REPLACE FUNCTION public.admin_learning_analytics(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '8s'
AS $function$
declare result jsonb;
begin
 if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege;end if;
 if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to) or p_to<=p_from or p_to-p_from>interval '400 days' then raise sqlstate 'PT422' using message='INVALID_PERIOD';end if;
 -- Current projections, not reconstructed historical targets/bookmarks.
 with eligible as materialized (select id from public.profiles where account_private.allowed(id)),
 facts as (
 select 'targets'::text kind,t.university_id::text label,t.user_id from public.student_target_universities t join eligible e on e.id=t.user_id where t.created_at>=p_from and t.created_at<p_to
 union all select 'saved',b.content_item_id::text,b.user_id from public.bookmarks b join eligible e on e.id=b.user_id where b.created_at>=p_from and b.created_at<p_to
 union all select 'recent',r.content_item_id::text,r.user_id from public.recent_views r join eligible e on e.id=r.user_id where r.viewed_at>=p_from and r.viewed_at<p_to
 union all select 'applications',a.university_id::text,a.user_id from public.student_applications a join eligible e on e.id=a.user_id where a.created_at>=p_from and a.created_at<p_to
 ), cohorts as (select kind,label,count(*) records,count(distinct user_id) users from facts group by kind,label),
 ranked as (select *,row_number() over(partition by kind order by users desc,label) rank from cohorts where users>=1),
 intervals as (
 select s.user_id,int8range(greatest(floor(extract(epoch from p_from)*1000)::bigint,floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint),least(floor(extract(epoch from p_to)*1000)::bigint,floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint),'[)') span
 from public.study_sessions s join eligible e on e.id=s.user_id cross join lateral jsonb_array_elements(s.active_segments) v
 where s.include_in_study_total and s.ended_at>p_from and s.started_at<p_to
 and floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint>floor(extract(epoch from p_from)*1000)::bigint
 and floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint<floor(extract(epoch from p_to)*1000)::bigint
 ), merged as (select user_id,range_agg(span) spans from intervals group by user_id),
 study as (select user_id,sum(upper(span)-lower(span)) ms from merged cross join lateral unnest(spans) span group by user_id),
 summaries as (select kind,count(*) records,count(distinct user_id) users from facts group by kind)
 select jsonb_build_object('version','admin-learning-analytics-v1','as_of',statement_timestamp(),'from',p_from,'to',p_to,'timezone','Asia/Seoul','minimum_sample',1,
 'metrics',jsonb_build_object(
 'targets',coalesce((select users from summaries where kind='targets'),0),
 'target_records',coalesce((select records from summaries where kind='targets'),0),
 'saved',coalesce((select records from summaries where kind='saved'),0),
 'recent',coalesce((select records from summaries where kind='recent'),0),
 'applications',coalesce((select records from summaries where kind='applications'),0),
 'study_users',(select case when count(*)>=0 then count(*) end from study),
 'study_ms',(select case when count(*)>=0 then coalesce(sum(ms),0) end from study)),
 'rows',coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'label',coalesce(case when kind in ('targets','applications') then (select name from public.universities where id::text=label) else (select title from public.content_items where id::text=label) end,'명칭 확인 필요'),'users',users,'records',records) order by kind,rank) from ranked where rank<=10),'[]'::jsonb),
 'state',case when not exists(select 1 from facts) and not exists(select 1 from study) then 'EMPTY' else 'READY' end)
 into result;
 return result;
end$function$
;
CREATE OR REPLACE FUNCTION public.admin_dashboard_study(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '8s'
AS $function$
declare result jsonb;
begin
 if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege; end if;
 if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to) or p_to<=p_from or p_to-p_from>interval '400 days' then raise sqlstate 'PT422' using message='INVALID_PERIOD'; end if;
 with eligible as materialized (
  select id,case when academic_status='retaker' then 'retaker' when academic_status='student' and grade_level in (1,2,3) then grade_level::text else 'unknown' end grade
  from public.profiles where account_private.allowed(id)
 ), intervals as (
  select s.user_id,e.grade,int8range(
   greatest(floor(extract(epoch from p_from)*1000)::bigint,floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint),
   least(floor(extract(epoch from p_to)*1000)::bigint,floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint),'[)') span
  from public.study_sessions s join eligible e on e.id=s.user_id cross join lateral jsonb_array_elements(s.active_segments) v
  where s.include_in_study_total and s.ended_at>p_from and s.started_at<p_to
   and floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint>floor(extract(epoch from p_from)*1000)::bigint
   and floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint<floor(extract(epoch from p_to)*1000)::bigint
 ), merged as (select user_id,grade,range_agg(span) spans from intervals group by user_id,grade),
 study as (select user_id,grade,sum(upper(span)-lower(span)) ms from merged cross join lateral unnest(spans) span group by user_id,grade),
 cohorts as (select grade,count(*) users,sum(ms) ms from study group by grade),
 total as (select count(*) users,coalesce(sum(ms),0) ms from study),
 gate as (select true ready)
 select jsonb_build_object('version','admin-dashboard-study-v1','as_of',statement_timestamp(),'minimum_sample',1,
  'total',jsonb_build_object('users',users,'ms',ms),
  'grades_available',(select ready from gate),
  'grades',case when (select ready from gate) then coalesce((select jsonb_agg(jsonb_build_object('grade',grade,'users',users,'ms',ms) order by grade) from cohorts),'[]'::jsonb) else '[]'::jsonb end)
 into result from total;
 return result;
end $function$
;
CREATE OR REPLACE FUNCTION public.admin_exam_learning(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '8s'
AS $function$
declare v jsonb;
begin
 if not public.admin_operator() then raise insufficient_privilege;end if;
 if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to) or p_from>=p_to or p_to-p_from>interval '400 days' then raise invalid_parameter_value;end if;
 with eligible as materialized(select r.*,ca.user_id from essay_exam_private.runs r join public.credit_accounts ca on ca.id=r.account_id where account_private.allowed(ca.user_id)),
 requested as materialized(select * from eligible where created_at>=p_from and created_at<p_to),
 completed as materialized(select * from eligible where state='completed' and completed_at>=p_from and completed_at<p_to),
 loops as materialized(select c.* from completed c join eligible p on p.id=c.parent_id and p.account_id=c.account_id and p.exam_id=c.exam_id
 where p.state='completed' and p.completed_at<=c.created_at and c.created_at<=c.completed_at
 and (select array_agg(a->>'questionId' order by a->>'questionId') from jsonb_array_elements(c.snapshot->'answers') a)
   =(select array_agg(a->>'questionId' order by a->>'questionId') from jsonb_array_elements(p.snapshot->'answers') a)),
 weekly as materialized(select date_trunc('week',completed_at at time zone 'Asia/Seoul')::date week,count(distinct user_id) users from loops group by 1),
 exams as materialized(select r.exam_id,count(distinct r.user_id) users,count(*) runs,sum(jsonb_array_length(r.snapshot->'answers')) questions from requested r group by r.exam_id),
 counts as (select (select count(distinct user_id) from requested) users,(select count(*) from requested) runs,
 (select count(*) from completed) completed,
 (select count(*) from completed c join public.essay_billing_decisions d on d.id=c.decision_id where c.parent_id is not null and d.reason='included_revision' and d.credits_required=0) free_rewrites,
 (select count(distinct user_id) from loops) loop_users)
 select jsonb_build_object('formula_version','exam-learning-v1','as_of',statement_timestamp(),'from',p_from,'to',p_to,'environment','UNKNOWN',
 'scope','exam_runs_only','state',case when users=0 then 'EMPTY' else 'READY' end,
 'metrics',to_jsonb(c),
 'weekly_state','READY',
 'weekly',coalesce((select jsonb_agg(jsonb_build_object('week',week,'users',users,'partial',week+7>(statement_timestamp() at time zone 'Asia/Seoul')::date or week<(p_from at time zone 'Asia/Seoul')::date or week+7>(p_to at time zone 'Asia/Seoul')::date) order by week) from weekly),'[]'),
 'exams_state','READY',
 'exams',coalesce((select jsonb_agg(to_jsonb(x)) from (select e.*,ex.exam_name,u.name university from exams e left join public.essay_exams ex on ex.id=e.exam_id left join public.universities u on u.id=ex.university_id order by e.runs desc,e.exam_id limit 100)x),'[]'),
 'learning_levels_state','NOT_CONNECTED','legacy_math_coverage','SEPARATE_SOURCE_NOT_ADDED') into v from counts c;
 return v;
end$function$
;
create or replace function public.admin_member_composition(p_from timestamptz,p_to timestamptz) returns jsonb
language plpgsql stable security definer set search_path='' set statement_timeout='8s' as $$
declare result jsonb;
begin
 if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege;end if;
 if (p_from is null)<>(p_to is null) or (p_from is not null and (not isfinite(p_from) or not isfinite(p_to) or p_from>=p_to or p_to-p_from>interval '400 days')) then raise invalid_parameter_value;end if;
 with members as materialized(select u.id,p.id profile_id,p.grade_level,p.academic_status,p.neis_office_code office,p.neis_school_code school
 from auth.users u left join public.profiles p on p.id=u.id where p_from is null or (u.created_at>=p_from and u.created_at<p_to)),
 grades as(select case when academic_status='retaker' then 'N수·검정고시 등' when grade_level is not null then '고'||grade_level else '미입력' end label,count(*) count from members where profile_id is not null group by 1),
 schools as(select office,school,count(*) count from members where school is not null group by 1,2)
 select jsonb_build_object('accounts',(select count(*) from members),'profiles',(select count(profile_id) from members),'school_members',(select count(school) from members),
 'active',(select count(distinct s.user_id) from public.study_sessions s join members m on m.id=s.user_id where s.include_in_study_total and s.ended_at is not null and s.started_at<coalesce(p_to,statement_timestamp()) and s.ended_at>coalesce(p_from,statement_timestamp()-interval '30 days') and jsonb_array_length(s.active_segments)>0),
 'grades',coalesce((select jsonb_agg(to_jsonb(g) order by label) from grades g),'[]'),
 'schools',coalesce((select jsonb_agg(to_jsonb(t)) from (select coalesce(c.school_name,'학교명 확인 필요') label,s.count from schools s left join student_private.school_display_cache c on c.office_code=s.office and c.school_code=s.school order by s.count desc,s.office,s.school limit 20)t),'[]')) into result;
 return result;
end$$;
revoke all on function public.admin_member_composition(timestamptz,timestamptz) from public,anon,service_role;
grant execute on function public.admin_member_composition(timestamptz,timestamptz) to authenticated;

create or replace function public.admin_member_university_activity(p_account_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' set statement_timeout='8s' as $$
declare result jsonb;
begin
 if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege;end if;
 if p_account_id is null then raise invalid_parameter_value;end if;
 if not account_private.allowed(p_account_id) then raise insufficient_privilege;end if;
 select coalesce(jsonb_agg(to_jsonb(t)),'[]') into result from (
 select u.name university,count(*) runs,count(*) filter(where r.parent_id is null) first_runs,count(*) filter(where r.parent_id is not null) rewrites,count(*) filter(where r.state='completed') completed,max(r.created_at) latest
 from essay_exam_private.runs r join public.credit_accounts ca on ca.id=r.account_id left join public.essay_exams e on e.id=r.exam_id left join public.universities u on u.id=e.university_id
 where ca.user_id=p_account_id group by u.id,u.name order by count(*) desc,u.id)t;
 return result;
end$$;
revoke all on function public.admin_member_university_activity(uuid) from public,anon,service_role;
grant execute on function public.admin_member_university_activity(uuid) to authenticated;
commit;
