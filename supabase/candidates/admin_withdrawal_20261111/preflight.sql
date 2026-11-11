-- Read-only preflight. A mismatch must stop deployment; investigate rather than edit the expected hash blindly.
BEGIN READ ONLY;
DO $$DECLARE x record; actual text; BEGIN
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('admin_withdrawal_list','admin_withdrawal_detail')) THEN
  RAISE EXCEPTION 'Candidate RPC already exists: inspect installation before proceeding';
 END IF;
 FOR x IN SELECT * FROM (VALUES
 ('public.admin_operator','5f3367e86e09801ba438438d2fbb5c89'),
 ('account_private.allowed','5bb28e0026f17746239e4369a772a5ce'),
 ('public.admin_student360','7bbaeb2ac65c3282705b35450083f1a8'),
 ('public.admin_member_list','d7817d9029d37b9954267d715eee3c09'),
 ('public.my_home_configuration','dd86b20e7ef547a061a67459f6252083'),
 ('student_private.study_summary','a1622f936527c48df8c24d35a2163650'),
 ('public.save_my_home_configuration','12d3286751b7bc9f11bdc1c9f2e0ff9e')
 ) expected(name,hash) LOOP
  SELECT md5(pg_get_functiondef(p.oid)) INTO actual FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=x.name;
  IF actual IS DISTINCT FROM x.hash THEN RAISE EXCEPTION 'Existing definition changed: %',x.name; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261111103058') THEN
  RAISE EXCEPTION 'Home account-state migration missing';
 END IF;
END$$;
-- Preserve aggregate-only evidence; no member IDs or personal histories in deployment logs.
SELECT state,phase,count(*) FROM public.account_deletion_requests GROUP BY state,phase ORDER BY state,phase;
SELECT c.relname,c.relrowsecurity,(SELECT count(*) FROM pg_policy p WHERE p.polrelid=c.oid) policies FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('account_deletion_requests','study_sessions','mock_exam_attempts','credit_transactions','home_configuration_revisions') ORDER BY c.relname;
SELECT n.nspname,p.proname,md5(pg_get_functiondef(p.oid)) definition_hash FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname||'.'||p.proname IN ('public.admin_operator','account_private.allowed','public.admin_student360','public.admin_member_list','public.my_home_configuration','student_private.study_summary','public.save_my_home_configuration') ORDER BY 1,2;
COMMIT;
