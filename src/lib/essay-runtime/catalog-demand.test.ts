import {it,expect} from 'vitest';
import research from '../../../data/research/essay-demand-2027.json';
import projection from '@/data/essay-catalog-demand.json';
import {publicCatalog,filterCatalog} from './public-discovery';
import {priorityUniversityIds,preparationUniversityIds} from './catalog-policy';
import {sortCatalog,catalogSortingEvidence} from './catalog-sorting';

it('joins44 research rows to42 canonical universities, keeping two campus records distinct',()=>{
 expect(research.records).toHaveLength(44);
 expect(new Set(research.records.map(r=>r.sourceUniversityId)).size).toBe(42);
 expect(new Set(research.records.map(r=>r.sourceRecord)).size).toBe(44);
 for(const r of research.records){
  const u=publicCatalog.universities.find(u=>u.sourceUniversityId===r.sourceUniversityId)!;
  expect(u).toBeDefined();expect(r.universityId).toBe(u.universityId);
  expect(r.admissionYear).toBe(2027);
  for(const id of r.offeringIds)expect(u.offerings.some(o=>o.id===id)).toBe(true);
 }
 const campus=research.records.filter(r=>r.scope==='explicit_campus');
 expect(campus.map(r=>[r.sourceUniversityId,r.campus])).toEqual([['korea','세종캠퍼스'],['yonsei','미래캠퍼스']]);
 expect(campus.every(r=>r.offeringIds.length===1)).toBe(true);
 expect(projection.universities.korea.sourceRecords).toHaveLength(2);
 expect(projection.universities.yonsei.sourceRecords).toHaveLength(2);
});
it('retains original research claims and provenance without promoting any number to verified statistics',()=>{
 expect(research.source.sha256).toBe('5bac5decaf773096df341f1037154c0748f1f2f667d4f29087e10d4cdc001efb');
 expect(research.source.verification).toContain('미대조');
 expect(research.records.every(r=>r.verificationStatus==='unverified'&&r.officialVerification===null)).toBe(true);
 for(const r of research.records)expect(r.reportedCompetitionRatio).toBeCloseTo(r.reportedApplicants/r.reportedIntake,8);
 expect(Object.values(projection.universities).every(r=>r.applicants===null&&r.competitionRatio===null)).toBe(true);
 expect(Object.keys(catalogSortingEvidence.statistics??{})).toHaveLength(0);
 expect(JSON.stringify(projection)).not.toContain('reportedApplicants');
});
it('keeps Owner22 policy separate from research ranks; preserves30/42/49 and stable filtered order',()=>{
 expect(priorityUniversityIds).toHaveLength(22);expect(preparationUniversityIds).toHaveLength(30);
 expect(publicCatalog.universities).toHaveLength(42);expect(publicCatalog.universities.flatMap(u=>u.offerings)).toHaveLength(49);
 expect(sortCatalog(publicCatalog.universities).slice(0,22).map(u=>u.sourceUniversityId)).toEqual([...priorityUniversityIds]);
 expect(sortCatalog(filterCatalog('','서울','','')).filter(u=>priorityUniversityIds.includes(u.sourceUniversityId as typeof priorityUniversityIds[number])).map(u=>u.sourceUniversityId))
  .toEqual(priorityUniversityIds.filter(id=>filterCatalog('','서울','','').some(u=>u.sourceUniversityId===id)));
 expect(sortCatalog(publicCatalog.universities,'name').slice(0,3).map(u=>u.sourceUniversityId)).toEqual(['gachon','catholic','kangnam']);
});
