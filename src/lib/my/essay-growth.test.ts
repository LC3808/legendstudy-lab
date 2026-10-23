import {it, expect} from 'vitest';
import {summarizeGrowth} from './essay-growth';
import type {EssaySummary} from './essay-summary';
import type {DimensionPoint} from './contract';

const base: Omit<DimensionPoint, 'evaluationId' | 'attemptId' | 'submittedAt' | 'level'> = {
 questionId: 'q1', criterionId: 'c1', definitionVersion: 'v1', questionMetadataVersion: 'v1', regimeKey: 'r1',
 evaluationVersion: 'v1', contractVersion: 'v1', evidenceManifest: 'hash', status: 'completed', requestKind: 'student',
 invalidatedAt: null, completedAt: '2026-10-09T02:00:00Z', supersedesEvaluationId: null,
};
const point = (over: Partial<DimensionPoint>): DimensionPoint => ({...base, evaluationId: 'e1', attemptId: 'a1', submittedAt: '2026-10-09T00:00:00Z', level: 2, ...over});
const session = (over: Partial<EssaySummary['sessions'][number]> = {}): EssaySummary['sessions'][number] => ({
 id: 's1', universityId: 'u1', universityName: '연세대학교', admissionYear: 2027, questionId: 'q1', questionLabel: '문제 1', attemptCount: 1, latestActivity: '2026-10-09T00:00:00Z', ...over,
});
const summary = (over: Partial<EssaySummary> = {}): EssaySummary => ({sessions: [], points: [], hasMoreSessions: false, hasMoreEvaluations: false, ...over});

it('reports an empty record as the no-history state without inventing counts', () => {
 expect(summarizeGrowth(summary())).toMatchObject({status: 'none', universitiesPracticed: 0, initialEvaluations: 0, reEvaluations: 0, comparison: null});
});

it('treats a submitted but not-yet-completed record as in progress, not complete', () => {
 const g = summarizeGrowth(summary({sessions: [session()], points: [point({status: 'processing', completedAt: null})]}));
 expect(g.status).toBe('in-progress');
 expect(g.initialEvaluations).toBe(0);
});

it('counts one 최초 per question and excludes invalidated results', () => {
 const g = summarizeGrowth(summary({
  sessions: [session()],
  points: [point({evaluationId: 'e1', attemptId: 'a1', level: 3}), point({evaluationId: 'bad', attemptId: 'a9', invalidatedAt: '2026-10-09T05:00:00Z', level: 5})],
 }));
 expect(g).toMatchObject({status: 'initial-only', initialEvaluations: 1, reEvaluations: 0, recentStage: 'initial', comparison: null});
});

it('compares only the same-context first and rewrite levels and keeps the real direction', () => {
 const g = summarizeGrowth(summary({
  sessions: [session({attemptCount: 2})],
  points: [
   point({evaluationId: 'e1', attemptId: 'a1', criterionId: 'c1', submittedAt: '2026-10-09T00:00:00Z', level: 2}),
   point({evaluationId: 'e1', attemptId: 'a1', criterionId: 'c2', submittedAt: '2026-10-09T00:00:00Z', level: 4}),
   point({evaluationId: 'e2', attemptId: 'a2', criterionId: 'c1', submittedAt: '2026-10-09T03:00:00Z', level: 4}),
   point({evaluationId: 'e2', attemptId: 'a2', criterionId: 'c2', submittedAt: '2026-10-09T03:00:00Z', level: 3}),
  ],
 }));
 expect(g.status).toBe('reevaluated');
 expect(g.initialEvaluations).toBe(1);
 expect(g.reEvaluations).toBe(1);
 expect(g.recentStage).toBe('reeval');
 expect(g.comparison).toEqual({improved: 1, unchanged: 0, declined: 1, pairs: 2, bestDelta: 2});
});

it('flags practice across several universities when none has a rewrite comparison yet', () => {
 const g = summarizeGrowth(summary({
  sessions: [session({id: 's1', universityId: 'u1', questionId: 'q1', universityName: '연세대학교'}), session({id: 's2', universityId: 'u2', questionId: 'q2', universityName: '고려대학교', latestActivity: '2026-10-10T00:00:00Z'})],
  points: [point({questionId: 'q1', evaluationId: 'e1', attemptId: 'a1'}), point({questionId: 'q2', evaluationId: 'e2', attemptId: 'a2'})],
 }));
 expect(g.status).toBe('multi');
 expect(g.universitiesPracticed).toBe(2);
 expect(g.recentUniversity).toBe('고려대학교');
 expect(g.comparison).toBeNull();
});
