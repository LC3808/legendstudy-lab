-- CANDIDATE — NOT applied to production. Owner approval required before apply_migration.
-- admin_admissions_analytics: 관리자 대시보드 '학습·입시 종합 현황' 개편용.
-- 기존 admin_learning_analytics는 변경하지 않는다(그대로 유지). 이 RPC는 희망 대학과
-- 실제 지원을 "서로 다른 축"으로 분리해 세분화한다.
--
-- 핵심 근거(검증됨):
--   * student_target_universities: UNIQUE(user_id, university_id, admission_year) → 대학×학년도당 1건.
--     따라서 대학별 학생수==기록수(중복). 의미 있는 건 "학생당 평균 희망 수"와 1지망(priority=1).
--   * student_applications: dedup UNIQUE 없음 → 한 학생이 같은 대학에 복수 전형/학과 지원 가능.
--     따라서 지원은 기록수 ≫ 학생수가 정상. 전형구분(admission_type)·학생당 지원 수가 핵심.
--   * 실제 지원 대상 = 고3 + N수(재수생). 희망 전공 = profiles.intended_major(현재 스냅샷).
-- 기간(p_from,p_to): targets/applications는 created_at 기준. majors/eligible은 현재 스냅샷(타임스탬프 없음).

create or replace function public.admin_admissions_analytics(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql stable security definer set search_path to '' set statement_timeout to '8s'
as $function$
declare result jsonb;
begin
  if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege; end if;
  if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to) or p_to<=p_from or p_to-p_from>interval '400 days'
     then raise sqlstate 'PT422' using message='INVALID_PERIOD'; end if;

  with eligible as materialized (
    select id, academic_status, grade_level, intended_major from public.profiles where account_private.allowed(id)
  ),
  -- 희망 대학(기간 내 생성, 현재 남아 있는 기록)
  tgt as (
    select t.user_id, t.university_id, t.priority
    from public.student_target_universities t join eligible e on e.id=t.user_id
    where t.created_at>=p_from and t.created_at<p_to
  ),
  tgt_uni as (
    select university_id, count(distinct user_id) students,
           count(*) filter (where priority=1) priority1
    from tgt group by university_id
  ),
  -- 희망 전공(현재 스냅샷)
  majors as (
    select intended_major label, count(*) students from eligible
    where intended_major is not null and btrim(intended_major)<>'' group by intended_major
  ),
  -- 실제 지원(기간 내 생성). 복수 지원 허용 → 기록수/학생수 분리 유의미.
  app as (
    select a.user_id, a.university_id, a.admission_type
    from public.student_applications a join eligible e on e.id=a.user_id
    where a.created_at>=p_from and a.created_at<p_to
  ),
  app_uni as (select university_id, count(distinct user_id) students, count(*) records from app group by university_id),
  app_type as (select coalesce(nullif(btrim(admission_type),''),'미분류') label, count(distinct user_id) students, count(*) records from app group by 1),
  elig as (select count(*) c from eligible where academic_status='retaker' or (academic_status='student' and grade_level=3))
  select jsonb_build_object(
    'version','admin-admissions-analytics-v1','as_of',statement_timestamp(),'from',p_from,'to',p_to,'timezone','Asia/Seoul',
    'aspiration', jsonb_build_object(
      'students', (select count(distinct user_id) from tgt),
      'records', (select count(*) from tgt),
      'avg_per_student', (select case when count(distinct user_id)>0 then round(count(*)::numeric/count(distinct user_id),2) else 0 end from tgt),
      'major_students', (select coalesce(sum(students),0) from majors),
      'universities', coalesce((select jsonb_agg(jsonb_build_object(
          'label', coalesce((select name from public.universities u where u.id=tu.university_id),'명칭 확인 필요'),
          'students', students, 'priority1', priority1) order by students desc, priority1 desc)
        from (select * from tgt_uni order by students desc, priority1 desc limit 10) tu), '[]'::jsonb),
      'majors', coalesce((select jsonb_agg(jsonb_build_object('label',label,'students',students) order by students desc, label)
        from (select * from majors order by students desc, label limit 10) m), '[]'::jsonb)
    ),
    'application', jsonb_build_object(
      'eligible', (select c from elig),
      'students', (select count(distinct user_id) from app),
      'records', (select count(*) from app),
      'coverage_pct', (select case when (select c from elig)>0 then round(100.0*(select count(distinct user_id) from app)/(select c from elig),1) else 0 end),
      'avg_per_student', (select case when count(distinct user_id)>0 then round(count(*)::numeric/count(distinct user_id),2) else 0 end from app),
      'universities', coalesce((select jsonb_agg(jsonb_build_object(
          'label', coalesce((select name from public.universities u where u.id=au.university_id),'명칭 확인 필요'),
          'students', students, 'records', records) order by records desc, students desc)
        from (select * from app_uni order by records desc, students desc limit 10) au), '[]'::jsonb),
      'admission_types', coalesce((select jsonb_agg(jsonb_build_object('label',label,'students',students,'records',records) order by records desc, label)
        from (select * from app_type order by records desc, label limit 10) at), '[]'::jsonb)
    ),
    'state', case when not exists(select 1 from tgt) and not exists(select 1 from app) and not exists(select 1 from majors) then 'EMPTY' else 'READY' end
  ) into result;
  return result;
end $function$;

revoke all on function public.admin_admissions_analytics(timestamptz,timestamptz) from public, anon;
grant execute on function public.admin_admissions_analytics(timestamptz,timestamptz) to authenticated;
