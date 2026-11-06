begin;
set local lock_timeout='2s';
do $$ begin
if md5(pg_get_functiondef('public.math_evaluation(jsonb)'::regprocedure))<>'381921b95ca50194c23ae42603eac5cf' then raise exception 'RPC drift';end if;
if md5(pg_get_functiondef('public.math_coaching(jsonb)'::regprocedure))<>'8d758a455bd76391f4c0537ad3a3c7f4' then raise exception 'RPC drift';end if;
end $$;
alter table public.math_evaluations add column learning_judgement jsonb;
create table math_private.q3_learning_policy(cutoff timestamptz not null);
revoke all on math_private.q3_learning_policy from public,anon,authenticated,service_role;
insert into math_private.q3_learning_policy values(clock_timestamp());
create function math_private.q3_finalize_with_learning(eid uuid, token uuid, output jsonb, packet jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare e public.math_evaluations; v jsonb; refs jsonb; observations jsonb; result uuid;
begin
 perform math_private.lock_evaluation(eid);
 select * into strict e from public.math_evaluations where id=eid;
 if e.leaf_id <> '9552766f-0785-54f6-86d4-c8c70c5da1b8' or e.requested_at < (select cutoff from math_private.q3_learning_policy) then raise invalid_parameter_value using message='Q3_SCOPE'; end if;
 if packet = '{"status":"INSUFFICIENT_EVIDENCE"}'::jsonb then
   result=public.math_finalize_evaluation(eid,token,output);
   if e.state='PROCESSING' then update public.math_evaluations set learning_judgement=jsonb_build_object('status','INSUFFICIENT_EVIDENCE','evaluation_id',eid) where id=eid; end if;
   return result;
 end if;
 if packet is not null then
  if e.state='COMPLETED' then
   if e.learning_judgement is null or e.learning_judgement->'submitted' is distinct from packet then
    raise invalid_parameter_value using message='LEARNING_BACKFILL_OR_REPLAY_CONFLICT';
   end if;
  else
   if e.state<>'PROCESSING' or e.lease_token is distinct from token or e.lease_until<=clock_timestamp() then raise invalid_parameter_value using message='STALE_FINALIZE';end if;
   v=packet->'value';
   if jsonb_typeof(packet) is distinct from 'object' or octet_length(packet::text)>32000
    or packet-array['value','review']<>'{}' or jsonb_typeof(v) is distinct from 'object'
    or v-array['version','evaluation_id','question_id','rubric_version','assessed_at','status','level','rationale','criterion_refs','observation_refs','strengths','improvements','next_direction','criterion_evidence']<>'{}'
    or jsonb_typeof(v->'level') is distinct from 'number'
    or v->>'version' is distinct from 'learning-completeness-v1'
    or v->>'status' is distinct from 'ASSESSED' or coalesce(v->>'level','') !~ '^[1-5]$'
    or v->>'evaluation_id' is distinct from eid::text or v->>'question_id' is distinct from e.leaf_id::text
    or coalesce(v->>'rubric_version','') !~ '^pinned-[a-f0-9]{64}$'
    or coalesce(length(v->>'rationale'),0) not between 1 and 1200
    or coalesce(length(v->>'next_direction'),0) not between 1 and 1200
    or jsonb_typeof(v->'strengths') is distinct from 'array' or jsonb_typeof(v->'improvements') is distinct from 'array'
    or jsonb_typeof(v->'criterion_refs') is distinct from 'array' or jsonb_typeof(v->'observation_refs') is distinct from 'array'
    or packet->'review'->>'version' is distinct from 'learning-independent-review-v1'
    or packet->'review'->'accepted' is distinct from 'true'::jsonb
    or coalesce(packet->'review'->>'candidate_sha256','') !~ '^[a-f0-9]{64}$'
    or output->'overall'->>'review_status' is distinct from 'NOT_REQUIRED'
    or not exists(select 1 from public.math_evaluation_sources where evaluation_id=eid) or output->'overall'->>'answer_status' is not distinct from 'NOT_DETERMINABLE' then raise invalid_parameter_value using message='LEARNING_INVALID';end if;
   if (v->>'assessed_at')::timestamptz is null or (v->>'assessed_at')::timestamptz<e.requested_at or (v->>'assessed_at')::timestamptz>clock_timestamp()+interval '5 minutes'
    or jsonb_array_length(v->'improvements')>5 or jsonb_array_length(v->'strengths')>20
    or exists(select 1 from jsonb_array_elements((v->'strengths')||(v->'improvements')) x where jsonb_typeof(x)<>'string' or length(x#>>'{}') not between 1 and 1200)
    then raise invalid_parameter_value using message='LEARNING_INVALID';end if;
   select coalesce(jsonb_agg(criterion_id::text order by criterion_id),'[]') into refs from public.math_evaluation_criteria where evaluation_id=eid;
   if jsonb_array_length(refs)=0 or jsonb_array_length(refs)<>jsonb_array_length(v->'criterion_refs') or not (refs @> (v->'criterion_refs') and refs <@ (v->'criterion_refs')) then raise invalid_parameter_value using message='LEARNING_CRITERIA_MISMATCH';end if;
   select coalesce(jsonb_agg(x->>'id'),'[]') into observations from jsonb_array_elements(output->'steps') x;
   if jsonb_array_length(v->'observation_refs')=0 or not observations @> (v->'observation_refs') then raise invalid_parameter_value using message='LEARNING_OBSERVATION_MISMATCH';end if;
  end if;
 end if;
 -- Canonical validation, ownership/lifecycle, fencing and replay remain authoritative.
 result=public.math_finalize_evaluation(eid,token,output);
 if packet is not null and e.state='PROCESSING' then
  update public.math_evaluations set learning_judgement=jsonb_build_object(
   'submitted',packet,'value',packet->'value','review',packet->'review',
   'criterion_outcomes',(select jsonb_agg(jsonb_build_object('criterion_id',x->>'criterion_id','verdict',x->>'verdict') order by x->>'criterion_id') from jsonb_array_elements(output->'criteria') x),
   'metadata',jsonb_build_object('assessment',output->'provenance','selected_extraction_id',e.selected_extraction_id,'profile_id',e.profile_id,'attempt_id',e.attempt_id,
    'exam_id',(select to_jsonb(ps)->>'essay_exam_id' from public.math_subproblems s join public.math_problems p on p.id=s.problem_id join public.math_problem_sets ps on ps.id=p.problem_set_id where s.id=e.leaf_id),
    'essay_question_id',(select to_jsonb(s)->>'essay_question_id' from public.math_subproblems s where s.id=e.leaf_id))) where id=eid;
 end if;
 return result;
end$$;
revoke all on function math_private.q3_finalize_with_learning(uuid,uuid,jsonb,jsonb) from public,anon,authenticated,service_role;
do $$ begin
if exists(select 1 from pg_auth_members where member='postgres'::regrole and roleid='math_executor'::regrole and grantor='postgres'::regrole) or has_schema_privilege('math_executor','math_private','CREATE') then raise exception 'unexpected pre-existing role grant'; end if; end $$;
grant select on math_private.q3_learning_policy to math_executor;
grant execute on function math_private.q3_finalize_with_learning(uuid,uuid,jsonb,jsonb) to math_executor;

-- Match canonical math executor boundary; public facade may be owned by postgres.
grant math_executor to postgres with admin false,inherit false,set true granted by postgres;
alter function math_private.q3_finalize_with_learning(uuid,uuid,jsonb,jsonb) security definer;
grant create on schema math_private to math_executor;
alter function math_private.q3_finalize_with_learning(uuid,uuid,jsonb,jsonb) owner to math_executor;
set local role math_executor;
grant execute on function math_private.q3_finalize_with_learning(uuid,uuid,jsonb,jsonb) to postgres;
reset role;
revoke create on schema math_private from math_executor;
revoke math_executor from postgres granted by postgres;

create function math_private.q3_visible(eid uuid) returns jsonb language sql stable set search_path='' as $$
select case when j->>'status'='INSUFFICIENT_EVIDENCE' and j->>'evaluation_id'=e.id::text then jsonb_build_object('version','learning-completeness-v1','evaluation_id',e.id,'status','INSUFFICIENT_EVIDENCE','level',null)
 when j#>>'{value,evaluation_id}'=e.id::text and j#>>'{value,question_id}'=e.leaf_id::text and j#>>'{value,status}'='ASSESSED' and j#>>'{value,version}'='learning-completeness-v1' and j#>'{review,accepted}'='true'::jsonb and jsonb_typeof(j#>'{value,level}')='number' and j#>>'{value,level}' ~ '^[1-5]$' then j->'value' end
 from public.math_evaluations e join public.math_attempts a on a.id=e.attempt_id cross join lateral (select e.learning_judgement as j) v where e.id=eid and a.student_id=auth.uid() and e.state='COMPLETED' and e.leaf_id='9552766f-0785-54f6-86d4-c8c70c5da1b8' and e.learning_judgement is not null;
$$;
revoke all on function math_private.q3_visible(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.math_evaluation(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v jsonb=p_request->'payload';action text=p_request->>'action';reply jsonb;allowed text[];
begin
 if p_request is null or jsonb_typeof(p_request)<>'object' or octet_length(p_request::text)>600000 or p_request-array['dto_version','action','payload']<>'{}' or p_request->>'dto_version' is distinct from 'math-worker-v1' or jsonb_typeof(v) is distinct from 'object' then raise invalid_parameter_value;end if;
 allowed=case action when 'claim' then array['evaluation_id'] when 'finalize' then array['evaluation_id','lease_token','output','learning_judgement'] when 'fail' then array['evaluation_id','lease_token','error_code'] else null end;
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
 when 'finalize' then if v ? 'learning_judgement' then
 begin
 reply=to_jsonb(math_private.q3_finalize_with_learning((v->>'evaluation_id')::uuid,(v->>'lease_token')::uuid,v->'output',v->'learning_judgement'));
 exception when invalid_parameter_value then
 if sqlerrm not in ('LEARNING_INVALID','LEARNING_CRITERIA_MISMATCH','LEARNING_OBSERVATION_MISMATCH') then raise;end if;
 reply=to_jsonb(public.math_finalize_evaluation((v->>'evaluation_id')::uuid,(v->>'lease_token')::uuid,v->'output'));
 end;
 else reply=to_jsonb(public.math_finalize_evaluation((v->>'evaluation_id')::uuid,(v->>'lease_token')::uuid,v->'output')); end if;
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
 if p_request->>'action'='history' and jsonb_typeof(answer#>'{result,attempts}')='array' then
 answer=jsonb_set(answer,'{result,attempts}',(select coalesce(jsonb_agg(case when level is null then r else r||jsonb_build_object('learning_completeness',level) end order by n),'[]') from jsonb_array_elements(answer#>'{result,attempts}') with ordinality as x(r,n) cross join lateral (select math_private.q3_visible((r->>'evaluation_id')::uuid) as level) v));
 end if;
 if p_request->>'action' not in ('read','reveal') then return answer;end if;
 declare level jsonb:=math_private.q3_visible((p_request#>>'{payload,evaluation_id}')::uuid); begin
 if level is not null then answer=jsonb_set(answer,'{result,learning_completeness}',level); end if;
 end;
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
