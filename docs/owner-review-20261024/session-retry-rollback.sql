-- Empty install only. After use, retain retry history and roll forward/review
-- reserved runs before changing the runtime; never fall back to per-question billing.
begin;
do $$begin
 if exists(select 1 from essay_exam_private.retry_requests) then
  raise exception 'NONEMPTY_RETRY_ROLLBACK_DENIED';end if;
end$$;
drop function public.essay_exam_session_checkpoint(uuid,uuid,uuid,text,text,uuid,jsonb);
drop function public.essay_exam_session_claim(uuid,uuid,uuid);
drop function public.essay_exam_retry(uuid,uuid,uuid,uuid);
drop function public.essay_exam_session_status(uuid);
drop function public.essay_exam_session_ready();
drop table essay_exam_private.retry_requests;
commit;
