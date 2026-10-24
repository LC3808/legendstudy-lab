-- Owner 실행 전용 / SELECT만 실행 / 함수 정의를 단일 결과로 반환
SELECT jsonb_agg(to_jsonb(definitions) ORDER BY schema_name,proname) AS function_definitions
FROM (
SELECT n.nspname AS schema_name,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef,pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','essay_exam_private') AND
 (p.proname IN ('admin_dashboard','admin_operator','admin_payment_orders','admin_member_credit',
 'admin_operations_summary','essay_exam_quote','essay_exam_submit','essay_exam_submit_cycle',
 'essay_exam_finish','essay_exam_claim','essay_exam_history','reserve','finish')
 OR (p.proname LIKE 'admin_%' AND p.proname LIKE '%registry%'))

) AS definitions;
