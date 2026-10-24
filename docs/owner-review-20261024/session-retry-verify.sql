-- Owner read-only verification; no member answers, tokens or ledger rows.
select jsonb_build_object(
 'table_installed',to_regclass('essay_exam_private.retry_requests') is not null,
 'functions',(select jsonb_agg(jsonb_build_object('name',p.proname,
  'anon_denied',not has_function_privilege('anon',p.oid,'EXECUTE'),
  'service_role_denied',not has_function_privilege('service_role',p.oid,'EXECUTE'),
  'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
  'worker_execute',has_function_privilege('essay_worker',p.oid,'EXECUTE'),
  'fixed_search_path',p.proconfig) order by p.proname)
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
   and p.proname in ('essay_exam_retry','essay_exam_session_claim','essay_exam_session_checkpoint','essay_exam_session_status','essay_exam_session_ready'))
) as session_retry_verification;
