"""Record conservative group coverage; not a rubric/Evaluation Package certification."""
import argparse,json,collections
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--private-root',type=Path,required=True)
root=parser.parse_args().private_root
registry=json.loads(Path('src/data/essay-source-registry.json').read_text())['exams']
rows={r['sha256']:r for r in json.loads((root/'inventory.json').read_text())}
out=[]
for group in json.loads((root/'review-candidates.json').read_text()):
    linked=[e for e in registry if set(e['sourceHashes'])&set(group['source_hashes'])]
    complete=bool(linked) and set(group['source_hashes'])<=set(h for e in linked for h in e['sourceHashes'])
    unresolved=not group['academic_year_candidate'] or not group['catalog_source_id'] or all(rows[h]['pdf_error'] for h in group['source_hashes'])
    status='UNRESOLVED' if unresolved else 'VERIFIED' if complete and len(linked)==1 else 'NEEDS_REVIEW'
    out.append({'review_group_key':group['review_group_key'],'status':status,'scope':'exam_identity_and_question_labels_only','registryKeys':[e['key'] for e in linked],'reason':'All group source identities reconciled to one selection record' if status=='VERIFIED' else 'Source boundaries, solution/rubric relationships or identities require review','source_hashes':group['source_hashes']})
(root/'candidate-review-status.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(dict(collections.Counter(x['status'] for x in out))))
