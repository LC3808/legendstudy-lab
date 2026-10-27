import {describe,it,expect} from 'vitest';
import {questionSupportsImages} from './input-mode';
import {examLaunchHold} from './launch-policy';
describe('input capability independent of launch approval',()=>{
 it('restores held Inha math images',()=>expect(questionSupportsImages('3e2526ee-14af-5c47-a5fc-76b70cc5bf8c','3be9ca31-73ca-56d4-909f-2bc07d5a6991')).toBe(true));
 it('holds KAU engineering while allowing image drafts',()=>{
 expect(examLaunchHold('6815943a-42c1-5eae-b711-449ac403b9fb')).toBe('NATURAL_MATH_HOLD');
 expect(questionSupportsImages('6815943a-42c1-5eae-b711-449ac403b9fb','6eaec5d3-4786-55a2-8dc6-a457edd5b16b')).toBe(true);
 });
 it('does not transfer capability between exams or infer unknown questions',()=>{
 expect(questionSupportsImages('another-exam','3be9ca31-73ca-56d4-909f-2bc07d5a6991')).toBe(false);
 expect(questionSupportsImages('3e2526ee-14af-5c47-a5fc-76b70cc5bf8c','unknown')).toBe(false);
 });
});

import audit from '../../../scripts/audits/essay-input-registry-20261027.json';
import {questionInputMode} from './input-mode';
describe('complete Production Registry input contract audit',()=>{
 it('covers every recorded question with a known exact exam/question pair',()=>{
  expect(audit.items).toHaveLength(1014);
  expect(new Set(audit.items.map(q=>q.questionId)).size).toBe(1014);
  for(const q of audit.items){
   expect(questionInputMode(q.examId,q.questionId),q.questionKey).toBe(q.mode);
   expect(questionSupportsImages(q.examId,q.questionId),q.questionKey).toBe(q.mode==='image');
   expect(questionInputMode('wrong-exam',q.questionId)).toBe('unknown');
   // Stale metadata must not override the verified per-question input contract.
   expect(questionInputMode(q.examId,q.questionId,q.mode==='image'?'text':'image')).toBe(q.mode);
  }
  expect(audit.items.filter(q=>q.mode==='image')).toHaveLength(483);
  expect(audit.items.filter(q=>q.mode==='text')).toHaveLength(531);
 });
 it('does not silently classify future unverified records as TEXT',()=>{
  expect(questionInputMode('new-exam','new-question')).toBe('unknown');
 });
 it('retains different input modes within mixed exams',()=>{
  for(const prefix of ['source:konkuk-2025-mock-free-major:','source:soongsil-2026-admission-business:']){
   const questions=audit.items.filter(q=>q.questionKey.startsWith(prefix));
   expect(new Set(questions.map(q=>questionInputMode(q.examId,q.questionId)))).toEqual(new Set(['text','image']));
  }
 });
});
