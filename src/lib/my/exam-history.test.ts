import {describe,it,expect} from 'vitest';
import fixture from './exam-history.fixture.json';
import {examReports} from './exam-history';
import {compareReports} from './evaluation-report';
describe('stored exam results use existing approved report',()=>{
 it('matches Native fixture identity, stars, advice and rewrite pins',()=>{
  const before=examReports(fixture.before)[0],after=examReports(fixture.after)[0];
  expect(after.priorId).toBe(before.id);expect(after.answer).toBe('Rewritten answer');
  expect(after.rubric[0].name).toBe('Reasoning');expect(after.rubric[0].stars).toBe(3);
  expect(after.actions).toEqual(['Add reason']);expect(compareReports(before,after)?.[0].direction).toBe('IMPROVED');
 });
});

it('shows only saved criterion judgments with evidence references, without inventing source text',()=>{
 const run=structuredClone(fixture.before) as typeof fixture.before & {result:{questions:{evaluation:{dimensions:{evidence_ids?:string[]}[]}}[]}};
 const d=run.result.questions[0].evaluation.dimensions[0];
 d.evidence_ids=['e1','e1','e2'];
 expect(examReports(run)[0].evidenceLabels).toEqual(['Reasoning — Needs connection']);
 d.criterion_id='unknown';expect(examReports(run)[0].evidenceLabels).toEqual([]);
 d.criterion_id='criterion';d.evidence_ids=[];expect(examReports(run)[0].evidenceLabels).toEqual([]);
});

it.each(['missing','duplicate','foreign','missing-answer','pinned-mismatch','empty'])('rejects completed parents with %s children',kind=>{
 const run:Record<string,unknown>=structuredClone(fixture.before);
 const questions=(run.result as {questions:Record<string,unknown>[]}).questions;
 if(kind==='missing')questions.length=0;
 if(kind==='duplicate')questions.push({...questions[0]});
 if(kind==='foreign')questions[0].questionId='foreign';
 if(kind==='missing-answer')run.answers=[];
 if(kind==='pinned-mismatch')run.question_ids=['other'];
 if(kind==='empty'){run.answers=[];questions.length=0;}
 expect(()=>examReports(run)).toThrow('INVALID_EXAM_RESULT');
});
it('keeps historical partial submissions valid without claiming full exam coverage',()=>{
 expect(examReports({...fixture.before,question_ids:['question']})).toHaveLength(1);
 expect(examReports({...fixture.before,state:'processing'})).toEqual([]);
});
