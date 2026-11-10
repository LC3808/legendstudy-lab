-- Read-only validation for admin_applications_list (run BEFORE apply; no writes).
-- 개별 지원 로스터: allowed 학생의 지원을 created_at desc 페이지. 현재 상태=미대체 최신 이벤트, ever_accepted 보존.
with eligible as (select id, display_name, neis_office_code, neis_school_code from public.profiles where account_private.allowed(id)),
base as (select a.* from public.student_applications a join eligible e on e.id=a.user_id)
select (select count(*) from base) total,
  (select jsonb_agg(jsonb_build_object('student',coalesce(nullif(btrim(e.display_name),''),'이름 미설정'),
     'university',(select name from public.universities u where u.id=a.university_id),'division',a.intended_division,
     'type',a.admission_type,'name',a.admission_name,'year',a.admission_year,
     'status',(select ev.kind from public.student_application_events ev where ev.application_id=a.id and ev.kind not in ('created','details_changed')
                 and not exists(select 1 from public.student_application_events r where r.supersedes_event_id=ev.id)
               order by coalesce(ev.occurred_at,ev.recorded_at) desc, ev.recorded_at desc, ev.id desc limit 1)) order by a.created_at desc)
   from (select * from base order by created_at desc, id desc limit 25) a join eligible e on e.id=a.user_id) items;
