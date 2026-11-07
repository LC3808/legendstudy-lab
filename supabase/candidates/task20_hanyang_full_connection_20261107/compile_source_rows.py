"""Offline only: generate exact, hash-pinned private source staging SQL. No network."""
from pathlib import Path
import json,hashlib,base64,sys
base=Path(__file__).resolve().parent;source=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
def lit(v):return "'"+v.replace("'","''")+"'"
for expected in json.loads((base/'release-manifest.json').read_text()):
 q=expected['question_id'];r=json.loads((source/(q+'.json')).read_text());m=r['manifest_text'];images=r['images_text'];digest=hashlib.sha256((m+images).encode()).hexdigest()
 assert r['question_id']==q and r['exam_id']==expected['exam_id'] and digest==r['sha256']==expected['source_payload_hash']
 refs=json.loads(m);assert set(refs)=={'problem','intent','rubric','solution'}
 data=json.loads(images)
 for z in data:
  assert hashlib.sha256(base64.b64decode(z['data'],validate=True)).hexdigest()==z['sha256']
  for role in z['roles']:assert z['source_sha256']==refs[role]['sha256'] and z['physical_page'] in refs[role]['pages']
 for role,ref in refs.items():assert sorted(z['physical_page'] for z in data if role in z['roles'])==ref['pages']
 e=r['exam_id'];s=f"""begin;
 do $$begin if not exists(select 1 from public.essay_questions where id='{q}' and essay_exam_id='{e}') then raise exception 'REGISTRY_DRIFT';end if;end$$;
 insert into math_private.task20_hanyang_source_pages values ('{q}','{e}',{lit(m)}::jsonb,{lit(images)}::jsonb,'{digest}') on conflict(question_id) do nothing;
 do $$begin if not exists(select 1 from math_private.task20_hanyang_source_pages where question_id='{q}' and exam_id='{e}' and content_sha256='{digest}') then raise exception 'SOURCE_DRIFT';end if;end$$;
 commit;"""
 (out/(q+'.sql')).write_text(s)
print('34 pinned statements generated; nothing applied')
