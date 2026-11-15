BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='10s';
CREATE FUNCTION public.admin_lab_dashboard_summary(p_from timestamptz DEFAULT NULL,p_to timestamptz DEFAULT NULL,p_source text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' SET statement_timeout='5s'
AS $function$
DECLARE answer jsonb;
BEGIN
 PERFORM essay_ops_private.require_admin();
 IF ((p_from IS NULL)<>(p_to IS NULL)) OR (p_from IS NOT NULL AND (NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_from>=p_to OR p_to-p_from>interval '400 days'))
 OR (p_source IS NOT NULL AND p_source NOT IN ('beta','other')) THEN RAISE invalid_parameter_value; END IF;
WITH facts AS MATERIALIZED (
 SELECT r.id,ca.user_id,e.university_id,v.name university,r.state,r.created_at,r.completed_at,
 b.reason='included_revision' AND b.credits_required=0 free_revision,
 EXISTS(SELECT 1 FROM public.credit_transactions t JOIN essay_beta_private.daily_grants g ON g.grant_id=t.grant_id
 WHERE t.decision_id=coalesce(parent.decision_id,r.decision_id)) beta_credit
 FROM essay_exam_private.runs r
 JOIN public.credit_accounts ca ON ca.id=r.account_id
 LEFT JOIN essay_exam_private.runs parent ON parent.id=r.parent_id AND parent.account_id=r.account_id
 LEFT JOIN public.essay_exams e ON e.id=r.exam_id
 LEFT JOIN public.universities v ON v.id=e.university_id
 LEFT JOIN public.essay_billing_decisions b ON b.id=r.decision_id
 WHERE (p_from IS NULL OR (r.created_at>=p_from AND r.created_at<p_to))
), filtered AS MATERIALIZED (
 SELECT * FROM facts WHERE p_source IS NULL OR beta_credit=(p_source='beta')
), universities AS (
 SELECT university_id,university,count(*) requests,count(DISTINCT user_id) students,
 count(*) FILTER(WHERE state='completed') completed,count(*) FILTER(WHERE state='failed') failed,
 count(*) FILTER(WHERE free_revision) free_revisions,count(*) FILTER(WHERE beta_credit) beta_requests
 FROM filtered GROUP BY university_id,university
)
SELECT jsonb_build_object('version','admin-lab-dashboard-v1','as_of',statement_timestamp(),
 'from',p_from,'to',p_to,'source',p_source,'students',(SELECT count(DISTINCT user_id) FROM filtered),
 'duration_samples',(SELECT count(*) FROM filtered WHERE state='completed' AND completed_at>=created_at),
 'avg_seconds',(SELECT avg(extract(epoch FROM completed_at-created_at)) FROM filtered WHERE state='completed' AND completed_at>=created_at),
 'universities',(SELECT coalesce(jsonb_agg(to_jsonb(u) ORDER BY requests DESC,university COLLATE "C" NULLS LAST,university_id),'[]'::jsonb) FROM universities u)
) INTO answer;

 RETURN answer;
END $function$;
ALTER FUNCTION public.admin_lab_dashboard_summary(timestamptz,timestamptz,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_lab_dashboard_summary(timestamptz,timestamptz,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.admin_lab_dashboard_summary(timestamptz,timestamptz,text) TO authenticated;
COMMENT ON FUNCTION public.admin_lab_dashboard_summary(timestamptz,timestamptz,text) IS 'admin-lab-dashboard-v1: read-only run cohort aggregates; no answers/results; beta means linked beta grant, not test/live';
NOTIFY pgrst,'reload schema';
COMMIT;
