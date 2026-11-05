begin;
do $$begin if md5(pg_get_functiondef('public.essay_browse_catalog(text)'::regprocedure))<> '6b8f759c777c6ff5e6e5b3868428017e' then raise exception 'CATALOG_DEFINITION_DRIFT';end if;end$$;
CREATE OR REPLACE FUNCTION public.essay_browse_catalog(p_university text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 with catalog(source_id,db_id,name) as (values
('gachon','a9e38cdc-9593-4c60-b8a6-698133f48518','가천대학교'),
('catholic','c5850ef5-616e-4ebb-aeac-3f6a3e7c4d0a','가톨릭대학교'),
('kangnam',null,'강남대학교'),
('konkuk','77fe30b2-f693-4612-a6d3-50e8be5c8f6c','건국대학교'),
('kyonggi','295f71b3-12da-4122-b743-f0c2c8bebe44','경기대학교'),
('knu','72bc4be0-6e72-4c72-adc5-8ee54279f3bd','경북대학교'),
('kyunghee','b401cc24-dd17-575e-8ac6-0fd8c9c8405d','경희대학교'),
('korea','a93ec9df-2096-4550-801f-07a25b9a437b','고려대학교'),
('kwangwoon','3d35489f-2e90-47b8-af1b-48928ee2269a','광운대학교'),
('kookmin','88aa2231-6a1c-47ee-a063-b168cdaf85ad','국민대학교'),
('dankook','bdae801b-e46e-449f-9211-0a440f8eb78d','단국대학교'),
('duksung',null,'덕성여자대학교'),
('dongguk','cd1ba908-2b5f-4063-a111-2da53d7d358b','동국대학교'),
('dongduk',null,'동덕여자대학교'),
('pnu','08303fd3-ec87-4976-a9a9-547a1d52f996','부산대학교'),
('syu',null,'삼육대학교'),
('sangmyung',null,'상명대학교'),
('sogang','816c1cb8-b54d-4f05-ae64-e82abfec0ada','서강대학교'),
('seokyeong',null,'서경대학교'),
('seoultech','52ec1dd2-b27b-4a5e-9ebb-a85cb8079ff2','서울과학기술대학교'),
('uos','0598e08a-20d6-4814-9511-6abe22814355','서울시립대학교'),
('swu',null,'서울여자대학교'),
('skku','4acee829-94d4-5f8a-b440-a72e423d439f','성균관대학교'),
('sungshin',null,'성신여자대학교'),
('sejong','447d2f79-fb0a-4a02-bce6-d214244b683d','세종대학교'),
('suwon',null,'수원대학교'),
('sookmyung','c4fa65ac-bbc6-5897-b4d8-f12f5a8f222b','숙명여자대학교'),
('soongsil','6ae1fd3f-22da-43f4-a796-1cfe960c5fcb','숭실대학교'),
('shinhan',null,'신한대학교'),
('ajou','25f8c2a3-7a6c-445a-80c5-f62f7b1ca4c6','아주대학교'),
('yonsei','9076637b-d827-5bb6-8e4e-954bd2a05805','연세대학교'),
('eulji',null,'을지대학교'),
('ewha','fdc7e693-15a2-47fc-b080-4f14e9274d95','이화여자대학교'),
('inha','e40f4b8f-8949-4726-a774-2b6f0e6d8939','인하대학교'),
('cau','ffad67a6-107f-47b7-a1cb-ab61687ffb9f','중앙대학교'),
('tukorea',null,'한국공학대학교'),
('koreatech',null,'한국기술교육대학교'),
('hufs','1fd29b0d-1141-4ff0-b1b3-c4f201854476','한국외국어대학교'),
('kau',null,'한국항공대학교'),
('hanshin',null,'한신대학교'),
('hanyang','1090e1be-174e-5042-abd3-ca929c6e26f8','한양대학교'),
('hongik','15f50d54-001d-49b9-836b-a5d9c76b9c0a','홍익대학교')
 ), selected as (
 select u.id from public.universities u join catalog c
 on (c.db_id is not null and u.id=c.db_id::uuid)
 or (c.db_id is null and u.slug=c.source_id and u.name=c.name)
 where c.source_id=p_university
 ), exams as (
 select e.id,e.university_id,e.admission_year,e.exam_kind,coalesce(e.field_or_division,e.admission_track) admission_track,e.exam_name,
 (select jsonb_agg(jsonb_build_object('id',q.id,'label',q.label) order by q.display_order,q.id)
 from public.essay_questions q where q.essay_exam_id=e.id) questions
 from public.essay_exams e join selected s on s.id=e.university_id
 )
 select coalesce(jsonb_agg(jsonb_build_object(
 'examId',id,'universityId',university_id,'year',admission_year,
 'kind',exam_kind,'track',admission_track,'title',exam_name,
 'questionCount',jsonb_array_length(questions),'questions',questions,
 'evaluationReady',false) order by admission_year desc,exam_name,id)
 filter(where questions is not null),'[]'::jsonb) from exams;
$function$;
commit;
