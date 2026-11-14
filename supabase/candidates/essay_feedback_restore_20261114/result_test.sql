-- LOCAL synthetic baseline only; all fixture writes roll back.
begin;
insert into public.universities(id,name) values('91000000-0000-4000-8000-000000000001','Fixture University');
insert into public.essay_exams(id,university_id,exam_name) values('91000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001','Fixture Exam');
insert into essay_exam_private.runs(id,account_id,exam_id,state,snapshot,result)
select '91000000-0000-4000-8000-000000000003',id,'91000000-0000-4000-8000-000000000002','completed',
'{"answers":[{"questionId":"91000000-0000-4000-8000-000000000004","answer":"synthetic"},{"questionId":"91000000-0000-4000-8000-000000000005","answer":"other question"}]}',
'{"questions":[{"questionId":"91000000-0000-4000-8000-000000000004","evaluation":{"summary":"fixture","local_reviews":"private review"},"telemetry":"private telemetry"},{"questionId":"91000000-0000-4000-8000-000000000005","evaluation":{"summary":"other question"}}]}'
from public.credit_accounts where user_id='00000000-0000-4000-8000-000000000002';
select set_config('test.actor','00000000-0000-4000-8000-000000000001',true);
select set_config('test.admin','false',true);
set local role authenticated;
do $$declare p jsonb='{"request_key":"91000000-0000-4000-8000-000000000006","kind":"quality","satisfaction":"helpful","platform":"ios","app_version":"fixture","evaluation_ref":"91000000-0000-4000-8000-000000000003/91000000-0000-4000-8000-000000000004"}'; f uuid; d jsonb;
begin
 begin perform public.essay_feedback_submit(p);raise exception 'expected owner denial';exception when insufficient_privilege then null;end;
 perform set_config('test.actor','00000000-0000-4000-8000-000000000002',true);
 f=public.essay_feedback_submit(p);
 begin perform public.admin_essay_feedback_result(f);raise exception 'expected admin denial';exception when insufficient_privilege then null;end;
 perform set_config('test.actor','00000000-0000-4000-8000-000000000001',true);
 perform set_config('test.admin','true',true);
 d=public.admin_essay_feedback_result(f);
 assert jsonb_array_length(d->'runs')=1;
 assert jsonb_array_length(d->'runs'->0->'answers')=1;
 assert jsonb_array_length(d->'runs'->0->'result'->'questions')=1;
 assert d::text not like '%private review%';
 assert d::text not like '%private telemetry%';
 assert d::text not like '%other question%';
end $$;
rollback;
