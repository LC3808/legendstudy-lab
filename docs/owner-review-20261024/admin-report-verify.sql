-- Owner read-only verification after admin-report-install.sql.
-- Does not impersonate an operator or return member/financial rows.
select jsonb_build_object(
 'installed',to_regprocedure('public.admin_release_report(jsonb)') is not null,
 'security_definer',p.prosecdef,
 'stable',p.provolatile='s',
 'fixed_search_path',p.proconfig,
 'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
 'anon_denied',not has_function_privilege('anon',p.oid,'EXECUTE'),
 'service_role_denied',not has_function_privilege('service_role',p.oid,'EXECUTE'),
 'operator_gate',position('public.admin_operator()' in pg_get_functiondef(p.oid))>0
) as admin_report_verification
from pg_proc p where p.oid=to_regprocedure('public.admin_release_report(jsonb)');
