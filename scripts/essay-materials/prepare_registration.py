"""Generate REVIEW-ONLY canonical metadata registration; never connect/apply to DB.
Preserve known IDs. Ambiguous existing exam identities are held, never merged.
No source bodies, Rubrics, evaluation activation, publication or permission grants.
"""
import argparse, hashlib, json, uuid
from pathlib import Path
NAMESPACE=uuid.uuid5(uuid.NAMESPACE_URL,'https://github.com/LC3808/legendstudy-app/essay-source-registration/v1')
def prepare(registry,db):
 universities={u['id']:u for u in db['universities']};exams={e['id']:e for e in db['exams']}
 ready=[];held=[]
 for source in registry['exams']:
  if source['verification']!='VERIFIED' or source['universityId'] not in universities:
   held.append({'sourceKey':source['key'],'reason':'UNVERIFIED_OR_UNKNOWN_UNIVERSITY'});continue
  identity=lambda e:e['universityId']==source['universityId'] and e['year']==source['year'] and e['kind']==source['kind']
  known=source['dbExamId']
  if known:
   if known not in exams or not identity(exams[known]):raise ValueError('Existing exam identity mismatch: '+source['key'])
  elif any(identity(e) for e in exams.values()):
   held.append({'sourceKey':source['key'],'reason':'EXISTING_EXAM_RECONCILIATION_REQUIRED'});continue
  eid=known or str(uuid.uuid5(NAMESPACE,'exam/'+source['key']))
  ready.append({'sourceKey':source['key'],'examId':eid,'existingExam':bool(known),
   'universityId':source['universityId'],'year':source['year'],'kind':source['kind'],
   'track':source['track'],'session':source['session'],'campus':source['campus'],
   'examKey':('source-'+source['key'].removeprefix('source:')),
   'name':' · '.join(str(x) for x in [universities[source['universityId']]['name'],source['year'],source['kind'],source['track'],source['session'],source['campus']] if x is not None),
   'sourceHashes':source['sourceHashes'],
   'questions':[{'sourceKey':q['key'],'id':q['dbQuestionId'] or str(uuid.uuid5(NAMESPACE,'question/'+q['key'])),'label':q['label'],'order':i} for i,q in enumerate(source['questions'])]})
 return {'status':'REVIEW_ONLY_NOT_APPLIED','publication':False,'evaluation':False,'exams':ready,'held':held}
def sql_document(plan):
 data=json.dumps(plan['exams'],ensure_ascii=False,separators=(',',':'))
 # Dollar quote collision denied; all data originate the checked metadata registry.
 if '$registration$' in data or '$body$' in data:raise ValueError('SQL delimiter collision')
 return '''-- REVIEW ONLY. Owner authorization required. No publication/evaluation/DDL.
-- Source registry remains unchanged until apply + exact read-back are approved.
begin;
do $body$
declare e jsonb; q jsonb; eid uuid;
begin
 for e in select value from jsonb_array_elements($registration$'''+data+'''$registration$::jsonb) loop
  eid=(e->>'examId')::uuid;
  if not exists(select 1 from public.universities where id=(e->>'universityId')::uuid) then raise exception 'UNIVERSITY_DRIFT';end if;
  if (e->>'existingExam')::boolean then
   if not exists(select 1 from public.essay_exams where id=eid and university_id=(e->>'universityId')::uuid and admission_year=(e->>'year')::int and exam_kind=e->>'kind') then raise exception 'EXAM_DRIFT';end if;
  else
   if exists(select 1 from public.essay_exams where university_id=(e->>'universityId')::uuid and admission_year=(e->>'year')::int and exam_kind=e->>'kind' and id<>eid and exam_key not like 'source-%') then raise exception 'EXAM_RECONCILIATION_REQUIRED';end if;
   insert into public.essay_exams(id,university_id,admission_year,exam_key,exam_name,exam_kind,campus,field_or_division,session_label)
   values(eid,(e->>'universityId')::uuid,(e->>'year')::int,e->>'examKey',e->>'name',e->>'kind',e->>'campus',e->>'track',e->>'session') on conflict(id) do nothing;
   if not exists(select 1 from public.essay_exams where id=eid and university_id=(e->>'universityId')::uuid and admission_year=(e->>'year')::int and exam_key=e->>'examKey' and exam_kind=e->>'kind' and campus is not distinct from e->>'campus' and field_or_division is not distinct from e->>'track' and session_label is not distinct from e->>'session' and not is_active and verification_status='review') then raise exception 'EXAM_COLLISION_OR_STATE_CHANGED';end if;
  end if;
  for q in select value from jsonb_array_elements(e->'questions') loop
   insert into public.essay_questions(id,essay_exam_id,question_key,label,display_order,metadata_version)
   values((q->>'id')::uuid,eid,q->>'sourceKey',q->>'label',(q->>'order')::int,'source-registration-v1') on conflict(id) do nothing;
   if not exists(select 1 from public.essay_questions where id=(q->>'id')::uuid and essay_exam_id=eid and question_key=q->>'sourceKey' and label=q->>'label' and display_order=(q->>'order')::int and metadata_version='source-registration-v1' and not is_published) then raise exception 'QUESTION_COLLISION_OR_STATE_CHANGED';end if;
  end loop;
 end loop;
end $body$;
commit;
'''
def rollback_document(plan):
 data=json.dumps(plan['exams'],ensure_ascii=False,separators=(',',':'))
 if '$registration$' in data or '$body$' in data:raise ValueError('SQL delimiter collision')
 return """-- REVIEW ONLY. No CASCADE; refuse edited metadata and any learning dependency.
begin;
lock table public.essay_questions,public.essay_exams in share row exclusive mode;
do $body$ declare e jsonb;q jsonb;expected jsonb;actual jsonb;begin
 for e in select value from jsonb_array_elements($registration$"""+data+"""$registration$::jsonb) loop
  for q in select value from jsonb_array_elements(e->'questions') loop
   expected=jsonb_build_object('id',q->>'id','essay_exam_id',e->>'examId','question_key',q->>'sourceKey','label',q->>'label','display_order',(q->>'order')::int,'metadata_version','source-registration-v1','is_published',false);
   select jsonb_strip_nulls(to_jsonb(x)-'created_at') into actual from public.essay_questions x where id=(q->>'id')::uuid;
   if found and actual is distinct from expected then raise exception 'QUESTION_STATE_CHANGED';end if;
   if exists(select 1 from public.essay_practice_sessions where question_id=(q->>'id')::uuid) then raise exception 'LEARNING_RECORDS_EXIST';end if;
   delete from public.essay_questions where id=(q->>'id')::uuid;
  end loop;
  if not (e->>'existingExam')::boolean then
   expected=jsonb_strip_nulls(jsonb_build_object('id',e->>'examId','university_id',e->>'universityId','admission_year',(e->>'year')::int,'exam_key',e->>'examKey','exam_name',e->>'name','exam_kind',e->>'kind','campus',e->>'campus','field_or_division',e->>'track','session_label',e->>'session','verification_status','review','is_active',false));
   select jsonb_strip_nulls(to_jsonb(x)-array['created_at','updated_at']) into actual from public.essay_exams x where id=(e->>'examId')::uuid;
   if found and actual is distinct from expected then raise exception 'EXAM_STATE_CHANGED';end if;
   delete from public.essay_exams where id=(e->>'examId')::uuid;
  end if;
 end loop;
end $body$;
commit;
"""
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--output',type=Path,required=True);args=ap.parse_args()
 base=Path(__file__).resolve().parents[2]
 registry=json.loads((base/'src/data/essay-source-registry.json').read_text())
 db=json.loads(Path(__file__).with_name('db-catalog-preflight-20261012.json').read_text())
 plan=prepare(registry,db);args.output.mkdir(parents=True,exist_ok=True)
 (args.output/'registration-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
 (args.output/'register-review-only.sql').write_text(sql_document(plan))
 (args.output/'rollback-review-only.sql').write_text(rollback_document(plan))
 print(json.dumps({'examRecords':len(plan['exams']),'newExamRecords':sum(not e['existingExam'] for e in plan['exams']),'questions':sum(len(e['questions']) for e in plan['exams']),'heldExamRecords':len(plan['held']),'applied':False}))
if __name__=='__main__':main()
