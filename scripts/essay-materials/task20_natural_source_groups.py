"""Inventory original natural-exam files without inventing exams or review approval.

Only metadata and observed page locators leave the private extraction directory.
Combined commentary is deliberately not automatically assigned to a different track.
"""
import argparse
import collections
import json
import re
import unicodedata
from pathlib import Path


def identity(slug, filename):
    name = unicodedata.normalize('NFC', filename)
    year = int(re.match(r'(\d{4})학년도', name).group(1))
    kind = 'mock' if '모의논술' in name else 'admission'
    session = None
    track = '자연계열'
    if slug == 'hanyang':
        m = re.search(r'(오전|오후\s*[12])', name)
        session = re.sub(r'\s+', '', m[1]) if m else None
    elif slug == 'chungang':
        if year == 2027 and kind == 'mock':
            mode = '창의' if '창의' in name else '일반'
            # A commentary file without 공통/의약학 is shared evidence, not an exam.
            track = ('의약학' if '의약학' in name else '자연계열' if '공통' in name else '미배정') + '(' + mode + ')'
        elif kind == 'admission':
            m = re.search(r'자연(?:계열)?([123])', name)
            session = m[1] + '회차' if m else None
    elif slug == 'kwangwoon':
        if kind == 'admission':
            m = re.search(r'(?:\(([123])교시\)|자연계([123]))', name)
            session = next(v for v in m.groups() if v) + '교시' if m else None
        # mock 자연1/2 and (1번)/(2번) are question files within one exam.
    else:
        raise ValueError('UNSUPPORTED_UNIVERSITY')
    return year, kind, track, session


def locators(doc):
    result = []
    for page, text in enumerate(doc['pages'], 1):
        # NUL from PDF extraction is spacing, not a mathematical symbol.
        text = text.replace('\x00', ' ')
        nums = sorted(set(int(n) for n in re.findall(r'\[\s*문제\s*(\d+)\s*번?\s*\]', text)))
        compact = re.sub(r'\s+', '', text)
        headings = [h for h in ('출제의도','채점기준','평가기준','예시답안','문제해설') if h in compact]
        if nums or headings:
            result.append({'page': page, 'observed_question_labels': nums, 'headings': headings})
    return result


def build(slug, documents, registry):
    groups = collections.defaultdict(list)
    for doc in documents:
        groups[identity(slug, doc['name'])].append(doc)
    output = []
    for key, docs in sorted(groups.items(), key=lambda x: str(x[0])):
        year, kind, track, session = key
        existing = [e for e in registry if e['admission_year'] == year and e['exam_kind'] == kind
                    and ('자연계열' if e['field_or_division'] == '자연' else (e['field_or_division'] or '')) == track
                    and e['session_label'] == session]
        sources = []
        for doc in docs:
            sources.append({'name': doc['name'], 'sha256': doc['sha256'], 'page_count': len(doc['pages']),
                            'locators': locators(doc), 'student_exemplar': '합격자' in doc['name'],
                            'question_file': '문제' in doc['name'] and '해설' not in doc['name'] or
                            (slug == 'kwangwoon' and '문제' in doc['name'])})
        question_sources = [s for s in sources if s['question_file'] and not s['student_exemplar']]
        observed = sorted({n for s in question_sources for p in s['locators'] for n in p['observed_question_labels']})
        duplicate_hashes = [sha for sha, count in collections.Counter(s['sha256'] for s in sources).items() if count > 1]
        status = 'UNASSIGNED_SHARED_COMMENTARY' if track.startswith('미배정') else 'IDENTITY_CONFLICT' if len(existing)>1 else 'REUSE_EXISTING_IDS' if existing else 'REGISTRY_MAPPING_REQUIRED'
        output.append({'slug': slug, 'year': year,'kind':kind,'track':track,'session':session,
                       'status':status,'existing_exam_ids':[e['exam_id'] for e in existing],
                       'existing_question_ids':[q['id'] for e in existing for q in e['questions']],
                       'sources':sources,'observed_parent_labels':observed,'duplicate_source_hashes':duplicate_hashes,
                       'question_source_present':bool(question_sources),'semantic_review_pass':False,
                       'publication_enabled':False,'parent_count_verified':False})
    return output


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--private-dir',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);a=ap.parse_args()
    read=lambda name:json.loads((a.private_dir/name).read_text())
    registry=read('task20-live-exams.json'); audit=read('task20-audit-input.json')['rows']
    all_groups=[]
    for slug in ('hanyang','chungang','kwangwoon'):
        ids={e['exam_id'] for e in audit if e['slug']==slug}
        groups=build(slug,read('task20-'+slug+'-natural-pages.json'),[e for e in registry if e['exam_id'] in ids])
        all_groups.extend(groups)
        print(slug,dict(collections.Counter(g['status'] for g in groups)))
    a.output.write_text(json.dumps(all_groups,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
