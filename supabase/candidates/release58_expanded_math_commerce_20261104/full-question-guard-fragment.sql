 if (select jsonb_agg(id::text order by id::text) from public.essay_questions where essay_exam_id=(e->>'examId')::uuid)
  is distinct from (select jsonb_agg(value order by value::text) from jsonb_array_elements(e->'questionIds')) then raise exception 'EXPANDED_COMPLETE_QUESTION_SET_DRIFT: %',e->>'examId';end if;
