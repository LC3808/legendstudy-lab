from pathlib import Path
import json,sys
root=Path(sys.argv[1]).resolve();base=Path(__file__).resolve().parent
for rel,addition,key in [('src/data/essay-beta-expansion.json','web-expansion-additions.json','exams'),('src/data/essay-student-pdf-candidates.json','web-pdf-additions.json','questions')]:
 path=root/rel;doc=json.loads(path.read_text());raw=json.loads((base/addition).read_text());items=raw['exams'] if key=='exams' else raw
 idkey='examId' if key=='exams' else 'questionId'
 for item in items:
  found=[x for x in doc[key] if x[idkey]==item[idkey]]
  if found: assert found==[item], 'Existing mapping differs: '+item[idkey]
  else: doc[key].append(item)
 path.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n')
path=root/'src/data/essay-question-inputs.json';doc=json.loads(path.read_text());new=json.loads((base/'web-input-additions.json').read_text())
for q,value in new.items():
 if q in doc: assert doc[q]==value,'Input mapping drift: '+q
 doc[q]=value
path.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n')
