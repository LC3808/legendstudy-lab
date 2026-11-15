-- Read-only; execute only after the separately approved apply.sql.
SELECT mode,purchase_enabled,qa_started_at,qa_until,
       (purchase_enabled=false AND qa_until IS NULL) AS remains_paused
FROM payment_private.configuration;
SELECT column_name,column_default,is_nullable
FROM information_schema.columns
WHERE table_schema='payment_private' AND table_name='configuration'
AND column_name IN ('purchase_enabled','qa_started_at','qa_until') ORDER BY column_name;
SELECT p.prosecdef,p.proconfig,p.proacl,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       md5(pg_get_functiondef(p.oid)) AS definition_md5,
       md5(pg_get_functiondef(p.oid))='8a156d337ed6c3b30b0c2e2d308d6d7c' AS exact_candidate_definition,
       position('d5eab102-da92-4c4c-9adb-16d2c9d20e4c' in pg_get_functiondef(p.oid))>0 AS fixed_owner_present,
       position('QA_ORDER_LIMIT' in pg_get_functiondef(p.oid))>0 AS order_limit_present,
       position('PAYMENT_PAUSED' in pg_get_functiondef(p.oid))>0 AS paused_gate_present,
       position('qa_subject_ids' in pg_get_functiondef(p.oid))=0 AS no_configurable_subject_list
FROM pg_proc p WHERE p.oid='public.payment_order(jsonb)'::regprocedure;
SELECT p.proacl,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('essay_finance',p.oid,'EXECUTE') AS finance_execute
FROM pg_proc p WHERE p.oid='public.payment_process(jsonb)'::regprocedure;
SELECT mode,state,grant_state,count(*) FROM public.payment_orders GROUP BY 1,2,3;
-- Compare function MD5 against the isolated apply output, and ACLs against the
-- preflight snapshot. Presence checks alone do not prove the complete definition.
