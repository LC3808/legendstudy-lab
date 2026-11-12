import {describe,it,expect} from 'vitest';
import sources from '../../data/essay-source-registry.json';
import pdfs from '../../data/essay-student-pdf-candidates.json';
import scope from '../../../scripts/deployment/ewha-pdf-scope.json';
import {betaExpansionCandidates,betaExpansionFor,expansionMathMatches} from './beta-expansion';
import {studentPdfForExam,studentPdf} from '../materials/student-asset';
const origin='https://lab.legendstudy.com';
const env={MATH_ORIGIN:origin,MATH_PROJECT_REF:'stlhijzpjfgwwdgunlsd',MATH_SUPABASE_URL:'https://stlhijzpjfgwwdgunlsd.supabase.co',ESSAY_PUBLIC_EXAMS:scope.exams.map(e=>e.examId).join(','),ESSAY_BETA_EXPANSION_EXAMS:scope.exams.map(e=>e.examId).join(',')};
describe('Ewha official admission 21 exams / 63 questions',()=>{
 it('preserves canonical source identity, order and existing mock Registry',()=>{
  expect(scope.exams).toHaveLength(21);expect(scope.exams.flatMap(e=>e.questionIds)).toHaveLength(63);
  expect(scope.excludedMockExamIds).toHaveLength(8);expect(scope.excludedMockQuestionIds).toHaveLength(24);
  const university=sources.exams.filter(e=>e.sourceUniversityId==='ewha');
  expect(university).toHaveLength(22);
  for(const exam of scope.exams){
   const matches=university.filter(e=>e.dbExamId===exam.examId);expect(matches).toHaveLength(1);
   const source=matches[0];expect(source.universityId).toBe(scope.universityId);expect(source.kind).toBe('admission');expect(source.year).toBe(exam.year);expect(source.track).toBe(exam.track);
   expect(source.questions.map(q=>q.dbQuestionId)).toEqual(exam.questionIds);
   expect(source.questions.map(q=>q.inputMode)).toEqual(Array(3).fill(exam.mode==='math'?'image':'text'));
   expect(source.sourceHashes).toEqual([exam.problemSha256,exam.solutionSha256]);
  }
  expect(university.filter(e=>e.kind==='mock')).toEqual(scope.preservedSourceMetadata);
  expect(scope.existingMockExamIds).toEqual(['c15360f1-571e-5fa4-8314-dde3022f9594']);
 });
 it('admits the exact Math 27 and Essay 36 through existing activation gates',()=>{
  const candidates=betaExpansionCandidates.filter(e=>e.universityId===scope.universityId);
  expect(candidates).toHaveLength(21);expect(candidates.filter(e=>e.mode==='math').flatMap(e=>e.questionIds)).toHaveLength(27);expect(candidates.filter(e=>e.mode==='essay').flatMap(e=>e.questionIds)).toHaveLength(36);
  for(const exam of scope.exams){
   const entry=betaExpansionFor(origin,env,exam.examId)!;expect(entry).toBeDefined();expect(entry.questionIds).toEqual(exam.questionIds);expect(entry.mode).toBe(exam.mode);expect(entry.packageDigest).toMatch(/^[a-f0-9]{64}$/);
   if(entry.mode==='math')expect(expansionMathMatches(entry,Object.entries(entry.mathQuestions).map(([questionId,leafId])=>({examId:exam.examId,questionId,leafId})))).toBe(true);
   else expect(entry.mathQuestions).toEqual({});
   expect(betaExpansionFor(origin,{...env,ESSAY_PUBLIC_EXAMS:''},exam.examId)).toBeUndefined();
   expect(betaExpansionFor('https://preview.example',env,exam.examId)).toBeUndefined();
  }
  for(const excluded of scope.excludedMockExamIds)expect(candidates.some(e=>e.examId===excluded)).toBe(false);
 });
 it('uses only the 21 unmodified question PDFs and never publishes official answers',()=>{
  const qids=scope.exams.flatMap(e=>e.questionIds);const rows=pdfs.questions.filter(q=>qids.includes(q.questionId));expect(rows).toHaveLength(63);expect(new Set(rows.map(r=>r.assetId)).size).toBe(21);
  for(const exam of scope.exams)for(const qid of exam.questionIds){
   const pdf=studentPdfForExam(exam.examId,qid)!;expect(pdf).not.toBeNull();expect(pdf.assetId).toBe(exam.problemSha256);expect(pdf.sha256).toBe(exam.problemSha256);expect(pdf.bucket).toBe('essay-material-originals');expect(pdf.startPage).toBeGreaterThanOrEqual(1);expect(pdf.startPage).toBeLessThanOrEqual(pdf.pageCount);
   expect(studentPdfForExam('foreign-exam',qid)).toBeNull();expect(studentPdf({...pdf,assetId:exam.solutionSha256,sha256:exam.solutionSha256},qid)).toBeNull();expect(studentPdf({...pdf,startPage:pdf.pageCount+1},qid)).toBeNull();
  }
  expect(rows.some(r=>scope.exams.some(e=>e.solutionSha256===r.assetId))).toBe(false);
  for(const qid of scope.excludedMockQuestionIds)expect(rows.some(r=>r.questionId===qid)).toBe(false);
 });
});
