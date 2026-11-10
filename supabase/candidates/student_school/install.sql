-- CANDIDATE — NOT applied to production. Owner approval required before apply_migration.
-- Student-facing school participation + ranking RPCs. SEPARATE from the admin RPCs:
-- student screens call ONLY these, never admin_study_by_school / admin_dashboard_study.
--
-- Aggregation basis is identical to admin_study_by_school (study_sessions.active_segments
-- → range_agg per user for dedup, include_in_study_total, account_private.allowed gate),
-- so school totals reconcile with the admin view. Differences from the admin RPC:
--   * no admin_operator() gate — any allowed() authenticated user may read;
--   * school scope comes from auth.uid()'s own profile (card) — a student cannot pass
--     an arbitrary school code to the card;
--   * school-level aggregates only (office_code, school_code, counts, ms) — never any
--     student identity or row-level data;
--   * ranking is min-sample gated for the per-capita metric.
--
-- BEFORE APPLY (same discipline as admin_study_by_school):
--   1) run the consistency check in test.sql in isolation (schools+unregistered == total),
--   2) confirm statement time within budget on production-size data,
--   3) confirm get_advisors reports no new security finding,
--   4) Owner approval for the operational apply_migration.

-- ---------------------------------------------------------------------------
-- 우리 학교 참여 현황 카드 — 로그인 사용자의 등록 학교 기준 집계.
-- 반환: has_school, registered_users, active_users_7d(최근 7일 기록자),
--        week_ms(이번 주 총공부시간, KST 주 시작), rank(이번 주 총시간 전국 순위 or null).
-- ---------------------------------------------------------------------------
create or replace function public.student_school_card()
returns jsonb
language plpgsql
stable security definer
set search_path to ''
set statement_timeout to '8s'
as $function$
declare
  v_uid uuid := auth.uid();
  v_office text; v_school text;
  v_week_start timestamptz;
  v_now timestamptz := now();
  v_min_recorders constant int := 3;  -- 공개 소표본 가드: 기록자 N명 미만 학교는 공개 순위에서 제외(개인 노출 방지)
  result jsonb;
begin
  if v_uid is null or not account_private.allowed(v_uid) then raise insufficient_privilege; end if;

  select neis_office_code, neis_school_code into v_office, v_school
  from public.profiles where id = v_uid;

  if v_office is null or v_school is null then
    return jsonb_build_object('version','student-school-card-v1','has_school',false,'as_of',statement_timestamp());
  end if;

  -- KST 기준 이번 주 시작(월요일 00:00) → timestamptz
  v_week_start := (date_trunc('week', (v_now at time zone 'Asia/Seoul')) at time zone 'Asia/Seoul');

  with eligible as materialized (
    select id, neis_office_code as office, neis_school_code as school
    from public.profiles where account_private.allowed(id)
  ),
  -- 전 학교 주간 집계(순위 계산용). 집계 기준은 admin_study_by_school와 동일.
  intervals as (
    select s.user_id, e.office, e.school, int8range(
      greatest(floor(extract(epoch from v_week_start)*1000)::bigint, floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint),
      least(floor(extract(epoch from v_now)*1000)::bigint,          floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint),'[)') span
    from public.study_sessions s
    join eligible e on e.id = s.user_id
    cross join lateral jsonb_array_elements(s.active_segments) v
    where s.include_in_study_total and s.ended_at > v_week_start and s.started_at < v_now
      and floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint > floor(extract(epoch from v_week_start)*1000)::bigint
      and floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint < floor(extract(epoch from v_now)*1000)::bigint
  ),
  merged as (select user_id, office, school, range_agg(span) spans from intervals group by user_id, office, school),
  study  as (select user_id, office, school, sum(upper(span)-lower(span)) ms from merged cross join lateral unnest(spans) span group by user_id, office, school),
  by_school as (
    select office, school, count(*) active_users, sum(ms) ms
    from study where office is not null and school is not null
    group by office, school
  ),
  -- 공개 순위는 기록자 v_min_recorders명 이상 학교만. 1~2명 학교의 총시간은 개인 공부시간을 사실상 노출하므로 순위 미부여(null).
  ranked as (select office, school, rank() over (order by ms desc) rnk from by_school where active_users >= v_min_recorders)
  select jsonb_build_object(
    'version','student-school-card-v1',
    'has_school', true,
    'office_code', v_office,
    'school_code', v_school,
    'registered_users', (select count(*) from eligible where office = v_office and school = v_school),
    'active_users_7d', (
      select count(distinct s.user_id)
      from public.study_sessions s join eligible e on e.id = s.user_id
      where e.office = v_office and e.school = v_school
        and s.include_in_study_total and s.ended_at > v_now - interval '7 days'
    ),
    'min_recorders', v_min_recorders,
    -- 이번 주 기록자 수(본인 학교). 소표본 안내(랭킹 잠금/필요 인원)에 사용. 카운트만 공개.
    'week_recorders', coalesce((select active_users from by_school where office = v_office and school = v_school), 0),
    -- 총공부시간/순위는 기록자 하한 이상에서만 공개. 미만이면 null(랭킹 잠금) → 프런트는 "곧 열려요" 안내.
    'week_ms', (select case when active_users >= v_min_recorders then ms else null end from by_school where office = v_office and school = v_school),
    'rank', (select rnk from ranked where office = v_office and school = v_school),
    'recorders_needed', greatest(0, v_min_recorders - coalesce((select active_users from by_school where office = v_office and school = v_school), 0)),
    'as_of', statement_timestamp()
  ) into result;
  return result;
end $function$;

-- ---------------------------------------------------------------------------
-- 학교별 TOP 랭킹 — 기간/지표별 학교 리더보드(학교 단위 집계만).
-- p_period: 'week' | 'last_week' | 'month'
-- p_metric: 'total'(총시간, 기록자>=3) | 'average'(1인당 평균, 기록자>=3) | 'registered'(가입 수, registered>=1)
-- 공개 기준은 서버 상수로 고정(총시간·평균 모두 기록자>=3). 클라이언트가 기준을 낮출 수
-- 있는 입력 파라미터는 두지 않는다(우회 방지). 기준 미달 학교의 ms/avg_ms는 반환 단계에서 null.
-- 가입 학생 수(registered_users)는 본인 학교만 실제 값, 다른 학교는 null로 반환(순위는 유지).
-- 반환: top[10], my_school(or null), around(내 학교 주변), school_count.
-- ---------------------------------------------------------------------------
create or replace function public.student_school_ranking(
  p_period text default 'week',
  p_metric text default 'total'
)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
set statement_timeout to '8s'
as $function$
declare
  v_uid uuid := auth.uid();
  v_office text; v_school text;
  v_from timestamptz; v_to timestamptz := now();
  v_week_start timestamptz;
  v_min_recorders constant int := 3;  -- 서버 강제: 총시간 공개 최소 기록자
  v_min_users     constant int := 3;  -- 서버 강제: 평균 공개 최소 기록자(2026-11-10 5→3 통일)
  result jsonb;
begin
  if v_uid is null or not account_private.allowed(v_uid) then raise insufficient_privilege; end if;
  if p_period not in ('week','last_week','month') then raise sqlstate 'PT422' using message='INVALID_PERIOD'; end if;
  if p_metric not in ('total','average','registered') then raise sqlstate 'PT422' using message='INVALID_METRIC'; end if;

  v_week_start := (date_trunc('week', (v_to at time zone 'Asia/Seoul')) at time zone 'Asia/Seoul');
  if p_period = 'week' then v_from := v_week_start;
  elsif p_period = 'last_week' then v_from := v_week_start - interval '7 days'; v_to := v_week_start;
  else v_from := v_to - interval '30 days';
  end if;

  select neis_office_code, neis_school_code into v_office, v_school
  from public.profiles where id = v_uid;

  with eligible as materialized (
    select id, neis_office_code as office, neis_school_code as school
    from public.profiles where account_private.allowed(id)
  ),
  intervals as (
    select s.user_id, e.office, e.school, int8range(
      greatest(floor(extract(epoch from v_from)*1000)::bigint, floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint),
      least(floor(extract(epoch from v_to)*1000)::bigint,      floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint),'[)') span
    from public.study_sessions s
    join eligible e on e.id = s.user_id
    cross join lateral jsonb_array_elements(s.active_segments) v
    where s.include_in_study_total and s.ended_at > v_from and s.started_at < v_to
      and floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint > floor(extract(epoch from v_from)*1000)::bigint
      and floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint < floor(extract(epoch from v_to)*1000)::bigint
  ),
  merged as (select user_id, office, school, range_agg(span) spans from intervals group by user_id, office, school),
  study  as (select user_id, office, school, sum(upper(span)-lower(span)) ms from merged cross join lateral unnest(spans) span group by user_id, office, school),
  reg as (select office, school, count(*) registered_users from eligible where office is not null and school is not null group by office, school),
  act as (select office, school, count(*) active_users, sum(ms) ms from study where office is not null and school is not null group by office, school),
  by_school as (
    select coalesce(r.office,a.office) office, coalesce(r.school,a.school) school,
           coalesce(r.registered_users,0) registered_users,
           coalesce(a.active_users,0) active_users, coalesce(a.ms,0) ms,
           case when coalesce(a.active_users,0)>0 then a.ms/a.active_users else 0 end avg_ms,
           -- 공개 가드(API 반환 단계 마스킹): 총시간/평균 모두 기록자 < 3이면 null(2026-11-10 통일).
           case when coalesce(a.active_users,0)>=v_min_recorders then a.ms else null end pub_ms,
           case when coalesce(a.active_users,0)>=v_min_users then (a.ms/a.active_users) else null end pub_avg,
           -- 가입 학생 수 비공개: 본인 학교만 실제 값, 다른 학교는 null(순위는 실제값으로 산출, 반환만 마스킹).
           case when coalesce(r.office,a.office)=v_office and coalesce(r.school,a.school)=v_school
                then coalesce(r.registered_users,0) else null end pub_registered
    from reg r full join act a using (office, school)
  ),
  -- 지표별 자격 필터 + 순위. total은 기록자 하한 이상만 공개.
  qualified as (
    select *, case p_metric
        when 'total' then ms
        when 'average' then avg_ms
        else registered_users::bigint end sort_key
    from by_school
    where (p_metric='total' and active_users>=v_min_recorders)
       or (p_metric='average' and active_users>=v_min_users)
       or (p_metric='registered' and registered_users>=1)
  ),
  ranked as (select *, rank() over (order by sort_key desc, office, school) rnk from qualified)
  select jsonb_build_object(
    'version','student-school-ranking-v1',
    'metric', p_metric, 'period', p_period, 'min_users', v_min_users, 'min_recorders', v_min_recorders,
    'as_of', statement_timestamp(),
    'school_count', (select count(*) from qualified),
    'top', coalesce((select jsonb_agg(row_json order by rnk) from (
        select rnk, jsonb_build_object('office_code',office,'school_code',school,'registered_users',pub_registered,'active_users',active_users,'ms',pub_ms,'avg_ms',pub_avg,'rank',rnk) row_json
        from ranked where rnk <= 10) t), '[]'::jsonb),
    'my_school', (select jsonb_build_object('office_code',office,'school_code',school,'registered_users',pub_registered,'active_users',active_users,'ms',pub_ms,'avg_ms',pub_avg,'rank',rnk)
                  from ranked where office = v_office and school = v_school),
    'around', coalesce((select jsonb_agg(jsonb_build_object('office_code',office,'school_code',school,'registered_users',pub_registered,'active_users',active_users,'ms',pub_ms,'avg_ms',pub_avg,'rank',rnk) order by rnk)
                  from ranked where rnk between
                    (select rnk from ranked where office = v_office and school = v_school) - 2 and
                    (select rnk from ranked where office = v_office and school = v_school) + 2), '[]'::jsonb)
  ) into result;
  return result;
end $function$;

revoke all on function public.student_school_card() from public, anon;
revoke all on function public.student_school_ranking(text,text) from public, anon;
grant execute on function public.student_school_card() to authenticated;
grant execute on function public.student_school_ranking(text,text) to authenticated;
