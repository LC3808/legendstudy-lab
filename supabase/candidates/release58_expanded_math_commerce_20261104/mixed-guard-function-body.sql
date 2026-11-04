CREATE OR REPLACE FUNCTION essay_exam_private.reserve(p_account uuid, p_exam uuid, p_key uuid, p_snapshot jsonb, p_parent uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r essay_exam_private.runs; parent essay_exam_private.runs; q jsonb; g uuid;
 rid uuid=gen_random_uuid(); did uuid=gen_random_uuid(); n integer; keys jsonb; parentkeys jsonb;
begin
 perform 1 from public.credit_accounts where id=p_account and user_id is not null for update;
 if not found then raise exception 'ACCOUNT_UNAVAILABLE';end if;
 select * into r from essay_exam_private.runs where account_id=p_account and request_key=p_key;
 if found then
  if r.exam_id<>p_exam or r.parent_id is distinct from p_parent or r.snapshot is distinct from p_snapshot then
   raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return r.id;
 end if;
 if p_key is null or p_snapshot is null or jsonb_typeof(p_snapshot)<>'object' or
 jsonb_typeof(p_snapshot->'answers') is distinct from 'array' then raise exception 'INVALID_SNAPSHOT';end if;
 n=jsonb_array_length(p_snapshot->'answers');
 if n<1 or n>100 then raise exception 'INVALID_QUESTION_SET';end if;
 select jsonb_agg(x->>'questionId' order by x->>'questionId') into keys from jsonb_array_elements(p_snapshot->'answers') x;
 if (select count(distinct x->>'questionId') from jsonb_array_elements(p_snapshot->'answers') x)<>n then
 raise exception 'INVALID_QUESTION_SET';end if;
 for q in select value from jsonb_array_elements(p_snapshot->'answers') loop
  if not exists(select 1 from public.essay_questions where id=(q->>'questionId')::uuid and essay_exam_id=p_exam) then
   raise exception 'QUESTION_NOT_IN_EXAM';end if;
  if jsonb_typeof(q->'body') is distinct from 'string' or length(btrim(q->>'body'))=0 or length(q->>'body')>30000 or
   coalesce(q->>'revision','') !~ '^[0-9]+$' or coalesce(q->>'rubricVersion','')='' or coalesce(q->>'evidenceVersion','')='' then
   raise exception 'INVALID_ANSWER';end if;
 end loop;
 -- New mixed submissions must contain every approved question. Existing exact
 -- accepted-key replay above remains unchanged, including historical partial runs.
 if p_exam=any(array['1f382418-b4b8-5562-82ec-0c2e5f3cfaef'::uuid,'2919c142-21d7-539d-952a-5382d16dbdf7'::uuid,'3566b3a0-10a3-56ab-a7dc-5b9638706164'::uuid,'42c8d5be-6cdb-5528-8808-174d9785b9d4'::uuid,'53bdd6f5-78be-548f-ac1b-23081f9bf74c'::uuid,'54d99cb2-f04e-598a-b5e9-9222d0b97bba'::uuid,'56a6be43-48eb-5aaa-a0ce-f646faaabe23'::uuid,'5ff20127-f5b6-5d4c-a6fd-f54c97a87130'::uuid,'6536445f-75b2-5f84-894a-f33382e8ea91'::uuid,'68996278-1e19-5560-ac94-cf43656bf684'::uuid,'7a00b094-234c-5376-b339-326a41abdeb9'::uuid,'7b2ba890-bb8d-5c00-b665-b926cdd5008f'::uuid,'7e232cd6-cbad-547f-bb34-2eb6cebb65f7'::uuid,'81b81d92-0a1a-54af-b4dd-2702222bc1f3'::uuid,'8931ed55-1c11-538a-b324-9765a60d3a75'::uuid,'8c5dc701-9b26-5935-9610-7b27256eb767'::uuid,'c3bb88cd-6a1d-54d0-bc84-4a4707202868'::uuid,'c5870bbe-a74f-5e7f-8767-8502166c56b4'::uuid,'c722ffa2-0ff4-5718-9748-186111a7c560'::uuid,'d4f1b0c4-98ef-5b28-999b-b369bb81d3ae'::uuid,'df220173-b0ef-5cd2-8a92-12a958fd669e'::uuid,'e8ea5bb3-0956-5fd6-b90e-4b7fb350b2f9'::uuid,'e9e7daf3-854c-57d3-a6dd-cc18fca0d8ea'::uuid,'ef5ca7d9-3a56-5068-933e-f7a2859ef438'::uuid,'f45667e4-bbd0-5372-b044-e5e9d3983521'::uuid,'f88663fb-a0d4-52ed-bead-ea11f2c2970e'::uuid]) then
  select jsonb_agg(value order by value::text) into parentkeys
  from jsonb_array_elements(($mixed_pins${"1f382418-b4b8-5562-82ec-0c2e5f3cfaef": ["3a4a8a77-5ddf-54be-ac2e-9d5516310a92", "5e7e0c59-16c3-506a-9d75-3df6b9af0ddc"], "7e232cd6-cbad-547f-bb34-2eb6cebb65f7": ["ac1e46b9-7b8f-50e0-b8cc-3dc6f431f10c", "b2dd66ec-1684-5fc3-8cae-d099e75cae74"], "81b81d92-0a1a-54af-b4dd-2702222bc1f3": ["b4864271-25e0-5a06-acd3-6a35257c2c8c", "fae8f3fd-42ea-508b-ba3f-f589fb83f1ac"], "c722ffa2-0ff4-5718-9748-186111a7c560": ["c6f2620a-32cc-5748-a40e-e2e2d11377c4", "e7e2ec5c-e0de-5b30-9f68-3862ac0186ec"], "7b2ba890-bb8d-5c00-b665-b926cdd5008f": ["590b127d-08da-5c33-9eea-34c9c03fc6a0", "df12e9f9-ca22-56f4-91d7-4a4b0092ca98"], "df220173-b0ef-5cd2-8a92-12a958fd669e": ["73bfc0f6-b992-5874-b24d-07cbdbe0360e", "d5c23f04-3bfc-5e6f-8a4c-f0e95b216e7c"], "2919c142-21d7-539d-952a-5382d16dbdf7": ["673777f6-9c69-585e-bf08-c36e470f51c7", "ac4d234d-56c0-57fd-85c3-2b9889889acd", "c64561bd-17a4-5280-9c43-3c2bb88d41c3"], "8c5dc701-9b26-5935-9610-7b27256eb767": ["2e0b25f8-e55f-51b3-b269-c20b1582be72", "899a2a38-ce8e-51b6-a176-02d428c86f39", "bf930847-4872-5d7d-8099-e177ff31e1db"], "42c8d5be-6cdb-5528-8808-174d9785b9d4": ["11f3fda1-4add-5072-a6ba-d8508b911025", "7a2514c8-e70c-52d9-88f9-2ca3b8d14853", "b200da32-38b8-590d-b39a-26ec482f7fc6"], "7a00b094-234c-5376-b339-326a41abdeb9": ["3348464b-5fce-5e2b-8b6c-9556315f15bd", "7f43dd12-8597-5605-ad40-60dd71e9604f", "92b9a6ee-6516-5aab-b654-5a8e68fd969d"], "53bdd6f5-78be-548f-ac1b-23081f9bf74c": ["128810a1-149d-5344-ade7-62f98a5d481e", "d08c00a8-78ef-5061-af5f-742e8e554798", "eaf570bf-af83-5e9e-a9b7-ac39fd801fcd"], "e9e7daf3-854c-57d3-a6dd-cc18fca0d8ea": ["6dd7b23e-7ffc-562e-8bc0-2c19c76391b1", "82ce8195-821c-5a3e-be9e-d6c7cefa4da5", "fb4072f0-054a-5ae0-bbdc-f21cf71bf865"], "3566b3a0-10a3-56ab-a7dc-5b9638706164": ["0aca057c-b5bf-533d-80ba-17991bac1b3d", "40aa3813-0e8f-53e4-a13d-daaf2c7e1f90", "aba44c58-18a0-5f91-8d0f-780de5982854"], "d4f1b0c4-98ef-5b28-999b-b369bb81d3ae": ["5f4999e6-b4df-5045-8060-81e331b9d524", "aaf768ae-f47a-525c-82ab-3348359d39c8", "ead93508-3fe5-5e0d-9005-810be5eab336"], "5ff20127-f5b6-5d4c-a6fd-f54c97a87130": ["790cc78d-05fe-5610-96b6-796c86825206", "805a1126-5a4b-5f81-9e37-c4837d604555", "8edfd369-d7b6-576c-bb94-78182f5e565c"], "8931ed55-1c11-538a-b324-9765a60d3a75": ["2d342bc3-c038-5520-a020-76e5ea77a33a", "974b12a2-14a7-5a5f-b2d0-94375d17ac17", "fceda5f5-01aa-5f9b-9826-b99c7726f09a"], "c5870bbe-a74f-5e7f-8767-8502166c56b4": ["03feeeff-75ff-57b4-b586-569d90bcbf00", "487de3bf-de59-53ac-a8a1-5653eb20396a", "cf0a153e-f543-533d-bfe5-7e590c7e1f92"], "c3bb88cd-6a1d-54d0-bc84-4a4707202868": ["0abea959-72df-5c55-adc8-76f2cd6af01e", "9cef2a80-6d17-5cb6-a9a0-b796aca6db90", "e95e65a1-433d-54ec-a135-9d2bd52c69a8"], "68996278-1e19-5560-ac94-cf43656bf684": ["2b733da1-6c2a-50d8-a32d-83d136636754", "a32bc8ed-edf9-580e-b2e6-10ddaea4cf1e"], "54d99cb2-f04e-598a-b5e9-9222d0b97bba": ["413b39ec-fa86-55e4-af64-cc3492d847f0", "a0310ac0-186f-5e83-9582-28e00ea4d6a1"], "e8ea5bb3-0956-5fd6-b90e-4b7fb350b2f9": ["2884b1ef-8274-5ccf-8377-a5f255355f39", "57a2115d-bc34-505e-8a29-b7a4bfdf2a41"], "6536445f-75b2-5f84-894a-f33382e8ea91": ["4723ac16-8f3c-59aa-b054-3f4cbf51bcf0", "c3a0af81-0957-558b-bd82-16c89225cf2f"], "ef5ca7d9-3a56-5068-933e-f7a2859ef438": ["8deffb08-d999-5bb1-9945-2f3b60e271c1", "ac775585-f684-534d-9836-49e9d4d352cd"], "f88663fb-a0d4-52ed-bead-ea11f2c2970e": ["261f7d64-93ed-587f-845a-0c4b43b83b9a", "4b5993d2-f469-52b6-91f2-a282011e4703"], "f45667e4-bbd0-5372-b044-e5e9d3983521": ["08679328-cbcb-5106-8429-626b250cbb62", "5372e8b2-5660-5812-8f07-fcb73573b3c0"], "56a6be43-48eb-5aaa-a0ce-f646faaabe23": ["18663cdf-e1fd-59d1-9871-9895093e1e81", "37d697f8-bb39-5415-954d-81c0dc7fbedc"]}$mixed_pins$::jsonb)->p_exam::text);
  if (select jsonb_agg(id::text order by id::text) from public.essay_questions where essay_exam_id=p_exam) is distinct from parentkeys then
   raise sqlstate 'PT409' using message='MIXED_RELEASE_SCOPE_CHANGED';end if;
  if keys is distinct from parentkeys then
   raise sqlstate 'PT422' using message='MIXED_COMPLETE_ANSWERS_REQUIRED';end if;
 end if;
 if p_parent is not null then
  select * into parent from essay_exam_private.runs where id=p_parent and account_id=p_account for update;
  if not found or parent.exam_id<>p_exam or parent.parent_id is not null or parent.state<>'completed' or
   not essay_beta_private.revision_open(parent.id) then raise exception 'REEVALUATION_NOT_INCLUDED';end if;
  if exists(select 1 from essay_exam_private.runs where parent_id=p_parent and state in ('reserved','completed')) then
   raise exception 'REEVALUATION_ALREADY_USED';end if;
  if exists(select 1 from public.credit_transactions where decision_id=parent.decision_id and transaction_type='refund') then
   raise exception 'REEVALUATION_NOT_INCLUDED';end if;
  select jsonb_agg(x->>'questionId' order by x->>'questionId') into parentkeys from jsonb_array_elements(parent.snapshot->'answers') x;
  if keys is distinct from parentkeys or (p_snapshot-'answers') is distinct from (parent.snapshot-'answers') then
   raise exception 'FROZEN_QUESTION_SET';end if;
  if exists(select 1 from jsonb_array_elements(p_snapshot->'answers') a join jsonb_array_elements(parent.snapshot->'answers') b
    on a->>'questionId'=b->>'questionId' where
    a->>'rubricVersion' is distinct from b->>'rubricVersion' or a->>'evidenceVersion' is distinct from b->>'evidenceVersion' or
    (a->>'revision')::bigint<(b->>'revision')::bigint or
    (a->>'body'<>b->>'body' and (a->>'revision')::bigint<=(b->>'revision')::bigint)) then
   raise exception 'STALE_REVISION_OR_CONTEXT';end if;
 else
  select cg.id into g from public.credit_grants cg where cg.account_id=p_account and
   (not essay_beta_private.is_beta(cg.id) or essay_beta_private.eligible(cg.id,p_exam)) and
   (cg.expires_at is null or cg.expires_at>clock_timestamp()) and
   not exists(select 1 from public.payment_orders o where o.grant_id=cg.id and o.state='CANCEL_PENDING') and
   (select coalesce(sum(t.balance_delta-t.reserved_delta),0) from public.credit_transactions t where t.grant_id=cg.id)>=1
   order by case when essay_beta_private.is_beta(cg.id) then 0 else 1 end, cg.expires_at nulls last,cg.created_at,cg.id limit 1 for update;
  -- Check after exact request replay, but before any reservation/Ledger write.
  -- Old clients cannot silently fall back once this account has received beta.
  if nullif(current_setting('legendstudy.confirmed_credit_grant',true),'') is null then
   if current_setting('legendstudy.credit_confirmation_required',true)='true' or exists(select 1 from essay_beta_private.daily_grants d join public.credit_accounts a on a.user_id=d.user_id where a.id=p_account)
   then raise sqlstate 'PT409' using message='CREDIT_SOURCE_CONFIRMATION_REQUIRED';end if;
  elsif g is distinct from nullif(current_setting('legendstudy.confirmed_credit_grant',true),'')::uuid then
   raise sqlstate 'PT409' using message='CREDIT_SOURCE_CHANGED';
  end if;
  if g is null then raise exception 'INSUFFICIENT_CREDIT';end if;
 end if;
 insert into public.essay_billing_decisions(id,account_id,idempotency_key,policy_key,policy_version,reason,credits_required,status,reserved_at,included_by_decision_id)
 values(did,p_account,did,'essay-exam-cycle','candidate-v1',case when p_parent is null then 'paid_cycle' else 'included_revision' end,
 case when p_parent is null then 1 else 0 end,'reserved',clock_timestamp(),parent.decision_id);
 insert into essay_exam_private.runs(id,account_id,exam_id,parent_id,decision_id,request_key,snapshot,state)
 values(rid,p_account,p_exam,p_parent,did,p_key,p_snapshot,'reserved');
 if g is not null then
 insert into public.credit_transactions(account_id,grant_id,decision_id,transaction_type,balance_delta,reserved_delta,idempotency_key,reason_code)
 values(p_account,g,did,'reserve',0,1,'exam:'||did||':reserve','essay_exam_initial');end if;
 return rid;
end $function$
;
