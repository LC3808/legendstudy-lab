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
  expect(betaExpansionCandidates).toHaveLength(42);
  for(const excluded of ['b98fd0c9-8a84-5747-a35c-25755312aede','a6667288-75ad-50d4-b237-d2a08e2bff8b','942c1c43-914f-5b99-9a30-e6474c363f6f'])expect(betaExpansionCandidates.some(e=>e.examId===excluded)).toBe(false);
  expect(betaExpansionCandidates.filter(e=>e.mode==='math')).toHaveLength(15);
  expect(betaExpansionCandidates.filter(e=>e.mode==='mixed')).toHaveLength(26);
  expect(betaExpansionCandidates.filter(e=>e.mode==='essay').map(e=>e.examId)).toEqual(['1862463a-bf97-580a-ad33-694375db5d50']);
  expect(new Set(betaExpansionCandidates.map(e=>e.universityId)).size).toBe(6);
  expect(new Set(betaExpansionCandidates.map(e=>e.examId)).size).toBe(betaExpansionCandidates.length);
  expect(betaExpansionCandidates.reduce((n,e)=>n+e.questionIds.length,0)).toBe(110);
  expect(betaExpansionCandidates.flatMap(e=>Object.values(e.mathQuestions))).toHaveLength(71);
  for(const e of betaExpansionCandidates){
   expect(new Set(e.questionIds).size).toBe(e.questionIds.length);
   expect(Object.keys(e.mathQuestions).every(q=>e.questionIds.includes(q))).toBe(true);
   if(e.mode==='mixed')expect(Object.keys(e.mathQuestions).length).toBeLessThan(e.questionIds.length);
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
