SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$DECLARE r jsonb; BEGIN
 r=public.admin_learning_analytics('2026-11-01 00:00+09','2026-11-03 00:00+09');
 ASSERT r#>>'{metrics,saved_users}'='2'; ASSERT r#>>'{metrics,recent_users}'='1'; ASSERT r#>>'{metrics,active_users}'='2'; ASSERT r#>>'{metrics,application_users}'='1';
 ASSERT r#>>'{metrics,study_ms}'='3600000'; ASSERT r#>>'{study_daily,0,ms}'='1800000'; ASSERT r#>>'{study_daily,1,ms}'='1800000';
 ASSERT r#>>'{interest_application,matching_records}'='1'; ASSERT r#>>'{interest_application,matching_students}'='1';
 ASSERT public.admin_applications_list(0)#>>'{items,0,user_id}'='00000000-0000-4000-8000-000000000002';
 ASSERT jsonb_array_length(public.admin_learning_analytics('2026-11-01 14:45Z','2026-11-01 15:15Z')->'study_daily')=2;
 BEGIN PERFORM public.admin_learning_analytics('2026-11-01Z','2026-11-01Z'); RAISE EXCEPTION 'invalid period accepted'; EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
END$$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$BEGIN BEGIN PERFORM public.admin_learning_analytics('2026-11-01Z','2026-11-03Z');RAISE EXCEPTION 'unauthorized';EXCEPTION WHEN insufficient_privilege THEN NULL;END; BEGIN PERFORM public.admin_applications_list(0); RAISE EXCEPTION 'unauthorized roster';EXCEPTION WHEN insufficient_privilege THEN NULL;END; END$$;
