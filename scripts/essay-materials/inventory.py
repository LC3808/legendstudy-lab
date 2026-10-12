"""Offline, private-only ZIP inventory. No extraction by member path, DB or network.
Metadata guesses are candidates, never reviewed Exam IDs or executable packages.
Run with the bundled pypdf Python. Original archives are never modified.
"""
import argparse, collections, hashlib, io, json, os, re, stat, unicodedata, zipfile
from pathlib import Path
from pypdf import PdfReader

VERSION = 'essay-material-inventory-v1'
EXPECTED = [x+'.zip' for x in '논술1차 한양대 중앙대 성균관대 서강대 건국대 홍익대 경희대 한국외대 이화여대 인하대 숭실대 동국대 세종대 연세대2 아주대 경북대 부산대 광운대 숙명여대'.split()]
MAX_MEMBER = 100 * 1024 * 1024

def digest(b): return hashlib.sha256(b).hexdigest()
def normalized_name(info):
    name = info.filename
    encoding = 'zip_utf8' if info.flag_bits & 0x800 else 'zip_default'
    if not info.flag_bits & 0x800:
        for candidate in ('utf-8', 'cp949'):
            try:
                decoded = name.encode('cp437').decode(candidate)
                if any('\uac00' <= c <= '\ud7a3' or '\u1100' <= c <= '\u11ff' for c in decoded):
                    name, encoding = decoded, 'recovered_'+candidate
                    break
            except (UnicodeError, LookupError): pass
    return unicodedata.normalize('NFC', name), encoding

def classify(name):
    years = sorted(set(int(v) for v in re.findall(r'(?<!\d)((?:19|20)\d{2})\s*학년도', name)))
    year = years[0] if len(years)==1 else None
    mock = bool(re.search(r'모의',name)); regular = bool(re.search(r'수시',name))
    typ = 'MOCK_ESSAY' if mock and not regular else 'REGULAR_ADMISSION_ESSAY' if regular and not mock else None
    # Retain source label including campus, numeric track and time; no broad engine inference.
    stem=Path(name).stem
    track = stem.split('_',1)[1].split(' ',1)[0] if '_' in stem else None
    sessions = re.findall(r'(?:오전|오후)\s*\d*|\d+\s*교시|\d+\s*차',stem)
    campuses = re.findall(r'서울|ERICA|에리카|미래|원주|세종|국제|글로벌',stem)
    roles=[role for pattern,role in [(r'문제','question'),(r'해설|풀이','explanation'),(r'채점|평가기준|평가 기준','scoring_criteria'),(r'출제.*의도','exam_intent'),(r'예시|모범','example_answer'),(r'우수|합격자','accepted_example'),(r'답안','answer')] if re.search(pattern,stem)]
    return dict(academic_year=year,year_candidates=years,exam_type=typ,track_raw=track,session_raw=sessions or None,campus_candidates=campuses,material_roles_candidates=roles,classification_confidence='filename_candidate',verification_status='BODY_REVIEW_REQUIRED',in_scope=year>=2001 if year else None)

def scan_pdf(data, text_dir):
    sha=digest(data); path=text_dir/(sha+'.json')
    if path.exists(): return json.loads(path.read_text())
    result={'sha256':sha,'page_count':None,'pages':[],'error':None,'question_count':None,'verification_status':'BODY_REVIEW_REQUIRED'}
    try:
        reader=PdfReader(io.BytesIO(data),strict=False)
        if reader.is_encrypted and not reader.decrypt(''): raise ValueError('ENCRYPTED')
        result['page_count']=len(reader.pages)
        for i,p in enumerate(reader.pages,1):
            try:
                text=unicodedata.normalize('NFC',p.extract_text() or '')
                headings=[m.group(0) for m in re.finditer(r'(?:문제|문항|논제)\s*[\[<【(]?\s*\d+(?:[-–.]\d+)?',text)]
                result['pages'].append({'page':i,'text':text,'text_sha256':digest(text.encode()),'text_characters':len(text.strip()),'question_markers':sorted(set(headings)),'roles_present':[r for ptn,r in [('출제\\s*의도','exam_intent'),('채점\\s*기준|평가\\s*기준','scoring_criteria'),('예시\\s*답안|모범\\s*답안','example_answer'),('해설|풀이','explanation')] if re.search(ptn,text)],'visual_review_required':True})
            except Exception as e: result['pages'].append({'page':i,'error':type(e).__name__,'visual_review_required':True})
        result['low_text_pages']=[p['page'] for p in result['pages'] if p.get('text_characters',0)<40]
    except Exception as e: result['error']=type(e).__name__
    path.write_text(json.dumps(result,ensure_ascii=False));return result

def run(source,output):
    if source.resolve() == output.resolve() or source.resolve() in output.resolve().parents:
        raise ValueError('Output must be outside source directory')
    os.umask(0o077);output.mkdir(parents=True,exist_ok=True);output.chmod(0o700)
    texts=output/'private-text';texts.mkdir(exist_ok=True)
    paths={unicodedata.normalize('NFC',p.name):p for p in source.iterdir() if p.is_file() and p.suffix.lower()=='.zip'}
    rows=[];archives=[];excluded=[]
    for name in sorted(paths):
        path=paths[name];archives.append({'name':name,'path':str(path),'sha256':digest(path.read_bytes())})
        with zipfile.ZipFile(path) as z:
            for index,info in enumerate(z.infolist()):
                n,encoding=normalized_name(info)
                if info.is_dir() or '__MACOSX' in n.split('/') or Path(n).name.startswith('._'): continue
                if Path(n).suffix.lower()!='.pdf':
                    excluded.append({'archive':name,'member':n,'reason':'NON_PDF'});continue
                if info.file_size>MAX_MEMBER or stat.S_ISLNK(info.external_attr>>16):
                    excluded.append({'archive':name,'member':n,'reason':'UNSAFE_MEMBER'});continue
                data=z.read(info);sha=digest(data);parsed=scan_pdf(data,texts)
                row={'source_zip':name,'source_zip_path':str(path),'zip_member_index':index,'original_member_name':info.filename,'normalized_member_name':n,'normalized_filename':Path(n).name,'encoding':encoding,'bytes':len(data),'sha256':sha,'pdf_pages':parsed['page_count'],'pdf_error':parsed['error'],'low_text_pages':parsed.get('low_text_pages',[]),'university_source_label':name[:-4],'university_id':None,'exam_id':None,'question_ids':[],**classify(n),'internal_analysis_allowed':True,'external_provider_transmission':'NOT_VERIFIED','public_distribution_allowed':False,'evaluation_allowed':False}
                rows.append(row)
        print(name,len([r for r in rows if r['source_zip']==name]),flush=True)
    groups=collections.defaultdict(list)
    for i,r in enumerate(rows):groups[r['sha256']].append(i)
    dup=[{'sha256':sha,'occurrence_indices':indices} for sha,indices in groups.items() if len(indices)>1]
    summary={'version':VERSION,'archives':len(archives),'missing_archives':[n for n in EXPECTED if n not in paths],'total_pdfs':len(rows),'unique_pdfs':len(groups),'duplicate_occurrences':sum(len(x['occurrence_indices'])-1 for x in dup),'duplicate_groups':len(dup),'pdf_errors':sum(bool(r['pdf_error']) for r in rows),'low_text_pdfs':sum(bool(r['low_text_pages']) for r in rows),'by_archive':dict(collections.Counter(r['source_zip'] for r in rows)),'year_candidates':dict(collections.Counter(str(r['academic_year']) for r in rows)),'exam_type_candidates':dict(collections.Counter(str(r['exam_type']) for r in rows)),'verified_exams':0,'verified_questions':0,'evaluation_allowed':False,'classification':'UNREVIEWED_CANDIDATES_NOT_CANONICAL_EXAMS'}
    for name,value in [('inventory',rows),('archives',archives),('duplicates',dup),('excluded',excluded),('summary',summary)]:
        (output/(name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(summary,ensure_ascii=False),flush=True)
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--source',type=Path,required=True);a.add_argument('--output',type=Path,required=True);args=a.parse_args();run(args.source,args.output)
