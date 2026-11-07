-- Retains data; fails if another task changed an applied function.
begin;
do $$begin if md5(pg_get_functiondef('math_private.evaluation_admission()'::regprocedure))<>'a6de193e8c4a7f4892abe2235e8b8d80' then raise exception 'ROLLBACK_FUNCTION_DRIFT';end if;end$$;
do $$begin if md5(pg_get_functiondef('essay_browse_catalog(text)'::regprocedure))<>'e50ccb84951c664fbc9ca85098a79ad3' then raise exception 'ROLLBACK_FUNCTION_DRIFT';end if;end$$;
do $$begin if md5(pg_get_functiondef('math_private.hanyang_worker_references(jsonb)'::regprocedure))<>'54acd2a1914f360e6ecd62e39acc8222' then raise exception 'ROLLBACK_FUNCTION_DRIFT';end if;end$$;
do $$begin if md5(pg_get_functiondef('math_private.release_catalog(uuid)'::regprocedure))<>'d5ec622c31c80a43f2536a1ddeab8cba' then raise exception 'ROLLBACK_FUNCTION_DRIFT';end if;end$$;
CREATE OR REPLACE FUNCTION math_private.evaluation_admission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if not (select evaluations_enabled from math_private.runtime_control where singleton) then
 raise exception 'MATH_EVALUATIONS_PAUSED' using errcode='55000';end if;
 if new.leaf_id is null or not (new.leaf_id=any(array['018b6b54-4815-504a-adb8-685faa204516'::uuid,'06cd2ae1-c7a5-52cb-8ab9-2725bbc7af9f'::uuid,'085d88cf-f279-56b6-a559-4c62679e60cf'::uuid,'0afcc1e0-68ed-56f1-94ef-52d4d81f144b'::uuid,'110e8736-854d-59a0-b4e6-7036a559b83a'::uuid,'11b0d01b-c247-54a5-88b5-368440f68c6f'::uuid,'148cb335-4931-52c1-8270-a1bac78c7082'::uuid,'1699c649-dcf0-5024-84f3-4775eaed49c3'::uuid,'169e0ff4-4fd3-5f87-9908-a8cbe7e768ce'::uuid,'1b28617b-36c6-5dd8-9879-48cb53466814'::uuid,'1cd8b541-a44c-513c-9afe-39cd46664a69'::uuid,'1ffa56cf-7b97-592b-a48c-8ab19e1e29f0'::uuid,'201f3df4-4851-52a3-9e18-6209ef34b56c'::uuid,'206c7e42-f324-5d92-8bbe-b11979d57eda'::uuid,'20fb9238-14bb-5100-949f-66dba3f08ccc'::uuid,'2186939f-a84c-535e-bd6b-647713856dbe'::uuid,'24f4aa41-fdc1-5801-ac60-fe7b1c4ded0c'::uuid,'2514e9c3-77ae-5f98-9eca-16de25ef1f5d'::uuid,'2b528dc2-5c4e-5e4f-8ecb-8bb4c2a4d8e1'::uuid,'2c34ec6b-5821-56df-b07c-99d5f365eca4'::uuid,'2c34f7fb-1485-5030-9b71-b2bd72fd6403'::uuid,'2c405a4c-6a94-530d-be82-76ecf8158138'::uuid,'2ce0c120-41de-538e-aed7-376b7efc5f3b'::uuid,'301f18a3-73b7-5552-a960-6235ff53b1fc'::uuid,'31a6ae05-81d5-5026-907b-85f75f2bec6d'::uuid,'31df8d5d-a638-50dd-b6f1-4b3ed6da4610'::uuid,'339a28cf-9bb2-5da9-a23b-7af6556ba0cd'::uuid,'353c6711-a8a7-5418-96b5-2435b1785837'::uuid,'36497aa6-43a3-50e2-b069-26c45566b086'::uuid,'37db2b14-b863-561e-87dc-df8e286746ca'::uuid,'39e08032-1c14-5f19-83bd-5be93efd365b'::uuid,'3a525e23-8893-513f-887f-5d36f03ee5dd'::uuid,'3bab07d3-c047-53c2-89ad-9fa20ec7b3f3'::uuid,'3e5189bc-840a-54ee-a6ab-d261261c5413'::uuid,'42682f4e-fa84-507e-b5d9-cbf7fbda00f1'::uuid,'43f13de2-e1f7-564b-a572-90e6f2431d37'::uuid,'4c54bfbb-5eee-54b5-be61-eefaf587cefa'::uuid,'502352a4-3b67-58f8-81bf-70c0271fc6c6'::uuid,'591f4939-0db3-565e-9ab0-d1ae60f438e6'::uuid,'609040a7-cee3-55b9-a678-2714f335a7a1'::uuid,'663a25a2-10bb-5f49-b4b0-69a6a5759580'::uuid,'674d75b3-7850-5487-bf75-3c9603f58f7f'::uuid,'67980cc4-1ff2-5e99-b482-7b1c913918c5'::uuid,'687452a8-0e06-5a41-bd5c-6850364d5e02'::uuid,'69b117c5-2fea-5eaa-9c25-d812f1d1b718'::uuid,'6b655a53-7b90-5f83-aed4-58a7d3cbeaae'::uuid,'6dd62ff5-b153-5dea-aeca-4bb7b86bbb2b'::uuid,'6f5aa167-60ed-5b13-a88f-5bf332b8705b'::uuid,'73a0a0e0-ad1e-52cd-bf3d-ba3dc5773ded'::uuid,'746b66ff-064c-5498-9cf7-7c44067909c1'::uuid,'7532956e-9fb5-57c1-98a3-f71aeee46941'::uuid,'793cb69a-80f6-53f4-bca7-de66d92da79f'::uuid,'7a3f5d7d-1980-52f0-a170-6a8308c1f0e7'::uuid,'7b3d8849-dc6b-5613-9de2-585fff227ab5'::uuid,'7d26749d-106d-535d-90c1-1c1bdebf8771'::uuid,'8000aa8a-902c-51da-b8c9-3b02b2b6e766'::uuid,'81a39ee1-28b2-5c3f-8a89-a96745045400'::uuid,'81f6f465-d368-55c3-9245-1e162c6a4170'::uuid,'82958b4f-bac2-53e8-8e46-fd88b5d5acab'::uuid,'838b227c-a442-5088-be0a-3339e0419d3f'::uuid,'83e40e71-85a8-520d-9c7a-7b73d6aabcd0'::uuid,'873c9757-2fcb-515f-b611-c78545d7a838'::uuid,'8d288993-9218-5b8c-95a9-581adf4d6e03'::uuid,'93d8b765-ad6f-5004-96fa-42013cdb3319'::uuid,'9464a798-36f8-5211-bcfb-c8ad43c1b4ad'::uuid,'9552766f-0785-54f6-86d4-c8c70c5da1b8'::uuid,'9765f9ca-2f33-58bb-8e97-c7575564ad58'::uuid,'97db9255-d3c9-55c9-8af4-082133a65ee4'::uuid,'98e31b7e-5eb6-52b1-8adc-392ad6ae02c3'::uuid,'9c4f66ce-893a-566c-8883-17838de68ae5'::uuid,'9caa0c67-a6d8-59c8-b5d6-68a24d7f3e5a'::uuid,'9d1518b7-ec66-5d20-a823-b87b4d7037c6'::uuid,'a066dde9-1311-5b54-82d0-032094087dda'::uuid,'a655a974-324b-507d-bc59-fc6c86e35d78'::uuid,'a716fd23-217a-5383-bab0-3e21271517b8'::uuid,'a89a09e9-b344-5105-aa60-b586f33a7f1e'::uuid,'ae5f2aff-f6f9-5da3-bd48-db41539858b3'::uuid,'af397781-3e8d-5cc5-9018-ae665ae81d49'::uuid,'b262813f-0bcd-51c6-9811-492296411c2e'::uuid,'b27b1562-c9a1-59bc-a424-1862f4ff7e9d'::uuid,'b2cc8e7e-0ba1-5229-aebd-ae0bce90c4cf'::uuid,'b86a7160-0a0b-52c1-84c0-7c78e81becf4'::uuid,'bb365a98-0f32-5ff7-8ee6-bf5f8534f2a2'::uuid,'be56b9db-a783-5db8-8b0e-810a57473bc8'::uuid,'c0247ec7-5e2f-5d84-ba81-691a5a0bea84'::uuid,'c16c7ced-07e9-585a-9cea-a424c9fe6fd2'::uuid,'c3abc2aa-8610-52bc-be22-bdebff5b2911'::uuid,'cc285170-9f86-5541-adf1-1823401c6e29'::uuid,'cca96260-ac54-52d2-83dd-008a0429200e'::uuid,'ce13b2e1-c6fb-5f2e-8500-d5166bbb1cd1'::uuid,'d3fa91a9-315c-52cf-86b9-e4e3ad1f7aca'::uuid,'df0b03d7-613b-5926-a380-df9a5eea74dc'::uuid,'e0f71b73-0f94-5fdc-94f6-6980d3a0bdb2'::uuid,'e7379b0d-6b85-564f-9118-29cbdde8e3f4'::uuid,'e82980f0-57a7-5e52-b267-92742323d8d0'::uuid,'ec11c069-b10c-5e16-89c8-0e20060fcfa3'::uuid,'ef007231-0962-5c3e-ace9-1fc3593cf5f5'::uuid,'efca55c7-550a-55be-8d62-c0a4c738b545'::uuid,'f0c79170-b07a-54b8-889e-c7448aee4bd1'::uuid,'f43a377a-034e-5a7c-9b9f-dd1e60b16afa'::uuid,'f5860380-dcdb-553e-befd-7b23a326fbef'::uuid,'f64947cb-345f-516c-823c-38d120124d6d'::uuid,'fa912822-b549-503b-b3ee-7b96a9116183'::uuid,'ff7e3c02-f2de-52e0-8a3c-ea1ad1ff8475'::uuid,'20c77076-721c-521d-9764-2bbd84f45879'::uuid,'b776559a-3c43-59a6-b980-54bab7861a1a'::uuid,'2adbe766-8cda-551c-abd4-3091440f2dff'::uuid,'df55f50c-4c40-50b6-84fc-4037eda43ef1'::uuid,'0bfe0962-b793-56a3-8c14-ec66ee229f6f'::uuid,'25d468bf-5b14-5cc6-bb39-1f62f564bb09'::uuid,'dadb3c08-1b7e-554a-bc65-2a389abceed3'::uuid,'9c3cb94f-4dac-5ae4-9198-fc7afbf193df'::uuid,'de9204d7-1565-57a0-8af2-ad0847467f3e'::uuid,'144f5cd5-dca6-5b40-9b91-a4c2311d78df'::uuid,'30f04d40-1c56-5944-a120-a4681dab57b8'::uuid,'01c6a7dd-b613-5ed0-8aee-722367866df7'::uuid,'0da7c83c-0d6f-5544-9e51-c7f0d4a06cc2'::uuid,'2c52f064-616b-50f5-ac92-7c05ea8b2680'::uuid,'3dc57772-fb44-5fd3-b34a-5ca03f3e1430'::uuid,'0a2ef554-e041-58e1-a551-8fb03b1702a9'::uuid,'214ba2cf-bbbd-5e65-8612-f08b66a48b04'::uuid,'71f0249e-a0ac-597b-9dae-da3071f41975'::uuid,'7d6df64a-298a-5c8c-b7c4-463d842a8d23'::uuid,'bcbbdd60-3593-56c5-a798-573c00b7f0d3'::uuid,'68988545-0975-5e99-8a12-c14aa9ecd1e3'::uuid,'fc66db06-8c5e-5886-9cc9-ac0653fddd01'::uuid,'5191b890-24e7-5987-8605-fe5ce34dab16'::uuid,'d56ed7e0-7fa2-5a67-890a-c84a7f57e5cc'::uuid,'9d5f2464-5bc5-5b7b-bf34-5278cb44f244'::uuid,'1db9c975-1c3f-5b3a-bd25-c98fd9376e44'::uuid,'2ca58a65-d7e0-5c81-b521-f01dc91bd99b'::uuid,'cc7a94e7-bf90-50d0-a230-5b8d3ffa9d88'::uuid,'d03bc2dc-63a2-566c-b7b5-b0c523f68f23'::uuid,'6f5e02c4-bae8-5194-929f-4526b834f77d'::uuid,'97a920a4-d8ba-5b1f-84ec-6de14d788848'::uuid,'b53af2c1-db5b-5820-b1a9-41479c118695'::uuid,'eebc0593-89f0-583d-84ab-40f2614613ff'::uuid,'15ead5c1-bd2c-5478-b04b-a155b0d12976'::uuid,'ac24797e-8b60-5860-9302-9b2911f05fd7'::uuid,'98041eaa-b40c-53d1-b295-67e946bb59eb'::uuid,'c4d55464-cd19-58cc-8e91-d400610d1438'::uuid,'acbb934e-c7a2-5785-a9fc-a2772a1a7cbe'::uuid,'d3c1fc13-a2cf-586a-a768-7b6938bbb13b'::uuid,'0a1ffdc6-51c3-5df3-9dcc-645088443e89'::uuid,'2005fbe2-ab24-540d-8fd2-5e2325aab1d9'::uuid,'1354113d-306d-5910-88d0-10ed0cbf2cdb'::uuid]))
 or not exists(select 1 from public.math_attempts a where a.id=new.attempt_id and a.student_id=auth.uid() and a.leaf_id=new.leaf_id) then
 raise exception 'MATH_QUESTION_NOT_RELEASED' using errcode='55000';end if;
 return new;
end$function$
;
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
 where e.id <> all(array['48f194ed-202f-5788-962c-cb259317157a'::uuid,'8842d967-e841-5296-a9d1-1bf24c78f6f7'::uuid,'2f7d8e9a-28d4-566c-b69a-09c0bdc01738'::uuid,'1b7f6944-0de5-5e61-bbcb-f44c78d61dac'::uuid,'bfe00753-a4bf-5857-8a39-056907969d23'::uuid,'bbd2b0a2-b1b6-5956-87fc-aa1cfa08a404'::uuid,'be701bb5-5647-5465-a338-1119dc0e064f'::uuid,'7bc501df-6c12-5e13-82ad-ce487947f5f9'::uuid,'66f3816a-221e-5bf8-9486-bf69cec2e216'::uuid,'ee5df319-a4f8-5840-a1c2-02136655512d'::uuid,'7def3132-0356-5e18-be98-895637c20e6e'::uuid,'8174f3c1-879c-582f-8a88-f658286c5b9b'::uuid,'25b00850-70b1-594d-93b4-b124701faf5c'::uuid,'76ae9d8e-7613-5d56-84a1-167ce31ecb14'::uuid,'866d1793-bbb5-5991-96e8-e52c2c99b2cd'::uuid,'66fa2252-0e8a-5f29-985a-c50adafa7dce'::uuid,'e484b585-d3ac-56d5-9c2c-7b604f28299d'::uuid,'c435f96e-0ce0-5603-ac22-c0984662eb98'::uuid,'a68fa7e1-b701-5c7b-95ae-cfc46850614f'::uuid,'eb9c551a-dd29-5454-9a55-8b58a2bb432d'::uuid,'cb4dc5d6-df44-519d-82b4-64833a13304e'::uuid,'de78b082-d9b1-5234-8bb9-d7f7543294db'::uuid,'1a3a3532-8fa1-5d33-917c-e99d441e1788'::uuid,'18902739-69fc-53c8-a9a7-6bf620c9008b'::uuid,'a2a9d777-2237-50c2-af89-a617b88c5bff'::uuid,'5ebc33d1-1097-5ed4-b521-6b9a25d13eaf'::uuid,'3368bb8c-eaf7-5c8f-9e50-aa86c3eb36a1'::uuid,'d2abfee2-2412-5630-9af8-a858116b6759'::uuid,'baceb638-55ee-5d78-8ff4-93dad7832914'::uuid,'10ade245-4c6a-552b-beae-5dc7af3b75bd'::uuid,'b1e3505a-359e-5122-bf42-32b1cb49a174'::uuid,'1705c7d2-e11d-570f-9a4a-d220d0600acd'::uuid,'91802b60-96bf-5cb6-abef-d1c1a738ae6f'::uuid,'44eba80d-09ed-5e8c-a988-01e90c78ffd4'::uuid,'45febe31-1b94-5648-a081-e335f82e81a4'::uuid,'1e66b782-4e74-5fd4-b36d-032991875522'::uuid,'6f01f238-622d-5a85-9a04-8bb5a7b9759d'::uuid,'65c60943-796e-59d0-a3e6-12a43411356b'::uuid,'52a6cbdf-dc7b-5b03-b42f-ec24d88adcb3'::uuid,'e172d96f-0567-560d-8b80-63660e655a9a'::uuid,'f2807bf1-7ffb-51b1-b062-41e7feb6f3a4'::uuid,'afc6578e-a531-5719-8706-b57f53921998'::uuid,'39493cde-f3ca-558d-9aab-7d3c5d7b871a'::uuid,'452155b0-b752-5dca-8912-49b37a5c6bef'::uuid,'423a09b8-b89e-578e-9744-e3c96d0dd611'::uuid,'3ebbbb28-afad-514d-a294-a50fabbdd917'::uuid,'5a565963-98db-5f0f-a7b0-5c879f4eaedb'::uuid,'55b45df4-d873-5c4b-9dcb-6741c0197298'::uuid,'06379378-b27e-510d-8027-abef96a08564'::uuid,'49fd76ae-48d9-5f33-a7f9-3873203847d1'::uuid,'6db119ec-58bd-5d5c-83ab-af33d192ffcc'::uuid,'b462a69f-b52d-5b81-b934-3157e4eb9e7f'::uuid,'4c582db3-d518-57f9-b3b1-56c257aca2e5'::uuid,'bb865f39-f41b-57a3-91b9-e96d2cb86478'::uuid,'4de2b4ff-7ce4-57f4-a864-14627899cdf9'::uuid,'4eb4266c-f109-540a-880b-4044730b4474'::uuid,'d01c91a0-2867-5f20-9df3-2eecc94cc329'::uuid,'6bc75b10-b63f-52cd-b74f-44ddacfb90e9'::uuid,'9e3bf5ce-eeeb-51e2-abad-addf41ad1973'::uuid,'47c0b9ff-5d09-5bb9-a1d2-052f87e9803a'::uuid,'78dc85f3-f3c8-5c8b-98fc-ff96b87527ac'::uuid,'6aa5f389-5cf0-5a35-84e7-ba74bb13557f'::uuid,'f1f86385-3ee4-5af4-a836-e819bae455a6'::uuid,'4835da12-452e-57c3-b134-9dbea8f821bb'::uuid,'dcbe742e-c418-5081-ad06-44953ec2ffac'::uuid,'6be424d3-ffc6-56ed-bab5-5d86416d142e'::uuid,'11ac8d4a-c8e4-5184-ac2a-8d622722cdcf'::uuid])
 )
 select coalesce(jsonb_agg(jsonb_build_object(
 'examId',id,'universityId',university_id,'year',admission_year,
 'kind',exam_kind,'track',admission_track,'title',exam_name,
 'questionCount',jsonb_array_length(questions),'questions',questions,
 'evaluationReady',false) order by admission_year desc,exam_name,id)
 filter(where questions is not null),'[]'::jsonb) from exams;
$function$
;
CREATE OR REPLACE FUNCTION math_private.release_catalog(p_exam uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;begin
 select coalesce(jsonb_agg(x),'[]') into result from (
 select s.essay_exam_id,q.id as essay_question_id,l.id as leaf_id,l.statement,p.statement as problem_statement,s.label||' · '||q.label as label,l.response_format
 from public.math_subproblems l join public.math_problems p on p.id=l.problem_id join public.math_problem_sets s on s.id=p.problem_set_id
 join public.essay_questions q on q.id=case when l.id='3bab07d3-c047-53c2-89ad-9fa20ec7b3f3'::uuid then 'cea40cf3-dc05-507a-a6eb-fd5e1e1847bb'::uuid else l.essay_question_id end and q.essay_exam_id=s.essay_exam_id
 where l.id=any(array['018b6b54-4815-504a-adb8-685faa204516'::uuid,'06cd2ae1-c7a5-52cb-8ab9-2725bbc7af9f'::uuid,'085d88cf-f279-56b6-a559-4c62679e60cf'::uuid,'0afcc1e0-68ed-56f1-94ef-52d4d81f144b'::uuid,'110e8736-854d-59a0-b4e6-7036a559b83a'::uuid,'11b0d01b-c247-54a5-88b5-368440f68c6f'::uuid,'148cb335-4931-52c1-8270-a1bac78c7082'::uuid,'1699c649-dcf0-5024-84f3-4775eaed49c3'::uuid,'169e0ff4-4fd3-5f87-9908-a8cbe7e768ce'::uuid,'1b28617b-36c6-5dd8-9879-48cb53466814'::uuid,'1cd8b541-a44c-513c-9afe-39cd46664a69'::uuid,'1ffa56cf-7b97-592b-a48c-8ab19e1e29f0'::uuid,'201f3df4-4851-52a3-9e18-6209ef34b56c'::uuid,'206c7e42-f324-5d92-8bbe-b11979d57eda'::uuid,'20fb9238-14bb-5100-949f-66dba3f08ccc'::uuid,'2186939f-a84c-535e-bd6b-647713856dbe'::uuid,'24f4aa41-fdc1-5801-ac60-fe7b1c4ded0c'::uuid,'2514e9c3-77ae-5f98-9eca-16de25ef1f5d'::uuid,'2b528dc2-5c4e-5e4f-8ecb-8bb4c2a4d8e1'::uuid,'2c34ec6b-5821-56df-b07c-99d5f365eca4'::uuid,'2c34f7fb-1485-5030-9b71-b2bd72fd6403'::uuid,'2c405a4c-6a94-530d-be82-76ecf8158138'::uuid,'2ce0c120-41de-538e-aed7-376b7efc5f3b'::uuid,'301f18a3-73b7-5552-a960-6235ff53b1fc'::uuid,'31a6ae05-81d5-5026-907b-85f75f2bec6d'::uuid,'31df8d5d-a638-50dd-b6f1-4b3ed6da4610'::uuid,'339a28cf-9bb2-5da9-a23b-7af6556ba0cd'::uuid,'353c6711-a8a7-5418-96b5-2435b1785837'::uuid,'36497aa6-43a3-50e2-b069-26c45566b086'::uuid,'37db2b14-b863-561e-87dc-df8e286746ca'::uuid,'39e08032-1c14-5f19-83bd-5be93efd365b'::uuid,'3a525e23-8893-513f-887f-5d36f03ee5dd'::uuid,'3bab07d3-c047-53c2-89ad-9fa20ec7b3f3'::uuid,'3e5189bc-840a-54ee-a6ab-d261261c5413'::uuid,'42682f4e-fa84-507e-b5d9-cbf7fbda00f1'::uuid,'43f13de2-e1f7-564b-a572-90e6f2431d37'::uuid,'4c54bfbb-5eee-54b5-be61-eefaf587cefa'::uuid,'502352a4-3b67-58f8-81bf-70c0271fc6c6'::uuid,'591f4939-0db3-565e-9ab0-d1ae60f438e6'::uuid,'609040a7-cee3-55b9-a678-2714f335a7a1'::uuid,'663a25a2-10bb-5f49-b4b0-69a6a5759580'::uuid,'674d75b3-7850-5487-bf75-3c9603f58f7f'::uuid,'67980cc4-1ff2-5e99-b482-7b1c913918c5'::uuid,'687452a8-0e06-5a41-bd5c-6850364d5e02'::uuid,'69b117c5-2fea-5eaa-9c25-d812f1d1b718'::uuid,'6b655a53-7b90-5f83-aed4-58a7d3cbeaae'::uuid,'6dd62ff5-b153-5dea-aeca-4bb7b86bbb2b'::uuid,'6f5aa167-60ed-5b13-a88f-5bf332b8705b'::uuid,'73a0a0e0-ad1e-52cd-bf3d-ba3dc5773ded'::uuid,'746b66ff-064c-5498-9cf7-7c44067909c1'::uuid,'7532956e-9fb5-57c1-98a3-f71aeee46941'::uuid,'793cb69a-80f6-53f4-bca7-de66d92da79f'::uuid,'7a3f5d7d-1980-52f0-a170-6a8308c1f0e7'::uuid,'7b3d8849-dc6b-5613-9de2-585fff227ab5'::uuid,'7d26749d-106d-535d-90c1-1c1bdebf8771'::uuid,'8000aa8a-902c-51da-b8c9-3b02b2b6e766'::uuid,'81a39ee1-28b2-5c3f-8a89-a96745045400'::uuid,'81f6f465-d368-55c3-9245-1e162c6a4170'::uuid,'82958b4f-bac2-53e8-8e46-fd88b5d5acab'::uuid,'838b227c-a442-5088-be0a-3339e0419d3f'::uuid,'83e40e71-85a8-520d-9c7a-7b73d6aabcd0'::uuid,'873c9757-2fcb-515f-b611-c78545d7a838'::uuid,'8d288993-9218-5b8c-95a9-581adf4d6e03'::uuid,'93d8b765-ad6f-5004-96fa-42013cdb3319'::uuid,'9464a798-36f8-5211-bcfb-c8ad43c1b4ad'::uuid,'9552766f-0785-54f6-86d4-c8c70c5da1b8'::uuid,'9765f9ca-2f33-58bb-8e97-c7575564ad58'::uuid,'97db9255-d3c9-55c9-8af4-082133a65ee4'::uuid,'98e31b7e-5eb6-52b1-8adc-392ad6ae02c3'::uuid,'9c4f66ce-893a-566c-8883-17838de68ae5'::uuid,'9caa0c67-a6d8-59c8-b5d6-68a24d7f3e5a'::uuid,'9d1518b7-ec66-5d20-a823-b87b4d7037c6'::uuid,'a066dde9-1311-5b54-82d0-032094087dda'::uuid,'a655a974-324b-507d-bc59-fc6c86e35d78'::uuid,'a716fd23-217a-5383-bab0-3e21271517b8'::uuid,'a89a09e9-b344-5105-aa60-b586f33a7f1e'::uuid,'ae5f2aff-f6f9-5da3-bd48-db41539858b3'::uuid,'af397781-3e8d-5cc5-9018-ae665ae81d49'::uuid,'b262813f-0bcd-51c6-9811-492296411c2e'::uuid,'b27b1562-c9a1-59bc-a424-1862f4ff7e9d'::uuid,'b2cc8e7e-0ba1-5229-aebd-ae0bce90c4cf'::uuid,'b86a7160-0a0b-52c1-84c0-7c78e81becf4'::uuid,'bb365a98-0f32-5ff7-8ee6-bf5f8534f2a2'::uuid,'be56b9db-a783-5db8-8b0e-810a57473bc8'::uuid,'c0247ec7-5e2f-5d84-ba81-691a5a0bea84'::uuid,'c16c7ced-07e9-585a-9cea-a424c9fe6fd2'::uuid,'c3abc2aa-8610-52bc-be22-bdebff5b2911'::uuid,'cc285170-9f86-5541-adf1-1823401c6e29'::uuid,'cca96260-ac54-52d2-83dd-008a0429200e'::uuid,'ce13b2e1-c6fb-5f2e-8500-d5166bbb1cd1'::uuid,'d3fa91a9-315c-52cf-86b9-e4e3ad1f7aca'::uuid,'df0b03d7-613b-5926-a380-df9a5eea74dc'::uuid,'e0f71b73-0f94-5fdc-94f6-6980d3a0bdb2'::uuid,'e7379b0d-6b85-564f-9118-29cbdde8e3f4'::uuid,'e82980f0-57a7-5e52-b267-92742323d8d0'::uuid,'ec11c069-b10c-5e16-89c8-0e20060fcfa3'::uuid,'ef007231-0962-5c3e-ace9-1fc3593cf5f5'::uuid,'efca55c7-550a-55be-8d62-c0a4c738b545'::uuid,'f0c79170-b07a-54b8-889e-c7448aee4bd1'::uuid,'f43a377a-034e-5a7c-9b9f-dd1e60b16afa'::uuid,'f5860380-dcdb-553e-befd-7b23a326fbef'::uuid,'f64947cb-345f-516c-823c-38d120124d6d'::uuid,'fa912822-b549-503b-b3ee-7b96a9116183'::uuid,'ff7e3c02-f2de-52e0-8a3c-ea1ad1ff8475'::uuid,'20c77076-721c-521d-9764-2bbd84f45879'::uuid,'b776559a-3c43-59a6-b980-54bab7861a1a'::uuid,'2adbe766-8cda-551c-abd4-3091440f2dff'::uuid,'df55f50c-4c40-50b6-84fc-4037eda43ef1'::uuid,'0bfe0962-b793-56a3-8c14-ec66ee229f6f'::uuid,'25d468bf-5b14-5cc6-bb39-1f62f564bb09'::uuid,'dadb3c08-1b7e-554a-bc65-2a389abceed3'::uuid,'9c3cb94f-4dac-5ae4-9198-fc7afbf193df'::uuid,'de9204d7-1565-57a0-8af2-ad0847467f3e'::uuid,'144f5cd5-dca6-5b40-9b91-a4c2311d78df'::uuid,'30f04d40-1c56-5944-a120-a4681dab57b8'::uuid,'01c6a7dd-b613-5ed0-8aee-722367866df7'::uuid,'0da7c83c-0d6f-5544-9e51-c7f0d4a06cc2'::uuid,'2c52f064-616b-50f5-ac92-7c05ea8b2680'::uuid,'3dc57772-fb44-5fd3-b34a-5ca03f3e1430'::uuid,'0a2ef554-e041-58e1-a551-8fb03b1702a9'::uuid,'214ba2cf-bbbd-5e65-8612-f08b66a48b04'::uuid,'71f0249e-a0ac-597b-9dae-da3071f41975'::uuid,'7d6df64a-298a-5c8c-b7c4-463d842a8d23'::uuid,'bcbbdd60-3593-56c5-a798-573c00b7f0d3'::uuid,'68988545-0975-5e99-8a12-c14aa9ecd1e3'::uuid,'fc66db06-8c5e-5886-9cc9-ac0653fddd01'::uuid,'5191b890-24e7-5987-8605-fe5ce34dab16'::uuid,'d56ed7e0-7fa2-5a67-890a-c84a7f57e5cc'::uuid,'9d5f2464-5bc5-5b7b-bf34-5278cb44f244'::uuid,'1db9c975-1c3f-5b3a-bd25-c98fd9376e44'::uuid,'2ca58a65-d7e0-5c81-b521-f01dc91bd99b'::uuid,'cc7a94e7-bf90-50d0-a230-5b8d3ffa9d88'::uuid,'d03bc2dc-63a2-566c-b7b5-b0c523f68f23'::uuid,'6f5e02c4-bae8-5194-929f-4526b834f77d'::uuid,'97a920a4-d8ba-5b1f-84ec-6de14d788848'::uuid,'b53af2c1-db5b-5820-b1a9-41479c118695'::uuid,'eebc0593-89f0-583d-84ab-40f2614613ff'::uuid,'15ead5c1-bd2c-5478-b04b-a155b0d12976'::uuid,'ac24797e-8b60-5860-9302-9b2911f05fd7'::uuid,'98041eaa-b40c-53d1-b295-67e946bb59eb'::uuid,'c4d55464-cd19-58cc-8e91-d400610d1438'::uuid,'acbb934e-c7a2-5785-a9fc-a2772a1a7cbe'::uuid,'d3c1fc13-a2cf-586a-a768-7b6938bbb13b'::uuid,'0a1ffdc6-51c3-5df3-9dcc-645088443e89'::uuid,'2005fbe2-ab24-540d-8fd2-5e2325aab1d9'::uuid,'1354113d-306d-5910-88d0-10ed0cbf2cdb'::uuid]) and p.state='ACTIVE' and s.state='ACTIVE' and (p_exam is null or s.essay_exam_id=p_exam)
 order by s.id,p.display_order,l.display_order,l.id) x;
 if jsonb_array_length(result)>512 then raise program_limit_exceeded using message='RELEASE_CATALOG_LIMIT_EXCEEDED';end if;
 return result;
end$function$
;
CREATE OR REPLACE FUNCTION math_private.hanyang_worker_references(ctx jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select coalesce((
   select jsonb_build_object(
     'official_images', p.images,
     'official_image_index', (select jsonb_agg(entry - 'data' order by position)
       from jsonb_array_elements(p.images) with ordinality as t(entry,position))
   )
   from math_private.task20_hanyang_source_pages p
   where p.question_id::text = ctx#>>'{leaf,essay_question_id}'
     and p.exam_id = (select s.essay_exam_id from public.math_problem_sets s where s.id::text=ctx#>>'{problem,problem_set_id}')
     and not exists (
        select 1 from (values ('QUESTION','problem'),('SCORING','rubric'),('INTENT','intent'),('SOLUTION','solution')) r(role,key)
        where not exists (select 1 from jsonb_array_elements(ctx->'sources') src
          where src->>'source_role'=r.role and src->>'provenance'='OFFICIAL' and src->>'verification'='HASH_VERIFIED'
            and src->>'problem_id'=ctx#>>'{problem,id}'
            and src->>'content_sha256'=p.manifest->r.key->>'sha256'
            and (src->>'locator') like ('% PDF '||(select string_agg(x,',' order by n) from jsonb_array_elements_text(p.manifest->r.key->'pages') with ordinality t(x,n))||'쪽')))
 ),'{}'::jsonb)
$function$
;
drop policy if exists task20_chungang_question_pdfs on storage.objects;
commit;
