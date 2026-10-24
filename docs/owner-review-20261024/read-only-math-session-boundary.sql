-- Owner read-only metadata. No student answers, profiles, financial rows or secrets.
select jsonb_build_object(
 'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,
   'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text,'definition',pg_get_functiondef(p.oid)) order by n.nspname,p.proname)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where p.prokind='f' and (
 n.nspname='math_private' and p.proname in ('authorize_billing','settle_billing','release_billing','evaluation_admission','learning_state','learning_eligibility') or
 n.nspname='public' and p.proname in ('math_catalog','math_artifact_storage') or
 n.nspname='account_private' and p.proname ilike '%math%')),
 'columns',(select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',data_type) order by table_name,ordinal_position)
 from information_schema.columns where table_schema='public' and table_name in ('math_problem_sets','math_problems','math_subproblems')),
 'triggers',(select jsonb_agg(jsonb_build_object('table',c.relname,'trigger',pg_get_triggerdef(t.oid)) order by c.relname,t.tgname)
 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
 where not t.tgisinternal and n.nspname='public' and c.relname in ('math_attempts','math_evaluations','profiles'))
) as math_session_boundary;
