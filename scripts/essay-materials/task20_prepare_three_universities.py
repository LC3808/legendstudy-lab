"""Prepare private review-only Registry recovery from observed question headings.

Does not approve evidence or publish exams. Reuses the tested registration guards.
"""
import argparse,json,pathlib,runpy,uuid
p=argparse.ArgumentParser();p.add_argument('--groups',type=pathlib.Path,required=True);p.add_argument('--registry',type=pathlib.Path,required=True);p.add_argument('--audit',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[2]
ns=runpy.run_path(str(root/'scripts/essay-materials/prepare_registration.py'))['NAMESPACE']
registry=json.loads(a.registry.read_text());audit=json.loads(a.audit.read_text())['rows']
known={x['exam_id'] for x in registry};knownq={q['id'] for x in registry for q in x['questions']}
exams=[];held=[]
for g in json.loads(a.groups.read_text()):
 if g['status']!='REGISTRY_MAPPING_REQUIRED':continue
 reason=None
 if not g['question_source_present']:reason='QUESTION_SOURCE_MISSING'
 if g['slug']=='chungang' and g['year']==2027:reason='OPTIONAL_QUESTION_AND_TRACK_MAPPING_REVIEW'
 if reason:held.append({k:g[k] for k in ('slug','year','kind','track','session')}|{'reason':reason});continue
 expected=[1,2,3,4] if g['slug']=='chungang' else [1,2]
 if g['observed_parent_labels']!=expected:raise ValueError('OBSERVED_QUESTION_BOUNDARY_MISMATCH')
 m=next(x for x in audit if x['slug']==g['slug'])
 session={'오전':'morning','오후1':'afternoon-1','오후2':'afternoon-2'}.get(g['session'], ('session-'+g['session'][0]) if g['session'] else 'single')
 key=f"source:{g['slug']}-{g['year']}-{g['kind']}-natural-{session}"
 eid=str(uuid.uuid5(ns,'exam/'+key));assert eid not in known
 qs=[]
 for n in expected:
  qkey=key+':q'+str(n);qid=str(uuid.uuid5(ns,'question/'+qkey));assert qid not in knownq
  qs.append(dict(sourceKey=qkey,id=qid,label=f'문제 {n}',order=n-1))
 exams.append(dict(sourceKey=key,examId=eid,existingExam=False,universityId=m['university_id'],year=g['year'],kind=g['kind'],track=g['track'],session=g['session'],campus=None,examKey=key.replace('source:','source-'),name=f"{m['university']} {g['year']}학년도 "+('모의논술' if g['kind']=='mock' else '수시 논술')+' '+g['track']+(' '+g['session'] if g['session'] else ''),sourceHashes=sorted(set(s['sha256'] for s in g['sources'])),questions=qs))
plan=dict(status='REVIEW_ONLY_NOT_APPLIED',publication=False,evaluation=False,exams=exams,held=held)
a.output.mkdir(parents=True,exist_ok=True)
(a.output/'registration-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
for name in ('register-review-only.sql','rollback-review-only.sql'):
 template=(root/'supabase/candidates/task20_sookmyung_recovery_20261106'/name).read_text().split('$registration$')
 assert len(template)==3
 template[1]=json.dumps(exams,ensure_ascii=False,separators=(',',':'))
 sql='$registration$'.join(template)
 if name=='register-review-only.sql':
  sql=sql.replace("field_or_division is not distinct from e->>'track'", "(case when field_or_division='자연' then '자연계열' else field_or_division end) is not distinct from e->>'track'")
 (a.output/name).write_text(sql)
print(json.dumps({'exams':len(exams),'questions':sum(len(e['questions']) for e in exams),'held':len(held),'production_applied':False}))
