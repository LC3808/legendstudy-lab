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
 const run=structuredClone(fixture.before) as any;
 const d=run.result.questions[0].evaluation.dimensions[0];
 d.evidence_ids=['e1','e1','e2'];
 expect(examReports(run)[0].evidenceLabels).toEqual(['Reasoning — Needs connection (저장된 근거 참조 2개)']);
 d.criterion_id='unknown';expect(examReports(run)[0].evidenceLabels).toEqual([]);
 d.criterion_id='criterion';d.evidence_ids=[];expect(examReports(run)[0].evidenceLabels).toEqual([]);
});
