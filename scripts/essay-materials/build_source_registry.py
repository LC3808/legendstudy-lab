"""Reproduce reviewed selection metadata; never emits private PDF text or activates evaluation."""
import argparse,json,hashlib,re
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--private-root',type=Path,required=True)
args=parser.parse_args()
root=args.private_root
rows=json.loads((root/'inventory.json').read_text()); strict=json.loads((root/'strict-structure-candidates.json').read_text());cat=json.loads(Path('src/data/essay-public-catalog.json').read_text());universities={u['sourceUniversityId']:u for u in cat['universities']}
# The published metadata snapshot is the reviewed allowlist, not every parser hit.
approved={h for e in json.loads(Path('src/data/essay-source-registry.json').read_text())['exams'] for h in e['sourceHashes']}
exams=[]
def add(u,year,kind,track,session,sha,labels,dbid=None,campus=None,locators=None,lengths=None):
 key='source:'+hashlib.sha256((u+'|'+str(year)+'|'+kind+'|'+track+'|'+str(session)+'|'+str(campus)).encode()).hexdigest()
 if any(e['key']==key for e in exams):raise ValueError('Duplicate identity requires review: '+key)
 exams.append({'key':key,'dbExamId':dbid,'universityId':universities[u]['universityId'],'sourceUniversityId':u,'year':year,'kind':kind,'track':track,'session':session,'campus':campus,'verification':'VERIFIED','verificationScope':'exam_identity_and_question_labels','sourceHashes':sha,'questions':[{'key':key+':'+str(n),'dbQuestionId':None,'label':'문제 '+str(n),'sourceLocator':(locators or {}).get(str(n)),'lengthLabel':(lengths or {}).get(str(n))} for n in labels],'evaluationReady':False})
for x in strict:
 if x['sha'] not in approved:continue
 track=x['track'];session=None
 if '(오후)' in track:track=track.replace('(오후)','');session='오후'
 add(x['university'],x['year'],x['kind'],track,session,[x['sha']],x['questions'])
add('skku',2025,'admission','언어형','1교시',['43371e05adaecbd324cadd2e28895d2b76e7d1598c9e857d1bd75aaa34d53e0d'],[1,2,3],'e15a43a8-5a50-501a-8a60-a632316240e8',locators={'1':'PDF 1–8쪽','2':'PDF 9–13쪽','3':'PDF 14–18쪽'})
add('hanyang',2024,'admission','인문계열','오후 2',['4f3b87f2197a042c8abdd361584e3e03ab4bd4d15bc5341273dee27b7b6fc73b'],[1],locators={'1':'PDF 2–3쪽'},lengths={'1':'1,200자'})
sook=[next(r['sha256'] for r in rows if r['sha256'].startswith(p)) for p in ['c3d2a9ab','8a9fa2a6']]
add('sookmyung',2025,'mock','인문계열',None,sook,['1-1','1-2','2-1','2-2'],'a6667288-75ad-50d4-b237-d2a08e2bff8b',locators={k:'해당 문항 PDF 2쪽' for k in ['1-1','1-2','2-1','2-2']},lengths={'1-1':'300±30자','1-2':'600±60자','2-1':'300±30자','2-2':'600±60자'})
# Reviewed extracted headers + explicit question boundaries. No original prose is emitted.
manual=[('uos','7545a4eef0ad',2027,'mock','자연계열',None,[1,2,3,4]),('knu','ed34b7237d55',2025,'mock','자연계열Ⅱ',None,[1,2,3]),('ewha','f0700c5dd3df',2024,'mock','자연계열Ⅰ',None,[1,2,3]),('sogang','f08c76cf8699',2024,'mock','인문계열(경제경영)','1차',[1]),('hufs','166c348ca8',2023,'admission','인문계','T3',[1,2,3]),('soongsil','bf0488e18d7f',2022,'admission','인문계열',None,[1,2])]
for u,prefix,y,k,t,s,qs in manual:
 sha=next(r['sha256'] for r in rows if r['sha256'].startswith(prefix));add(u,y,k,t,s,[sha],qs)

kw=[next(r['sha256'] for r in rows if r['sha256'].startswith(p)) for p in ['e9a3c7b3','8fb5f2c3']]
add('kwangwoon',2022,'mock','자연계열',None,kw,[1,2],locators={'1':'문제 1 자료 PDF 1쪽','2':'문제 2 자료 PDF 1쪽'})
hongik=next(r['sha256'] for r in rows if r['sha256'].startswith('88b9b0113d36'))
add('hongik',2025,'admission','자연계열(수학)',None,[hongik],list(range(1,8)),campus='세종',locators={str(i):'공식 보고서 인쇄면 '+str(n)+'쪽' for i,n in enumerate([93,95,97,99,101,103,106],1)})
# One prompt has no printed ordinal; do not manufacture a question number.
for e in exams:
 if e['sourceUniversityId']=='sogang':
  e['questions'][0]['label']='논술 문항'
  e['questions'][0]['key']=e['key']+':unnumbered'
coverage=[{'sourceUniversityId':u,'files':sum(r['catalog_source_id']==u for r in rows),'verifiedExams':sum(e['sourceUniversityId']==u for e in exams),'status':'VERIFIED' if any(e['sourceUniversityId']==u for e in exams) else 'NEEDS_REVIEW'} for u in sorted(set(r['catalog_source_id'] for r in rows))]
result={'version':'essay-source-registry-v1','verifiedAt':'2026-10-12','verificationScope':'Selection metadata only; not Provider/rubric/content completeness','coverage':coverage,'exams':exams}
Path('src/data/essay-source-registry.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(len(exams),sum(len(e['questions']) for e in exams),sum(c['verifiedExams']>0 for c in coverage))
