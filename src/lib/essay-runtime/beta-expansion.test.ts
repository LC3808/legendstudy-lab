import {describe,it,expect} from 'vitest';
import {betaExpansionCandidates,betaExpansionFor,expansionMathMatches} from './beta-expansion';
import {studentPdfForExam} from '../materials/student-asset';
const candidate=betaExpansionCandidates.find(e=>e.mode==='math')!;
const origin='https://lab.legendstudy.com';
const env={MATH_ORIGIN:origin,MATH_PROJECT_REF:'stlhijzpjfgwwdgunlsd',MATH_SUPABASE_URL:'https://stlhijzpjfgwwdgunlsd.supabase.co',ESSAY_PUBLIC_EXAMS:candidate.examId,ESSAY_BETA_EXPANSION_EXAMS:candidate.examId};
describe('explicit existing Registry expansion',()=>{
 it('requires exact project, host, public scope and activation scope',()=>{
  expect(betaExpansionFor(origin,env,candidate.examId)).toEqual(candidate);
  for(const change of [{ESSAY_BETA_EXPANSION_EXAMS:''},{ESSAY_BETA_EXPANSION_EXAMS:'*'},{ESSAY_BETA_EXPANSION_EXAMS:candidate.examId+',invalid'},{ESSAY_PUBLIC_EXAMS:''},{MATH_PROJECT_REF:'kpqbedylxlyntrrfybpn'},{MATH_SUPABASE_URL:'https://foreign.example'}])expect(betaExpansionFor(origin,{...env,...change},candidate.examId)).toBeUndefined();
  expect(betaExpansionFor('https://preview.example',env,candidate.examId)).toBeUndefined();
 });
 it('pins every complete question and official PDF without adding the TEST-only natural exam',()=>{
  expect(betaExpansionCandidates).toHaveLength(16);
  expect(betaExpansionCandidates.some(e=>e.examId==='b98fd0c9-8a84-5747-a35c-25755312aede')).toBe(false);
  expect(betaExpansionCandidates.flatMap(e=>Object.values(e.mathQuestions))).toHaveLength(46);
  for(const e of betaExpansionCandidates){
   expect(e.packageDigest).toMatch(/^[a-f0-9]{64}$/);
   expect(e.questionIds.every(q=>!!studentPdfForExam(e.examId,q))).toBe(true);
   if(e.mode==='math')expect(Object.keys(e.mathQuestions).sort()).toEqual([...e.questionIds].sort());
  }
 });
 it('does not admit a truncated catalog, duplicate mapping or foreign leaf',()=>{
  const rows=Object.entries(candidate.mathQuestions).map(([questionId,leafId])=>({examId:candidate.examId,questionId,leafId}));
  expect(expansionMathMatches(candidate,rows)).toBe(true);
  expect(expansionMathMatches(candidate,rows.slice(1))).toBe(false);
  expect(expansionMathMatches(candidate,[...rows,rows[0]])).toBe(false);
  expect(expansionMathMatches(candidate,rows.map(r=>({...r,leafId:'other'})))).toBe(false);
 });
});
