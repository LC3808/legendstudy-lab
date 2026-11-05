begin;
do $$begin if md5(pg_get_functiondef('public.essay_browse_catalog(text)'::regprocedure))<> '7a5d5ee547e406222a67d51fe310c7d8' then raise exception 'CATALOG_DEFINITION_DRIFT';end if;end$$;
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
 where e.id <> all(array['ec06c1af-0efc-5477-80b9-ab25b3f938b7'::uuid,'2d4f01c3-6a94-5010-84a5-ba8c410d5aa3'::uuid,'12fc2456-206b-5172-8a54-513056b4692f'::uuid,'b8fc4b28-b54c-5af1-ab01-e7a191978a93'::uuid,'6d59d592-045f-5a07-ab47-6d2b9b1c6080'::uuid,'c51e9d2b-2141-582d-8fef-39aa3569146a'::uuid,'913dc1fb-b97a-585a-a3bc-42403307833c'::uuid,'7a837ee4-ef07-5885-8d06-d20ff241ebc6'::uuid,'77f27f9e-7ef9-5184-8fb1-607c68cc03d2'::uuid,'1d3fbceb-ef00-5b63-adca-15d2913d2410'::uuid,'f62c49c7-39ca-5405-9969-93ee88972bdd'::uuid,'2c20b87a-0594-5a1e-80ae-30bc72087152'::uuid,'c4c633bf-8edb-536a-8a7b-89f9ab64921e'::uuid,'26703113-7ecb-5632-b3a3-7185fdd9bb0a'::uuid,'2b66ee4c-a7bf-5c2d-b648-629cf712b0ca'::uuid,'fff2d3d1-5b69-5da9-8a67-53c9658896a4'::uuid,'92e250d2-e074-5e84-8b8b-60c335aa2cde'::uuid,'30559faa-7c26-54ee-a5ec-859a58f96bda'::uuid,'cb2bd529-7d6f-5f61-a6a6-7f8deba486c1'::uuid,'48f194ed-202f-5788-962c-cb259317157a'::uuid,'8842d967-e841-5296-a9d1-1bf24c78f6f7'::uuid,'2f7d8e9a-28d4-566c-b69a-09c0bdc01738'::uuid,'1b7f6944-0de5-5e61-bbcb-f44c78d61dac'::uuid,'bfe00753-a4bf-5857-8a39-056907969d23'::uuid,'bbd2b0a2-b1b6-5956-87fc-aa1cfa08a404'::uuid,'be701bb5-5647-5465-a338-1119dc0e064f'::uuid,'7bc501df-6c12-5e13-82ad-ce487947f5f9'::uuid,'66f3816a-221e-5bf8-9486-bf69cec2e216'::uuid,'ee5df319-a4f8-5840-a1c2-02136655512d'::uuid,'7def3132-0356-5e18-be98-895637c20e6e'::uuid,'8174f3c1-879c-582f-8a88-f658286c5b9b'::uuid,'25b00850-70b1-594d-93b4-b124701faf5c'::uuid,'76ae9d8e-7613-5d56-84a1-167ce31ecb14'::uuid,'866d1793-bbb5-5991-96e8-e52c2c99b2cd'::uuid,'66fa2252-0e8a-5f29-985a-c50adafa7dce'::uuid,'e484b585-d3ac-56d5-9c2c-7b604f28299d'::uuid,'c435f96e-0ce0-5603-ac22-c0984662eb98'::uuid,'a68fa7e1-b701-5c7b-95ae-cfc46850614f'::uuid,'eb9c551a-dd29-5454-9a55-8b58a2bb432d'::uuid,'cb4dc5d6-df44-519d-82b4-64833a13304e'::uuid,'de78b082-d9b1-5234-8bb9-d7f7543294db'::uuid,'1a3a3532-8fa1-5d33-917c-e99d441e1788'::uuid,'18902739-69fc-53c8-a9a7-6bf620c9008b'::uuid,'a2a9d777-2237-50c2-af89-a617b88c5bff'::uuid,'5ebc33d1-1097-5ed4-b521-6b9a25d13eaf'::uuid,'3368bb8c-eaf7-5c8f-9e50-aa86c3eb36a1'::uuid,'d2abfee2-2412-5630-9af8-a858116b6759'::uuid,'baceb638-55ee-5d78-8ff4-93dad7832914'::uuid,'10ade245-4c6a-552b-beae-5dc7af3b75bd'::uuid,'b1e3505a-359e-5122-bf42-32b1cb49a174'::uuid,'1705c7d2-e11d-570f-9a4a-d220d0600acd'::uuid,'91802b60-96bf-5cb6-abef-d1c1a738ae6f'::uuid,'44eba80d-09ed-5e8c-a988-01e90c78ffd4'::uuid,'45febe31-1b94-5648-a081-e335f82e81a4'::uuid,'1e66b782-4e74-5fd4-b36d-032991875522'::uuid,'6f01f238-622d-5a85-9a04-8bb5a7b9759d'::uuid,'65c60943-796e-59d0-a3e6-12a43411356b'::uuid,'52a6cbdf-dc7b-5b03-b42f-ec24d88adcb3'::uuid,'e172d96f-0567-560d-8b80-63660e655a9a'::uuid,'f2807bf1-7ffb-51b1-b062-41e7feb6f3a4'::uuid,'afc6578e-a531-5719-8706-b57f53921998'::uuid,'39493cde-f3ca-558d-9aab-7d3c5d7b871a'::uuid,'452155b0-b752-5dca-8912-49b37a5c6bef'::uuid,'423a09b8-b89e-578e-9744-e3c96d0dd611'::uuid,'3ebbbb28-afad-514d-a294-a50fabbdd917'::uuid,'5a565963-98db-5f0f-a7b0-5c879f4eaedb'::uuid,'55b45df4-d873-5c4b-9dcb-6741c0197298'::uuid,'06379378-b27e-510d-8027-abef96a08564'::uuid,'49fd76ae-48d9-5f33-a7f9-3873203847d1'::uuid,'6db119ec-58bd-5d5c-83ab-af33d192ffcc'::uuid,'b462a69f-b52d-5b81-b934-3157e4eb9e7f'::uuid,'4c582db3-d518-57f9-b3b1-56c257aca2e5'::uuid,'bb865f39-f41b-57a3-91b9-e96d2cb86478'::uuid,'4de2b4ff-7ce4-57f4-a864-14627899cdf9'::uuid,'4eb4266c-f109-540a-880b-4044730b4474'::uuid,'d01c91a0-2867-5f20-9df3-2eecc94cc329'::uuid,'6bc75b10-b63f-52cd-b74f-44ddacfb90e9'::uuid,'9e3bf5ce-eeeb-51e2-abad-addf41ad1973'::uuid,'47c0b9ff-5d09-5bb9-a1d2-052f87e9803a'::uuid,'78dc85f3-f3c8-5c8b-98fc-ff96b87527ac'::uuid,'6aa5f389-5cf0-5a35-84e7-ba74bb13557f'::uuid,'f1f86385-3ee4-5af4-a836-e819bae455a6'::uuid,'4835da12-452e-57c3-b134-9dbea8f821bb'::uuid,'dcbe742e-c418-5081-ad06-44953ec2ffac'::uuid,'6be424d3-ffc6-56ed-bab5-5d86416d142e'::uuid,'11ac8d4a-c8e4-5184-ac2a-8d622722cdcf'::uuid])
 )
 select coalesce(jsonb_agg(jsonb_build_object(
 'examId',id,'universityId',university_id,'year',admission_year,
 'kind',exam_kind,'track',admission_track,'title',exam_name,
 'questionCount',jsonb_array_length(questions),'questions',questions,
 'evaluationReady',false) order by admission_year desc,exam_name,id)
 filter(where questions is not null),'[]'::jsonb) from exams;
$function$;
commit;
