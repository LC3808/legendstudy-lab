-- Read-only validation for admin_admission_outcomes (run BEFORE apply; no writes).
-- 현재 상태 판정 = created/details_changed 제외 + 미대체(supersedes) 최신 이벤트(기존 latest_event와 동일 기준).
with eligible as (select id from public.profiles where account_private.allowed(id)),
app as (select a.id,a.user_id,a.university_id,a.admission_type,
  (select e.kind from public.student_application_events e
     where e.application_id=a.id and e.kind not in ('created','details_changed')
       and not exists(select 1 from public.student_application_events r where r.supersedes_event_id=e.id)
     order by coalesce(e.occurred_at,e.recorded_at) desc, e.recorded_at desc, e.id desc limit 1) status
  from public.student_applications a join eligible el on el.id=a.user_id)
select count(*) applications, count(*) filter (where status is not null) with_status,
  count(*) filter (where status in ('accepted','additional_acceptance')) final_accepted,
  count(*) filter (where status='stage_pass') stage_pass,
  count(*) filter (where status='rejected') rejected
from app;
