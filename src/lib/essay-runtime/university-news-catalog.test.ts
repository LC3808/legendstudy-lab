import {describe,it,expect} from 'vitest';
import {universityNewsCatalog} from './university-news-catalog';
import {publicCatalog} from './public-discovery';
describe('shared university news catalog',()=>{
 it('preserves every source identity without name guessing',()=>{
  const x=universityNewsCatalog();
  expect(x.universities).toHaveLength(42);
  for(const u of publicCatalog.universities){
   const actual=x.universities.find(v=>v.sourceUniversityId===u.sourceUniversityId)!;
   expect(actual.universityId).toBe(u.universityId);
   expect(actual.identityStatus).toBe(u.universityId?'MAPPED':'UNMAPPED');
  }
 });
 it('preserves date/time wording, source status and academic year',()=>{
  const x=universityNewsCatalog();
  for(const u of publicCatalog.universities)for(const o of u.offerings)for(const d of o.admissionDetails??[]){
   const actual=x.universities.find(v=>v.sourceUniversityId===u.sourceUniversityId)!.offerings.find(v=>v.id===`${o.id}:${d.sourceId}`)!;
   expect(actual.examDateText).toBe(d.facts.exam_date??null);
   expect(actual.examTimeText).toBe(d.facts.exam_time??null);
   expect(actual.academicYear).toBe(o.admissionYear);
   expect(actual.sourceStatus).toBe(d.sourceStatus);
   if(!d.facts.exam_date)expect(actual.scheduleStatus).toBe('UNCONFIRMED');
  }
 });
 it('does not leak account or application data',()=>{
  expect(JSON.stringify(universityNewsCatalog())).not.toMatch(/user_id|student_applications|email/);
 });
});
