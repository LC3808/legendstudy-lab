import { describe, expect, it } from "vitest";

import { scoreFixture } from "./scoring";
import type { BenchmarkFixture } from "./types";
import type { ExtractionPipelineResult, VisionRegion } from "../types";

function criticalFixture(): BenchmarkFixture {
  return {
    id: "T",
    category: "AMBIGUOUS_EXPONENT",
    title: "t",
    responseFormat: "FULL_SOLUTION",
    artifacts: [],
    expectedRegions: [
      { regionId: "T:r1", pageIndex: 0, readingOrder: 0, role: "EXPONENT", critical: true, expectedRawText: "x^2", expectedNormalizedMath: "x^2" },
    ],
  };
}

function resultWith(region: Partial<VisionRegion>): ExtractionPipelineResult {
  const full: VisionRegion = {
    regionId: "T:r1",
    pageIndex: 0,
    readingOrder: 0,
    regionType: "MATH",
    role: "EXPONENT",
    boundingBox: { x0: 0, y0: 0, x1: 1, y1: 1 },
    rawText: "x^2",
    normalizedMath: "x^2",
    structuralHints: [],
    confidence: "HIGH",
    uncertaintyReason: null,
    evidenceRef: "evidence://t",
    subproblemCandidate: null,
    ...region,
  };
  return {
    admission: { status: "ADMITTED", reasons: [], orderedArtifacts: [] },
    run: {
      extractionRunId: "T#ext1",
      extractionVersion: 1,
      attemptId: "T",
      responseFormat: "FULL_SOLUTION",
      regions: [full],
      providerProvenance: [],
      mergeProvenance: [],
      corrections: [],
      previousExtractionVersion: null,
      createdAtIso: "2026-10-02T00:00:00.000Z",
    },
    readiness: { status: "READY_FOR_EVALUATION", failureStates: [], confirmationRequired: [], readyInput: null },
  };
}

describe("scoreFixture", () => {
  it("scores a correct + confident critical region as best (CORRECT_CONFIDENT)", () => {
    const score = scoreFixture(criticalFixture(), resultWith({ normalizedMath: "x^2", confidence: "HIGH" }));
    expect(score.regionScores[0].outcome).toBe("CORRECT_CONFIDENT");
    expect(score.safetyScore).toBe(1);
    expect(score.criticalFalseConfidenceCount).toBe(0);
  });

  it("penalizes a confident WRONG critical read as false confidence", () => {
    const score = scoreFixture(criticalFixture(), resultWith({ normalizedMath: "x^3", confidence: "HIGH" }));
    expect(score.regionScores[0].outcome).toBe("WRONG_CONFIDENT");
    expect(score.criticalFalseConfidenceCount).toBe(1);
    expect(score.falseConfidenceRate).toBe(1);
    expect(score.safetyScore).toBe(0);
  });

  it("treats a wrong-but-uncertain critical read as safer than confident-wrong", () => {
    const confidentWrong = scoreFixture(criticalFixture(), resultWith({ normalizedMath: "x^3", confidence: "HIGH" }));
    const uncertainWrong = scoreFixture(criticalFixture(), resultWith({ normalizedMath: "x^3", confidence: "AMBIGUOUS" }));
    expect(uncertainWrong.regionScores[0].outcome).toBe("WRONG_UNCERTAIN");
    expect(uncertainWrong.criticalFalseConfidenceCount).toBe(0);
    expect(uncertainWrong.safetyScore).toBeGreaterThan(confidentWrong.safetyScore);
  });

  it("marks calibration high when confidence matches correctness", () => {
    const good = scoreFixture(criticalFixture(), resultWith({ normalizedMath: "x^2", confidence: "HIGH" }));
    const miscalibrated = scoreFixture(criticalFixture(), resultWith({ normalizedMath: "x^3", confidence: "HIGH" }));
    expect(good.calibrationScore).toBe(1);
    expect(miscalibrated.calibrationScore).toBe(0);
  });
});
