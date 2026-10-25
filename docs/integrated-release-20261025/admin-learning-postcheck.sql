SELECT p.prosecdef AS security_definer,p.provolatile='s' AS stable,p.proconfig,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
 NOT has_function_privilege('anon',p.oid,'EXECUTE') AS anon_denied,
 NOT has_function_privilege('service_role',p.oid,'EXECUTE') AS service_role_denied
FROM pg_proc p WHERE p.oid=to_regprocedure('public.admin_learning_summary(uuid)');
