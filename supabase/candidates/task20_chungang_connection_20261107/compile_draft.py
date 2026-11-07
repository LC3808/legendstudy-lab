"""Offline DRAFT package compiler. No activation or Provider calls."""
from pathlib import Path
import json,uuid,sys,hashlib
from package_sql import registration_sql,DIMENSIONS
p=Path(sys.argv[1]);manifest=json.loads((p/'source-manifest.json').read_text());packages=[];public=[]
for r in manifest:
 if 'evidence' not in r:continue
 q=r['question_id'];n=r['question'];uid=lambda k:str(uuid.uuid5(uuid.UUID(q),'task20-chungang-natural-v1:'+k));rows={}
 def add(t,k,**v):rows.setdefault('math_'+t,[]).append(dict(id=uid(k),**v))
 def version(k):return dict(logical_id=uid(k),version=1,state='DRAFT')
 def page_text(ref,page):return json.loads((p/(ref['sha256']+'.json')).read_text())[page-1].replace('\x00',' ')
 def text(role):return '\n\n'.join(page_text(r['evidence'][role],j) for j in r['evidence'][role]['pages'])
 add('problem_sets','set',essay_exam_id=r['exam_id'],label=r['exam']+' '+str(n),**version('set'))
 add('problems','problem',problem_set_id=uid('set'),display_order=n,statement=text('problem'),**version('problem'))
 add('subproblems','leaf',problem_id=uid('problem'),leaf_key='q'+str(n),display_order=n,statement='모든 소문항의 풀이 과정을 포함하세요.',response_format='FULL_SOLUTION',allow_common_rubric=False,essay_question_id=q)
 for role,key in [('QUESTION','problem'),('SCORING','rubric'),('INTENT','intent'),('SOLUTION','solution')]:
  if key not in r['evidence']:continue
  ref=r['evidence'][key];add('source_artifacts',role,problem_id=uid('problem'),source_role=role,source_url='urn:sha256:'+ref['sha256'],locator=ref['file']+' PDF '+','.join(map(str,ref['pages']))+'쪽',provenance='OFFICIAL',verification='HASH_VERIFIED',content_sha256=ref['sha256'])
 add('evaluation_profiles','profile',scope='LEAF',leaf_id=uid('leaf'),response_format='FULL_SOLUTION',rubric_version='math-rubric-v1',required_dimensions=DIMENSIONS,reasoning_required=True,**version('profile'))
 for j,page in enumerate(r['evidence']['rubric']['pages']):
  add('scoring_criteria','criterion'+str(j),leaf_id=uid('leaf'),source_id=uid('SCORING'),criterion_key=f'q{n}-source-page-{page}',description=page_text(r['evidence']['rubric'],page),official_points=None,rubric_dimensions=DIMENSIONS)
 add('canonical_solutions','solution',leaf_id=uid('leaf'),source_id=uid('SOLUTION'),origin='OFFICIAL',body=text('solution'),**version('solution'))
 # Page order is source order only; not claimed as inferred pedagogical step boundaries.
 for j,page in enumerate(r['evidence']['solution']['pages']):add('canonical_solution_steps','step'+str(j),solution_id=uid('solution'),position=j+1,body=page_text(r['evidence']['solution'],page),criterion_id=None)
 package=dict(exam_id=r['exam_id'],essay_question_id=q,ids={'leaf':uid('leaf')},existing_schema_rows=rows)
 packages.append(package);public.append(dict(exam_id=r['exam_id'],question_id=q,leaf_id=uid('leaf'),state='DRAFT',source_status=r['status'],technical_ready=False,row_count=sum(len(x) for x in rows.values()),package_sha256=hashlib.sha256(json.dumps(package,ensure_ascii=False,sort_keys=True).encode()).hexdigest()))
assert len(packages)==69
(p/'packages.private.json').write_text(json.dumps(packages,ensure_ascii=False))
(p/'draft.private.sql').write_text(registration_sql(packages))
(p/'draft-manifest.json').write_text(json.dumps(public,ensure_ascii=False,indent=2))
print({'draft_packages':len(packages),'rows':sum(x['row_count'] for x in public),'production_writes':0,'provider_calls':0})
