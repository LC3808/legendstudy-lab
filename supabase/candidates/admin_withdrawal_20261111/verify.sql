-- Read-only installation checks. This does not impersonate an admin or mutate a real account.
BEGIN READ ONLY;
DO $$DECLARE sig text; f record; BEGIN
 FOREACH sig IN ARRAY ARRAY['public.admin_withdrawal_list(text,text,text,integer,integer,jsonb)','public.admin_withdrawal_detail(uuid)'] LOOP
  SELECT * INTO f FROM pg_proc WHERE oid=to_regprocedure(sig);
  IF NOT FOUND THEN RAISE EXCEPTION 'RPC missing: %',sig; END IF;
  IF NOT f.prosecdef OR f.provolatile<>'s' OR NOT (f.proconfig @> ARRAY['search_path=""','statement_timeout=8s']) THEN RAISE EXCEPTION 'Unsafe configuration: %',sig; END IF;
  IF has_function_privilege('anon',sig,'EXECUTE') OR has_function_privilege('service_role',sig,'EXECUTE') OR NOT has_function_privilege('authenticated',sig,'EXECUTE') THEN RAISE EXCEPTION 'ACL mismatch: %',sig; END IF;
 END LOOP;
END$$;
SELECT count(*) FILTER(WHERE state='DELETION_PENDING' AND error_code IS NULL) pending,
 count(*) FILTER(WHERE state='ERASING' AND error_code IS NULL) processing,
 count(*) FILTER(WHERE state IN ('DELETION_PENDING','ERASING') AND error_code IS NOT NULL) failed,
 count(*) FILTER(WHERE state='ERASED' AND completed_at>=statement_timestamp()-interval '30 days') completed30
FROM public.account_deletion_requests WHERE expires_at IS NULL OR expires_at>statement_timestamp();
SELECT n.nspname,p.proname,md5(pg_get_functiondef(p.oid)) definition_hash FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname||'.'||p.proname IN ('public.admin_operator','account_private.allowed','public.admin_student360','public.admin_member_list','public.my_home_configuration','student_private.study_summary','public.save_my_home_configuration') ORDER BY 1,2;
COMMIT;
