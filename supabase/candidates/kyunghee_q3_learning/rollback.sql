begin;
set local lock_timeout='2s';
CREATE OR REPLACE FUNCTION public.math_evaluation(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v jsonb=p_request->'payload';action text=p_request->>'action';reply jsonb;allowed text[];
begin
 if p_request is null or jsonb_typeof(p_request)<>'object' or octet_length(p_request::text)>600000 or p_request-array['dto_version','action','payload']<>'{}' or p_request->>'dto_version' is distinct from 'math-worker-v1' or jsonb_typeof(v) is distinct from 'object' then raise invalid_parameter_value;end if;
 allowed=case action when 'claim' then array['evaluation_id'] when 'finalize' then array['evaluation_id','lease_token','output'] when 'fail' then array['evaluation_id','lease_token','error_code'] else null end;
 if allowed is null or v-allowed<>'{}' then raise invalid_parameter_value;end if;
 case action
 when 'claim' then
  reply=public.math_claim_evaluation((v->>'evaluation_id')::uuid);
  select reply||jsonb_build_object('context',jsonb_build_object(
   'attempt',jsonb_build_object('attempt_id',a.id,'kind',a.kind,'typed_answer',a.typed_answer,'input_kind',a.input_kind,'prior_evaluation_id',a.prior_evaluation_id,'target_step_id',a.target_step_id),
   'leaf',(select to_jsonb(l) from public.math_subproblems l where id=e.leaf_id),
   'problem',(select to_jsonb(p) from public.math_problems p join public.math_subproblems l on l.problem_id=p.id where l.id=e.leaf_id),
   'profile',(select to_jsonb(p) from public.math_evaluation_profiles p where id=e.profile_id),
   'extraction',(select coalesce(jsonb_agg(to_jsonb(z)-array['attempt_id','run_id'] order by reading_order),'[]') from public.math_extraction_regions z where run_id=e.selected_extraction_id),
   'criteria',(select coalesce(jsonb_agg(to_jsonb(c) order by c.id),'[]') from public.math_evaluation_criteria x join public.math_scoring_criteria c on c.id=x.criterion_id where x.evaluation_id=e.id),
   'sources',(select coalesce(jsonb_agg(to_jsonb(s) order by s.id),'[]') from public.math_evaluation_sources x join public.math_source_artifacts s on s.id=x.source_id where x.evaluation_id=e.id),
   'solutions',(select coalesce(jsonb_agg(to_jsonb(s) order by s.id),'[]') from public.math_canonical_solutions s where e.authority_solutions ? s.id::text)
  )) into reply from public.math_evaluations e join public.math_attempts a on a.id=e.attempt_id where e.id=(v->>'evaluation_id')::uuid;
 when 'finalize' then reply=to_jsonb(public.math_finalize_evaluation((v->>'evaluation_id')::uuid,(v->>'lease_token')::uuid,v->'output'));
 when 'fail' then perform public.math_fail_evaluation((v->>'evaluation_id')::uuid,(v->>'lease_token')::uuid,v->>'error_code');reply=jsonb_build_object('failed',true);
 end case;
 if octet_length(reply::text)>2097152 then raise program_limit_exceeded using message='MATH_RESPONSE_BOUND';end if;
 return jsonb_build_object('dto_version','math-worker-v1','action',action,'result',reply);
end$function$;
CREATE OR REPLACE FUNCTION public.math_coaching(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare answer jsonb; run math_private.session_runs; quote jsonb; can_continue boolean;
begin
 answer=public.math_coaching_before_task16g(p_request);
 -- Supplemental official material; no modification of assessment authority pins.
 if p_request->>'action' in ('read','reveal') and answer->'result'->>'disclosed'='true' then
  answer=jsonb_set(answer,'{result,full_solution,references}',coalesce(answer#>'{result,full_solution,references}','[]'::jsonb)||coalesce((
   select jsonb_agg(jsonb_build_object('id',s.id,'origin',s.origin,'body',s.body,'relationship','SUPPLEMENTAL_AFTER_ASSESSMENT','source_locator','공식 문항카드 3쪽 · 예시답안','source_sha256',source_artifact.content_sha256))
   from public.math_evaluations e join public.math_canonical_solutions s on s.leaf_id=e.leaf_id
   join public.math_source_artifacts source_artifact on source_artifact.id=s.source_id
   where e.id=(p_request->'payload'->>'evaluation_id')::uuid
    and s.id='b4ea4666-f2a7-5ff1-83a8-41498b86b044'::uuid and s.state='ACTIVE'
    and not exists(select 1 from jsonb_array_elements(coalesce(answer#>'{result,full_solution,references}','[]'::jsonb)) r where r->>'id'=s.id::text)
  ),'[]'::jsonb));
 end if;
 if p_request->>'action' not in ('read','reveal') then return answer;end if;
 -- Display only the canonical question label; a leaf_key is an internal identifier.
 answer=jsonb_set(answer,'{result}',answer->'result'||coalesce((
  select jsonb_build_object('exam_label',ps.label||' · '||q.label)
  from public.math_evaluations e join public.math_subproblems s on s.id=e.leaf_id
  join public.math_problems p on p.id=s.problem_id join public.math_problem_sets ps on ps.id=p.problem_set_id
  join public.essay_questions q on q.id=s.essay_question_id and q.essay_exam_id=ps.essay_exam_id
  where e.id=(p_request->'payload'->>'evaluation_id')::uuid
 ),'{}'::jsonb));
 select r.* into run from math_private.session_evaluations x join math_private.session_members m on m.attempt_id=x.attempt_id join math_private.session_runs r on r.id=m.run_id
 where x.evaluation_id=(p_request->'payload'->>'evaluation_id')::uuid and r.student_id=auth.uid();
 if found then
  can_continue=run.state='completed' and not exists(select 1 from math_private.session_runs where previous_run_id=run.id and state<>'cancelled');
  if can_continue then quote=public.math_session_quote(run.id);end if;
  answer=jsonb_set(answer,'{result,rewrite_policy}',coalesce(answer->'result'->'rewrite_policy','{}')||jsonb_build_object('eligible',can_continue and quote->>'credits_required'='0','paid_available',can_continue and quote->>'credits_required'='1','session_run_id',run.id,'exam_id',run.exam_id,'next_quote',quote));
 end if;
 return answer;
end$function$;

commit;
