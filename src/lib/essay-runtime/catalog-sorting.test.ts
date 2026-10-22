import {describe,it,expect} from 'vitest';
import {sortCatalog,servicePriority,type CatalogSortingEvidence,type CatalogSort} from './catalog-sorting';
import {publicCatalog,filterCatalog,type CatalogUniversity} from './public-discovery';
import {priorityUniversityIds,servicePreparingUniversityIds} from './catalog-policy';
const ids=(rows:CatalogUniversity[])=>rows.map(u=>u.sourceUniversityId);
const stats=(applicants:number|null,competitionRatio:number|null)=>({verificationStatus:'verified' as const,admissionYear:2027 as const,sourceUrl:'https://example.edu/admission',verifiedAt:'2026-09-18',applicants,competitionRatio});
describe('public catalog sorting',()=>{
 it('retains all42 universities/49offerings and puts the16 preparation universities last',()=>{
  const result=sortCatalog(publicCatalog.universities);
  expect(result).toHaveLength(42);expect(result.flatMap(u=>u.offerings)).toHaveLength(49);
  expect(new Set(ids(result.slice(-16)))).toEqual(new Set(servicePreparingUniversityIds));
 });
 it('uses Seoul then Korean alphabetical order and does not mutate the catalog',()=>{
  const before=JSON.stringify(publicCatalog);
  const sorted=sortCatalog(publicCatalog.universities);
  const active=sorted.filter(u=>servicePriority(u)===1);
  const seoul=active.filter(u=>u.offerings.some(o=>o.region==='서울'));
  const other=active.filter(u=>!u.offerings.some(o=>o.region==='서울'));
  expect(active).toEqual([...seoul,...other]);
  for(const rows of [seoul,other,sorted.filter(u=>servicePriority(u)===2)])
   expect(rows).toEqual([...rows].sort((a,b)=>a.name.localeCompare(b.name,'ko-KR')));
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
  expect(ids(sortCatalog(rows,'service',evidence))).toEqual(['skku','cau','gachon','kangnam']);
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

it('does not use applicant totals for the default order or override explicit HOLD',()=>{
 const rows=publicCatalog.universities;
 const evidence:CatalogSortingEvidence={statistics:{skku:stats(10000,30),gachon:stats(999999,90)}};
 expect(sortCatalog(rows,'service',evidence)).toEqual(sortCatalog(rows,'service'));
 expect(servicePriority(rows.find(u=>u.sourceUniversityId==='yonsei')!,{evaluationReadyIds:new Set(['yonsei'])})).toBe(2);
});
