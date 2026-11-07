-- Private Worker payload only. Never used by student results or History.
create or replace function math_private.hanyang_worker_references(ctx jsonb)
returns jsonb language sql stable security invoker set search_path='' as $fn$
 select coalesce((
   select jsonb_build_object(
     'official_evidence_gaps', case when p.manifest ? 'intent' then '[]'::jsonb else '["INTENT_SOURCE_NOT_PROVIDED"]'::jsonb end,
     'official_images', p.images,
     'official_image_index', (select jsonb_agg(entry - 'data' order by position)
       from jsonb_array_elements(p.images) with ordinality as t(entry,position))
   )
   from math_private.task20_hanyang_source_pages p
   where p.question_id::text = ctx#>>'{leaf,essay_question_id}'
     and p.exam_id = (select s.essay_exam_id from public.math_problem_sets s where s.id::text=ctx#>>'{problem,problem_set_id}')
     and not exists (
        select 1 from (values ('QUESTION','problem'),('SCORING','rubric'),('INTENT','intent'),('SOLUTION','solution')) r(role,key)
        where (r.role<>'INTENT' or p.manifest ? 'intent' or p.question_id not in ('f420487b-4c38-5bc8-8ad7-65bf052683a2','c8b2f3e7-67d8-567f-821b-2c9f58050b19','e8466474-ac49-5060-87c0-525826e94fb4','f62a977a-35a6-5a28-8059-9defa7993d1d','830324f3-9ab8-5403-8c69-fc1f436cc46e','3c5645b0-cc99-5a8e-bafc-5ac251284bb8','d12b2175-c473-5b3f-89e9-b7a03a65ce86','1722a798-217f-5751-9ee5-69a7516f6369','6588cd3f-23fe-5ce4-95f1-242a88380414','3d720c1e-cf92-501e-bcf9-1a48017b6757','b641d151-3e82-5727-a05f-fe56556108ce','a4a161ba-dca6-5fae-ab44-c453db2a3b28','3721f392-e90b-5399-891b-04b618438e36','563f74bd-cc6a-535e-b952-7b4ee1d956bd','08b89bb1-b045-56fc-9ecc-08400ea26f9e','5a64b5a0-885e-5435-acd3-e13133d3179f'))
        and not exists (select 1 from jsonb_array_elements(ctx->'sources') src
          where src->>'source_role'=r.role and src->>'provenance'='OFFICIAL' and src->>'verification'='HASH_VERIFIED'
            and src->>'problem_id'=ctx#>>'{problem,id}'
            and src->>'content_sha256'=p.manifest->r.key->>'sha256'
            and (src->>'locator') like ('% PDF '||(select string_agg(x,',' order by n) from jsonb_array_elements_text(p.manifest->r.key->'pages') with ordinality t(x,n))||'쪽')))
 ),'{}'::jsonb)
$fn$;
revoke all on function math_private.hanyang_worker_references(jsonb) from public,anon,authenticated;
