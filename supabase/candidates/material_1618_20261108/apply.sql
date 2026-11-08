-- Candidate only. Owner approval required before production execution.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.resources WHERE id='78960745-ee6a-5045-842f-08738ac1fe44' AND source_resource_key='upcYM/dJMcafBoTJm' AND content_item_id='1ce76c57-5025-541b-b190-cdc7cf485c5b' AND exam_subject_id='56c40413-4816-5535-8d4a-530695f456ed') THEN RAISE EXCEPTION 'Original identity changed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.resources WHERE id='9a50b598-df2f-5573-aaad-4d81921d0a31' AND is_active AND resource_type='question') THEN RAISE EXCEPTION 'Retained question missing'; END IF;
 IF EXISTS(SELECT 1 FROM public.resources WHERE source_post_id='4eb61b68-11b7-5fde-9202-d472b244ddad' AND source_resource_key='qDjj2/dJMcafISWxm' AND id<>'c8761509-f6d0-56d8-999c-16407683d7fd') THEN RAISE EXCEPTION 'Resource identity collision'; END IF;
END $$;
INSERT INTO public.resources(id,content_item_id,exam_subject_id,source_post_id,source_resource_key,resource_type,title,source_label,source_url,link_kind,file_extension,display_order,is_active)
SELECT 'c8761509-f6d0-56d8-999c-16407683d7fd',content_item_id,exam_subject_id,source_post_id,'qDjj2/dJMcafISWxm','answer_explanation','2025학년도 6월 s_생활과윤리 정답,해설.pdf','2025학년도 6월 s_생활과윤리 정답,해설.pdf','https://blog.kakaocdn.net/dna/qDjj2/dJMcafISWxm/AAAAAAAAAAAAAAAAAAAAANpjHhcdk5SfxSeJSZqPdYbbJlXOM2Qr_dt-f8KltULJ/2025%ED%95%99%EB%85%84%EB%8F%84%206%EC%9B%94%20s_%EC%83%9D%ED%99%9C%EA%B3%BC%EC%9C%A4%EB%A6%AC%20%EC%A0%95%EB%8B%B5,%ED%95%B4%EC%84%A4.pdf','unknown','pdf',display_order,true
FROM public.resources WHERE id='78960745-ee6a-5045-842f-08738ac1fe44'
ON CONFLICT(id) DO NOTHING;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.resources WHERE id='c8761509-f6d0-56d8-999c-16407683d7fd' AND source_resource_key='qDjj2/dJMcafISWxm' AND exam_subject_id='56c40413-4816-5535-8d4a-530695f456ed' AND resource_type='answer_explanation' AND is_active) THEN RAISE EXCEPTION 'Answer verification failed'; END IF;
END $$;
UPDATE public.resources SET is_active=false WHERE id='78960745-ee6a-5045-842f-08738ac1fe44' AND is_active;
COMMIT;
