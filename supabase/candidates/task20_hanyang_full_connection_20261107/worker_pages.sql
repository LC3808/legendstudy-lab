-- Private Worker payload only. Never used by student results or History.
create or replace function math_private.hanyang_worker_references(ctx jsonb)
returns jsonb language sql stable security invoker set search_path='' as $fn$
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
$fn$;
revoke all on function math_private.hanyang_worker_references(jsonb) from public,anon,authenticated;
