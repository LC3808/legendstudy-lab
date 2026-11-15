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
