"""Create offline review candidates; never publish or authorize evaluation.
Reuse catalog IDs and the exact-hash existing SKKU manifest. No inferred DB IDs.
Private output may contain material locators; do not commit its contents wholesale.
"""
import argparse, collections, csv, hashlib, json, os, re
from pathlib import Path
from inventory import classify, digest

def prepare(root,catalog,source,manifest):
 rows=json.loads((root/'inventory.json').read_text());universities=json.loads(catalog.read_text())['universities']
 aliases={u['name'].replace('대학교','대').replace('여자대','여대'):u for u in universities}
 # Established Korean shorthand, not a new canonical identity.
 aliases['한국외대']=next(u for u in universities if u['sourceUniversityId']=='hufs')
 groups=collections.defaultdict(list)
 for r in rows:
  n=r['normalized_filename']; found=[u for a,u in aliases.items() if a in n or a in r['university_source_label']]
  unique={u['sourceUniversityId']:u for u in found}
  u=next(iter(unique.values())) if len(unique)==1 else None
  r['catalog_source_id']=u['sourceUniversityId'] if u else None;r['university_id']=u['universityId'] if u else None
  data=json.loads((root/'private-text'/(r['sha256']+'.json')).read_text())
  pages=data['pages']; body='\n'.join(p.get('text','') for p in pages)
  # Both may appear in a collected document. Conflicts remain quarantined.
  kinds=[]
  if re.search(r'모의\s*논술',body):kinds.append('MOCK_ESSAY')
  if re.search(r'수시\s*(모집|논술)|수시모집',body):kinds.append('REGULAR_ADMISSION_ESSAY')
  r['body_exam_type_candidates']=kinds
  r['body_role_pages']={role:[p['page'] for p in pages if role in p.get('roles_present',[])] for role in ['exam_intent','scoring_criteria','example_answer','explanation']}
  r['question_marker_pages']=[{'page':p['page'],'markers':p['question_markers']} for p in pages if p.get('question_markers')]
  r['question_count']=None # markers include solutions, repeated headings and subquestions
  if '구술' in n or '면접' in n:r['verification_status']='OUTSIDE_ESSAY_SCOPE'
  elif r['in_scope'] is False:r['verification_status']='PRE_2001_DEFERRED'
  elif r['pdf_error']:r['verification_status']='PDF_REPAIR_REQUIRED'
  elif r['low_text_pages']:r['verification_status']='VISUAL_OR_OCR_REVIEW_REQUIRED'
  else:r['verification_status']='BODY_REVIEW_REQUIRED'
  # Conservative grouping for manual pair review only. Source prefixes retain year,
  # campus/track/session; plain missing identities are kept separate by file hash.
  prefix=n.split(' ',1)[0] if '_' not in n else n.split('_',1)[0]+'_'+n.split('_',1)[1].split(' ',1)[0]
  key=(r['catalog_source_id'],prefix) if u and '_' in n and r['academic_year'] else (r['catalog_source_id'],r['sha256'])
  groups[key].append(r)
 candidates=[]
 for key,items in groups.items():
  first=items[0]; files=sorted(set(r['sha256'] for r in items))
  candidates.append({'review_group_key':digest(json.dumps(key,ensure_ascii=False).encode()),'university_id':first['university_id'],'catalog_source_id':first['catalog_source_id'],'academic_year_candidate':first['academic_year'],'exam_type_candidates':sorted(set(k for r in items for k in r['body_exam_type_candidates']+([r['exam_type']] if r['exam_type'] else []))),'track_raw':first['track_raw'],'session_raw':first['session_raw'],'source_hashes':files,'exam_id':None,'question_ids':[],'question_markers':[{'source_sha256':r['sha256'],'pages':r['question_marker_pages']} for r in items],'material_links':[{'source_sha256':r['sha256'],'roles':r['body_role_pages']} for r in items],'version':'review-candidate-v1','verification_status':'NOT_AN_EVALUATION_PACKAGE','evaluation_allowed':False,'external_provider_transmission':'NOT_VERIFIED'})
 existing=json.loads(source.read_text());m=json.loads(manifest.read_text())
 if m['pdf_sha256'] != existing['pdf_sha256'] or m['essay_exam_id'] != existing['exam']['id']:
  raise ValueError('Existing manifest/source identity mismatch')
 matches=[r for r in rows if r['sha256']==existing['pdf_sha256']]
 reuse={'status':'EXACT_SOURCE_REUSED' if matches else 'SOURCE_NOT_FOUND','source_sha256':existing['pdf_sha256'],'university_id':existing['university']['id'],'exam_id':existing['exam']['id'],'academic_year':2025,'exam_type':'REGULAR_ADMISSION_ESSAY','track':existing['exam']['field_or_division'],'session':existing['exam']['session_label'],'existing_package_version':m['evidence_package_version'],'existing_package_sha256':m['package_sha256'],'existing_manifest_sha256':digest(manifest.read_bytes()),'source_matches':[{'zip':r['source_zip'],'member':r['normalized_member_name']} for r in matches],'question_ids':[],'questions':m['questions'],'evidence_locators':m['locators'],'db_question_rows':0,'runtime_activation':False,'external_provider_transmission':'NOT_VERIFIED','note':'Existing package reference retained, not regenerated. Question labels are NOT newly allocated DB IDs.'}
 counts=collections.Counter((r['catalog_source_id'],str(r['academic_year']),str(r['exam_type']),str(r['track_raw'])) for r in rows)
 summary=json.loads((root/'summary.json').read_text());summary.update({'universities_mapped':len(set(r['catalog_source_id'] for r in rows if r['catalog_source_id'])),'unmapped_occurrences':sum(r['catalog_source_id'] is None for r in rows),'review_groups':len(candidates),'reused_existing_packages':int(bool(matches)),'existing_question_structures_reused':len(m['questions']) if matches else 0,'new_verified_exams':0,'new_verified_questions':0,'verification_states':dict(collections.Counter(r['verification_status'] for r in rows))})
 for name,obj in [('inventory',rows),('review-candidates',candidates),('existing-skku-reconciliation',reuse),('summary',summary)]: (root/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
 with (root/'inventory-summary.csv').open('w') as f:
  w=csv.writer(f);w.writerow(['catalog_source_id','academic_year_candidate','exam_type_candidate','track_raw','pdf_occurrences']);w.writerows([list(k)+[v] for k,v in sorted(counts.items(),key=str)])
 print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__':
 os.umask(0o077);p=argparse.ArgumentParser()
 for n in ['root','catalog','existing-source','existing-manifest']:p.add_argument('--'+n,type=Path,required=True)
 a=p.parse_args();prepare(a.root,a.catalog,a.existing_source,a.existing_manifest)
