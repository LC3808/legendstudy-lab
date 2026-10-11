import {describe,it,expect} from 'vitest';
import {sortCatalog,servicePriority,type CatalogSortingEvidence,type CatalogSort} from './catalog-sorting';
import {publicCatalog,filterCatalog,type CatalogUniversity} from './public-discovery';
import {priorityUniversityIds} from './catalog-policy';
const ids=(rows:CatalogUniversity[])=>rows.map(u=>u.sourceUniversityId);
const stats=(applicants:number|null,competitionRatio:number|null)=>({verificationStatus:'verified' as const,admissionYear:2027 as const,sourceUrl:'https://example.edu/admission',verifiedAt:'2026-09-18',applicants,competitionRatio});
describe('public catalog sorting',()=>{
 it('retains42 universities/49offerings; prioritizes exactly Owner22, keeps Busan/Kyungpook and defers Kangnam/Eulji',()=>{
  const result=sortCatalog(publicCatalog.universities);
  expect(new Set(ids(result.slice(0,22)))).toEqual(new Set(priorityUniversityIds));
  expect(result).toHaveLength(42);expect(result.flatMap(u=>u.offerings)).toHaveLength(49);
  expect(ids(result.slice(-2))).toEqual(['kangnam','eulji']);
  expect(ids(result)).toContain('knu');expect(ids(result)).toContain('pnu');
 });
 it('keeps original data immutable and uses Owner order for unknown priority statistics and alphabetical names for the remaining cohorts',()=>{
  const before=JSON.stringify(publicCatalog);
  const sorted=sortCatalog(publicCatalog.universities);
  expect(ids(sorted.slice(0,22))).toEqual([...priorityUniversityIds]);
  for(const group of [2,3,4]){
   const rows=sorted.filter(u=>servicePriority(u)===group);
   expect(rows).toEqual([...rows].sort((a,b)=>a.name.localeCompare(b.name,'ko-KR')));
  }
  expect(JSON.stringify(publicCatalog)).toBe(before);
 });
 it('applies every sort after search, region/type/year filters without losing matching records',()=>{
  for(const args of [['','','',''],['강남','','',''],['을지','','',''],['','서울','',''],['','','수리','2027'],['','경기·인천','인문','2027']]){
   const rows=filterCatalog(...args as [string,string,string,string]);
   for(const sort of ['service','applicants','competition','name'] as CatalogSort[])expect(new Set(ids(sortCatalog(rows,sort)))).toEqual(new Set(ids(rows)));
   const groups=sortCatalog(rows).map(u=>servicePriority(u));expect(groups).toEqual([...groups].sort((a,b)=>a-b));
  }
 });
 it('uses verified totals descending, nulls last; competition/name choices are independent of service groups',()=>{
  const rows=publicCatalog.universities.filter(u=>['gachon','cau','skku','kangnam'].includes(u.sourceUniversityId));
  const evidence:CatalogSortingEvidence={statistics:{gachon:stats(30000,20),cau:stats(20000,40),skku:stats(null,null),kangnam:stats(40000,30)}};
  expect(ids(sortCatalog(rows,'service',evidence))).toEqual(['gachon','cau','skku','kangnam']);
  expect(ids(sortCatalog(rows,'applicants',evidence))).toEqual(['kangnam','gachon','cau','skku']);
  expect(ids(sortCatalog(rows,'competition',evidence))).toEqual(['cau','kangnam','gachon','skku']);
  expect(ids(sortCatalog(rows,'name',evidence))).toEqual(['gachon','kangnam','skku','cau']);
 });
 it('does not infer readiness from priority or question IDs; only supplied gate-approved readiness ranks first',()=>{
  expect(sortCatalog(publicCatalog.universities).some(u=>servicePriority(u)===0)).toBe(false);
  const evidence:CatalogSortingEvidence={evaluationReadyIds:new Set(['catholic'])};
  expect(sortCatalog(publicCatalog.universities,'service',evidence)[0].sourceUniversityId).toBe('catholic');
 });
 it('keeps classification stable when filtering removes a Seoul offering',()=>{
  const university=publicCatalog.universities.find(u=>!priorityUniversityIds.includes(u.sourceUniversityId as typeof priorityUniversityIds[number])&&u.offerings.some(o=>o.region==='서울'))!;
  expect(servicePriority({...university,offerings:[]})).toBe(servicePriority(university));
 });
 it('ignores invalid statistics and never fabricates current numbers',()=>{
  expect(publicCatalog.universities.flatMap(u=>u.offerings.flatMap(o=>o.admissionDetails??[])).every(d=>d.applicants===null&&d.competitionRatio===null)).toBe(true);
  const rows=publicCatalog.universities;
  expect(sortCatalog(rows,'applicants',{statistics:{cau:{...stats(999999,5),sourceUrl:''}}})).toEqual(sortCatalog(rows,'service'));
 });
});

it('uses verified totals before Owner fallback without mistaking development priority for service availability',()=>{
 const rows=publicCatalog.universities;
 const evidence:CatalogSortingEvidence={statistics:{skku:stats(10000,30),cau:stats(null,null)}};
 expect(ids(sortCatalog(rows,'service',evidence)).slice(0,3)).toEqual(['skku','gachon','cau']);
 expect(ids(sortCatalog(rows,'service')).slice(0,3)).toEqual(['gachon','cau','skku']);
});
