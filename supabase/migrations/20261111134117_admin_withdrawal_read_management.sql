-- Candidate only. Owner approval required. No table, RLS, worker or retention changes.
BEGIN;
CREATE FUNCTION public.admin_withdrawal_list(
 p_query text DEFAULT '', p_status text DEFAULT '', p_sort text DEFAULT 'newest',
 p_limit integer DEFAULT 25, p_offset integer DEFAULT 0, p_cursor jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' SET statement_timeout='8s' AS $$
DECLARE result jsonb; cutoff timestamptz:=statement_timestamp(); anchor_at timestamptz; anchor_id uuid;
BEGIN
 IF public.admin_operator() IS NOT TRUE OR account_private.allowed(auth.uid()) IS NOT TRUE THEN
  RAISE insufficient_privilege USING message='OPERATOR_REQUIRED';
 END IF;
 IF p_query IS NULL OR length(p_query)>36 OR p_status IS NULL OR p_status NOT IN ('','pending','processing','failed','completed','cancelled')
 OR p_sort IS NULL OR p_sort NOT IN ('newest','oldest') OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 OR p_offset IS NULL OR p_offset<0 THEN
  RAISE invalid_parameter_value USING message='INVALID_FILTER';
 END IF;
 IF p_cursor IS NOT NULL THEN
  IF jsonb_typeof(p_cursor)<>'object' OR NOT (p_cursor ?& ARRAY['as_of','requested_at','request_id']) OR p_offset<>0 THEN
   RAISE invalid_parameter_value USING message='INVALID_CURSOR';
  END IF;
  cutoff:=(p_cursor->>'as_of')::timestamptz;
  anchor_at:=(p_cursor->>'requested_at')::timestamptz;
  anchor_id:=(p_cursor->>'request_id')::uuid;
  IF cutoff IS NULL OR (anchor_at IS NULL)<>(anchor_id IS NULL) OR cutoff>statement_timestamp() OR anchor_at>cutoff THEN
   RAISE invalid_parameter_value USING message='INVALID_CURSOR';
  END IF;
 END IF;
 WITH rows AS MATERIALIZED (
  SELECT r.id request_id,
   CASE WHEN r.state IN ('DELETION_PENDING','ERASING') THEN r.subject_id END account_id,
   CASE WHEN r.state IN ('DELETION_PENDING','ERASING') THEN u.created_at END joined_at,
   r.requested_at,r.scheduled_deletion_at,r.completed_at,r.state,r.phase,
   CASE WHEN r.state IN ('DELETION_PENDING','ERASING') AND r.error_code IS NOT NULL THEN 'failed'
        WHEN r.state='DELETION_PENDING' THEN 'pending' WHEN r.state='ERASING' THEN 'processing'
        WHEN r.state='ERASED' THEN 'completed' ELSE 'cancelled' END status,
   CASE WHEN r.state='DELETION_PENDING' THEN 'retained' WHEN r.state='ERASING' THEN 'erasing'
        WHEN r.state='ERASED' THEN 'erased' ELSE 'cancelled' END data_state
  FROM public.account_deletion_requests r LEFT JOIN auth.users u ON u.id=r.subject_id
  WHERE (r.expires_at IS NULL OR r.expires_at>statement_timestamp()) AND r.requested_at<=cutoff
 ), filtered AS MATERIALIZED (
  SELECT * FROM rows WHERE (p_status='' OR status=p_status)
   AND (btrim(p_query)='' OR strpos(coalesce(account_id::text,''),lower(btrim(p_query)))>0)
 ), remaining AS MATERIALIZED (
  SELECT * FROM filtered WHERE anchor_at IS NULL
   OR (p_sort='newest' AND (requested_at,request_id)<(anchor_at,anchor_id))
   OR (p_sort='oldest' AND (requested_at>anchor_at OR (requested_at=anchor_at AND request_id<anchor_id)))
 ), page AS (
  SELECT * FROM remaining ORDER BY CASE WHEN p_sort='newest' THEN requested_at END DESC,
   CASE WHEN p_sort='oldest' THEN requested_at END ASC,request_id DESC LIMIT p_limit OFFSET p_offset
 )
 SELECT jsonb_build_object('version','admin-withdrawals-v1','as_of',statement_timestamp(),
  'next_cursor',CASE WHEN (SELECT count(*) FROM remaining)>p_limit+p_offset THEN
   (SELECT jsonb_build_object('as_of',cutoff,'requested_at',requested_at,'request_id',request_id) FROM page
    ORDER BY CASE WHEN p_sort='newest' THEN requested_at END ASC, CASE WHEN p_sort='oldest' THEN requested_at END DESC,request_id ASC LIMIT 1) ELSE NULL END,
  'total',(SELECT count(*) FROM filtered),'limit',p_limit,'offset',p_offset,
  'kpis',jsonb_build_object('pending',(SELECT count(*) FROM rows WHERE status='pending'),
   'processing',(SELECT count(*) FROM rows WHERE status='processing'),
   'failed',(SELECT count(*) FROM rows WHERE status='failed'),
   'completed30',(SELECT count(*) FROM rows WHERE status='completed' AND completed_at>=statement_timestamp()-interval '30 days')),
  'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY CASE WHEN p_sort='newest' THEN requested_at END DESC,
   CASE WHEN p_sort='oldest' THEN requested_at END ASC,request_id DESC) FROM page p),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_withdrawal_list(text,text,text,integer,integer,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_withdrawal_list(text,text,text,integer,integer,jsonb) TO authenticated;

CREATE FUNCTION public.admin_withdrawal_detail(p_request_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' SET statement_timeout='8s' AS $$
DECLARE r public.account_deletion_requests%rowtype; u uuid; identity_data jsonb; activity jsonb; study jsonb;
BEGIN
 IF public.admin_operator() IS NOT TRUE OR account_private.allowed(auth.uid()) IS NOT TRUE THEN
  RAISE insufficient_privilege USING message='OPERATOR_REQUIRED';
 END IF;
 SELECT * INTO r FROM public.account_deletion_requests WHERE id=p_request_id AND (expires_at IS NULL OR expires_at>statement_timestamp());
 IF NOT FOUND THEN RAISE sqlstate 'PT404' USING message='REQUEST_NOT_FOUND'; END IF;
 -- Never reconstruct deleted/partially-erased individual history. No snapshots are stored.
 IF r.state='DELETION_PENDING' AND EXISTS(SELECT 1 FROM auth.users WHERE id=r.subject_id) THEN
  u:=r.subject_id;
  SELECT jsonb_build_object('account_id',a.id,'joined_at',a.created_at,'grade',p.grade_level,
   'academic_status',p.academic_status,'school_set',p.neis_school_code IS NOT NULL) INTO identity_data
  FROM auth.users a LEFT JOIN public.profiles p ON p.id=a.id WHERE a.id=u;
  study:=student_private.study_summary(u,statement_timestamp());
  WITH sessions AS MATERIALIZED (
   SELECT * FROM public.study_sessions WHERE user_id=u AND ended_at<=statement_timestamp() AND include_in_study_total
  ), study_days AS (
   SELECT DISTINCT day::date FROM sessions s CROSS JOIN LATERAL jsonb_array_elements(s.active_segments) seg
   CROSS JOIN LATERAL generate_series(
    ((s.started_at+(seg->>0)::bigint*interval '1 millisecond') AT TIME ZONE 'Asia/Seoul')::date::timestamp,
    ((s.started_at+((seg->>1)::bigint-1)*interval '1 millisecond') AT TIME ZONE 'Asia/Seoul')::date::timestamp,
    interval '1 day') day WHERE (seg->>1)::bigint>(seg->>0)::bigint
  ), mocks AS MATERIALIZED (
   SELECT m.*,es.content_item_id exam_id FROM public.mock_exam_attempts m
   JOIN public.exam_subjects es ON es.id=m.exam_subject_id WHERE m.user_id=u AND m.submitted_at IS NOT NULL
  ), runs AS MATERIALIZED (
   SELECT er.* FROM essay_exam_private.runs er JOIN public.credit_accounts ca ON ca.id=er.account_id WHERE ca.user_id=u
  ), credits AS MATERIALIZED (
   SELECT t.*,g.origin FROM public.credit_transactions t JOIN public.credit_accounts ca ON ca.id=t.account_id
   LEFT JOIN public.credit_grants g ON g.id=t.grant_id AND g.account_id=t.account_id
   WHERE ca.user_id=u AND t.transaction_type='consume'
  ), applications AS MATERIALIZED (SELECT * FROM public.student_applications WHERE user_id=u),
  outcomes AS (
   SELECT e.* FROM public.student_application_events e JOIN applications a ON a.id=e.application_id
   WHERE e.kind IN ('accepted','additional_acceptance','rejected')
    AND NOT EXISTS(SELECT 1 FROM public.student_application_events replacement WHERE replacement.supersedes_event_id=e.id)
  ), tokens AS MATERIALIZED (SELECT * FROM public.invite_tokens WHERE inviter_user_id=u),
  attributed AS MATERIALIZED (
   SELECT a.* FROM public.invite_attributions a JOIN tokens t ON t.id=a.invite_token_id
  ), first_study AS (
   SELECT a.invited_user_id FROM attributed a WHERE EXISTS(
    SELECT 1 FROM public.study_sessions s WHERE s.user_id=a.invited_user_id AND s.include_in_study_total
     AND s.started_at>=a.signup_at AND EXISTS(SELECT 1 FROM jsonb_array_elements(s.active_segments) g WHERE (g->>1)::bigint>(g->>0)::bigint))
  )
  SELECT jsonb_build_object(
   'study_ms',(study->>'all_time_ms')::bigint,'study_sessions',(SELECT count(*) FROM sessions),
   'study_days',(SELECT count(*) FROM study_days),'study_last',(SELECT max(ended_at) FROM sessions),
   'mock_submissions',(SELECT count(*) FROM mocks),'mock_exams',(SELECT count(DISTINCT exam_id) FROM mocks),
   'mock_scores',(SELECT count(*) FROM mocks WHERE raw_score IS NOT NULL),'mock_last',(SELECT max(submitted_at) FROM mocks),
   'essay_requests',(SELECT count(*) FROM runs),'essay_completed',(SELECT count(*) FROM runs WHERE state='completed'),
   'essay_rewrites',(SELECT count(*) FROM runs WHERE parent_id IS NOT NULL),
   'credits_consumed',(SELECT coalesce(-sum(balance_delta),0) FROM credits),
   'credits_paid',(SELECT coalesce(-sum(balance_delta),0) FROM credits WHERE origin='purchase'),
   'credits_free',(SELECT coalesce(-sum(balance_delta),0) FROM credits WHERE origin IN ('signup_bonus','promotion')),
   'credits_other',(SELECT coalesce(-sum(balance_delta),0) FROM credits WHERE origin IS NULL OR origin NOT IN ('purchase','signup_bonus','promotion')),
   'essay_last',(SELECT max(created_at) FROM runs),
   'material_views',NULL,'viewed_materials',(SELECT count(*) FROM public.recent_views WHERE user_id=u),
   'bookmarks',(SELECT count(*) FROM public.bookmarks WHERE user_id=u),
   'material_last',(SELECT max(t) FROM (SELECT max(viewed_at) t FROM public.recent_views WHERE user_id=u
     UNION ALL SELECT max(created_at) FROM public.bookmarks WHERE user_id=u) x),
   'targets',(SELECT count(*) FROM public.student_target_universities WHERE user_id=u AND status='interested'),
   'applications',(SELECT count(*) FROM applications),'outcome_applications',(SELECT count(DISTINCT application_id) FROM outcomes),
   'invite_links',(SELECT count(*) FROM tokens),'invite_signups',(SELECT count(DISTINCT invited_user_id) FROM attributed),
   'invite_first_study',(SELECT count(DISTINCT invited_user_id) FROM first_study),
   'last_activity',(SELECT max(t) FROM (
     SELECT max(ended_at) t FROM sessions UNION ALL SELECT max(submitted_at) FROM mocks UNION ALL SELECT max(created_at) FROM runs
     UNION ALL SELECT max(viewed_at) FROM public.recent_views WHERE user_id=u
     UNION ALL SELECT max(created_at) FROM public.bookmarks WHERE user_id=u
     UNION ALL SELECT max(updated_at) FROM public.student_target_universities WHERE user_id=u
     UNION ALL SELECT max(updated_at) FROM applications UNION ALL SELECT max(recorded_at) FROM public.student_application_events WHERE user_id=u
     UNION ALL SELECT max(created_at) FROM tokens) activity_times)
  ) INTO activity;
 END IF;
 RETURN jsonb_build_object('version','admin-withdrawal-detail-v1','as_of',statement_timestamp(),
  'request_id',r.id,'state',r.state,'requested_at',r.requested_at,'scheduled_deletion_at',r.scheduled_deletion_at,
  'started_at',NULL,'completed_at',r.completed_at,'cancelled_at',r.cancelled_at,'expires_at',r.expires_at,
  'phase',r.phase,'retry_count',r.retry_count,'next_attempt_at',r.next_attempt_at,
  -- No arbitrary provider/SQL error text (or credentials) crosses this boundary.
  'error',CASE WHEN r.error_code IS NULL THEN NULL WHEN r.error_code IN ('STORAGE_UNAVAILABLE','PROVIDER_EXTERNAL_GATE','FINANCE_EXTERNAL_GATE','AUTH_UNAVAILABLE','POSTCONDITION_FAILED','TRANSPORT_UNAVAILABLE','RESTORE_CHECKPOINT_UNAVAILABLE') THEN r.error_code ELSE 'PROCESSING_ERROR' END,
  'identity',identity_data,'activity',activity);
END $$;
REVOKE ALL ON FUNCTION public.admin_withdrawal_detail(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_withdrawal_detail(uuid) TO authenticated;
COMMIT;
