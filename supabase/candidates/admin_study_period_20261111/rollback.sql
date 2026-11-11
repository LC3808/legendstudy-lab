-- CANDIDATE rollback: read function only. No rows, tables, ACL or policies changed.
BEGIN;
DO $$ BEGIN
 IF md5(pg_get_functiondef('public.admin_dashboard_study(timestamptz,timestamptz)'::regprocedure)) <> '2a74d4b3612953760d4ae73403cb3f96' THEN RAISE EXCEPTION 'DASHBOARD_STUDY_ROLLBACK_DRIFT'; END IF;
END $$;
-- Captured production definition only; no data. 2026-11-11. Do not apply as a migration.
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

COMMIT;
