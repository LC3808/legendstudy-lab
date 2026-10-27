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
