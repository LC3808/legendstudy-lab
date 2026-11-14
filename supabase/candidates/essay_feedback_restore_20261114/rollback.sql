-- Disable new UI first. Retain all submitted facts and audit history.
begin;
revoke execute on function public.essay_feedback_submit(jsonb),public.essay_feedback_mine(integer),public.admin_essay_feedback(jsonb),public.admin_essay_feedback_update(uuid,text,text,timestamptz),public.admin_essay_feedback_result(uuid) from authenticated;
notify pgrst,'reload schema';
commit;
