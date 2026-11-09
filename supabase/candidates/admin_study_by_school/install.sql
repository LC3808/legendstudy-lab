-- CANDIDATE — NOT applied to production. Owner approval required before apply_migration.
-- admin_study_by_school: 학교별 공부시간 집계 (관리자 전용).
-- 집계 기준은 admin_dashboard_study와 동일(study_sessions.active_segments → range_agg로
-- 사용자별 중복 제거, include_in_study_total, account_private.allowed 게이트, 학년 버킷).
-- group by 축만 학교(neis_office_code, neis_school_code)로 바꾸고,
--   registered_users(유효 가입자) 와 active_users(기간 내 기록자)를 구분한다.
-- 정합성: sum(schools.ms) + unregistered.ms == total.ms (격리 검증에서 확인).

create or replace function public.admin_study_by_school(
  p_from timestamptz,
  p_to timestamptz,
  p_grade text default null,     -- NULL=전체, '1'|'2'|'3'|'retaker'|'unknown'
  p_min_users int default 5      -- 평균 랭킹 최소 기록자(운영 설정 가능). 응답에 echo하며 집계에는 영향 없음.
)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
set statement_timeout to '8s'
as $function$
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
end $function$;

revoke all on function public.admin_study_by_school(timestamptz,timestamptz,text,int) from public, anon;
grant execute on function public.admin_study_by_school(timestamptz,timestamptz,text,int) to authenticated;
