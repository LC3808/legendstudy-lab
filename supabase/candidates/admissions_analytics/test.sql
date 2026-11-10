-- Read-only validation for admin_admissions_analytics (run BEFORE apply; no writes).
-- 1) 희망 대학: 대학×학년도 UNIQUE → 대학별 학생수==기록수. 평균 희망 수 = 기록/학생.
with eligible as (select id, intended_major from public.profiles where account_private.allowed(id)),
tgt as (select t.user_id,t.university_id,t.priority from public.student_target_universities t join eligible e on e.id=t.user_id)
select count(distinct user_id) asp_students, count(*) asp_records,
  round(count(*)::numeric/nullif(count(distinct user_id),0),2) avg_per_student,
  (select bool_and(s=r) from (select count(distinct user_id) s, count(*) r from tgt group by university_id) z) as per_univ_students_eq_records
from tgt;

-- 2) 희망 전공 분포(현재 스냅샷).
select intended_major, count(*) students from public.profiles
where account_private.allowed(id) and intended_major is not null and btrim(intended_major)<>'' group by 1 order by 2 desc;

-- 3) 실제 지원: dedup 제약 없음 → 학생당 지원 수 분리 유의미. 전형 분포.
with eligible as (select id from public.profiles where account_private.allowed(id)),
app as (select a.user_id,a.university_id,a.admission_type from public.student_applications a join eligible e on e.id=a.user_id)
select count(distinct user_id) students, count(*) records,
  (select count(*) from public.profiles where account_private.allowed(id) and (academic_status='retaker' or (academic_status='student' and grade_level=3))) eligible_hs3_retaker
from app;
