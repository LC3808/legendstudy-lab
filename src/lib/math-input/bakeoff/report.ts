/**
 * MATH-3C-1 — comparison report generator. Sorts providers by safety for readability but declares
 * NO winner (provider selection is a later, separate decision). Cost is estimated only when real
 * pricing is supplied; otherwise null.
 */

import type {
  EstimatedCost,
  ProviderBenchmarkReport,
  ProviderPricing,
} from "./types";

export interface ComparisonRow {
  providerId: string;
  modelId: string;
  safetyScore: number;
  qualityScore: number;
  calibrationScore: number;
  falseConfidenceRate: number;
  criticalFalseConfidenceCount: number;
  missedCritical: number;
}

export interface ComparisonReport {
  rows: ComparisonRow[];
  winnerSelected: false;
  note: string;
  markdown: string;
}

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;

export function generateComparisonReport(reports: ProviderBenchmarkReport[]): ComparisonReport {
  const rows: ComparisonRow[] = reports
    .map((report) => ({
      providerId: report.providerId,
      modelId: report.modelId,
      safetyScore: report.aggregate.safetyScore,
      qualityScore: report.aggregate.qualityScore,
      calibrationScore: report.aggregate.calibrationScore,
      falseConfidenceRate: report.aggregate.falseConfidenceRate,
      criticalFalseConfidenceCount: report.aggregate.criticalFalseConfidenceCount,
      missedCritical: report.aggregate.missedCritical,
    }))
    .sort((a, b) => b.safetyScore - a.safetyScore);

  const header =
    "| provider | model | safety | quality | calibration | false-conf | critical-false-conf | missed-critical |";
  const divider = "| --- | --- | --- | --- | --- | --- | --- | --- |";
  const body = rows.map(
    (r) =>
      `| ${r.providerId} | ${r.modelId} | ${pct(r.safetyScore)} | ${pct(r.qualityScore)} | ${pct(
        r.calibrationScore,
      )} | ${pct(r.falseConfidenceRate)} | ${r.criticalFalseConfidenceCount} | ${r.missedCritical} |`,
  );
  const note =
    "Ranked by safety for readability only. No winner is selected; critical false confidence and " +
    "missed critical regions dominate safety and must be reviewed before any provider decision.";

  return {
    rows,
    winnerSelected: false,
    note,
    markdown: ["# MATH-3C Vision provider bake-off (no winner selected)", "", header, divider, ...body, "", note].join("\n"),
  };
}

/** Estimate cost only when pricing is supplied; otherwise null (MATH-3C-1 has no real pricing). */
export function estimateCost(
  report: ProviderBenchmarkReport,
  pricing: ProviderPricing | null,
): EstimatedCost {
  if (!pricing) {
    return { providerId: report.providerId, currency: null, estimated: null };
  }
  const units = report.aggregate.totalRequestUnits ?? 0;
  const tokens = report.aggregate.totalTokenUsage ?? 0;
  const estimated = units * (pricing.perRequestUnit ?? 0) + tokens * (pricing.perToken ?? 0);
  return { providerId: report.providerId, currency: pricing.currency ?? null, estimated };
}
