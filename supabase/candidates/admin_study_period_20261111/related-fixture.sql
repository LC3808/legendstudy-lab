-- Production function definitions for isolated regression only. No production data.
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

CREATE OR REPLACE FUNCTION public.admin_member_composition(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '8s'
AS $function$
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
 'schools',coalesce((select jsonb_agg(to_jsonb(t)) from (select coalesce(c.school_name,'학교명 확인 필요') label,s.office office_code,s.school school_code,s.count from schools s left join student_private.school_display_cache c on c.office_code=s.office and c.school_code=s.school order by s.count desc,s.office,s.school limit 20)t),'[]')) into result;
 return result;
end$function$
;

CREATE OR REPLACE FUNCTION public.admin_study_by_school(p_from timestamp with time zone, p_to timestamp with time zone, p_grade text DEFAULT NULL::text, p_min_users integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '8s'
AS $function$
declare result jsonb;
begin
  if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege; end if;
  if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to)
     or p_to<=p_from or p_to-p_from>interval '400 days' then raise sqlstate 'PT422' using message='INVALID_PERIOD'; end if;
  if p_grade is not null and p_grade not in ('1','2','3','retaker','unknown') then raise sqlstate 'PT422' using message='INVALID_GRADE'; end if;
  if p_min_users is null or p_min_users < 1 then p_min_users := 1; end if;

  with eligible as materialized (
    select id,
      case when academic_status='retaker' then 'retaker'
           when academic_status='student' and grade_level in (1,2,3) then grade_level::text
           else 'unknown' end as grade,
      neis_office_code as office, neis_school_code as school
    from public.profiles
    where account_private.allowed(id)
  ),
  eligible_f as (select * from eligible where p_grade is null or grade = p_grade),
  intervals as (
    select s.user_id, e.office, e.school, int8range(
      greatest(floor(extract(epoch from p_from)*1000)::bigint, floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint),
      least(floor(extract(epoch from p_to)*1000)::bigint,  floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint),'[)') span
    from public.study_sessions s
    join eligible_f e on e.id = s.user_id
    cross join lateral jsonb_array_elements(s.active_segments) v
    where s.include_in_study_total and s.ended_at > p_from and s.started_at < p_to
      and floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint > floor(extract(epoch from p_from)*1000)::bigint
      and floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint < floor(extract(epoch from p_to)*1000)::bigint
  ),
  merged as (select user_id, office, school, range_agg(span) spans from intervals group by user_id, office, school),
  study  as (select user_id, office, school, sum(upper(span)-lower(span)) ms from merged cross join lateral unnest(spans) span group by user_id, office, school),
  reg as (select office, school, count(*) registered_users from eligible_f where office is not null and school is not null group by office, school),
  act as (select office, school, count(*) active_users, sum(ms) ms from study where office is not null and school is not null group by office, school),
  by_school as (
    select coalesce(r.office, a.office) office, coalesce(r.school, a.school) school,
           coalesce(r.registered_users,0) registered_users,
           coalesce(a.active_users,0) active_users, coalesce(a.ms,0) ms
    from reg r full join act a using (office, school)
  ),
  unreg as (
    select (select count(*) from eligible_f where office is null or school is null) registered_users,
           coalesce((select count(*) from study where office is null or school is null),0) active_users,
           coalesce((select sum(ms) from study where office is null or school is null),0) ms
  ),
  total as (select count(*) users, coalesce(sum(ms),0) ms from study)
  select jsonb_build_object(
    'version','admin-study-by-school-v1',
    'as_of', statement_timestamp(),
    'grade', coalesce(p_grade,'all'),
    'min_users', p_min_users,
    'total', (select jsonb_build_object('users',users,'ms',ms) from total),
    'unregistered', (select jsonb_build_object('registered_users',registered_users,'active_users',active_users,'ms',ms) from unreg),
    'schools', coalesce((select jsonb_agg(jsonb_build_object(
        'office_code', office, 'school_code', school,
        'registered_users', registered_users, 'active_users', active_users,
        'ms', ms, 'avg_ms', case when active_users>0 then (ms/active_users) else 0 end
      ) order by ms desc) from by_school), '[]'::jsonb)
  ) into result;
  return result;
end $function$
;
