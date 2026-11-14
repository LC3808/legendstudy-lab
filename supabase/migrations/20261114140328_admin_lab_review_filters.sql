begin;
set local lock_timeout='3s';
set local statement_timeout='10s';
do $guard$ begin
 if md5((select prosrc from pg_proc where oid='public.admin_lab_runs(uuid,uuid,uuid,text,text,integer)'::regprocedure)) IS DISTINCT FROM 'bb392b3b92b88796fcc7868169b3144d' then raise exception 'BASELINE_DRIFT';end if;
 if to_regprocedure('public.admin_lab_runs_filtered(uuid,uuid,uuid,text,text,integer,text,timestamptz,timestamptz)') is not null then raise exception 'ALREADY_INSTALLED';end if;
end $guard$;
CREATE FUNCTION public.admin_lab_runs_filtered(p_user uuid DEFAULT NULL::uuid, p_university uuid DEFAULT NULL::uuid, p_exam uuid DEFAULT NULL::uuid, p_state text DEFAULT NULL::text, p_source text DEFAULT NULL::text, p_offset integer DEFAULT 0, p_query text DEFAULT '', p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '5s'
AS $function$
DECLARE answer jsonb; q text := btrim(coalesce(p_query,''));
BEGIN
 PERFORM essay_ops_private.require_admin();
 IF p_offset IS NULL OR p_offset<0 OR p_offset>100000 OR (p_state IS NOT NULL AND p_state NOT IN ('completed','failed','reserved')) OR (p_source IS NOT NULL AND p_source NOT IN ('beta','other')) THEN RAISE invalid_parameter_value; END IF;
 IF length(q)>254 OR ((p_from IS NULL) <> (p_to IS NULL)) OR (p_from IS NOT NULL AND (NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_from>=p_to OR p_to-p_from>interval '400 days')) THEN RAISE invalid_parameter_value; END IF;
 WITH facts AS MATERIALIZED (
 SELECT r.id,r.exam_id,r.parent_id,r.created_at,r.completed_at,r.state,ca.user_id,u.email::text email,
 e.university_id,v.name university,e.exam_name title,e.admission_year as year,
 b.reason billing_reason,b.credits_required,b.status billing_status,
 b.reason='included_revision' AND b.credits_required=0 free_revision,
 EXISTS(SELECT 1 FROM public.credit_transactions t JOIN essay_beta_private.daily_grants g ON g.grant_id=t.grant_id WHERE t.decision_id=coalesce((SELECT parent.decision_id FROM essay_exam_private.runs parent WHERE parent.id=r.parent_id AND parent.account_id=r.account_id),r.decision_id)) beta_credit,
 coalesce(jsonb_array_length(r.snapshot->'answers'),0) question_count,
 coalesce(jsonb_array_length(r.result->'questions'),0) result_question_count,
 (SELECT max(t.created_at) FROM public.credit_transactions t WHERE t.decision_id=r.decision_id AND t.transaction_type='consume') last_consumed_at
 FROM essay_exam_private.runs r JOIN public.credit_accounts ca ON ca.id=r.account_id
 LEFT JOIN auth.users u ON u.id=ca.user_id
 LEFT JOIN public.essay_exams e ON e.id=r.exam_id LEFT JOIN public.universities v ON v.id=e.university_id
 LEFT JOIN public.essay_billing_decisions b ON b.id=r.decision_id
 WHERE (p_user IS NULL OR ca.user_id=p_user)
 AND (q='' OR ca.user_id::text=lower(q) OR strpos(lower(coalesce(u.email,'')),lower(q))>0)
 AND (p_from IS NULL OR (r.created_at>=p_from AND r.created_at<p_to))
 ), filtered AS MATERIALIZED (
 SELECT * FROM facts WHERE (p_university IS NULL OR university_id=p_university) AND (p_exam IS NULL OR exam_id=p_exam)
 AND (p_state IS NULL OR state=p_state) AND (p_source IS NULL OR beta_credit=(p_source='beta'))
 ), page AS (SELECT * FROM filtered ORDER BY created_at DESC,id LIMIT 25 OFFSET p_offset)
 SELECT jsonb_build_object('version','admin-lab-filtered-v1','as_of',statement_timestamp(),'total',(SELECT count(*) FROM filtered),'offset',p_offset,'limit',25,
 'summary',(SELECT jsonb_build_object('requested',count(*),'initial',count(*) FILTER(WHERE parent_id IS NULL),'completed',count(*) FILTER(WHERE state='completed'),
 'failed',count(*) FILTER(WHERE state='failed'),'pending',count(*) FILTER(WHERE state NOT IN ('completed','failed')),
 'free_revisions',count(*) FILTER(WHERE free_revision),'beta_credit',count(*) FILTER(WHERE beta_credit),
 'last_requested_at',max(created_at),'last_consumed_at',max(last_consumed_at)) FROM filtered),
 'latest',(SELECT jsonb_build_object('university',university,'title',title,'created_at',created_at) FROM filtered ORDER BY created_at DESC,id LIMIT 1),
 'exams',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY title,exam_id),'[]') FROM (SELECT DISTINCT exam_id,title,university_id FROM facts WHERE p_university IS NULL OR university_id=p_university) e),
 'universities',(SELECT coalesce(jsonb_agg(to_jsonb(u) ORDER BY university),'[]') FROM (SELECT DISTINCT university_id,university FROM facts) u),
 'items',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY created_at DESC,id),'[]') FROM page p)) INTO answer;
 RETURN answer;
END $function$

;
ALTER FUNCTION public.admin_lab_runs_filtered(uuid,uuid,uuid,text,text,integer,text,timestamptz,timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_lab_runs_filtered(uuid,uuid,uuid,text,text,integer,text,timestamptz,timestamptz) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.admin_lab_runs_filtered(uuid,uuid,uuid,text,text,integer,text,timestamptz,timestamptz) TO authenticated;

commit;
select 'ADMIN-LAB-FILTERS-R1' package;
