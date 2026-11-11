-- Post-apply read-only metadata guard. Signed admin/non-admin API checks remain separate.
BEGIN READ ONLY;
DO $$ DECLARE f record; BEGIN
 SELECT * INTO f FROM pg_proc WHERE oid=to_regprocedure('public.admin_dashboard_study(timestamptz,timestamptz)');
 IF NOT FOUND OR md5(pg_get_functiondef(f.oid))<>'2a74d4b3612953760d4ae73403cb3f96' THEN RAISE EXCEPTION 'CANDIDATE_DEFINITION_MISMATCH'; END IF;
 IF f.proacl::text IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres}' OR NOT f.prosecdef OR f.provolatile<>'s'
 OR NOT f.proconfig @> ARRAY['search_path=""','statement_timeout=8s'] THEN RAISE EXCEPTION 'CANDIDATE_SECURITY_MISMATCH'; END IF;
END $$;
ROLLBACK;
