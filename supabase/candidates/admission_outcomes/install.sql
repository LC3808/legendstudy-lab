-- CANDIDATE — NOT applied to production. Owner approval required before apply_migration.
-- admin_admission_outcomes: 입시 성과(합격 현황) 관리자 집계. 마케팅/BM 소셜 프루프 + 합격률.
-- 기존 테이블/RPC는 변경하지 않는다. 신규 RPC만 추가.
--
-- "현재 상태" = student_application_events 중 created/details_changed 제외 + 미대체(supersedes) 최신 이벤트.
--   (기존 student_private.applications의 latest_event 판정과 동일 기준을 재사용 — 일관성.)
-- 최종 합격 = accepted + additional_acceptance (등록은 별도). 합격률 = 최종합격 / (최종합격+불합격).
-- 개인 식별 없이 집계 수치만 반환(관리자 전용).

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
  app as (
    select a.id, a.user_id, a.university_id, a.admission_type,
      (select e.kind from public.student_application_events e
         where e.application_id=a.id and e.kind not in ('created','details_changed')
           and not exists(select 1 from public.student_application_events r where r.supersedes_event_id=e.id)
         order by coalesce(e.occurred_at,e.recorded_at) desc, e.recorded_at desc, e.id desc limit 1) status
    from public.student_applications a join eligible el on el.id=a.user_id
    where a.created_at>=p_from and a.created_at<p_to
  ),
  tagged as (select *, (status in ('accepted','additional_acceptance')) is_accept, (status='rejected') is_reject from app),
  uni as (select university_id, count(*) applications, count(*) filter (where status in ('accepted','additional_acceptance')) accepted from app group by university_id),
  typ as (select coalesce(nullif(btrim(admission_type),''),'미분류') label, count(*) applications, count(*) filter (where status in ('accepted','additional_acceptance')) accepted from app group by 1)
  select jsonb_build_object(
    'version','admin-admission-outcomes-v1','as_of',statement_timestamp(),'from',p_from,'to',p_to,
    'totals', jsonb_build_object(
      'applications', (select count(*) from app),
      'students', (select count(distinct user_id) from app),
      'with_status', (select count(*) from app where status is not null),
      'final_accepted', (select count(*) from tagged where is_accept),
      'accepted_students', (select count(distinct user_id) from tagged where is_accept),
      'stage_pass', (select count(*) from app where status='stage_pass'),
      'rejected', (select count(*) from app where status='rejected'),
      'registered', (select count(*) from app where status='registered'),
      'not_registered', (select count(*) from app where status='not_registered'),
      'pending', (select count(*) from app where status is null or status in ('planned','submitted')),
      'accept_rate', (select case when count(*) filter (where is_accept or is_reject)>0
                        then round(100.0*count(*) filter (where is_accept)/count(*) filter (where is_accept or is_reject),1) else null end from tagged)
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
