/**
 * MATH-3C-1 — scoring. Critical mathematical regions are weighted far above cosmetic ones, and a
 * confident wrong read of a critical region (e.g. x² read as x³) is penalized far more than an
 * uncertain one. Measurement only; picks no winner.
 */

import type { ExtractionPipelineResult } from "../types";
import type { ConfidenceBand, VisionRegion } from "../types";
import type {
  AggregateScore,
  BenchmarkCategory,
  BenchmarkFixture,
  ExpectedRegion,
  FixtureScore,
  ProviderMeter,
  RegionOutcome,
  RegionScore,
} from "./types";

const WEIGHT_CRITICAL = 5;
const WEIGHT_NONCRITICAL = 1;

const OUTCOME_CREDIT: Record<RegionOutcome, number> = {
  CORRECT_CONFIDENT: 1,
  CORRECT_UNCERTAIN: 0.9,
  WRONG_UNCERTAIN: 0.4, // safe: surfaced doubt → routes to confirmation
  WRONG_CONFIDENT: 0, // false confidence
  MISSED: 0,
};

const norm = (value: string | null): string => (value ?? "").replace(/\s+/g, "").trim();
const isConfident = (band: ConfidenceBand): boolean => band === "HIGH" || band === "MEDIUM";

export function expectedRegionCorrect(expected: ExpectedRegion, actual: VisionRegion): boolean {
  if (expected.expectedNormalizedMath !== null) {
    return norm(actual.normalizedMath) === norm(expected.expectedNormalizedMath);
  }
  return norm(actual.rawText) === norm(expected.expectedRawText);
}

export function regionConfident(band: ConfidenceBand): boolean {
  return isConfident(band);
}

const isCorrect = expectedRegionCorrect;

function classify(correct: boolean, confident: boolean): Exclude<RegionOutcome, "MISSED"> {
  if (correct) return confident ? "CORRECT_CONFIDENT" : "CORRECT_UNCERTAIN";
  return confident ? "WRONG_CONFIDENT" : "WRONG_UNCERTAIN";
}

function weightOf(critical: boolean): number {
  return critical ? WEIGHT_CRITICAL : WEIGHT_NONCRITICAL;
}

function readingOrderFidelity(expected: ExpectedRegion[], actualById: Map<string, VisionRegion>): number {
  let pairs = 0;
  let good = 0;
  const byPage = new Map<number, ExpectedRegion[]>();
  for (const e of expected) {
    const list = byPage.get(e.pageIndex) ?? [];
    list.push(e);
    byPage.set(e.pageIndex, list);
  }
  for (const list of byPage.values()) {
    const ordered = [...list].sort((a, b) => a.readingOrder - b.readingOrder);
    for (let i = 0; i < ordered.length - 1; i += 1) {
      const a = actualById.get(ordered[i].regionId);
      const b = actualById.get(ordered[i + 1].regionId);
      if (!a || !b) continue;
      pairs += 1;
      if (a.readingOrder <= b.readingOrder) good += 1;
    }
  }
  return pairs === 0 ? 1 : good / pairs;
}

export interface ScoreFixtureOptions {
  /** # critical regions the fallback resolved that the primary left uncertain/unresolved. */
  fallbackUsefulness?: number | null;
  meter?: ProviderMeter | null;
}

export function scoreFixture(
  fixture: BenchmarkFixture,
  result: ExtractionPipelineResult,
  options: ScoreFixtureOptions = {},
): FixtureScore {
  const actual = result.run?.regions ?? [];
  const actualById = new Map(actual.map((r) => [r.regionId, r]));
  const expectedIds = new Set(fixture.expectedRegions.map((e) => e.regionId));

  const regionScores: RegionScore[] = [];
  let creditSum = 0;
  let weightSum = 0;
  let matched = 0;
  let calibrated = 0;
  let falseConfident = 0;
  let criticalFalseConfidence = 0;
  let missedCritical = 0;
  let transcriptionHits = 0;
  let normMathTotal = 0;
  let normMathHits = 0;
  let criticalTotal = 0;
  let criticalCorrect = 0;

  for (const expected of fixture.expectedRegions) {
    const weight = weightOf(expected.critical);
    weightSum += weight;
    if (expected.critical) criticalTotal += 1;

    const got = actualById.get(expected.regionId);
    if (!got) {
      regionScores.push({ regionId: expected.regionId, critical: expected.critical, outcome: "MISSED", correct: false, confident: false });
      if (expected.critical) missedCritical += 1;
      continue;
    }

    matched += 1;
    const correct = isCorrect(expected, got);
    const confident = isConfident(got.confidence);
    const outcome = classify(correct, confident);
    regionScores.push({ regionId: expected.regionId, critical: expected.critical, outcome, correct, confident });

    creditSum += OUTCOME_CREDIT[outcome] * weight;
    if ((correct && confident) || (!correct && !confident)) calibrated += 1;
    if (outcome === "WRONG_CONFIDENT") {
      falseConfident += 1;
      if (expected.critical) criticalFalseConfidence += 1;
    }
    if (norm(got.rawText) === norm(expected.expectedRawText)) transcriptionHits += 1;
    if (expected.expectedNormalizedMath !== null) {
      normMathTotal += 1;
      if (norm(got.normalizedMath) === norm(expected.expectedNormalizedMath)) normMathHits += 1;
    }
    if (expected.critical && correct) criticalCorrect += 1;
  }

  const spuriousCount = actual.filter((r) => !expectedIds.has(r.regionId)).length;

  const rawQuality = weightSum === 0 ? 0 : creditSum / weightSum;
  const spuriousFactor = 1 - Math.min(0.5, 0.05 * spuriousCount);
  const qualityScore = clamp(rawQuality * spuriousFactor);

  const criticalFcFactor = 1 - Math.min(1, 0.5 * criticalFalseConfidence);
  const missedCriticalFactor = 1 - Math.min(0.5, 0.25 * missedCritical);
  const safetyScore = clamp(qualityScore * criticalFcFactor * missedCriticalFactor);

  return {
    fixtureId: fixture.id,
    category: fixture.category,
    pipelineProduced: result.run !== null,
    qualityScore,
    safetyScore,
    calibrationScore: matched === 0 ? 0 : calibrated / matched,
    transcriptionFidelity: fixture.expectedRegions.length === 0 ? 1 : transcriptionHits / fixture.expectedRegions.length,
    normalizedMathFidelity: normMathTotal === 0 ? 1 : normMathHits / normMathTotal,
    readingOrderFidelity: readingOrderFidelity(fixture.expectedRegions, actualById),
    criticalRegionAccuracy: criticalTotal === 0 ? 1 : criticalCorrect / criticalTotal,
    falseConfidenceRate: matched === 0 ? 0 : falseConfident / matched,
    criticalFalseConfidenceCount: criticalFalseConfidence,
    missedCritical,
    spuriousCount,
    fallbackUsefulness: options.fallbackUsefulness ?? null,
    regionScores,
    meter: options.meter ?? null,
  };
}

export function aggregate(fixtureScores: FixtureScore[]): AggregateScore {
  const n = fixtureScores.length;
  const avg = (pick: (s: FixtureScore) => number): number =>
    n === 0 ? 0 : fixtureScores.reduce((sum, s) => sum + pick(s), 0) / n;

  const safetyByCategory: Partial<Record<BenchmarkCategory, number>> = {};
  for (const score of fixtureScores) safetyByCategory[score.category] = score.safetyScore;

  const meters = fixtureScores.map((s) => s.meter).filter((m): m is ProviderMeter => m !== null);
  const sumMeter = (pick: (m: ProviderMeter) => number | undefined): number | null =>
    meters.length === 0 ? null : meters.reduce((sum, m) => sum + (pick(m) ?? 0), 0);

  return {
    fixtureCount: n,
    qualityScore: avg((s) => s.qualityScore),
    safetyScore: avg((s) => s.safetyScore),
    calibrationScore: avg((s) => s.calibrationScore),
    falseConfidenceRate: avg((s) => s.falseConfidenceRate),
    criticalFalseConfidenceCount: fixtureScores.reduce((sum, s) => sum + s.criticalFalseConfidenceCount, 0),
    missedCritical: fixtureScores.reduce((sum, s) => sum + s.missedCritical, 0),
    safetyByCategory,
    totalLatencyMs: sumMeter((m) => m.latencyMs),
    totalRequestUnits: sumMeter((m) => m.requestUnits),
    totalTokenUsage: sumMeter((m) => m.tokenUsage),
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
