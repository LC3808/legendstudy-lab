-- Owner 실행 전용. READ ONLY. 학생 본문/이메일/토큰/Secret/거래 원문 미조회.
BEGIN READ ONLY;
SELECT n.nspname AS schema_name,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef,pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','essay_exam_private') AND
 (p.proname IN ('admin_dashboard','admin_operator','admin_payment_orders','admin_member_credit',
 'admin_operations_summary','essay_exam_quote','essay_exam_submit','essay_exam_submit_cycle',
 'essay_exam_finish','essay_exam_claim','essay_exam_history','reserve','finish')
 OR (p.proname LIKE 'admin_%' AND p.proname LIKE '%registry%'))
ORDER BY n.nspname,p.proname;
SELECT table_schema,table_name,column_name,data_type,udt_name
FROM information_schema.columns
WHERE (table_schema='public' AND table_name IN ('credit_grants','credit_transactions','credit_accounts',
 'payment_orders','profiles','study_sessions','essay_exams','essay_questions'))
 OR (table_schema='essay_exam_private' AND table_name IN ('runs','checkpoints'))
ORDER BY table_schema,table_name,ordinal_position;
COMMIT;
