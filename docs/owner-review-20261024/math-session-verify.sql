-- Metadata only; no user/answer/ledger row output.
select jsonb_build_object(
 'tables_installed',(select count(*)=5 from pg_tables where schemaname='math_private' and tablename in ('session_runs','session_members','session_evaluations','session_retries','session_function_backup')),
 'rls_enabled',(select bool_and(relrowsecurity) from pg_class where oid in ('math_private.session_runs'::regclass,'math_private.session_members'::regclass,'math_private.session_evaluations'::regclass,'math_private.session_retries'::regclass,'math_private.session_function_backup'::regclass)),
 'existing_owners_acls_preserved',not exists(select 1 from math_private.session_function_backup b join pg_proc p on p.oid=b.signature::regprocedure where p.proowner<>b.owner_id or p.proacl::text is distinct from b.acl),
 'installed_definitions_match',not exists(select 1 from math_private.session_function_backup b where md5(pg_get_functiondef(b.signature::regprocedure))<>b.installed_hash),
 'temporary_create_removed',not has_schema_privilege('essay_executor','math_private','CREATE'),
 'existing_binding_uniqueness',exists(select 1 from pg_constraint where conrelid='public.math_billing_bindings'::regclass and conname='math_billing_bindings_billing_decision_id_key' and contype='u'),
 'functions',(select jsonb_agg(jsonb_build_object('name',proname,'authenticated_execute',has_function_privilege('authenticated',oid,'EXECUTE'),'anon_denied',not has_function_privilege('anon',oid,'EXECUTE'),'service_role_denied',not has_function_privilege('service_role',oid,'EXECUTE'),'fixed_search_path',proconfig) order by proname) from pg_proc where pronamespace='public'::regnamespace and proname in ('math_session_submit','math_session_read','math_session_retry','math_session_history'))
) as math_session_verification;
