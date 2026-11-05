import argparse,pathlib,json,uuid,runpy,re
parser=argparse.ArgumentParser()
parser.add_argument('--source-plan',type=pathlib.Path,required=True)
parser.add_argument('--pages',type=pathlib.Path,required=True)
parser.add_argument('--registry',type=pathlib.Path,required=True)
parser.add_argument('--output',type=pathlib.Path,required=True)
args=parser.parse_args()
base=pathlib.Path(__file__).resolve().parents[2]
h=runpy.run_path(str(base/'scripts/essay-materials/prepare_registration.py'));ns=h['NAMESPACE']
rows=json.loads(args.source_plan.read_text())
pages={d['sha256']:d for d in json.loads(args.pages.read_text())}
live=json.loads(args.registry.read_text());existing_ids={e['exam_id'] for e in live};existing_qids={q['id'] for e in live for q in e['questions']};exams=[]
for r in rows:
 if r['status']!='REGISTRY_MAPPING_REQUIRED':continue
 key=f"source:sookmyung-{r['year']}-{r['kind']}-{r['track']}-"+(('session-'+r['session'][0]) if r['session'] else 'single')
 eid=str(uuid.uuid5(ns,'exam/'+key));assert eid not in existing_ids
 qdocs=[s for s in r['sources'] if s['role']=='question'];text='\n'.join(p for d in qdocs for p in pages[d['sha256']]['pages'])
 parents=sorted(set(int(x) for x in re.findall(r'(?m)^\s*([1-9])\s*[-－]\s*[1-9](?:\s*[.．(]|\s)',text)))
 if r['year']==2021 and r['track']=='humanities':parents=sorted(set(int(x) for x in re.findall(r'(?m)^\s*([12])\.\s*$',text)))
 if not parents:raise ValueError('QUESTION_BOUNDARY_REVIEW_REQUIRED '+key)
 qs=[]
 for i,n in enumerate(parents):
  qkey=f'{key}:q{n}';qid=str(uuid.uuid5(ns,'question/'+qkey));assert qid not in existing_qids
  qs.append(dict(sourceKey=qkey,id=qid,label=f'문항 {n}',order=i))
 track={'humanities':'인문계열','natural':'자연계열','pharmacy':'자연계열(약학부)'}[r['track']]
 exams.append(dict(sourceKey=key,examId=eid,existingExam=False,universityId='c4fa65ac-bbc6-5897-b4d8-f12f5a8f222b',year=r['year'],kind=r['kind'],track=track,session=r['session'],campus=None,examKey=key.replace('source:','source-'),name=f"숙명여자대학교 {r['year']}학년도 "+('모의논술' if r['kind']=='mock' else '수시 논술')+' '+track+(' '+r['session'] if r['session'] else ''),sourceHashes=sorted(s['sha256'] for s in r['sources']),questions=qs))
plan=dict(status='REVIEW_ONLY_NOT_APPLIED',publication=False,evaluation=False,exams=exams,held=[])
out=args.output;out.mkdir(exist_ok=True)
(out/'registration-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
sql=h['sql_document'](plan)
sql='\n'.join(line for line in sql.split('\n') if "EXAM_RECONCILIATION_REQUIRED" not in line)
# Source-prefixed IDs alone must not bypass semantic duplicate protection.
needle="   insert into public.essay_exams(id,university_id,admission_year,exam_key,exam_name,exam_kind,campus,field_or_division,session_label)"
guard="""   if exists(select 1 from public.essay_exams where university_id=(e->>'universityId')::uuid and admission_year=(e->>'year')::int and exam_kind=e->>'kind' and id<>eid and field_or_division is not distinct from e->>'track' and session_label is not distinct from e->>'session') then raise exception 'SEMANTIC_EXAM_DUPLICATE';end if;
"""
assert needle in sql;sql=sql.replace(needle,guard+needle)
# Lock the same metadata tables used by rollback, blocking concurrent registration drift.
sql=sql.replace('begin;\ndo $body$','begin;\nlock table public.essay_questions,public.essay_exams in share row exclusive mode;\ndo $body$')
(out/'register-review-only.sql').write_text(sql)
rollback=h['rollback_document'](plan)
rollback=rollback.replace('expected jsonb;actual jsonb;begin','expected jsonb;actual jsonb; fk record; hit boolean; ids uuid[]; begin')
needle="  for q in select value from jsonb_array_elements(e->'questions') loop"
guard="""  if exists(select 1 from public.essay_questions where essay_exam_id=(e->>'examId')::uuid and id not in (select (value->>'id')::uuid from jsonb_array_elements(e->'questions'))) then raise exception 'UNPLANNED_QUESTIONS_EXIST';end if;
  for fk in select c.conrelid,c.confrelid,c.conkey,c.confkey,a.attname from pg_constraint c cross join lateral generate_subscripts(c.confkey,1) pos(n) join pg_attribute target on target.attrelid=c.confrelid and target.attnum=c.confkey[pos.n] and target.attname='id' join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[pos.n] where c.contype='f' and c.confrelid in ('public.essay_exams'::regclass,'public.essay_questions'::regclass) and c.conrelid<>'public.essay_questions'::regclass loop
   if fk.confrelid='public.essay_exams'::regclass then ids=array[(e->>'examId')::uuid];else select array_agg((value->>'id')::uuid) into ids from jsonb_array_elements(e->'questions');end if;
   execute format('select exists(select 1 from %s where %I=any($1))',fk.conrelid::regclass,fk.attname) into hit using ids;
   if hit then raise exception 'DEPENDENT_RECORDS_EXIST';end if;
  end loop;
"""
assert needle in rollback;rollback=rollback.replace(needle,guard+needle)
(out/'rollback-review-only.sql').write_text(rollback)
print(json.dumps(dict(exams=len(exams),questions=sum(len(e['questions']) for e in exams),existing_exams_preserved=8,applied=False)))
