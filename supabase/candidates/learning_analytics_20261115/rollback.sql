BEGIN;
SET LOCAL lock_timeout='3s';
DO $$BEGIN
 IF md5(pg_get_functiondef('public.admin_learning_analytics(timestamptz,timestamptz)'::regprocedure)) <> '1fd12f054b54f89a08ae096c5520d077'
 OR md5(pg_get_functiondef('public.admin_applications_list(integer)'::regprocedure)) <> '7ff011d6e2cac7a8e81467a7b3c11e60' THEN
 RAISE EXCEPTION 'Read contract drift: rollback refused'; END IF;
END$$;
CREATE OR REPLACE FUNCTION public.admin_learning_analytics(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '8s'
AS $function$
declare result jsonb;
begin
 if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege;end if;
 if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to) or p_to<=p_from or p_to-p_from>interval '400 days' then raise sqlstate 'PT422' using message='INVALID_PERIOD';end if;
 -- Current projections, not reconstructed historical targets/bookmarks.
 with eligible as materialized (select id from public.profiles where account_private.allowed(id)),
 facts as (
 select 'targets'::text kind,t.university_id::text label,t.user_id from public.student_target_universities t join eligible e on e.id=t.user_id where t.created_at>=p_from and t.created_at<p_to
 union all select 'saved',b.content_item_id::text,b.user_id from public.bookmarks b join eligible e on e.id=b.user_id where b.created_at>=p_from and b.created_at<p_to
 union all select 'recent',r.content_item_id::text,r.user_id from public.recent_views r join eligible e on e.id=r.user_id where r.viewed_at>=p_from and r.viewed_at<p_to
 union all select 'applications',a.university_id::text,a.user_id from public.student_applications a join eligible e on e.id=a.user_id where a.created_at>=p_from and a.created_at<p_to
 ), cohorts as (select kind,label,count(*) records,count(distinct user_id) users from facts group by kind,label),
 ranked as (select *,row_number() over(partition by kind order by users desc,label) rank from cohorts where users>=1),
 intervals as (
 select s.user_id,int8range(greatest(floor(extract(epoch from p_from)*1000)::bigint,floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint),least(floor(extract(epoch from p_to)*1000)::bigint,floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint),'[)') span
 from public.study_sessions s join eligible e on e.id=s.user_id cross join lateral jsonb_array_elements(s.active_segments) v
 where s.include_in_study_total and s.ended_at>p_from and s.started_at<p_to
 and floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint>floor(extract(epoch from p_from)*1000)::bigint
 and floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint<floor(extract(epoch from p_to)*1000)::bigint
 ), merged as (select user_id,range_agg(span) spans from intervals group by user_id),
 study as (select user_id,sum(upper(span)-lower(span)) ms from merged cross join lateral unnest(spans) span group by user_id),
 summaries as (select kind,count(*) records,count(distinct user_id) users from facts group by kind)
 select jsonb_build_object('version','admin-learning-analytics-v1','as_of',statement_timestamp(),'from',p_from,'to',p_to,'timezone','Asia/Seoul','minimum_sample',1,
 'metrics',jsonb_build_object(
 'targets',coalesce((select users from summaries where kind='targets'),0),
 'target_records',coalesce((select records from summaries where kind='targets'),0),
 'saved',coalesce((select records from summaries where kind='saved'),0),
 'recent',coalesce((select records from summaries where kind='recent'),0),
 'applications',coalesce((select records from summaries where kind='applications'),0),
 'study_users',(select case when count(*)>=0 then count(*) end from study),
 'study_ms',(select case when count(*)>=0 then coalesce(sum(ms),0) end from study)),
 'rows',coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'label',coalesce(case when kind in ('targets','applications') then (select name from public.universities where id::text=label) else (select title from public.content_items where id::text=label) end,'명칭 확인 필요'),'users',users,'records',records) order by kind,rank) from ranked where rank<=10),'[]'::jsonb),
 'state',case when not exists(select 1 from facts) and not exists(select 1 from study) then 'EMPTY' else 'READY' end)
 into result;
 return result;
end$function$
;


CREATE OR REPLACE FUNCTION public.admin_applications_list(p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '8s'
AS $function$
declare result jsonb;
begin
  if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege; end if;
  if p_offset is null or p_offset<0 or p_offset>100000 then raise check_violation; end if;

  with eligible as materialized (
    select id, display_name, neis_office_code, neis_school_code, academic_status, grade_level
    from public.profiles where account_private.allowed(id)
  ),
  base as (select a.* from public.student_applications a join eligible e on e.id=a.user_id),
  page as (select * from base order by created_at desc, id desc offset p_offset limit 25)
  select jsonb_build_object(
    'version','admin-applications-list-v1','offset',p_offset,'limit',25,
    'total', (select count(*) from base),
    'has_more', exists(select 1 from base order by created_at desc, id desc offset p_offset+25 limit 1),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'application_id', a.id,
        'student_name', coalesce(nullif(btrim(e.display_name),''),'이름 미설정'),
        'office_code', e.neis_office_code, 'school_code', e.neis_school_code,
        'student_status', e.academic_status, 'grade_level', e.grade_level,
        'university', coalesce((select name from public.universities u where u.id=a.university_id),'명칭 확인 필요'),
        'intended_division', a.intended_division,
        'admission_type', a.admission_type,
        'admission_name', a.admission_name,
        'admission_year', a.admission_year,
        'created_at', a.created_at,
        'status', (select ev.kind from public.student_application_events ev
                     where ev.application_id=a.id and ev.kind not in ('created','details_changed')
                       and not exists(select 1 from public.student_application_events r where r.supersedes_event_id=ev.id)
                     order by coalesce(ev.occurred_at,ev.recorded_at) desc, ev.recorded_at desc, ev.id desc limit 1),
        'ever_accepted', exists(select 1 from public.student_application_events ev
                                  where ev.application_id=a.id and ev.kind in ('accepted','additional_acceptance')
                                    and not exists(select 1 from public.student_application_events r where r.supersedes_event_id=ev.id))
      ) order by a.created_at desc, a.id desc)
      from page a join eligible e on e.id=a.user_id), '[]'::jsonb)
  ) into result;
  return result;
end $function$
;


NOTIFY pgrst, 'reload schema';
COMMIT;
