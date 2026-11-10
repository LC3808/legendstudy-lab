-- Read-only validation for admin_admission_outcomes (run BEFORE apply; no writes).
-- 최종합격 = 미대체 accepted/additional_acceptance 이벤트 EXISTS(등록/미등록 이후에도 보존, 건당 1회).
-- 두 합격률: A 지원건=최종합격÷(최종합격+불합격), B 학생=최종합격경험학생÷결과입력학생. 분모 0 → null(집계 전).
with eligible as (select id from public.profiles where account_private.allowed(id)),
cur as (select e.application_id,e.kind from public.student_application_events e
        where not exists(select 1 from public.student_application_events r where r.supersedes_event_id=e.id)),
app as (select a.id,a.user_id,
  exists(select 1 from cur c where c.application_id=a.id and c.kind in ('accepted','additional_acceptance')) has_accept,
  exists(select 1 from cur c where c.application_id=a.id and c.kind='rejected') has_reject
  from public.student_applications a join eligible el on el.id=a.user_id)
select count(*) applications,
  count(*) filter (where has_accept) final_accepted,
  count(*) filter (where has_accept or has_reject) decided_apps,
  (select count(distinct user_id) from app where has_accept or has_reject) result_students,
  case when count(*) filter (where has_accept or has_reject)>0 then round(100.0*count(*) filter (where has_accept)/count(*) filter (where has_accept or has_reject),1) end accept_rate_apps
from app;
