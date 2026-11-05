"""Compile visually checked private evidence into existing Math tables, DRAFT only.
No network, schema change, Registry insertion, publication, or billing mutation.
Original PDFs and compiled content stay outside Git. Stable IDs make retries exact.
"""
import argparse, hashlib, json, re, uuid
from pathlib import Path

TARGETS = {
 '7c112225-51cc-59d8-a985-6c459a1e0a0a': ('25dc068b-4672-56e1-b8df-08ee8800e2f6', 2),
 '40290efd-36af-55a9-beb7-8c90bbb04ee4': ('25dc068b-4672-56e1-b8df-08ee8800e2f6', 3),
 'a7d06546-9d61-5317-afff-e656c25964f7': ('25dc068b-4672-56e1-b8df-08ee8800e2f6', 4),
 'ed63c506-ee9b-5ce7-967f-a1d53b9feac6': ('0a331c3e-d46b-5af3-b787-e3342e8a1ae8', 1),
 '4df1296d-abe4-5499-af35-20ba573fd6ae': ('0a331c3e-d46b-5af3-b787-e3342e8a1ae8', 2),
 '101a7dcc-1c05-5c1d-b926-3f5729158f54': ('0a331c3e-d46b-5af3-b787-e3342e8a1ae8', 3),
}
TABLES = ('math_problem_sets','math_problems','math_subproblems','math_source_artifacts','math_evaluation_profiles','math_scoring_criteria','math_canonical_solutions','math_canonical_solution_steps')
DIMENSIONS=['logical_development','computation_accuracy','final_conclusion']
def ident(question,kind):
 return str(uuid.uuid5(uuid.NAMESPACE_URL,'legendstudy:task20c:20261106:'+question+':'+kind))
def compile_packages(items,sources):
 if len(items)!=6 or {x['question_id'] for x in items}!=set(TARGETS): raise ValueError('EXACT_SIX_REQUIRED')
 checked={}
 for sha,path in sources.items():
  if hashlib.sha256(Path(path).read_bytes()).hexdigest()!=sha: raise ValueError('SOURCE_HASH_MISMATCH')
  checked[sha]=True
 rows={t:[] for t in TABLES};manifest=[]
 for x in items:
  q=x['question_id'];exam,num=TARGETS[q]
  if (x['exam_id'],x['number'])!=(exam,num): raise ValueError('REGISTRY_MISMATCH')
  if x['source_sha256'] not in checked: raise ValueError('SOURCE_NOT_CHECKED')
  if x.get('state')!='DRAFT' or x.get('publication_allowed') is not False or x.get('provider_allowed') is not False: raise ValueError('DRAFT_ONLY')
  if x['review']['status']!='SOURCE_CHECKED' or not x['intent'].strip(): raise ValueError('REVIEW_MISSING')
  if not x['criteria'] or not x['solution_steps'] or not x['statement'].strip(): raise ValueError('EVIDENCE_MISSING')
  if sum(c['points'] for c in x['criteria'])!=x['total_points']: raise ValueError('OFFICIAL_TOTAL_MISMATCH')
  if any(not c['description'].strip() or c['points']<=0 for c in x['criteria']): raise ValueError('CRITERION_INVALID')
  if len({c['key'] for c in x['criteria']})!=len(x['criteria']): raise ValueError('DUPLICATE_CRITERION')
  if any(0xE000<=ord(ch)<=0xF8FF for ch in json.dumps(x,ensure_ascii=False)): raise ValueError('UNRESOLVED_FONT_GLYPH')
  ids={k:ident(q,k) for k in ['set','problem','leaf','profile','solution']}
  # Question-scoped content version follows the existing Konkuk Q1 model.
  # This is not a new Registry exam; original exam/question IDs remain the binding.
  rows['math_problem_sets'].append(dict(id=ids['set'],essay_exam_id=exam,logical_id=ids['set'],version=1,label=x['label'],state='DRAFT'))
  rows['math_problems'].append(dict(id=ids['problem'],problem_set_id=ids['set'],logical_id=ids['problem'],version=1,display_order=num,statement=x['statement'],state='DRAFT'))
  rows['math_subproblems'].append(dict(id=ids['leaf'],problem_id=ids['problem'],essay_question_id=q,leaf_key='q'+str(num),display_order=1,statement='풀이 과정과 근거를 포함하여 모든 소문항에 답하시오.',response_format='FULL_SOLUTION',allow_common_rubric=False))
  for role in ['QUESTION','INTENT','SCORING','SOLUTION']:
   pages=x['pages'].get(role)
   if not pages or any(type(p)!=int or p<1 for p in pages): raise ValueError('SOURCE_LOCATOR_MISSING')
   rows['math_source_artifacts'].append(dict(id=ident(q,role),problem_id=ids['problem'],source_role=role,source_url='urn:sha256:'+x['source_sha256'],locator='PDF physical pages '+','.join(map(str,pages))+'; '+x['label'],provenance='OFFICIAL',verification='HASH_VERIFIED',content_sha256=x['source_sha256']))
  rows['math_evaluation_profiles'].append(dict(id=ids['profile'],logical_id=ids['profile'],version=1,scope='LEAF',leaf_id=ids['leaf'],response_format='FULL_SOLUTION',rubric_version='math-rubric-v1',required_dimensions=DIMENSIONS,reasoning_required=True,state='DRAFT'))
  for c in x['criteria']:
   rows['math_scoring_criteria'].append(dict(id=ident(q,'criterion:'+c['key']),leaf_id=ids['leaf'],source_id=ident(q,'SCORING'),criterion_key=c['key'],description=c['description'],official_points=c['points'],rubric_dimensions=DIMENSIONS))
  rows['math_canonical_solutions'].append(dict(id=ids['solution'],leaf_id=ids['leaf'],source_id=ident(q,'SOLUTION'),logical_id=ids['solution'],version=1,origin='OFFICIAL',state='DRAFT',body='\n\n'.join(x['solution_steps'])))
  for pos,body in enumerate(x['solution_steps'],1):
   # Do not guess which atomic criterion a combined derivation proves.
   rows['math_canonical_solution_steps'].append(dict(id=ident(q,'step:'+str(pos)),solution_id=ids['solution'],position=pos,body=body,criterion_id=None))
  manifest.append(dict(question_id=q,exam_id=exam,label=x['label'],ids=ids,source_sha256=x['source_sha256'],pages=x['pages'],criteria_count=len(x['criteria']),official_total=x['total_points'],source_review='SOURCE_CHECKED',runtime_review='NOT_VERIFIED',production_applied=False))
 return rows,manifest

def literal(v):
 if v is None:return 'null'
 if isinstance(v,bool):return 'true' if v else 'false'
 if isinstance(v,list):return 'array['+','.join(literal(s) for s in v)+']::text[]'
 if isinstance(v,(int,float)):return str(v)
 return "'"+str(v).replace("'","''")+"'"
def sql_candidate(rows):
 if '$task20c$' in json.dumps(rows,ensure_ascii=False): raise ValueError('SQL_DELIMITER_COLLISION')
 parts=['begin;','set local lock_timeout=\'5s\';','set local statement_timeout=\'30s\';']
 for leaf in rows['math_subproblems']:
  q=leaf['essay_question_id'];exam=TARGETS[q][0]
  parts.append("do $task20c$begin if not exists(select 1 from public.essay_questions where id="+literal(q)+" and essay_exam_id="+literal(exam)+") then raise exception 'REGISTRY_BINDING_MISSING';end if;end$task20c$;")
 for table in TABLES:
  for row in rows[table]:
   # Refuse different content at a stable ID instead of silently overwriting it.
   payload=literal(json.dumps(row,ensure_ascii=False))+'::jsonb'
   parts.append(f"do $task20c$begin if exists(select 1 from public.{table} t where id={literal(row['id'])} and not to_jsonb(t) @> {payload}) then raise exception 'CONTENT_ID_CONFLICT';end if;end$task20c$;")
   parts.append(f"insert into public.{table} ({','.join(row)}) values ({','.join(literal(v) for v in row.values())}) on conflict(id) do nothing;")
 parts.append('commit;')
 return '\n'.join(parts)+'\n'
def rollback_candidate(rows):
 leaf_ids=','.join(literal(x['id'])+'::uuid' for x in rows['math_subproblems'])
 parts=['begin;',"do $task20c$begin if exists(select 1 from public.math_attempts where leaf_id in ("+leaf_ids+")) then raise exception 'REFERENCED_CONTENT_ROLLBACK_DENIED';end if;end$task20c$;"]
 for table in reversed(TABLES):
  ids=','.join(literal(x['id'])+'::uuid' for x in rows[table])
  parts.append(f'delete from public.{table} where id in ({ids});')
 parts.append('commit;');return '\n'.join(parts)+'\n'
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--sources',required=True);p.add_argument('--output',required=True);a=p.parse_args()
 rows,manifest=compile_packages(json.loads(Path(a.input).read_text()),json.loads(Path(a.sources).read_text()))
 dest=Path(a.output);dest.mkdir(parents=True,exist_ok=True)
 for name,value in [('rows.private.json',rows),('manifest.json',manifest)]: (dest/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
 (dest/'draft.private.sql').write_text(sql_candidate(rows));(dest/'rollback.private.sql').write_text(rollback_candidate(rows))
 print(json.dumps({'questions':len(manifest),'rows':{t:len(v) for t,v in rows.items()},'publication':False}))
