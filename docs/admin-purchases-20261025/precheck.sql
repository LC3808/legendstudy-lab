SELECT to_regprocedure('public.admin_mobile_purchase_report(timestamptz,timestamptz,integer)') IS NULL new_function,
 to_regprocedure('public.admin_operator()') IS NOT NULL operator_gate,
 to_regprocedure('account_private.allowed(uuid)') IS NOT NULL lifecycle_gate,
 to_regclass('public.credit_transactions') IS NOT NULL ledger_exists;
