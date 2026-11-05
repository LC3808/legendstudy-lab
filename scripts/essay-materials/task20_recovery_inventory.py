"""Read-only recovery inventory; never upgrades source review or public availability.

Inputs are existing production Registry snapshots and private material archives.
Outputs contain IDs, hashes and page locators, not original PDF text or credentials.
"""
import argparse
import collections
import hashlib
import json
import re
import unicodedata
from pathlib import Path

TARGETS = {'hanyang','chungang','kwangwoon','sookmyung','kau','soongsil','swu','dongguk','kyunghee','korea','sogang','sungkyunkwan','konkuk'}
REQUIRED_ROLES = {'question', 'intent', 'criteria'}

def file_hash(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def inspect_question(question, draft, files):
    refs = draft.get('package', {}).get('questions', []) if draft else []
    entries = [r for r in refs if r.get('question_id') == question['id']]
    evidence = entries[0].get('source_page_references', []) if len(entries) == 1 else []
    roles = set()
    issues = set()
    locators = []
    for ref in evidence:
        role = ref.get('role')
        text = ref.get('evidenceText', '')
        sha = ref.get('sourceHash')
        first, last = ref.get('startPage'), ref.get('endPage')
        valid_range = isinstance(first, int) and not isinstance(first, bool) and isinstance(last, int) and not isinstance(last, bool) and 1 <= first <= last
        if ref.get('questionId') != question['id']:
            issues.add('QUESTION_ID_MISMATCH')
        elif text.strip() and valid_range and sha in files:
            roles.add(role)
        if not valid_range: issues.add('INVALID_PAGE_RANGE')
        if sha not in files: issues.add('SOURCE_HASH_NOT_FOUND')
        if not text.strip(): issues.add('EMPTY_EVIDENCE_TEXT')
        pua = sum(0xE000 <= ord(c) <= 0xF8FF for c in text)
        if pua: issues.add('ORIGINAL_FORMULA_VISUAL_REVIEW_REQUIRED')
        if ref.get('verification') != 'VERIFIED': issues.add('SOURCE_REVIEW_PENDING')
        locators.append(dict(role=role, source_sha256=sha, first_page=first,last_page=last,
                             source_files=files.get(sha, []), extracted_private_glyphs=pua,
                             review_status=ref.get('verification')))
    missing = sorted(REQUIRED_ROLES - roles)
    if missing: issues.add('MISSING_REQUIRED_SOURCE_ROLE')
    return dict(question_id=question['id'], label=question['label'], source_locators=locators,
                missing_roles=missing, issues=sorted(issues),
                source_candidate_complete=not missing, semantic_review_pass=False)

def sookmyung_identity(name):
    name=unicodedata.normalize('NFC',name)
    year=int(re.match(r'(\d{4})학년도',name).group(1))
    kind='mock' if '모의논술' in name else 'admission'
    track='humanities' if '인문' in name else 'pharmacy' if '약학' in name else 'natural'
    # Mock humanities 1/2 in 2025/2026 are question files, NOT separate sessions.
    session=None
    if kind=='admission' and track=='humanities':
        m=re.search(r'인문(?:계)?\(?([123])',name)
        session=m.group(1)+'회차' if m else None
    return (year,kind,track,session)

def sookmyung_plan(pages, exams):
    groups=collections.defaultdict(list)
    for item in pages:
        groups[sookmyung_identity(item['name'])].append(item)
    result=[]
    for key, docs in sorted(groups.items(),key=lambda x:str(x[0])):
        qdocs=[d for d in docs if d['name'].endswith(' 문제.pdf')]
        if not qdocs: continue
        year,kind,track,session=key
        matches=[]
        for e in exams:
            t=e['field_or_division'] or ''
            actual='humanities' if '인문' in t else 'pharmacy' if '약학' in t and '제외' not in t else 'natural'
            if (e['admission_year'],e['exam_kind'],actual,e['session_label'])==key:matches.append(e)
        sources=[]
        for d in docs:
            n=d['name']; role='question' if n.endswith(' 문제.pdf') else 'student_exemplar' if '우수답안' in n else 'general_commentary' if '총평' in n else 'official_assessment'
            headings=[]
            for i,p in enumerate(d['pages'],1):
                normalized=re.sub(r'\s+','',p)
                found=[word for word in ['출제의도','채점기준','예시답안'] if word in normalized]
                if found:headings.append(dict(page=i,headings=found))
            sources.append(dict(name=n,sha256=d['sha256'],page_count=len(d['pages']),role=role,heading_pages=headings))
        result.append(dict(year=year,kind=kind,track=track,session=session,
            existing_exam_ids=[e['exam_id'] for e in matches],
            existing_question_ids=[q['id'] for e in matches for q in e['questions']],
            status='REUSE_EXISTING_IDS' if len(matches)==1 else 'IDENTITY_CONFLICT' if matches else 'REGISTRY_MAPPING_REQUIRED',
            question_file_count=len(qdocs),sources=sources,public_activation=False,
            parent_question_count=None,notes='Original subquestion structure must be reviewed; do not infer parent count from filenames.'))
    return result

def main():
    p=argparse.ArgumentParser();p.add_argument('--registry',type=Path,required=True);p.add_argument('--audit',type=Path,required=True);p.add_argument('--assembled',type=Path,required=True);p.add_argument('--source-root',type=Path,required=True);p.add_argument('--sookmyung-pages',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--backup-root',type=Path);a=p.parse_args()
    read=lambda p:json.loads(p.read_text())
    live=read(a.registry); audit=read(a.audit)['rows'];meta={e['exam_id']:e for e in audit};assembled=read(a.assembled)
    if len({e['exam_id'] for e in live})!=len(live):raise ValueError('DUPLICATE_EXAM_ID')
    files=collections.defaultdict(list)
    for path in sorted(a.source_root.rglob('*.pdf')):
        files[file_hash(path)].append(unicodedata.normalize('NFC',str(path.relative_to(a.source_root))))
    # Earlier official reports were archived by their content hash. Reuse them;
    # do not treat absence from the later download folder as missing evidence.
    required_hashes={ref.get('sourceHash') for draft in assembled['drafts'].values()
                     for q in draft.get('package',{}).get('questions',[])
                     for ref in q.get('source_page_references',[])}
    if a.backup_root:
        for sha in sorted(h for h in required_hashes if h and h not in files):
            if not re.fullmatch(r'[0-9a-f]{64}',sha):raise ValueError('INVALID_SOURCE_HASH')
            archived=a.backup_root/(sha+'.pdf')
            if archived.is_file():
                if file_hash(archived)!=sha:raise ValueError('ARCHIVED_SOURCE_HASH_MISMATCH')
                files[sha].append('archived-originals/'+sha+'.pdf')
    result=[]
    for e in live:
        m=meta.get(e['exam_id']);
        if not m or m['slug'] not in TARGETS:continue
        qs=[inspect_question(q,assembled['drafts'].get(q['id']),files) for q in e['questions']]
        result.append(dict(university=m['university'],slug=m['slug'],exam_id=e['exam_id'],year=e['admission_year'],kind=e['exam_kind'],track=e['field_or_division'],session=e['session_label'],question_count=len(qs),existing_math_sets=e['math_sets'],existing_policy=m['policy'],questions=qs,publication_status='UNCHANGED',source_inventory_only=True))
    smids={e['exam_id'] for e in audit if e['slug']=='sookmyung'}
    sm=sookmyung_plan(read(a.sookmyung_pages),[e for e in live if e['exam_id'] in smids])
    a.output.mkdir(parents=True,exist_ok=True)
    for name,value in [('existing-registry-source-coverage.json',result),('sookmyung-recovery-plan.json',sm)]:
        (a.output/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
    summary=dict(registry_exams=len(live),registry_questions=sum(len(e['questions']) for e in live),target_exams=len(result),source_files=sum(map(len,files.values())),sookmyung_groups=len(sm),sookmyung_existing=sum(x['status']=='REUSE_EXISTING_IDS' for x in sm),sookmyung_missing=sum(x['status']=='REGISTRY_MAPPING_REQUIRED' for x in sm),production_writes=0,provider_calls=0)
    (a.output/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
if __name__=='__main__':main()
