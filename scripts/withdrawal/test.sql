\set ON_ERROR_STOP on
CREATE FUNCTION public.test_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %',label; END IF; END$$;
INSERT INTO auth.users SELECT ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,now()-interval '60 days' FROM generate_series(1,8)i;
INSERT INTO public.admin_users(user_id) VALUES ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000004');
INSERT INTO public.profiles(id,grade_level,academic_status,neis_school_code) VALUES('00000000-0000-0000-0000-000000000003',3,'student','school');
INSERT INTO public.account_deletion_requests(id,subject_id,requested_at,scheduled_deletion_at,state,phase,retry_count,error_code,completed_at,expires_at,next_attempt_at)
SELECT ('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
 CASE WHEN i=5 THEN NULL ELSE ('00000000-0000-0000-0000-'||lpad((i+2)::text,12,'0'))::uuid END,
 now()-interval '2 days',now()+interval '12 days',
 CASE WHEN i<=2 THEN 'DELETION_PENDING' WHEN i<=4 THEN 'ERASING' WHEN i=5 THEN 'ERASED' ELSE 'CANCELLED' END,
 CASE WHEN i<=2 THEN 'PERSONAL' WHEN i<=4 THEN 'AUTH' WHEN i=5 THEN 'DONE' ELSE 'PERSONAL' END,
 CASE WHEN i=3 THEN 2 ELSE 0 END,CASE WHEN i=3 THEN 'AUTH_UNAVAILABLE' END,
 CASE WHEN i=5 THEN now()-interval '1 day' END,CASE WHEN i>=5 THEN now()+interval '29 days' END,now()+interval '12 days'
FROM generate_series(1,6)i;
-- Expired receipt must not be exposed even if purge hasn't executed yet.
INSERT INTO public.account_deletion_requests(id,state,phase,requested_at,scheduled_deletion_at,completed_at,expires_at,retry_count)
VALUES('10000000-0000-0000-0000-000000000007','ERASED','DONE',now()-interval '50 days',now()-interval '36 days',now()-interval '31 days',now()-interval '1 day',0);
INSERT INTO public.study_sessions(id,user_id,started_at,ended_at,active_segments,include_in_study_total,duration_seconds)
VALUES ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','2020-01-01 00:00Z','2020-01-01 01:00Z','[[0,3600000]]',true,3600),
('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','2020-01-01 00:30Z','2020-01-01 01:30Z','[[0,3600000]]',true,3600),
('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','2020-01-01 14:59Z','2020-01-01 15:01Z','[[0,120000]]',true,120),
('20000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000003','2020-01-03 00:00Z','2020-01-03 01:00Z','[[0,3600000]]',false,3600),
('20000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002','2020-01-04 00:00Z','2020-01-04 01:00Z','[[0,3600000]]',true,3600);
INSERT INTO public.exam_subjects(id,content_item_id) VALUES ('30000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000010');
INSERT INTO public.mock_exam_attempts(id,user_id,exam_subject_id,submitted_at,raw_score) SELECT ('31000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001',now()-interval '3 days',80 FROM generate_series(1,2)i;
INSERT INTO public.credit_accounts(id,user_id) VALUES('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003');
INSERT INTO essay_exam_private.runs(id,account_id,parent_id,state,created_at) VALUES
('41000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',null,'completed',now()-interval '4 days'),
('41000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','completed',now()-interval '3 days');
INSERT INTO public.credit_transactions(account_id,transaction_type,balance_delta,reserved_delta) VALUES
('40000000-0000-0000-0000-000000000001','consume',-1,-1),('40000000-0000-0000-0000-000000000001','reserve',0,1),('40000000-0000-0000-0000-000000000001','release',0,-1);
INSERT INTO public.bookmarks(user_id,created_at) VALUES('00000000-0000-0000-0000-000000000003',now()-interval '1 day');
INSERT INTO public.recent_views(user_id,viewed_at) VALUES('00000000-0000-0000-0000-000000000003',now()-interval '1 day');
INSERT INTO public.student_applications(id,user_id) VALUES('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003'),('50000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003');
INSERT INTO public.student_application_events(id,application_id,user_id,kind,supersedes_event_id) VALUES
('51000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','accepted',null),
('51000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','rejected','51000000-0000-0000-0000-000000000001');
INSERT INTO public.invite_tokens(id,inviter_user_id) VALUES('60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003');
INSERT INTO public.invite_attributions(invite_token_id,invited_user_id,signup_at) VALUES('60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','2019-12-31Z');
INSERT INTO public.credit_grants VALUES('42000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','signup_bonus');
UPDATE public.credit_transactions SET grant_id='42000000-0000-0000-0000-000000000001' WHERE transaction_type='consume';
CREATE TEMP TABLE preservation AS SELECT n.nspname,c.relname,0::bigint count,''::text checksum FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname IN ('public','auth','essay_exam_private');
DO $$DECLARE x record; BEGIN FOR x IN SELECT * FROM preservation LOOP EXECUTE format('update preservation set count=(select count(*) from %I.%I),checksum=(select md5(coalesce(string_agg(t::text,'''' order by t::text),'''')) from %I.%I t) where nspname=$1 and relname=$2',x.nspname,x.relname,x.nspname,x.relname) USING x.nspname,x.relname; END LOOP;END$$;
-- Admin session (DB fixture only; gateway validates real JWT signatures).
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-0000-0000-000000000001','role','authenticated','exp',extract(epoch FROM now())+3600)::text,false);
SET ROLE authenticated;
SELECT test_assert((admin_withdrawal_list()->>'total')::int=6,'expiry excludes stale receipts');
SELECT test_assert(admin_withdrawal_list()->'kpis'='{"pending":2,"processing":1,"failed":1,"completed30":1}'::jsonb,'four exclusive KPI buckets');
SELECT test_assert(jsonb_array_length(admin_withdrawal_list('','pending')->'items')=2,'pending filter');
SELECT test_assert(jsonb_array_length(admin_withdrawal_list('','failed')->'items')=1,'failed filter');
SELECT test_assert((admin_withdrawal_list('000000000003')->>'total')::int=1,'internal id search');
SELECT test_assert((admin_withdrawal_list('not-found')->>'total')::int=0,'real empty');
SELECT test_assert(admin_withdrawal_list('','','newest',1,0)->'items'->0->>'request_id'='10000000-0000-0000-0000-000000000006','stable tied order');
SELECT test_assert(admin_withdrawal_list('','','newest',1,1)->'items'->0->>'request_id'='10000000-0000-0000-0000-000000000005','stable next page');
SELECT test_assert(admin_withdrawal_list('','completed')->'items'->0->'account_id'='null'::jsonb,'erased identity absent');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->>'study_ms'='5520000','deduplicated lifetime time');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->>'study_days'='2','KST midnight distinct days');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->>'study_sessions'='3','included completed sessions only');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->>'mock_submissions'='2','retries remain separate submissions');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->>'mock_exams'='1','distinct exam count');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->>'mock_scores'='2','saved score count');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->>'credits_consumed'='1','no reserve/release double counting');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->>'essay_rewrites'='1','rewrite without new consumption');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->>'credits_free'='1','free grant source preserved');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->>'credits_paid'='0','not counted as paid');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->'material_views'='null'::jsonb,'unknown clicks are not zero');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->>'applications'='2','separate applications retained');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->>'outcome_applications'='1','corrected outcomes not double counted');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->>'invite_signups'='1','attributed signup only');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'activity'->>'invite_first_study'='1','post-signup first study');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000003')->'activity'='null'::jsonb,'partly erased metrics suppressed');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000003')->>'error'='AUTH_UNAVAILABLE','safe error reason');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000005')->'identity'='null'::jsonb,'no erased member identity');
SELECT test_assert(admin_withdrawal_detail('10000000-0000-0000-0000-000000000001')->'started_at'='null'::jsonb,'phase is not a start timestamp');
DO $$BEGIN BEGIN PERFORM admin_withdrawal_list('','','bad');RAISE EXCEPTION 'invalid filter accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;BEGIN PERFORM admin_withdrawal_detail('10000000-0000-0000-0000-000000000007');RAISE EXCEPTION 'expired receipt leaked';EXCEPTION WHEN sqlstate 'PT404' THEN NULL;END;END$$;
RESET ROLE;
-- Direct API role checks: ordinary, pending, pending-admin, missing/expired context.
DO $$DECLARE actor text; BEGIN FOREACH actor IN ARRAY ARRAY['00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004'] LOOP
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','exp',extract(epoch FROM now())+3600)::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 BEGIN PERFORM public.admin_withdrawal_list();RAISE EXCEPTION 'unauthorized list leak';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.admin_withdrawal_detail('10000000-0000-0000-0000-000000000001');RAISE EXCEPTION 'IDOR leak';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 EXECUTE 'RESET ROLE';
END LOOP;END$$;
SET ROLE anon;
DO $$BEGIN BEGIN PERFORM public.admin_withdrawal_list();RAISE EXCEPTION 'anonymous list leak';EXCEPTION WHEN insufficient_privilege THEN NULL;END;BEGIN PERFORM public.admin_withdrawal_detail('10000000-0000-0000-0000-000000000001');RAISE EXCEPTION 'anonymous detail leak';EXCEPTION WHEN insufficient_privilege THEN NULL;END;END$$;
RESET ROLE;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-0000-0000-000000000003','role','authenticated','exp',extract(epoch FROM now())+3600)::text,false);
SET ROLE authenticated;
DO $$BEGIN BEGIN PERFORM public.my_home_configuration();RAISE EXCEPTION 'home pending gate lost';EXCEPTION WHEN insufficient_privilege THEN NULL;END;BEGIN PERFORM public.save_my_home_configuration('{}'::jsonb,0);RAISE EXCEPTION 'home write pending gate lost';EXCEPTION WHEN insufficient_privilege THEN NULL;END;END$$;
RESET ROLE;
DO $$DECLARE x record; n bigint; h text; BEGIN FOR x IN SELECT * FROM preservation LOOP EXECUTE format('select count(*),md5(coalesce(string_agg(t::text,'''' order by t::text),'''')) from %I.%I t',x.nspname,x.relname) INTO n,h; PERFORM test_assert(n=x.count AND h=x.checksum,'unchanged '||x.nspname||'.'||x.relname);END LOOP;END$$;
SELECT test_assert(NOT has_function_privilege('anon','public.admin_withdrawal_list(text,text,text,integer,integer,jsonb)','EXECUTE'),'anon grant absent');
SELECT test_assert(NOT has_function_privilege('service_role','public.admin_withdrawal_detail(uuid)','EXECUTE'),'service role grant absent');
SELECT 'PASS: fixture aggregates, lifecycle, privilege matrix, IDOR, expiry, home gate and all-table preservation' result;

-- Cursor regression: inserts ahead of the page and expired/deleted receipts cannot shift offsets.
BEGIN;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-0000-0000-000000000001','role','authenticated','exp',extract(epoch FROM now())+3600)::text,true);
DO $$DECLARE c jsonb; page jsonb; BEGIN
 c:=public.admin_withdrawal_list('','','newest',1,0)->'next_cursor';
 DELETE FROM public.account_deletion_requests WHERE id='10000000-0000-0000-0000-000000000006';
 INSERT INTO public.account_deletion_requests(id,subject_id,requested_at,scheduled_deletion_at,state,phase,retry_count)
 VALUES('10000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000008',clock_timestamp(),now()+interval '14 days','DELETION_PENDING','PERSONAL',0);
 page:=public.admin_withdrawal_list('','','newest',1,0,c);
 PERFORM public.test_assert(page->'items'->0->>'request_id'='10000000-0000-0000-0000-000000000005','cursor survives insert/removal ahead');
 PERFORM public.test_assert((page->>'total')::int=5,'new insert excluded until refresh');
 PERFORM public.test_assert((public.admin_withdrawal_list('','','newest',1,0,jsonb_build_object('as_of',c->>'as_of','requested_at',NULL,'request_id',NULL))->>'total')::int=5,'previous first page retains cutoff');
 c:=public.admin_withdrawal_list('','','oldest',1,0)->'next_cursor';
 PERFORM public.test_assert(public.admin_withdrawal_list('','','oldest',1,0,c)->'items'->0->>'request_id'='10000000-0000-0000-0000-000000000004','oldest tie cursor');
END$$;
ROLLBACK;
DO $$DECLARE claims jsonb; BEGIN FOREACH claims IN ARRAY ARRAY[
 '{}'::jsonb,
 jsonb_build_object('sub','00000000-0000-0000-0000-000000000001','role','authenticated','exp',extract(epoch FROM now())-1)
] LOOP
 PERFORM set_config('request.jwt.claims',claims::text,true);
 BEGIN PERFORM public.admin_withdrawal_list();RAISE EXCEPTION 'invalid JWT context accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END LOOP; END$$;
SELECT 'PASS: cursor mutation and missing/expired context' result;
