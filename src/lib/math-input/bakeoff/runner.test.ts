import { describe, expect, it } from "vitest";

import { BENCHMARK_FIXTURES } from "./manifest";
import {
  createCautiousFactory,
  createOracleFactory,
  createOverconfidentFactory,
  createUnderconfidentFactory,
} from "./providers";
import { generateComparisonReport } from "./report";
import { runBenchmark } from "./runner";

// Critical regions used for the "hard" providers.
const CRITICAL_IDS = ["B17:r1", "B18:r1", "B19:r1"];

describe("bake-off runner", () => {
  it("runs the full 20-fixture set through the MATH-3B pipeline deterministically", async () => {
    const a = await runBenchmark({ providerId: "mock-oracle", modelId: "oracle-1", factory: createOracleFactory() });
    const b = await runBenchmark({ providerId: "mock-oracle", modelId: "oracle-1", factory: createOracleFactory() });
    expect(a.fixtureScores).toHaveLength(20);
    expect(a.aggregate).toEqual(b.aggregate);
  });

  it("oracle (correct+confident) is near-perfect with no critical false confidence", async () => {
    const report = await runBenchmark({ providerId: "mock-oracle", modelId: "oracle-1", factory: createOracleFactory() });
    expect(report.aggregate.criticalFalseConfidenceCount).toBe(0);
    expect(report.aggregate.safetyScore).toBeGreaterThan(0.95);
  });

  it("a confident wrong critical read scores materially worse than an uncertain one", async () => {
    const overconfident = await runBenchmark({
      providerId: "mock-overconfident",
      modelId: "overconfident-1",
      factory: createOverconfidentFactory(CRITICAL_IDS),
    });
    const cautious = await runBenchmark({
      providerId: "mock-cautious",
      modelId: "cautious-1",
      factory: createCautiousFactory(CRITICAL_IDS),
    });
    const oracle = await runBenchmark({ providerId: "mock-oracle", modelId: "oracle-1", factory: createOracleFactory() });

    // Confident-wrong-on-critical (x² read as x³) must be materially worse than uncertain-wrong.
    expect(overconfident.aggregate.safetyScore).toBeLessThan(cautious.aggregate.safetyScore);
    expect(cautious.aggregate.safetyScore).toBeLessThan(oracle.aggregate.safetyScore);
    expect(overconfident.aggregate.criticalFalseConfidenceCount).toBeGreaterThan(0);
    expect(cautious.aggregate.criticalFalseConfidenceCount).toBe(0);
  });

  it("targeted fallback that agrees resolves an uncertain-but-correct critical region", async () => {
    const report = await runBenchmark({
      providerId: "mock-underconfident",
      modelId: "underconfident-1",
      factory: createUnderconfidentFactory(CRITICAL_IDS),
      fallbackFactory: createOracleFactory(),
    });
    const totalFallbackUse = report.fixtureScores.reduce((sum, s) => sum + (s.fallbackUsefulness ?? 0), 0);
    expect(totalFallbackUse).toBeGreaterThan(0);
  });

  it("report generator ranks by safety but selects no winner", async () => {
    const oracle = await runBenchmark({ providerId: "oracle", modelId: "o", factory: createOracleFactory() });
    const bad = await runBenchmark({ providerId: "overconfident", modelId: "x", factory: createOverconfidentFactory(CRITICAL_IDS) });
    const report = generateComparisonReport([bad, oracle]);
    expect(report.winnerSelected).toBe(false);
    expect(report.rows[0].providerId).toBe("oracle"); // sorted by safety, not declared winner
    expect(report.markdown).toContain("No winner is selected");
  });

  it("covers the full manifest by default", async () => {
    const report = await runBenchmark({ providerId: "oracle", modelId: "o", factory: createOracleFactory() });
    expect(report.fixtureScores.map((s) => s.fixtureId)).toEqual(BENCHMARK_FIXTURES.map((f) => f.id));
  });
});
