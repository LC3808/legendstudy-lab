"""Split original 2026 Sookmyung criteria into question-scoped review inputs.

No grading policy generation; official 9 bands are never converted to learning 5.
Original extracted formula glyphs stay unchanged and require image verification.
"""
import argparse,hashlib,json,re
from pathlib import Path


def split_criteria(pages):
    joined='\n'.join(pages)
    start=re.search(r'6\.\s*채점\s*기준',joined)
    end=re.search(r'7\.\s*예시\s*답안',joined)
    if not start or not end or end.start()<=start.end():raise ValueError('CRITERIA_SECTION_BOUNDARY_MISSING')
    segment=joined[start.end():end.start()]
    markers=list(re.finditer('■ 각 세부 문제별로',segment))
    if len(markers)!=3:raise ValueError('EXPECTED_THREE_CRITERIA_GROUPS')
    out=[]
    for i,m in enumerate(markers):
        finish=markers[i+1].start() if i+1<len(markers) else len(segment)
        text=segment[m.start():finish].strip()
        numbers={int(x) for x in re.findall(r'<([123])-[12]>',text)}
        if numbers!={i+1}:raise ValueError('CROSS_QUESTION_CRITERIA')
        if {int(x) for x in re.findall(r'([1-9])등급',text)}!=set(range(1,10)):raise ValueError('INCOMPLETE_OFFICIAL_BANDS')
        absolute_start=start.end()+m.start();absolute_end=start.end()+finish
        offsets=[];cursor=0
        for page,p in enumerate(pages,1):
            if cursor<len(joined) and cursor+len(p)>absolute_start and cursor<absolute_end:offsets.append(page)
            cursor+=len(p)+1
        out.append({'parent_number':i+1,'text':text,'first_page':min(offsets),'last_page':max(offsets),
                    'text_sha256':hashlib.sha256(text.encode()).hexdigest(),'verification':'NEEDS_REVIEW'})
    return out


def main():
    p=argparse.ArgumentParser();p.add_argument('--pages',type=Path,required=True);p.add_argument('--registry',type=Path,required=True);p.add_argument('--private-output',type=Path,required=True);p.add_argument('--metadata-output',type=Path,required=True);a=p.parse_args()
    docs=json.loads(a.pages.read_text());reg=json.loads(a.registry.read_text());results=[];metadata=[]
    pins=[('5f002de0-5b59-50b8-8e05-684428e1e96d','83b1926d98c9e083eaf7f2f83b9e01c0c091c7c80f484bdfb0ca134a5760d028'),('7484fbea-4c68-5285-b525-227f835ca4cc','cb39fc2c249fc16ad7d299e5767838cfb33e23da90b02ea38fe679ec1c475080')]
    for eid,sha in pins:
        exam=next(e for e in reg if e['exam_id']==eid);doc=next(d for d in docs if d['sha256']==sha)
        if hashlib.sha256(Path(doc['path']).read_bytes()).hexdigest()!=sha:raise ValueError('ORIGINAL_HASH_CHANGED')
        units=split_criteria(doc['pages'])
        for unit in units:
            n=unit['parent_number'];matches=[q for q in exam['questions'] if q['label'].startswith(f'문항 {n} ')]
            if len(matches)!=1:raise ValueError('REGISTRY_PARENT_AMBIGUOUS')
            unit.update(exam_id=eid,question_id=matches[0]['id'],source_sha256=sha,role='criteria',official_band_count=9,learning_level_conversion=False,provider_transmission_approved=False)
            results.append(unit);metadata.append({k:v for k,v in unit.items() if k!='text'})
    a.private_output.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
    a.metadata_output.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'exams':2,'question_scoped_criteria':len(results),'production_writes':0,'provider_calls':0,'review':'PENDING_FORMULA_IMAGE_REVIEW'}))
if __name__=='__main__':main()
