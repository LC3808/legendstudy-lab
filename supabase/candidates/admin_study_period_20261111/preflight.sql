-- Read only. Stop on definition or ACL drift.
BEGIN READ ONLY;
DO $guard$ BEGIN
 IF to_regprocedure('public.admin_dashboard_study(timestamptz,timestamptz)') IS NULL OR
 md5(pg_get_functiondef('public.admin_dashboard_study(timestamptz,timestamptz)'::regprocedure)) <> '755d8e824f53a2c82a2cc90cbdf660d1' THEN
 RAISE EXCEPTION 'DASHBOARD_STUDY_BASELINE_DRIFT'; END IF;
 IF (SELECT proacl::text FROM pg_proc WHERE oid='public.admin_dashboard_study(timestamptz,timestamptz)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres}' THEN
 RAISE EXCEPTION 'DASHBOARD_STUDY_ACL_DRIFT'; END IF;
END $guard$;
SELECT md5(pg_get_functiondef('public.admin_dashboard_study(timestamptz,timestamptz)'::regprocedure)) definition_hash;
ROLLBACK;
