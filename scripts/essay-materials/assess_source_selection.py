"""Conservative selection-metadata candidates. Does not certify rubric or Provider readiness."""
import argparse,json,re,collections
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--private-root',type=Path,required=True)
root=parser.parse_args().private_root
rows=json.loads((root/'inventory.json').read_text());cat=json.loads(Path('src/data/essay-public-catalog.json').read_text());us={u['sourceUniversityId']:u for u in cat['universities']}
found=[]
for r in rows:
 n=r['normalized_filename']; track=r['track_raw'] or ''
 if not '문제' in n or any(x in n for x in ['답안','해설','풀이']) or r['pdf_error'] or not r['academic_year'] or not track:continue
 if re.search(r'\d|Ⅰ|Ⅱ|Ⅲ|번|공통|선택',track):continue
 d=json.loads((root/'private-text'/(r['sha256']+'.json')).read_text());body='\n'.join(p.get('text','') for p in d['pages']);compact=re.sub(r'\s|\x00','',body)
 if f"{r['academic_year']}학년도" not in compact:continue
 kind='mock' if ('모의논술' in compact or '모의문항' in compact) else 'admission' if '수시' in compact else None
 if not kind:continue
 heads=list(re.finditer(r'(?:[\[【]\s*(?:문제|논제|문항)\s*(\d+)\s*번?\s*[\]】]|(?:^|\n)\s*(?:문제|논제|문항)\s*(\d+)\s*(?=[\s.:]))',body))
 nums=[int(m.group(1) or m.group(2)) for m in heads];unique=sorted(set(nums))
 if not unique or unique!=list(range(1,max(unique)+1)) or max(unique)>12 or len(nums)!=len(unique):continue
 if re.sub(r'\(.*?\)','',track).replace('계열','').replace('계','') not in compact:continue
 found.append({'university':r['catalog_source_id'],'year':r['academic_year'],'kind':kind,'track':track,'questions':unique,'sha':r['sha256'],'name':n,'pages':r['pdf_pages']})
print('COUNT',len(found),'UNIVERSITIES',len(set(x['university'] for x in found)));print(collections.Counter(x['university'] for x in found));
(root/'strict-structure-candidates.json').write_text(json.dumps(found,ensure_ascii=False,indent=2))
for x in found[:15]:print(x['name'],x['questions'])
