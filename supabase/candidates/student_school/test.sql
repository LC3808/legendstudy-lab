-- Read-only validation for the student school RPCs. Run inline BEFORE any apply.
-- Confirms the student ranking aggregation reconciles with the same basis as
-- admin_study_by_school: per-school ms summed over a window equals the total ms
-- of eligible users in that window (schools + unregistered == total).
with params as (select (now()-interval '30 days')::timestamptz p_from, now()::timestamptz p_to),
eligible as (
  select id, neis_office_code office, neis_school_code school
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
act as (select office,school,count(*) active_users,sum(ms) ms from study where office is not null and school is not null group by office,school),
unreg as (select coalesce((select sum(ms) from study where office is null or school is null),0) ms),
total as (select coalesce(sum(ms),0) ms from study)
select
  (select coalesce(sum(ms),0) from act)+(select ms from unreg) = (select ms from total) as ms_consistent,
  (select count(*) from act) as school_rows;
