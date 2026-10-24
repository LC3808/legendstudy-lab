-- Owner read-only metadata; no answers, profile rows, tokens or ledger rows.
select jsonb_build_object(
 'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'definition',pg_get_functiondef(p.oid)) order by n.nspname,p.proname)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where p.prokind='f' and (
  n.nspname='math_private' and p.proname in ('authorize_billing','settle_billing','release_billing','binding_guard','lock_account_attempt','evaluation_projection') or
  n.nspname='public' and p.proname in ('math_input','math_evaluation','math_request_evaluation','math_claim_evaluation','math_finalize_evaluation','math_fail_evaluation','math_create_attempt','math_learning'))),
 'columns',(select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',data_type) order by table_name,ordinal_position)
 from information_schema.columns where table_schema='public' and table_name in ('math_attempts','math_evaluations','math_billing_bindings','math_leaves','math_artifacts')),
 'constraints',(select jsonb_agg(jsonb_build_object('table',c.relname,'name',k.conname,'definition',pg_get_constraintdef(k.oid)) order by c.relname,k.conname)
 from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('math_attempts','math_evaluations','math_billing_bindings'))
) as math_session_contract;
