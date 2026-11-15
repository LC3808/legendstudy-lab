-- Read only. Run with an authenticated administrator JWT for the final SELECT.
select p.oid::regprocedure as signature,p.prosecdef,
       p.proconfig,pg_get_userbyid(p.proowner) as owner,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute
from pg_proc p where p.oid='public.admin_lab_dashboard_summary(timestamptz,timestamptz,text)'::regprocedure;
-- A SQL Editor postgres role without JWT is intentionally denied by require_admin().
-- select public.admin_lab_dashboard_summary(null,null,null);
