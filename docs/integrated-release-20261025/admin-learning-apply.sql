BEGIN;
-- Additive metadata-only read; original RPCs, data and financial contracts remain unchanged.
CREATE OR REPLACE FUNCTION public.admin_learning_summary(p_subject uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE result jsonb;
BEGIN
 IF NOT public.admin_operator() OR NOT account_private.allowed(auth.uid()) THEN
  RAISE SQLSTATE '42501' USING MESSAGE='OPERATOR_REQUIRED';
 END IF;
 IF p_subject IS NOT NULL AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_subject) THEN
  RAISE SQLSTATE 'PT404' USING MESSAGE='MEMBER_NOT_FOUND';
 END IF;
 SELECT jsonb_build_object('version','admin-learning-v1','as_of',statement_timestamp(),
  'members',CASE WHEN p_subject IS NULL THEN jsonb_build_object(
   'accounts',(SELECT count(*) FROM auth.users),'profiles',(SELECT count(*) FROM public.profiles),
   'without_profile',(SELECT count(*) FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id WHERE p.id IS NULL)) ELSE NULL END,
  'essay',(SELECT jsonb_build_object('total',count(*),'initial',count(*) FILTER(WHERE r.parent_id IS NULL),
   'rewrites',count(*) FILTER(WHERE r.parent_id IS NOT NULL),'completed',count(*) FILTER(WHERE r.state='completed'),
   'pending',count(*) FILTER(WHERE r.state='reserved'),'failed',count(*) FILTER(WHERE r.state='failed'))
   FROM essay_exam_private.runs r JOIN public.credit_accounts a ON a.id=r.account_id
   WHERE p_subject IS NULL OR a.user_id=p_subject),
  'math',(SELECT jsonb_build_object('total',count(*),'initial',count(*) FILTER(WHERE parent_id IS NULL),
   'rewrites',count(*) FILTER(WHERE parent_id IS NOT NULL),'completed',count(*) FILTER(WHERE state='completed'),
   'pending',count(*) FILTER(WHERE state='reserved'),'failed',count(*) FILTER(WHERE state='failed'))
   FROM math_private.session_runs WHERE p_subject IS NULL OR student_id=p_subject),
  'registry',CASE WHEN p_subject IS NULL THEN jsonb_build_object(
   'universities',(SELECT count(distinct university_id) FROM public.essay_exams),
   'exams',(SELECT count(*) FROM public.essay_exams),'questions',(SELECT count(*) FROM public.essay_questions),
   'is_published',(SELECT count(*) FROM public.essay_questions WHERE is_published)) ELSE NULL END
 ) INTO result;
 RETURN result;
END $fn$;
ALTER FUNCTION public.admin_learning_summary(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_learning_summary(uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.admin_learning_summary(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
