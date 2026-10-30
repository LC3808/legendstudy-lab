import {describe,it,expect} from 'vitest';
import {sourceExams,sourceCoverage} from './source-registry';
import registry from '@/data/essay-source-registry.json';
import catalog from '@/data/essay-public-catalog.json';
import assets from '@/data/essay-student-pdf-candidates.json';
describe('reviewed source metadata and runtime boundary',()=>{
 it('connects all 21 source universities using the existing catalog identity',()=>{
  expect(sourceCoverage).toHaveLength(21);
  for(const row of sourceCoverage){const u=catalog.universities.find(u=>u.sourceUniversityId===row.sourceUniversityId);expect(u).toBeDefined();expect(sourceExams(row.sourceUniversityId).length).toBeGreaterThan(0);for(const e of sourceExams(row.sourceUniversityId))expect(e.universityId).toBe(u?.universityId);}
 });
 it('does not manufacture canonical question UUIDs or turn on evaluation from metadata',()=>{
  expect(new Set(registry.exams.map(e=>e.key)).size).toBe(registry.exams.length);
  for(const e of registry.exams){expect(e.evaluationReady).toBe(false);expect(e.sourceHashes.length).toBeGreaterThan(0);expect(e.questions.length).toBeGreaterThan(0);expect(new Set(e.questions.map(q=>q.key)).size).toBe(e.questions.length);for(const q of e.questions){if(q.dbQuestionId!==null){expect(q.dbQuestionId).toMatch(/^[0-9a-f-]{36}$/);if(q.dbQuestionId==='4cbe8b69-2ccc-5c4e-9e77-0644f90e2cde'){expect(e.sourceUniversityId).toBe('hanyang');expect(e.dbExamId).toBe('345d3caa-3438-58c3-8f80-62a6242179ec');expect('studentPdf' in q&&q.studentPdf).toBeTruthy();}else expect(assets.questions.some(a=>a.examId===e.dbExamId&&a.questionId===q.dbQuestionId&&a.verification==='VERIFIED')).toBe(true);}}}
 });
 it('retains verified mock/admission, campus, subquestion and session distinctions',()=>{
  expect(sourceExams('yonsei').find(e=>e.year===2027)?.kind).toBe('mock');
  expect(sourceExams('hongik').find(e=>e.year===2025)?.campus).toBe('세종');
  expect(sourceExams('hanyang').find(e=>e.year===2024&&e.track==='자연계열')?.questions).toHaveLength(2);
  expect(sourceExams('sookmyung')[0].questions.map(q=>q.label)).toEqual(['문제 1-1','문제 1-2','문제 2-1','문제 2-2']);
  expect(sourceExams('inha').every(e=>e.session==='오후')).toBe(true);
  const cau=sourceExams('cau').filter(e=>e.year===2025&&e.track==='인문사회');expect(new Set(cau.map(e=>e.kind)).size).toBe(2);
 });
});
