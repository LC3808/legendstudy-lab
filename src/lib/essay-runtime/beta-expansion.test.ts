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
  expect(betaExpansionCandidates).toHaveLength(204);
  for(const excluded of ['b98fd0c9-8a84-5747-a35c-25755312aede','a6667288-75ad-50d4-b237-d2a08e2bff8b','942c1c43-914f-5b99-9a30-e6474c363f6f'])expect(betaExpansionCandidates.some(e=>e.examId===excluded)).toBe(false);
  expect(betaExpansionCandidates.filter(e=>e.mode==='math')).toHaveLength(156);
  expect(betaExpansionCandidates.filter(e=>e.mode==='mixed')).toHaveLength(26);
  expect(betaExpansionCandidates.filter(e=>e.mode==='essay')).toHaveLength(17);
  expect(betaExpansionCandidates.filter(e=>e.mode==='essay').map(e=>e.examId)).toContain('1862463a-bf97-580a-ad33-694375db5d50');
  expect(new Set(betaExpansionCandidates.map(e=>e.universityId)).size).toBe(15);
  expect(new Set(betaExpansionCandidates.map(e=>e.examId)).size).toBe(betaExpansionCandidates.length);
  expect(betaExpansionCandidates.reduce((n,e)=>n+e.questionIds.length,0)).toBe(558);
  expect(betaExpansionCandidates.flatMap(e=>Object.values(e.mathQuestions))).toHaveLength(453);
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


it('admits Soongsil 2024 Q1 Q3 Q4 while preserving the full Registry and holding Q2',()=>{
 const e=betaExpansionCandidates.find(e=>e.examId==='fb89bcfe-ed40-5bc2-8a91-db9e935a5d43')!;
 const hold='815bc344-cdbb-5b7f-82c1-dc528de46f51';
 expect(e.catalogQuestionIds).toHaveLength(4);expect(e.catalogQuestionIds).toContain(hold);
 expect(e.questionIds).toHaveLength(3);expect(e.questionIds).not.toContain(hold);
 expect(e.mathQuestions[hold]).toBeUndefined();
 expect(expansionMathMatches(e,Object.entries(e.mathQuestions).map(([questionId,leafId])=>({examId:e.examId,questionId,leafId})))).toBe(true);
});

it('admits Dongguk 2026 mock Q1 only after the official corrected evidence connection',()=>{
 const e=betaExpansionCandidates.find(e=>e.examId==='324dbf82-b4bc-5607-977b-2cf512812212')!;
 const hold='49ea9aaa-1c46-51e7-b148-a03aef20ae4e';
 expect(e.catalogQuestionIds).toHaveLength(3);expect(e.catalogQuestionIds).toContain(hold);
 expect(e.questionIds).toHaveLength(3);expect(e.questionIds).toContain(hold);
 expect(e.mathQuestions[hold]).toBe('645d7b6a-2c7a-5a0e-9d34-0eead5c142e5');
 expect(expansionMathMatches(e,Object.entries(e.mathQuestions).map(([questionId,leafId])=>({examId:e.examId,questionId,leafId})))).toBe(true);
});

it('keeps SWU science in its explicit science route and outside quantitative admission',()=>{
 const e=betaExpansionCandidates.find(e=>e.examId==='3643b295-3b63-5b77-bd1b-d3ce68de4885')!;
 expect(e.mode).toBe('math'); expect(e.questionIds).toHaveLength(3);
 expect(expansionMathMatches(e,Object.entries(e.mathQuestions).map(([questionId,leafId])=>({examId:e.examId,questionId,leafId})))).toBe(true);
 for(const science of ['a16f832e-20b1-5ee3-b3dc-9e0973e7483c','ebb3dead-13e3-5e19-993f-0a7459431aec','c7ffdcd0-54fe-5c84-9a12-3df64985d2bc']){
  expect(betaExpansionCandidates.find(x=>x.examId===science)?.mode).toBe('science');
  expect(betaExpansionCandidates.find(x=>x.examId===science)?.mathQuestions).toEqual({});
  expect(betaExpansionFor(origin,{...env,ESSAY_PUBLIC_EXAMS:science,ESSAY_BETA_EXPANSION_EXAMS:science},science)?.mode).toBe('science');
 }
});


it('admits nine verified KAU leaves, including a partial exam, while three remaining HOLD leaves stay closed',()=>{
 const entries=betaExpansionCandidates.filter(e=>e.universityId==='881976e7-8e3d-53e3-8bd8-4ebe5d3a0445');
 expect(entries).toHaveLength(6); expect(entries.flatMap(e=>e.questionIds)).toHaveLength(9);
 const hold=['f0ae1ea0-6c50-5b7e-b42b-35f436849c6f','2476c8dc-a8e4-599a-8cf2-1ffdddbb6f06','8c11754b-d3af-56bf-9b66-d72092468f70'];
 for(const e of entries){
  const rows=Object.entries(e.mathQuestions).map(([questionId,leafId])=>({examId:e.examId,questionId,leafId}));
  expect(expansionMathMatches(e,rows)).toBe(true);
  expect(expansionMathMatches(e,rows.map(r=>({...r,leafId:'unapproved'})))).toBe(false);
  expect(e.questionIds.every(q=>!hold.includes(q))).toBe(true);
 }
 const partial=entries.find(e=>e.catalogQuestionIds)!;
 expect(partial.catalogQuestionIds).toEqual(['2476c8dc-a8e4-599a-8cf2-1ffdddbb6f06','ed096a20-52a7-5f27-a71b-4c7c2401cdc9']);
 expect(partial.questionIds).toEqual(['ed096a20-52a7-5f27-a71b-4c7c2401cdc9']);
});

it('adds 18 explicit science questions while keeping four KHU Math leaf routes and PDF bindings',()=>{
 const science=betaExpansionCandidates.filter(e=>e.mode==='science');
 expect(science).toHaveLength(5);
 expect(science.flatMap(e=>e.questionIds)).toHaveLength(22);
 expect(science.flatMap(e=>Object.keys(e.mathQuestions))).toHaveLength(4);
 for(const e of science){
  expect(e.questionIds.every(q=>!!studentPdfForExam(e.examId,q))).toBe(true);
  expect(betaExpansionFor(origin,{...env,ESSAY_PUBLIC_EXAMS:e.examId,ESSAY_BETA_EXPANSION_EXAMS:''},e.examId)).toBeUndefined();
  const rows=Object.entries(e.mathQuestions).map(([questionId,leafId])=>({examId:e.examId,questionId,leafId}));
  expect(expansionMathMatches(e,rows)).toBe(true);
 }
});
