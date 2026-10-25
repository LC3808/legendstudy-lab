SELECT to_regprocedure('public.admin_learning_summary(uuid)') IS NULL AS new_function,
 to_regprocedure('public.admin_operator()') IS NOT NULL AS operator_gate,
 to_regprocedure('account_private.allowed(uuid)') IS NOT NULL AS lifecycle_gate,
 to_regclass('essay_exam_private.runs') IS NOT NULL AS essay_runs,
 to_regclass('math_private.session_runs') IS NOT NULL AS math_runs;
