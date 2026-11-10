-- CANDIDATE — NOT applied to production. Owner approval required before apply_migration.
-- admin_applications_list: 관리자 상세 화면용 "개별 지원 목록" (누가·어디에·전형·상태).
-- 기존 테이블/RPC는 변경하지 않는다. 신규 RPC만 추가. operator 전용(개인 식별 포함 → 엄격 게이트).
-- 현재 상태 = created/details_changed 제외 + 미대체 최신 이벤트(기존 latest_event와 동일 기준).
-- ever_accepted = accepted/additional_acceptance 이력 보존(등록/미등록 이후에도 합격 표시용).
-- 페이지네이션(25/페이지). 기간 필터 없음(지원은 희소·입력 분산 → 로스터는 전체 표시).

create or replace function public.admin_applications_list(p_offset int default 0)
returns jsonb
language plpgsql stable security definer set search_path to '' set statement_timeout to '8s'
as $function$
declare result jsonb;
begin
  if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege; end if;
  if p_offset is null or p_offset<0 or p_offset>100000 then raise check_violation; end if;

  with eligible as materialized (
    select id, display_name, neis_office_code, neis_school_code, academic_status, grade_level
    from public.profiles where account_private.allowed(id)
  ),
  base as (select a.* from public.student_applications a join eligible e on e.id=a.user_id),
  page as (select * from base order by created_at desc, id desc offset p_offset limit 25)
  select jsonb_build_object(
    'version','admin-applications-list-v1','offset',p_offset,'limit',25,
    'total', (select count(*) from base),
    'has_more', exists(select 1 from base order by created_at desc, id desc offset p_offset+25 limit 1),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'application_id', a.id,
        'student_name', coalesce(nullif(btrim(e.display_name),''),'이름 미설정'),
        'office_code', e.neis_office_code, 'school_code', e.neis_school_code,
        'student_status', e.academic_status, 'grade_level', e.grade_level,
        'university', coalesce((select name from public.universities u where u.id=a.university_id),'명칭 확인 필요'),
        'intended_division', a.intended_division,
        'admission_type', a.admission_type,
        'admission_name', a.admission_name,
        'admission_year', a.admission_year,
        'created_at', a.created_at,
        'status', (select ev.kind from public.student_application_events ev
                     where ev.application_id=a.id and ev.kind not in ('created','details_changed')
                       and not exists(select 1 from public.student_application_events r where r.supersedes_event_id=ev.id)
                     order by coalesce(ev.occurred_at,ev.recorded_at) desc, ev.recorded_at desc, ev.id desc limit 1),
        'ever_accepted', exists(select 1 from public.student_application_events ev
                                  where ev.application_id=a.id and ev.kind in ('accepted','additional_acceptance')
                                    and not exists(select 1 from public.student_application_events r where r.supersedes_event_id=ev.id))
      ) order by a.created_at desc, a.id desc)
      from page a join eligible e on e.id=a.user_id), '[]'::jsonb)
  ) into result;
  return result;
end $function$;

revoke all on function public.admin_applications_list(int) from public, anon;
grant execute on function public.admin_applications_list(int) to authenticated;
