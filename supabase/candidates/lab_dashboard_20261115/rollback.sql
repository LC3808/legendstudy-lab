BEGIN;
SET LOCAL lock_timeout='3s';
DO $guard$ BEGIN
 IF md5((SELECT prosrc FROM pg_proc WHERE oid='public.admin_lab_dashboard_summary(timestamptz,timestamptz,text)'::regprocedure)) IS DISTINCT FROM 'a81cb100c99d8135af76342eae1832e2' THEN RAISE EXCEPTION 'FUNCTION_DRIFT'; END IF;
END $guard$;
DROP FUNCTION public.admin_lab_dashboard_summary(timestamptz,timestamptz,text);
NOTIFY pgrst,'reload schema';
COMMIT;
