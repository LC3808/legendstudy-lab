import {comparableDimensionDelta, type DimensionPoint} from './contract';
import type {EssaySummary} from './essay-summary';

/**
 * 나의 논술 성장 — presentation summary, derived only from `my_essay_summary`.
 *
 * This file never reads, writes or re-evaluates anything: it folds the already
 * fetched, fail-closed `EssaySummary` into the handful of honest facts the MY
 * growth card shows. Every count is a real completed student evaluation, and the
 * only level comparison is the strict same-context gate `comparableDimensionDelta`
 * already enforces, so a declining or unchanged result is reported as it happened.
 * Criterion names are intentionally absent here — `my_essay_summary` carries no
 * criterion label, so the card shows improvement counts and links to the detail view for
 * the named breakdown rather than inventing a label.
 */
export type GrowthStatus = 'none' | 'in-progress' | 'initial-only' | 'reevaluated' | 'multi';
export type GrowthComparison = {improved: number; unchanged: number; declined: number; pairs: number; bestDelta: number | null};
export type GrowthSummary = {
 status: GrowthStatus;
 universitiesPracticed: number;
 initialEvaluations: number;
 reEvaluations: number;
 recentUniversity: string | null;
 recentStage: 'initial' | 'reeval' | null;
 comparison: GrowthComparison | null;
};

type EvalGroup = {
 evaluationId: string; questionId: string; attemptId: string; submittedAt: string;
 completedAt: string | null; invalidatedAt: string | null; status: string; requestKind: string;
 points: DimensionPoint[];
};

/** A real, trustworthy result: a completed, non-invalidated, student-requested evaluation. */
function isValidCompleted(e: EvalGroup) {
 return e.status === 'completed' && !e.invalidatedAt && e.requestKind === 'student' && !!e.completedAt;
}

function groupEvaluations(points: DimensionPoint[]): EvalGroup[] {
 const map = new Map<string, EvalGroup>();
 for (const p of points) {
  let g = map.get(p.evaluationId);
  if (!g) {
   g = {evaluationId: p.evaluationId, questionId: p.questionId, attemptId: p.attemptId, submittedAt: p.submittedAt,
    completedAt: p.completedAt, invalidatedAt: p.invalidatedAt, status: p.status, requestKind: p.requestKind, points: []};
   map.set(p.evaluationId, g);
  }
  g.points.push(p);
 }
 return [...map.values()];
}

export function summarizeGrowth(summary: EssaySummary): GrowthSummary {
 const {sessions, points} = summary;
 if (sessions.length === 0) return blank('none');

 const universitiesPracticed = new Set(sessions.map((s) => s.universityId)).size;
 const evals = groupEvaluations(points);
 const valid = evals.filter(isValidCompleted);

 // Order each question's valid evaluations in time: the earliest is 최초, the rest 재첨삭.
 const byQuestion = new Map<string, EvalGroup[]>();
 for (const e of valid) {
  const list = byQuestion.get(e.questionId) ?? [];
  list.push(e);
  byQuestion.set(e.questionId, list);
 }
 for (const list of byQuestion.values()) list.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

 const initialEvaluations = byQuestion.size; // one 최초 per question that has any completed result
 const reEvaluations = valid.length - initialEvaluations;

 // 최근 대학: the most recently active session; falls back to the latest completed evaluation's question.
 const recentUniversity = recentUniversityName(summary, valid, byQuestion);

 // 최근 평가 단계: is the single most recent completed evaluation a 최초 or a 재첨삭?
 const recentStage = latestStage(valid, byQuestion);

 // Universities that actually reached a completed result (for the 여러 대학 state).
 const questionUniversity = new Map(sessions.map((s) => [s.questionId, s.universityId]));
 const universitiesWithResult = new Set([...byQuestion.keys()].flatMap((q) => {
  const u = questionUniversity.get(q);
  return u ? [u] : [];
 })).size;

 const comparison = compareLevels(valid);

 let status: GrowthStatus;
 if (valid.length === 0) status = 'in-progress';
 else if (comparison) status = 'reevaluated';
 else if (universitiesWithResult >= 2) status = 'multi';
 else status = 'initial-only';

 return {status, universitiesPracticed, initialEvaluations, reEvaluations, recentUniversity, recentStage, comparison};
}

function blank(status: GrowthStatus): GrowthSummary {
 return {status, universitiesPracticed: 0, initialEvaluations: 0, reEvaluations: 0, recentUniversity: null, recentStage: null, comparison: null};
}

function recentUniversityName(summary: EssaySummary, valid: EvalGroup[], byQuestion: Map<string, EvalGroup[]>): string | null {
 const dated = summary.sessions.filter((s) => s.latestActivity);
 if (dated.length) {
  return dated.slice().sort((a, b) => b.latestActivity!.localeCompare(a.latestActivity!))[0].universityName || null;
 }
 void byQuestion;
 const latest = valid.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
 if (!latest) return summary.sessions[0]?.universityName || null;
 return summary.sessions.find((s) => s.questionId === latest.questionId)?.universityName || null;
}

function latestStage(valid: EvalGroup[], byQuestion: Map<string, EvalGroup[]>): 'initial' | 'reeval' | null {
 const latest = valid.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
 if (!latest) return null;
 const ordered = byQuestion.get(latest.questionId) ?? [];
 return ordered[0]?.evaluationId === latest.evaluationId ? 'initial' : 'reeval';
}

/**
 * Compare the earliest and latest completed points for every (question, criterion),
 * deferring the whole decision to `comparableDimensionDelta`. A pair that fails the
 * strict same-context gate is simply not counted; it is never shown as unchanged.
 */
function compareLevels(valid: EvalGroup[]): GrowthComparison | null {
 const buckets = new Map<string, DimensionPoint[]>();
 for (const e of valid) {
  for (const p of e.points) {
   if (p.level === null) continue;
   const key = `${p.questionId}\u0000${p.criterionId}`;
   const list = buckets.get(key) ?? [];
   list.push(p);
   buckets.set(key, list);
  }
 }
 let improved = 0, unchanged = 0, declined = 0, pairs = 0, bestDelta: number | null = null;
 for (const list of buckets.values()) {
  if (list.length < 2) continue;
  const sorted = list.slice().sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const delta = comparableDimensionDelta(sorted[0], sorted[sorted.length - 1]);
  if (delta === null) continue;
  pairs++;
  if (delta > 0) improved++;
  else if (delta < 0) declined++;
  else unchanged++;
  if (bestDelta === null || delta > bestDelta) bestDelta = delta;
 }
 return pairs > 0 ? {improved, unchanged, declined, pairs, bestDelta} : null;
}
