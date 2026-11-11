-- Schema-only isolated fixtures from production metadata, 2026-11-11. No user data.
CREATE SCHEMA auth; CREATE SCHEMA account_private; CREATE SCHEMA student_private; CREATE SCHEMA essay_exam_private;
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE auth.users(id uuid PRIMARY KEY,created_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
CREATE TABLE essay_exam_private.runs (id uuid,account_id uuid,exam_id uuid,parent_id uuid,decision_id uuid,request_key uuid,snapshot jsonb,state text,result jsonb,created_at timestamp with time zone,completed_at timestamp with time zone,dispatch_key uuid,lease_token uuid,lease_until timestamp with time zone,previous_paid_run_id uuid,submission_index integer);
CREATE TABLE public.account_deletion_requests (id uuid,subject_id uuid,requested_at timestamp with time zone,scheduled_deletion_at timestamp with time zone,state text,cancelled_at timestamp with time zone,completed_at timestamp with time zone,expires_at timestamp with time zone,phase text,lease_token uuid,lease_until timestamp with time zone,retry_count integer,next_attempt_at timestamp with time zone,error_code text,notification_pending boolean,provider_verified boolean,benefit_capture_state text);
CREATE TABLE public.admin_users (user_id uuid,created_at timestamp with time zone);
CREATE TABLE public.bookmarks (id uuid,user_id uuid,content_item_id uuid,created_at timestamp with time zone);
CREATE TABLE public.credit_accounts (id uuid,user_id uuid,created_at timestamp with time zone);
CREATE TABLE public.credit_transactions (id uuid,account_id uuid,grant_id uuid,decision_id uuid,transaction_type text,balance_delta integer,reserved_delta integer,idempotency_key text,reversal_of uuid,reason_code text,actor_reference text,created_at timestamp with time zone);
CREATE TABLE public.exam_subjects (id uuid,content_item_id uuid,source_subject_key text,subject_id uuid,raw_subject_label text,taxonomy_version text,mapping_status text,mapping_confidence numeric(4,3),mapping_note text,mapping_rule_version text,verified_at timestamp with time zone,display_order integer,is_active boolean,created_at timestamp with time zone,updated_at timestamp with time zone);
CREATE TABLE public.home_configuration_revisions (user_id uuid,revision bigint,config_version integer,cards jsonb,updated_at timestamp with time zone);
CREATE TABLE public.invite_attributions (id uuid,invite_token_id uuid,invited_user_id uuid,signup_at timestamp with time zone,school_confirmed_at timestamp with time zone,first_study_at timestamp with time zone,d7_retained_at timestamp with time zone,d7_evaluated_at timestamp with time zone,created_at timestamp with time zone);
CREATE TABLE public.invite_tokens (id uuid,token_hash text,inviter_user_id uuid,office_code text,school_code text,campaign text,created_at timestamp with time zone,expires_at timestamp with time zone,revoked_at timestamp with time zone);
CREATE TABLE public.mock_exam_attempts (id uuid,user_id uuid,study_session_id uuid,exam_subject_id uuid,paper_variant text,answer_key_version_id uuid,grade_cutoff_version_id uuid,scoring_version text,submitted_at timestamp with time zone,created_at timestamp with time zone,raw_score integer,max_score integer,question_count smallint,correct_count smallint,unanswered_count smallint,grade smallint,grade_status text,request_payload jsonb);
CREATE TABLE public.profiles (id uuid,display_name text,grade_level smallint,created_at timestamp with time zone,updated_at timestamp with time zone,neis_office_code text,neis_school_code text,target_date date,target_label text,academic_status text,onboarding_completed_at timestamp with time zone,intended_major text);
CREATE TABLE public.recent_views (id uuid,user_id uuid,content_item_id uuid,viewed_at timestamp with time zone);
CREATE TABLE public.student_application_events (id uuid,application_id uuid,user_id uuid,request_key uuid,kind text,occurred_at timestamp with time zone,recorded_at timestamp with time zone,supersedes_event_id uuid,payload jsonb);
CREATE TABLE public.student_applications (id uuid,user_id uuid,admission_year smallint,university_id uuid,university_name_snapshot text,intended_division text,admission_type text,admission_name text,revision integer,created_at timestamp with time zone,updated_at timestamp with time zone);
CREATE TABLE public.student_target_universities (id uuid,user_id uuid,university_id uuid,admission_year smallint,admission_type text,intended_division text,priority smallint,status text,source text,created_at timestamp with time zone,updated_at timestamp with time zone);
CREATE TABLE public.study_sessions (id uuid,user_id uuid,mode text,title text,subject text,planned_duration_seconds integer,started_at timestamp with time zone,ended_at timestamp with time zone,active_segments jsonb,duration_seconds integer,created_at timestamp with time zone,include_in_study_total boolean);
CREATE OR REPLACE FUNCTION account_private.allowed(u uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select u is not null and exists(select 1 from auth.users where id=u) and not exists(select 1 from public.account_deletion_requests where subject_id=u and state in ('DELETION_PENDING','ERASING'))
$function$;

CREATE OR REPLACE FUNCTION public.admin_operator()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare claims jsonb; expiry numeric;
begin
 -- Identity is always auth.uid(); API JWT signature validation remains at the gateway.
 -- Require an unexpired verified request context, also denying missing/malformed context.
 claims := nullif(current_setting('request.jwt.claims',true),'')::jsonb;
 if auth.uid() is null or claims->>'sub' is distinct from auth.uid()::text or claims->>'role' is distinct from 'authenticated' or jsonb_typeof(claims->'exp') is distinct from 'number' then return false; end if;
 expiry := (claims->>'exp')::numeric;
 if expiry <= extract(epoch from statement_timestamp()) then return false; end if;
 return exists(select 1 from public.admin_users a where a.user_id=auth.uid());
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end$function$;

CREATE OR REPLACE FUNCTION public.admin_student360(p_account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare identity jsonb;
begin
 if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege;end if;
 if p_account_id is null or not exists(select 1 from auth.users where id=p_account_id) then raise sqlstate 'PT404' using message='MEMBER_NOT_FOUND';end if;
 if not account_private.allowed(p_account_id) then raise insufficient_privilege using message='ACCOUNT_RESTRICTED';end if;
 select jsonb_build_object('display_name',p.display_name,'academic_status',p.academic_status,'school_office_code',p.neis_office_code,'school_code',p.neis_school_code,'grade_level',p.grade_level,'intended_major',p.intended_major) into identity from public.profiles p where p.id=p_account_id;
 return jsonb_build_object('version','student360-v1','as_of',statement_timestamp(),
 'identity',identity,'study',student_private.study_summary(p_account_id,statement_timestamp()),
 'applications',student_private.applications(p_account_id,0),'essay',student_private.essay_summary(p_account_id),
 'academic_performance',null,'period_entitlement',null);
end$function$;

CREATE OR REPLACE FUNCTION student_private.study_summary(p_user uuid, p_now timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare today date=(p_now at time zone 'Asia/Seoul')::date; first_day timestamptz; last_day timestamptz; n integer; result jsonb; all_ms bigint;
begin
 first_day=(today-29)::timestamp at time zone 'Asia/Seoul';
 last_day=(today+1)::timestamp at time zone 'Asia/Seoul';
 -- Match APP's bounded 2,000 completed-record contract; never silently truncate totals.
 select count(*) into n from (select 1 from public.study_sessions where user_id=p_user
 and started_at>=first_day-interval '24 hours' and started_at<last_day and ended_at>first_day limit 2001) r;
 if n>2000 then raise exception 'STUDY_HISTORY_LIMIT' using errcode='54000';end if;
 with intervals as (
  select int8range(floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint,
   floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint,'[)') span
  from public.study_sessions s cross join lateral jsonb_array_elements(s.active_segments) v
  where s.user_id=p_user and s.started_at>=first_day-interval '24 hours' and s.started_at<last_day and s.ended_at>first_day
  and s.include_in_study_total
 ), merged as (select range_agg(span) spans from intervals), bounds as (
  select today-i as bucket_day,
   (extract(epoch from ((today-i)::timestamp at time zone 'Asia/Seoul'))*1000)::bigint lo,
   (extract(epoch from ((today-i+1)::timestamp at time zone 'Asia/Seoul'))*1000)::bigint hi
  from generate_series(0,29) i
 ), totals as (
  select b.bucket_day,coalesce((select sum(greatest(0,least(upper(s),b.hi)-greatest(lower(s),b.lo)))
   from merged cross join lateral unnest(spans) s),0)::bigint ms from bounds b
 ) select jsonb_build_object('version','study-summary-v1','as_of',p_now,'timezone','Asia/Seoul','unit','milliseconds',
 'source','completed_synced_sessions','record_count',n,
 'today_ms',sum(ms) filter(where bucket_day=today),
 'week_ms',sum(ms) filter(where bucket_day>=date_trunc('week',today::timestamp)::date),
 'last30_ms',sum(ms),
 'daily7',jsonb_agg(jsonb_build_object('date',bucket_day,'milliseconds',ms) order by bucket_day) filter(where bucket_day>=today-6)) into result from totals;
 -- Additive lifetime projection; same completed segments and overlap union as v1.
 -- No timer/outbox records are collected or rewritten. Existing 30-day fields stay identical.
 with intervals as (
  select int8range(floor(extract(epoch from s.started_at)*1000)::bigint+(v->>0)::bigint,
   floor(extract(epoch from s.started_at)*1000)::bigint+(v->>1)::bigint,'[)') span
  from public.study_sessions s cross join lateral jsonb_array_elements(s.active_segments) v
  where s.user_id=p_user and s.include_in_study_total and s.ended_at<=p_now
 ), merged as (select range_agg(span) spans from intervals)
 select coalesce(sum(upper(span)-lower(span)),0)::bigint into all_ms
 from merged cross join lateral unnest(spans) span;
 return result || jsonb_build_object('all_time_ms',all_ms,'all_time_source','completed_synced_sessions');
end$function$;

CREATE OR REPLACE FUNCTION public.save_my_home_configuration(p_config jsonb, p_revision bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_owner uuid := auth.uid(); v_current jsonb; v_card jsonb; v_ids text[] := '{}'; v_revision bigint;
begin
  if v_owner is null then raise exception 'Authentication required' using errcode='28000'; end if;
  -- Same lock order as the existing account lifecycle: subject, then home.
  perform account_private.lock_subject(v_owner);
  if not account_private.allowed(v_owner) then raise insufficient_privilege; end if;
  if p_revision is null or p_revision < 0 or p_config is null or jsonb_typeof(p_config) <> 'object'
    or p_config->>'config_version' is distinct from '1' or jsonb_typeof(p_config->'cards') is distinct from 'array'
    then raise exception 'Invalid configuration' using errcode='22023'; end if;
  if pg_column_size(p_config) > 65536 or jsonb_array_length(p_config->'cards') > 100 then raise exception 'Too many cards' using errcode='22023'; end if;
  for v_card in select value from jsonb_array_elements(p_config->'cards') loop
    if jsonb_typeof(v_card->'card_id') is distinct from 'string' or not (v_card->>'card_id' ~ '^[a-z][a-z0-9_]{0,79}$')
      or jsonb_typeof(v_card->'visible') is distinct from 'boolean'
      or jsonb_typeof(v_card->'display_order') is distinct from 'number'
      or not (v_card->>'display_order' ~ '^[0-9]{1,3}$')
      or (v_card->>'card_id') = any(v_ids)
      then raise exception 'Invalid card' using errcode='22023'; end if;
    v_ids := array_append(v_ids, v_card->>'card_id');
  end loop;
  perform pg_advisory_xact_lock(hashtextextended('home-configuration:' || v_owner::text, 0));
  v_current := public.my_home_configuration();
  v_revision := coalesce((v_current->>'revision')::bigint, 0);
  -- A lost response can be retried safely without duplicating history.
  if v_current is not null and v_current->'cards' = p_config->'cards' then return v_current; end if;
  if v_revision <> p_revision then raise exception 'Configuration changed' using errcode='40001'; end if;
  insert into public.home_configuration_revisions(user_id, revision, config_version, cards)
    values(v_owner, v_revision + 1, 1, p_config->'cards');
  return public.my_home_configuration();
end;
$function$;

CREATE OR REPLACE FUNCTION public.my_home_configuration()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  if not account_private.allowed(auth.uid()) then raise insufficient_privilege; end if;
  select jsonb_build_object('config_version', config_version, 'cards', cards, 'revision', revision, 'updated_at', updated_at) into v_result
  from public.home_configuration_revisions where user_id = auth.uid() order by revision desc limit 1;
  return v_result;
end;
$function$;


CREATE TABLE public.credit_grants(id uuid,account_id uuid,origin text);
-- Exact read-only fixture dependency of the production home write gate.
CREATE OR REPLACE FUNCTION account_private.lock_subject(u uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $function$select pg_advisory_xact_lock(hashtextextended(u::text,84612))$function$;
