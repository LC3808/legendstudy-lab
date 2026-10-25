SELECT p.prosecdef security_definer,p.provolatile='s' stable,p.proconfig,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
 NOT has_function_privilege('anon',p.oid,'EXECUTE') anon_denied,
 NOT has_function_privilege('service_role',p.oid,'EXECUTE') service_role_denied
FROM pg_proc p WHERE p.oid=to_regprocedure('public.admin_mobile_purchase_report(timestamptz,timestamptz,integer)');
