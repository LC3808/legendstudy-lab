-- Run after the isolated notice_rich_v1/local_test.sql fixture and v2 install.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.assert_ok(public.notice_editor_capability()->>'version'='2','v2 available');
select public.notice_admin_save_rich('{"title":"부분 서식","category":"general","status":"draft","content_document":{"version":2,"blocks":[{"type":"text","text":"신청은 "},{"type":"text","text":"오늘","attributes":{"bold":true,"background":"#ffff00","color":"#000000","size":"22px","underline":true}},{"type":"text","text":"까지입니다."}]}}') as saved \gset
select public.assert_ok(:'saved'::jsonb->>'content'='신청은 오늘까지입니다.','app text');
select public.assert_ok(:'saved'::jsonb#>>'{content_document,blocks,1,attributes,size}'='22px','selected size');
select public.assert_error($q$select public.notice_admin_save_rich('{"content_document":{"version":2,"blocks":[{"type":"text","text":"X","attributes":{"link":"javascript:alert(1)"}}]}}')$q$,'INVALID_NOTICE_DOCUMENT');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.notice_admin_save_rich(:'saved'::jsonb || jsonb_build_object('status','published','published_at',now()-interval '1 hour')) as published_v2 \gset
reset role;
set role anon;
select set_config('request.jwt.claim.sub','',false);
select public.assert_ok(public.notice_detail((:'saved'::jsonb->>'notice_id')::uuid,'web')->'content_document'=:'saved'::jsonb->'content_document','public web retains range formatting');
select public.assert_ok(public.notice_detail((:'saved'::jsonb->>'notice_id')::uuid,'app')->>'content'='신청은 오늘까지입니다.','public app receives readable text');
reset role;
