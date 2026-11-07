-- REVIEW ONLY. Owner authorization required. No publication/evaluation/DDL.
-- Source registry remains unchanged until apply + exact read-back are approved.
begin;
lock table public.essay_questions,public.essay_exams in share row exclusive mode;
do $body$
declare e jsonb; q jsonb; eid uuid;
begin
 for e in select value from jsonb_array_elements($registration$[{"sourceKey": "source:hanyang-2024-admission-natural-afternoon-1", "examId": "f62b2b3f-5e45-50d2-843b-8f839812fcae", "existingExam": false, "universityId": "1090e1be-174e-5042-abd3-ca929c6e26f8", "year": 2024, "kind": "admission", "track": "자연계열", "session": "오후1", "campus": null, "examKey": "source-hanyang-2024-admission-natural-afternoon-1", "name": "한양대학교 2024학년도 수시 논술 자연계열 오후1", "sourceHashes": ["6de905abebcc25734b21abe4a939ebf1bb00ea605633195439b5e4c260a82a20"], "questions": [{"sourceKey": "source:hanyang-2024-admission-natural-afternoon-1:q1", "id": "bccce485-0b92-5d19-a89d-29dfa6f5c621", "label": "문제 1", "order": 0}, {"sourceKey": "source:hanyang-2024-admission-natural-afternoon-1:q2", "id": "ba221193-6912-5c5c-9016-6a9a434740be", "label": "문제 2", "order": 1}]}]$registration$::jsonb) loop
  eid=(e->>'examId')::uuid;
  if not exists(select 1 from public.universities where id=(e->>'universityId')::uuid) then raise exception 'UNIVERSITY_DRIFT';end if;
  if (e->>'existingExam')::boolean then
   if not exists(select 1 from public.essay_exams where id=eid and university_id=(e->>'universityId')::uuid and admission_year=(e->>'year')::int and exam_kind=e->>'kind') then raise exception 'EXAM_DRIFT';end if;
  else
   if exists(select 1 from public.essay_exams where university_id=(e->>'universityId')::uuid and admission_year=(e->>'year')::int and exam_kind=e->>'kind' and id<>eid and (case when field_or_division='자연' then '자연계열' else field_or_division end) is not distinct from e->>'track' and replace(session_label,' ','') is not distinct from replace(e->>'session',' ','')) then raise exception 'SEMANTIC_EXAM_DUPLICATE';end if;
   insert into public.essay_exams(id,university_id,admission_year,exam_key,exam_name,exam_kind,campus,field_or_division,session_label)
   values(eid,(e->>'universityId')::uuid,(e->>'year')::int,e->>'examKey',e->>'name',e->>'kind',e->>'campus',e->>'track',e->>'session') on conflict(id) do nothing;
   if not exists(select 1 from public.essay_exams where id=eid and university_id=(e->>'universityId')::uuid and admission_year=(e->>'year')::int and exam_key=e->>'examKey' and exam_kind=e->>'kind' and campus is not distinct from e->>'campus' and (case when field_or_division='자연' then '자연계열' else field_or_division end) is not distinct from e->>'track' and replace(session_label,' ','') is not distinct from replace(e->>'session',' ','') and not is_active and verification_status='review') then raise exception 'EXAM_COLLISION_OR_STATE_CHANGED';end if;
  end if;
  for q in select value from jsonb_array_elements(e->'questions') loop
   insert into public.essay_questions(id,essay_exam_id,question_key,label,display_order,metadata_version)
   values((q->>'id')::uuid,eid,q->>'sourceKey',q->>'label',(q->>'order')::int,'source-registration-v1') on conflict(id) do nothing;
   if not exists(select 1 from public.essay_questions where id=(q->>'id')::uuid and essay_exam_id=eid and question_key=q->>'sourceKey' and label=q->>'label' and display_order=(q->>'order')::int and metadata_version='source-registration-v1' and not is_published) then raise exception 'QUESTION_COLLISION_OR_STATE_CHANGED';end if;
  end loop;
 end loop;
end $body$;
commit;
