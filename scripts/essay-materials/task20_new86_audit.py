"""Reconcile completed registration with live package state and original PDF locators.

No production writes, review promotion, generated rubric, or Provider requests.
Page candidates are not approved question mappings.
"""
import argparse,collections,hashlib,json,re
from pathlib import Path

def anchors(text, number):
    text=text.replace('\x00',' ')
    patterns=[rf'\[\s*문제\s*{number}\s*번?\s*\]',rf'(?:<|〈)\s*(?:문제\s*)?{number}\s*[-－]\s*\d+',rf'(?m)^\s*{number}\s*[-－]\s*\d+\s*[.．]',rf'문\s*항\s*{number}(?!\d)',rf'문제\s*{number}(?!\d|\s*[-－])']
    return any(re.search(p,text) for p in patterns)

def inspect(exam, live, documents):
    if live['exam_id']!=exam['examId']:raise ValueError('EXAM_ID_DRIFT')
    expected={q['id'] for q in exam['questions']}
    if {q['id'] for q in live['questions']}!=expected:raise ValueError('QUESTION_ID_DRIFT')
    source_rows=[]
    for sha in exam['sourceHashes']:
        doc=documents.get(sha)
        if not doc:source_rows.append({'sha256':sha,'missing_local_original':True});continue
        source_rows.append({'sha256':sha,'name':doc['name'],'pages':len(doc['pages']),'original_hash_verified':doc['hash_verified']})
    result=[]
    for q in exam['questions']:
        n=int(re.search(r'\d+',q['label'])[0]);loc=[]
        for sha in exam['sourceHashes']:
            doc=documents.get(sha)
            if not doc:continue
            for page,text in enumerate(doc['pages'],1):
                norm=re.sub(r'\s+','',text.replace('\x00',' '))
                labels=anchors(text,n)
                headings=[h for h in ('출제의도','채점기준','평가기준','예시답안','문항해설') if h in norm]
                if not labels and not headings:continue
                # A title or a whole-exam page is not sufficient to assert a rubric mapping.
                loc.append({'source_sha256':sha,'page':page,'question_anchor_observed':labels,
                    'section_headings':headings,'contains_other_question_anchors':any(anchors(text,k) for k in range(1,10) if k!=n),
                    'private_glyph_count':sum(0xE000<=ord(c)<=0xF8FF for c in text),
                    'mapping_state':'CANDIDATE_NOT_VERIFIED'})
        state=next(x for x in live['questions'] if x['id']==q['id'])
        reasons=['NO_REVIEWED_PACKAGE'] if not live['package_digest'] else []
        if not live['runtime_policy']:reasons.append('NO_EXECUTION_POLICY')
        if not any(x['question_anchor_observed'] for x in loc):reasons.append('QUESTION_PAGE_REVIEW_REQUIRED')
        if not any('채점기준' in x['section_headings'] or '평가기준' in x['section_headings'] for x in loc):reasons.append('CRITERIA_SECTION_NOT_LOCATED')
        if any(x['private_glyph_count'] for x in loc):reasons.append('FORMULA_IMAGE_COMPARISON_REQUIRED')
        result.append({'question_id':q['id'],'label':q['label'],'published':state['published'],'math_leaf_count':state['math_leaf_count'],
                       'evaluation_ready':False,'review_complete':False,'reasons':reasons,'source_page_candidates':loc})
    return {'exam_id':exam['examId'],'name':exam['name'],'university_id':exam['universityId'],'year':exam['year'],'track':exam['track'],
        'registered_status':'COMPLETED_OWNER_APPROVED','review_state':live['review_state'],'package_digest':live['package_digest'],
        'runtime_policy':live['runtime_policy'],'resource_links':live['resource_links'],'is_active':live['is_active'],
        'source_files':source_rows,'questions':result,'public_candidate':False,'banner_eligible':False}

def main():
    p=argparse.ArgumentParser();p.add_argument('--private-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    root=Path(__file__).resolve().parents[2];plans=[]
    for f in root.glob('supabase/candidates/task20_*recovery_20261106/registration-plan.json'):plans.extend(json.loads(f.read_text())['exams'])
    if len(plans)!=86 or len({e['examId'] for e in plans})!=86:raise ValueError('APPROVED_SCOPE_DRIFT')
    live={e['exam_id']:e for e in json.loads((a.private_dir/'task20-new86-live.json').read_text())}
    docs={}
    for slug in ('sookmyung','hanyang','chungang','kwangwoon'):
        file='task20-sookmyung-pages.json' if slug=='sookmyung' else f'task20-{slug}-natural-pages.json'
        for d in json.loads((a.private_dir/file).read_text()):
            d['hash_verified']=hashlib.sha256(Path(d['path']).read_bytes()).hexdigest()==d['sha256']
            if not d['hash_verified']:raise ValueError('ORIGINAL_HASH_CHANGED')
            docs[d['sha256']]=d
    rows=[inspect(e,live[e['examId']],docs) for e in plans]
    summary={'exams':len(rows),'questions':sum(len(e['questions']) for e in rows),'package_connected':sum(bool(e['package_digest']) for e in rows),
             'review_complete':0,'evaluation_ready':0,'public_candidates':0,'new_banner_targets':0,'production_writes':0,'provider_calls':0,
             'missing_original_hashes':sorted({s['sha256'] for e in rows for s in e['source_files'] if s.get('missing_local_original')}),
             'question_reason_counts':dict(collections.Counter(r for e in rows for q in e['questions'] for r in q['reasons']))}
    a.output.mkdir(parents=True,exist_ok=True)
    (a.output/'new86-package-source-audit.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
    (a.output/'new86-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(summary,ensure_ascii=False))
if __name__=='__main__':main()
