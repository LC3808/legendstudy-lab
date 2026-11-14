import {describe,it,expect} from 'vitest';
import {feedbackSubject} from './lab-navigation';
const run='00000000-0000-4000-8000-000000000001',question='00000000-0000-4000-8000-000000000002';
describe('feedback identity links',()=>{
 it('accepts exact persisted UUID pair or canonical evaluation reference',()=>{
  expect(feedbackSubject({run_id:run,question_id:question})).toEqual({runId:run,questionId:question});
  expect(feedbackSubject({evaluation_ref:run+'/'+question})).toEqual({runId:run,questionId:question});
 });
 it('rejects conflicting or unavailable relationships',()=>{
  for(const row of [{evaluation_ref:'someone@example.com'},{run_id:run},{evaluation_ref:run+'/'+question+'/extra'},{run_id:question,question_id:question,evaluation_ref:run+'/'+question}])expect(feedbackSubject(row)).toBeNull();
 });
});
