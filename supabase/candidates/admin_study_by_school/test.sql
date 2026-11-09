-- Isolation / consistency validation for admin_study_by_school (read-only).
-- Run inline (no function needed) to confirm: schools + unregistered == total,
-- matching admin_dashboard_study's study aggregation. Verified read-only on
-- production 2026-11-09 (30d): sum_active 22 == total 22, sum_ms == total_ms.
with params as (select (now()-interval '30 days')::timestamptz p_from, now()::timestamptz p_to),
eligible as (
  select id,
    case when academic_status='retaker' then 'retaker'
         when academic_status='student' and grade_level in (1,2,3) then grade_level::text
         else 'unknown' end grade,
    neis_office_code office, neis_school_code school
  from public.profiles where account_private.allowed(id)
),
intervals as (
  select s.user_id, e.office, e.school, int8range(
    greatest(floor(extract(epoch from params.p_from)*1000)::bigint, floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint),
    least(floor(extract(epoch from params.p_to)*1000)::bigint,  floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint),'[)') span
  from public.study_sessions s join eligible e on e.id=s.user_id
  cross join params cross join lateral jsonb_array_elements(s.active_segments) v
  where s.include_in_study_total and s.ended_at>params.p_from and s.started_at<params.p_to
    and floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint>floor(extract(epoch from params.p_from)*1000)::bigint
    and floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint<floor(extract(epoch from params.p_to)*1000)::bigint
),
merged as (select user_id,office,school,range_agg(span) spans from intervals group by user_id,office,school),
study as (select user_id,office,school,sum(upper(span)-lower(span)) ms from merged cross join lateral unnest(spans) span group by user_id,office,school),
reg as (select office,school,count(*) registered_users from eligible where office is not null and school is not null group by office,school),
act as (select office,school,count(*) active_users,sum(ms) ms from study where office is not null and school is not null group by office,school),
by_school as (select coalesce(r.office,a.office) office,coalesce(r.school,a.school) school,coalesce(r.registered_users,0) registered_users,coalesce(a.active_users,0) active_users,coalesce(a.ms,0) ms from reg r full join act a using(office,school)),
unreg as (select coalesce((select count(*) from study where office is null or school is null),0) active_users, coalesce((select sum(ms) from study where office is null or school is null),0) ms),
total as (select count(*) users,coalesce(sum(ms),0) ms from study)
select
  (select coalesce(sum(active_users),0) from by_school)+(select active_users from unreg) = (select users from total) as users_consistent,
  (select coalesce(sum(ms),0) from by_school)+(select ms from unreg) = (select ms from total) as ms_consistent;
