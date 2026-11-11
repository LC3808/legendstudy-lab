-- READ ONLY production audit: aggregate output only. No function installation or user rows exported.
BEGIN READ ONLY;
WITH eligible AS MATERIALIZED (
 SELECT id,neis_office_code office,neis_school_code school FROM public.profiles WHERE account_private.allowed(id)
), bounds AS (
 SELECT 'all' mode,coalesce(min(s.started_at),statement_timestamp()) lo,statement_timestamp() hi
 FROM public.study_sessions s JOIN eligible e ON e.id=s.user_id
 WHERE s.include_in_study_total AND s.ended_at IS NOT NULL AND s.started_at<statement_timestamp() AND jsonb_array_length(s.active_segments)>0
 UNION ALL
 SELECT 'd30',((statement_timestamp() AT TIME ZONE 'Asia/Seoul')::date-29)::timestamp AT TIME ZONE 'Asia/Seoul',
 ((statement_timestamp() AT TIME ZONE 'Asia/Seoul')::date+1)::timestamp AT TIME ZONE 'Asia/Seoul'
), intervals AS MATERIALIZED (
 SELECT b.mode,s.user_id,e.office,e.school,int8range(
 greatest(floor(extract(epoch FROM b.lo)*1000)::bigint,floor(extract(epoch FROM s.started_at)*1000)::bigint+(v->>0)::bigint),
 least(floor(extract(epoch FROM b.hi)*1000)::bigint,floor(extract(epoch FROM s.started_at)*1000)::bigint+(v->>1)::bigint),'[)') span
 FROM public.study_sessions s JOIN eligible e ON e.id=s.user_id CROSS JOIN bounds b CROSS JOIN LATERAL jsonb_array_elements(s.active_segments) v
 WHERE s.include_in_study_total AND s.ended_at>b.lo AND s.started_at<b.hi
 AND floor(extract(epoch FROM s.started_at)*1000)::bigint+(v->>1)::bigint>floor(extract(epoch FROM b.lo)*1000)::bigint
 AND floor(extract(epoch FROM s.started_at)*1000)::bigint+(v->>0)::bigint<floor(extract(epoch FROM b.hi)*1000)::bigint
), merged AS (
 SELECT mode,user_id,office,school,range_agg(span) spans FROM intervals GROUP BY 1,2,3,4
), totals AS (
 SELECT mode,user_id,office,school,sum(upper(span)-lower(span)) ms FROM merged CROSS JOIN LATERAL unnest(spans) span GROUP BY 1,2,3,4
), endpoints AS (
 -- Independent sweep-line duration oracle, not range_agg.
 SELECT mode,user_id,lower(span) point,1 delta FROM intervals WHERE NOT isempty(span)
 UNION ALL SELECT mode,user_id,upper(span),-1 FROM intervals WHERE NOT isempty(span)
), points AS (
 SELECT mode,user_id,point,sum(delta) delta FROM endpoints GROUP BY 1,2,3
), coverage AS (
 SELECT *,sum(delta) OVER(PARTITION BY mode,user_id ORDER BY point) active,
 lead(point) OVER(PARTITION BY mode,user_id ORDER BY point) next_point FROM points
)
SELECT b.mode,b.lo,b.hi,
 (SELECT count(*) FROM totals t WHERE t.mode=b.mode) users,
 (SELECT coalesce(sum(ms),0) FROM totals t WHERE t.mode=b.mode) ms,
 (SELECT coalesce(sum(next_point-point),0) FROM coverage c WHERE c.mode=b.mode AND active>0) independent_ms,
 (SELECT coalesce(sum(ms),0) FROM totals t WHERE t.mode=b.mode AND t.school IS NOT NULL) school_ms,
 (SELECT coalesce(sum(ms),0) FROM totals t WHERE t.mode=b.mode AND t.school IS NULL) no_school_ms,
 (SELECT count(*) FROM (SELECT office,school FROM totals t WHERE t.mode=b.mode AND t.school IS NOT NULL GROUP BY 1,2) a) schools
FROM bounds b ORDER BY b.mode;
ROLLBACK;
