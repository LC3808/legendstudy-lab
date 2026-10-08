/**
 * MATH-3C-1 — Vision provider bake-off harness types. Measurement only; NO live/paid provider call.
 * Reuses the MATH-3B provider-independent adapter + canonical Vision types. No provider-specific
 * payload is introduced into canonical Math types; metering lives in bake-off-only types here.
 *
 * Critical mathematical errors are weighted separately from cosmetic OCR differences, and a
 * confident wrong read of a critical region scores materially worse than an uncertain one.
 */

import type { MathInputArtifact, MathResponseFormat, RegionRole } from "../types";

export type BenchmarkCategory =
  | "KOREAN_HANDWRITING"
  | "KOREAN_PROSE_FORMULAS"
  | "SUPERSCRIPT_SUBSCRIPT"
  | "FRACTIONS"
  | "RADICALS"
  | "INEQUALITIES"
  | "INTEGRAL_BOUNDS"
  | "MATRICES"
  | "MULTILINE_EQUATIONS"
  | "MULTIPAGE_READING_ORDER"
  | "SUBPROBLEM_MARKERS"
  | "GRAPHS_DIAGRAMS"
  | "CROSSED_OUT_CORRECTED"
  | "DENSE_FULL_SOLUTION"
  | "PROOF"
  | "SHORT_ANSWER"
  | "AMBIGUOUS_EXPONENT"
  | "AMBIGUOUS_SIGN"
  | "AMBIGUOUS_INEQUALITY"
  | "REGION_LOCALIZATION";

export const BENCHMARK_CATEGORIES: readonly BenchmarkCategory[] = [
  "KOREAN_HANDWRITING",
  "KOREAN_PROSE_FORMULAS",
  "SUPERSCRIPT_SUBSCRIPT",
  "FRACTIONS",
  "RADICALS",
  "INEQUALITIES",
  "INTEGRAL_BOUNDS",
  "MATRICES",
  "MULTILINE_EQUATIONS",
  "MULTIPAGE_READING_ORDER",
  "SUBPROBLEM_MARKERS",
  "GRAPHS_DIAGRAMS",
  "CROSSED_OUT_CORRECTED",
  "DENSE_FULL_SOLUTION",
  "PROOF",
  "SHORT_ANSWER",
  "AMBIGUOUS_EXPONENT",
  "AMBIGUOUS_SIGN",
  "AMBIGUOUS_INEQUALITY",
  "REGION_LOCALIZATION",
] as const;

/** A region-level expected fact. `critical` marks mathematically load-bearing regions. */
export interface ExpectedRegion {
  regionId: string;
  pageIndex: number;
  readingOrder: number;
  role: RegionRole;
  critical: boolean;
  expectedRawText: string;
  expectedNormalizedMath: string | null;
  /** When true, a correct read of this region should also carry an authorized evidence reference. */
  requiresEvidenceRef?: boolean;
}

export interface BenchmarkFixture {
  id: string;
  category: BenchmarkCategory;
  title: string;
  responseFormat: MathResponseFormat;
  /** Synthetic artifacts only — never real student data. */
  artifacts: MathInputArtifact[];
  expectedRegions: ExpectedRegion[];
}

/* ------------------------------------------------------------------ scoring */

export type RegionOutcome =
  | "CORRECT_CONFIDENT"
  | "CORRECT_UNCERTAIN"
  | "WRONG_UNCERTAIN"
  | "WRONG_CONFIDENT"
  | "MISSED";

export interface RegionScore {
  regionId: string;
  critical: boolean;
  outcome: RegionOutcome;
  correct: boolean;
  confident: boolean;
}

export interface FixtureScore {
  fixtureId: string;
  category: BenchmarkCategory;
  pipelineProduced: boolean;
  /** Composite correctness weighted by criticality, in [0,1]. */
  qualityScore: number;
  /** qualityScore degraded by critical false confidence / critical misses, in [0,1]. */
  safetyScore: number;
  /** Fraction of matched regions whose confidence matches correctness, in [0,1]. */
  calibrationScore: number;
  transcriptionFidelity: number;
  normalizedMathFidelity: number;
  readingOrderFidelity: number;
  criticalRegionAccuracy: number;
  falseConfidenceRate: number;
  criticalFalseConfidenceCount: number;
  missedCritical: number;
  spuriousCount: number;
  /** # critical regions the fallback resolved that the primary left uncertain/unresolved. */
  fallbackUsefulness: number | null;
  regionScores: RegionScore[];
  meter: ProviderMeter | null;
}

/** Bake-off-only metering (not a canonical Math type). Cost is estimated later from real pricing. */
export interface ProviderMeter {
  latencyMs?: number;
  requestUnits?: number;
  tokenUsage?: number;
}

export interface AggregateScore {
  fixtureCount: number;
  qualityScore: number;
  safetyScore: number;
  calibrationScore: number;
  falseConfidenceRate: number;
  criticalFalseConfidenceCount: number;
  missedCritical: number;
  safetyByCategory: Partial<Record<BenchmarkCategory, number>>;
  totalLatencyMs: number | null;
  totalRequestUnits: number | null;
  totalTokenUsage: number | null;
}

export interface ProviderBenchmarkReport {
  providerId: string;
  modelId: string;
  fixtureScores: FixtureScore[];
  aggregate: AggregateScore;
}

/** Supplied only when real provider pricing is known (MATH-3C-2+); null otherwise. */
export interface ProviderPricing {
  perRequestUnit?: number;
  perToken?: number;
  currency?: string;
}

export interface EstimatedCost {
  providerId: string;
  currency: string | null;
  estimated: number | null;
}
