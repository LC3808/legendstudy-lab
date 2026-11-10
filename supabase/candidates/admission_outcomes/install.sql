-- CANDIDATE — NOT applied to production. Owner approval required before apply_migration.
-- admin_admission_outcomes: 입시 성과(합격 현황) 관리자 집계. 마케팅/BM 소셜 프루프 + 합격률.
-- 기존 테이블/RPC는 변경하지 않는다. 신규 RPC만 추가.
--
-- 판정 기준(Owner 확정):
--   * 이벤트는 "미대체(supersedes 없음)" 것만 유효(기존 latest_event와 동일 기준의 이력).
--   * 최종 합격 = 지원 건에 accepted 또는 additional_acceptance 이벤트가 과거에 1회라도 존재.
--     → 이후 등록/미등록 이벤트가 와도 합격 사실은 보존된다(현재 상태만 보지 않는다).
--   * 1단계 합격(stage_pass)은 최종 합격에 포함하지 않는다(별도 표시).
--   * 지원 건별 중복 집계 금지(EXISTS로 건당 1회).
-- 두 합격률(분모 다름, 분모 0이면 null=프런트 '집계 전'):
--   A. 지원 건 기준 합격률 = 최종합격 지원 건 / 최종 결과 확정(최종합격 or 불합격) 지원 건.
--   B. 학생 기준 합격 경험률 = 최종합격 경험 학생 / 최종 결과 1건 이상 입력 학생.
-- 결과 미입력 지원/학생은 분모에서 제외. 개인 식별 없이 집계 수치만. 자기신고 데이터.

create or replace function public.admin_admission_outcomes(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql stable security definer set search_path to '' set statement_timeout to '8s'
as $function$
declare result jsonb;
begin
  if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege; end if;
  if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to) or p_to<=p_from or p_to-p_from>interval '400 days'
     then raise sqlstate 'PT422' using message='INVALID_PERIOD'; end if;

  with eligible as materialized (select id from public.profiles where account_private.allowed(id)),
  -- 미대체 이벤트만 유효.
  cur as (
    select e.application_id, e.kind from public.student_application_events e
    where not exists(select 1 from public.student_application_events r where r.supersedes_event_id=e.id)
  ),
  app as (
    select a.id, a.user_id, a.university_id, a.admission_type,
      exists(select 1 from cur c where c.application_id=a.id and c.kind in ('accepted','additional_acceptance')) has_accept,
      exists(select 1 from cur c where c.application_id=a.id and c.kind='stage_pass') has_stage,
      exists(select 1 from cur c where c.application_id=a.id and c.kind='rejected') has_reject,
      exists(select 1 from cur c where c.application_id=a.id and c.kind='registered') has_registered,
      exists(select 1 from cur c where c.application_id=a.id and c.kind='not_registered') has_not_registered
    from public.student_applications a join eligible el on el.id=a.user_id
    where a.created_at>=p_from and a.created_at<p_to
  ),
  uni as (select university_id, count(*) applications, count(*) filter (where has_accept) accepted from app group by university_id),
  typ as (select coalesce(nullif(btrim(admission_type),''),'미분류') label, count(*) applications, count(*) filter (where has_accept) accepted from app group by 1)
  select jsonb_build_object(
    'version','admin-admission-outcomes-v1','as_of',statement_timestamp(),'from',p_from,'to',p_to,'self_reported',true,
    'totals', jsonb_build_object(
      'applications', (select count(*) from app),
      'students', (select count(distinct user_id) from app),
      'final_accepted', (select count(*) from app where has_accept),                 -- 최종 합격 지원 건(합격 이력 보존)
      'accepted_students', (select count(distinct user_id) from app where has_accept),
      'stage_pass_only', (select count(*) from app where has_stage and not has_accept), -- 1단계만 통과(별도)
      'rejected', (select count(*) from app where has_reject and not has_accept),       -- 불합격(합격 이력 있으면 합격 우선)
      'registered', (select count(*) from app where has_registered),
      'not_registered', (select count(*) from app where has_not_registered),
      'decided_apps', (select count(*) from app where has_accept or has_reject),        -- 지원건 합격률 분모
      'result_students', (select count(distinct user_id) from app where has_accept or has_reject), -- 학생 경험률 분모
      -- A. 지원 건 기준 합격률 (분모 0 → null)
      'accept_rate_apps', (select case when count(*) filter (where has_accept or has_reject)>0
                             then round(100.0*count(*) filter (where has_accept)/count(*) filter (where has_accept or has_reject),1) else null end from app),
      -- B. 학생 기준 합격 경험률 (분모 0 → null)
      'accept_exp_rate_students', (select case when (select count(distinct user_id) from app where has_accept or has_reject)>0
                             then round(100.0*(select count(distinct user_id) from app where has_accept)/(select count(distinct user_id) from app where has_accept or has_reject),1) else null end)
    ),
    'universities', coalesce((select jsonb_agg(jsonb_build_object(
        'label', coalesce((select name from public.universities u where u.id=x.university_id),'명칭 확인 필요'),
        'applications', applications, 'accepted', accepted) order by accepted desc, applications desc)
      from (select * from uni order by accepted desc, applications desc limit 10) x), '[]'::jsonb),
    'admission_types', coalesce((select jsonb_agg(jsonb_build_object('label',label,'applications',applications,'accepted',accepted) order by accepted desc, applications desc)
      from (select * from typ order by accepted desc, applications desc limit 10) y), '[]'::jsonb),
    'state', case when not exists(select 1 from app) then 'EMPTY' else 'READY' end
  ) into result;
  return result;
end $function$;

revoke all on function public.admin_admission_outcomes(timestamptz,timestamptz) from public, anon;
grant execute on function public.admin_admission_outcomes(timestamptz,timestamptz) to authenticated;
