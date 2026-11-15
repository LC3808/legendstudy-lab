\set ON_ERROR_STOP on
\ir admin_learning_analytics.baseline.sql
\ir admin_applications_list.baseline.sql
REVOKE ALL ON FUNCTION public.admin_learning_analytics(timestamptz,timestamptz),public.admin_applications_list(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_learning_analytics(timestamptz,timestamptz),public.admin_applications_list(integer) TO authenticated;
CREATE TEMP TABLE before_contract AS SELECT oid,proacl,md5(pg_get_functiondef(oid)) hash FROM pg_proc WHERE proname IN ('admin_learning_analytics','admin_applications_list');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
CREATE TEMP TABLE before_result AS SELECT public.admin_learning_analytics('2026-11-01 00:00+09','2026-11-03 00:00+09') payload;
\ir apply.sql
DO $$DECLARE old jsonb; new jsonb; k text; BEGIN
 SELECT payload INTO old FROM before_result;
 new=public.admin_learning_analytics('2026-11-01 00:00+09','2026-11-03 00:00+09');
 FOR k IN SELECT jsonb_object_keys(old->'metrics') LOOP ASSERT old->'metrics'->k=new->'metrics'->k, k; END LOOP;
 ASSERT old->'rows'=new->'rows'; ASSERT old->'state'=new->'state';
 ASSERT NOT EXISTS(SELECT FROM before_contract b JOIN pg_proc p USING(oid) WHERE p.proacl IS DISTINCT FROM b.proacl);
 ASSERT NOT has_function_privilege('anon','public.admin_learning_analytics(timestamptz,timestamptz)','EXECUTE');
END$$;
SET ROLE authenticated;
\ir local_test.sql
RESET ROLE;
\ir rollback.sql
DO $$BEGIN ASSERT NOT EXISTS(SELECT FROM before_contract b JOIN pg_proc p USING(oid) WHERE p.proacl IS DISTINCT FROM b.proacl OR md5(pg_get_functiondef(p.oid))<>b.hash); END$$;
\ir apply.sql
