-- Read only. Function signatures, timeout, grants and drift guard are unchanged.
SELECT proname, md5(pg_get_functiondef(oid)) definition_hash,prosecdef,proconfig,proacl
FROM pg_proc WHERE oid IN ('public.admin_learning_analytics(timestamptz,timestamptz)'::regprocedure,'public.admin_applications_list(integer)'::regprocedure);
SELECT has_function_privilege('anon','public.admin_learning_analytics(timestamptz,timestamptz)','EXECUTE') anonymous_learning,
 has_function_privilege('anon','public.admin_applications_list(integer)','EXECUTE') anonymous_applications;
