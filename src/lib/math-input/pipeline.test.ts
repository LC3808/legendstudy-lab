import { describe, expect, it } from "vitest";

import { applyExtractionConfirmation } from "./confirmation";
import {
  fixedClock,
  imageArtifact,
  pdfArtifact,
  region,
  typedArtifact,
} from "./fixtures";
import { createFallbackAdapter, createStaticAdapter } from "./mock-adapter";
import { assessReadinessForRun, runExtractionPipeline } from "./orchestration";
import { VISION_CREDIT_IMPACT } from "./types";
import type { MathInputArtifact, VisionRegion } from "./types";

const primaryOf = (regions: VisionRegion[], status: "OK" | "INVALID_OUTPUT" | "UNAVAILABLE" = "OK") =>
  createStaticAdapter("mock-primary", "mock-primary-1", { regions, providerStatus: status });

async function run(opts: {
  attemptId?: string;
  responseFormat: Parameters<typeof runExtractionPipeline>[0]["responseFormat"];
  artifacts: MathInputArtifact[];
  regions?: VisionRegion[];
  primaryStatus?: "OK" | "INVALID_OUTPUT" | "UNAVAILABLE";
  fallback?: Parameters<typeof runExtractionPipeline>[0]["fallback"];
  evidenceAvailable?: (ref: string | null) => boolean;
}) {
  return runExtractionPipeline({
    attemptId: opts.attemptId ?? "attempt-1",
    responseFormat: opts.responseFormat,
    artifacts: opts.artifacts,
    primary: opts.regions ? primaryOf(opts.regions, opts.primaryStatus) : undefined,
    fallback: opts.fallback,
    clock: fixedClock,
    evidenceAvailable: opts.evidenceAvailable,
  });
}

describe("MATH-3B Vision/input pipeline — V01–V30 acceptance matrix", () => {
  it("V01 typed SHORT_ANSWER '12' is READY with a single compact region", async () => {
    const result = await run({ responseFormat: "SHORT_ANSWER", artifacts: [typedArtifact(0, "12")] });
    expect(result.readiness.status).toBe("READY_FOR_EVALUATION");
    expect(result.run?.regions).toHaveLength(1);
    expect(result.run?.regions[0].rawText).toBe("12");
  });

  it("V02 typed algebra expression converges at the normalized boundary", async () => {
    const result = await run({ responseFormat: "SHORT_REASONING", artifacts: [typedArtifact(0, "x^2+2x+1")] });
    expect(result.readiness.status).toBe("READY_FOR_EVALUATION");
    expect(result.run?.regions[0].normalizedMath).toBe("x^2+2x+1");
  });

  it("V03 clean single-page handwritten FULL_SOLUTION is READY", async () => {
    const regions = [
      region({ role: "REASONING_TEXT", regionType: "TEXT", rawText: "먼저 미분한다", confidence: "HIGH" }),
      region({ role: "FORMULA", rawText: "f'(x)=2x", normalizedMath: "f'(x)=2x", readingOrder: 1 }),
      region({ role: "FINAL_ANSWER", rawText: "x=0", normalizedMath: "x=0", readingOrder: 2 }),
    ];
    const result = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions });
    expect(result.readiness.status).toBe("READY_FOR_EVALUATION");
  });

  it("V04 multi-page solution preserves ordered pages", async () => {
    const regions = [
      region({ pageIndex: 0, role: "REASONING_TEXT", regionType: "TEXT", rawText: "p0" }),
      region({ pageIndex: 1, role: "FINAL_ANSWER", rawText: "p1", readingOrder: 0 }),
    ];
    const result = await run({
      responseFormat: "FULL_SOLUTION",
      artifacts: [imageArtifact(0), imageArtifact(1)],
      regions,
    });
    expect(result.readiness.readyInput?.pages).toEqual([{ pageIndex: 0 }, { pageIndex: 1 }]);
  });

  it("V05 Korean prose + formulas preserved", async () => {
    const regions = [
      region({ role: "REASONING_TEXT", regionType: "TEXT", rawText: "조건에 의하여 연속이다" }),
      region({ role: "FORMULA", rawText: "\\int_0^1 x^2 dx", normalizedMath: "\\int_0^1 x^2 dx", readingOrder: 1 }),
    ];
    const result = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions });
    expect(result.readiness.status).toBe("READY_FOR_EVALUATION");
    expect(result.run?.regions[0].rawText).toContain("조건");
  });

  it("V06 x² vs x³ exponent ambiguity blocks with confirmation", async () => {
    const regions = [region({ role: "EXPONENT", rawText: "x^2", confidence: "AMBIGUOUS", uncertaintyReason: "SYMBOL_AMBIGUITY" })];
    const result = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions });
    expect(result.readiness.status).toBe("NEEDS_CONFIRMATION");
    expect(result.readiness.confirmationRequired).toHaveLength(1);
  });

  it("V07 + vs - operator-sign ambiguity blocks with confirmation", async () => {
    const regions = [region({ role: "OPERATOR_SIGN", rawText: "+", confidence: "AMBIGUOUS", uncertaintyReason: "SYMBOL_AMBIGUITY" })];
    const result = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions });
    expect(result.readiness.status).toBe("NEEDS_CONFIRMATION");
  });

  it("V08 < vs ≤ inequality-direction ambiguity blocks", async () => {
    const regions = [region({ role: "INEQUALITY_DIRECTION", rawText: "<", confidence: "LOW", uncertaintyReason: "SYMBOL_AMBIGUITY" })];
    const result = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions });
    expect(result.readiness.status).toBe("NEEDS_CONFIRMATION");
  });

  it("V09 fraction ambiguity in the final answer blocks", async () => {
    const regions = [region({ role: "FINAL_ANSWER", rawText: "1/2", confidence: "AMBIGUOUS", structuralHints: ["is_fraction"] })];
    const result = await run({ responseFormat: "SHORT_ANSWER", artifacts: [imageArtifact(0)], regions });
    expect(result.readiness.status).toBe("NEEDS_CONFIRMATION");
  });

  it("V10 integral-bounds ambiguity blocks", async () => {
    const regions = [region({ role: "INTEGRATION_BOUND", rawText: "0..1", confidence: "AMBIGUOUS" })];
    const result = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions });
    expect(result.readiness.status).toBe("NEEDS_CONFIRMATION");
  });

  it("V11 subproblem-marker ambiguity flags rather than binds silently", async () => {
    const regions = [region({ role: "SUBPROBLEM_MARKER", rawText: "(1)", confidence: "AMBIGUOUS", uncertaintyReason: "SUBPROBLEM_BINDING_AMBIGUITY" })];
    const result = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions });
    expect(result.readiness.status).toBe("NEEDS_CONFIRMATION");
    expect(result.readiness.confirmationRequired[0].uncertaintyReason).toBe("SUBPROBLEM_BINDING_AMBIGUITY");
  });

  it("V12 graph/diagram region is preserved, not forced to text, and does not block", async () => {
    const regions = [region({ role: "GRAPH", regionType: "GRAPH_REGION", rawText: "", normalizedMath: null, confidence: "MEDIUM" })];
    const result = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions });
    expect(result.readiness.status).toBe("READY_FOR_EVALUATION");
    expect(result.run?.regions[0].regionType).toBe("GRAPH_REGION");
  });

  it("V13 primary/fallback agreement upgrades confidence and becomes READY", async () => {
    const ambiguous = region({ role: "EXPONENT", rawText: "x^2", confidence: "AMBIGUOUS" });
    const fallback = createFallbackAdapter("mock-fallback", "mock-fallback-1", {
      [ambiguous.regionId]: { ...ambiguous, confidence: "MEDIUM" },
    });
    const result = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions: [ambiguous], fallback });
    expect(result.run?.mergeProvenance[0].decision).toBe("PRIMARY_ACCEPTED");
    expect(result.readiness.status).toBe("READY_FOR_EVALUATION");
  });

  it("V14 non-critical ambiguity does not trigger fallback or block", async () => {
    const regions = [region({ role: "REASONING_TEXT", regionType: "TEXT", rawText: "대략", confidence: "LOW" })];
    const fallback = createFallbackAdapter("mock-fallback", "mock-fallback-1", {});
    const result = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions, fallback });
    expect(result.readiness.status).toBe("READY_FOR_EVALUATION");
    expect(result.run?.providerProvenance.some((p) => p.stage === "FALLBACK")).toBe(false);
  });

  it("V15 primary/fallback disagreement on a critical region requires confirmation (not confidence-max)", async () => {
    const primaryRegion = region({ role: "EXPONENT", rawText: "x^2", confidence: "AMBIGUOUS" });
    const fallback = createFallbackAdapter("mock-fallback", "mock-fallback-1", {
      [primaryRegion.regionId]: { ...primaryRegion, rawText: "x^3", normalizedMath: "x^3", confidence: "HIGH" },
    });
    const result = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions: [primaryRegion], fallback });
    expect(result.run?.mergeProvenance[0].decision).toBe("STUDENT_CONFIRMATION_REQUIRED");
    expect(result.readiness.status).toBe("NEEDS_CONFIRMATION");
  });

  it("V16 student confirms provider candidate → new version, READY", async () => {
    const regions = [region({ role: "EXPONENT", rawText: "x^2", confidence: "AMBIGUOUS" })];
    const first = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions });
    const target = first.readiness.confirmationRequired[0];
    const confirmation = applyExtractionConfirmation({
      attemptId: "attempt-1",
      expectedExtractionVersion: 1,
      run: first.run!,
      corrections: [{ regionId: target.regionId, confirmedRawText: "x^2", confirmedNormalizedMath: "x^2", acceptedAsIs: true }],
      clock: fixedClock,
    });
    expect(confirmation.status).toBe("CONFIRMED");
    expect(confirmation.run?.extractionVersion).toBe(2);
    const readiness = assessReadinessForRun(confirmation.run!, [imageArtifact(0)]);
    expect(readiness.status).toBe("READY_FOR_EVALUATION");
  });

  it("V17 student corrects provider candidate; provider candidate retained as provenance", async () => {
    const regions = [region({ role: "EXPONENT", rawText: "x^3", confidence: "AMBIGUOUS" })];
    const first = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions });
    const target = first.readiness.confirmationRequired[0];
    const confirmation = applyExtractionConfirmation({
      attemptId: "attempt-1",
      expectedExtractionVersion: 1,
      run: first.run!,
      corrections: [{ regionId: target.regionId, confirmedRawText: "x^2", confirmedNormalizedMath: "x^2", acceptedAsIs: false }],
      clock: fixedClock,
    });
    expect(confirmation.run?.corrections[0].providerCandidateRawText).toBe("x^3");
    expect(confirmation.run?.corrections[0].confirmedRawText).toBe("x^2");
    expect(confirmation.run?.corrections[0].acceptedAsIs).toBe(false);
  });

  it("V18 unreadable critical region needs re-upload, not confirmation", async () => {
    const regions = [region({ role: "FINAL_ANSWER", rawText: "", confidence: "UNREADABLE", uncertaintyReason: "IMAGE_QUALITY" })];
    const result = await run({ responseFormat: "SHORT_ANSWER", artifacts: [imageArtifact(0)], regions });
    expect(result.readiness.status).toBe("NEEDS_REUPLOAD");
    expect(result.readiness.failureStates).toContain("CRITICAL_UNCERTAINTY");
  });

  it("V19 corrupted/malformed provider output fails closed (no partial publish)", async () => {
    const bad = region({ boundingBox: { x0: 0, y0: 0, x1: 2, y1: 1 } });
    const result = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions: [bad] });
    expect(result.readiness.status).toBe("INPUT_FAILED");
    expect(result.readiness.failureStates).toContain("EXTRACTION_FAILED");
  });

  it("V20 unsupported file type is rejected at admission", async () => {
    const result = await run({
      responseFormat: "FULL_SOLUTION",
      artifacts: [imageArtifact(0, { mediaType: "image/gif" })],
      regions: [region()],
    });
    expect(result.readiness.status).toBe("INPUT_FAILED");
    expect(result.readiness.failureStates).toContain("UNSUPPORTED_INPUT");
  });

  it("V21 PDF page ordering is normalized", async () => {
    const regions = [
      region({ pageIndex: 0, role: "FINAL_ANSWER", rawText: "a" }),
      region({ pageIndex: 1, role: "FINAL_ANSWER", rawText: "b" }),
    ];
    const result = await run({
      responseFormat: "FULL_SOLUTION",
      artifacts: [pdfArtifact(1), pdfArtifact(0)],
      regions,
    });
    expect(result.readiness.readyInput?.pages).toEqual([{ pageIndex: 0 }, { pageIndex: 1 }]);
  });

  it("V22 PROOF multi-page continuation is not flattened", async () => {
    const regions = [
      region({ pageIndex: 0, role: "REASONING_TEXT", regionType: "TEXT", rawText: "가정" }),
      region({ pageIndex: 1, role: "REASONING_TEXT", regionType: "TEXT", rawText: "따라서 성립" }),
    ];
    const result = await run({ responseFormat: "PROOF", artifacts: [imageArtifact(0), imageArtifact(1)], regions });
    expect(result.readiness.status).toBe("READY_FOR_EVALUATION");
    expect(result.run?.regions.map((r) => r.pageIndex)).toEqual([0, 1]);
  });

  it("V23 SHORT_ANSWER does not synthesize solution steps", async () => {
    const result = await run({ responseFormat: "SHORT_ANSWER", artifacts: [typedArtifact(0, "12")] });
    expect(result.run?.regions.some((r) => r.role === "REASONING_TEXT")).toBe(false);
    expect(result.run?.regions).toHaveLength(1);
  });

  it("V24 confirmation is EXTRACTION_CONFIRMATION, not a re-solve", async () => {
    const regions = [region({ role: "EXPONENT", rawText: "x^2", confidence: "AMBIGUOUS" })];
    const first = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions });
    const confirmation = applyExtractionConfirmation({
      attemptId: "attempt-1",
      expectedExtractionVersion: 1,
      run: first.run!,
      corrections: [{ regionId: first.run!.regions[0].regionId, confirmedRawText: "x^2", acceptedAsIs: true }],
      clock: fixedClock,
    });
    expect(confirmation.kind).toBe("EXTRACTION_CONFIRMATION");
    expect(confirmation.run?.attemptId).toBe("attempt-1");
    expect(VISION_CREDIT_IMPACT).toBe("NONE");
  });

  it("V25 extraction failure yields no READY input (no evaluation Credit consumed)", async () => {
    const result = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions: [region()], primaryStatus: "UNAVAILABLE" });
    expect(result.readiness.readyInput).toBeNull();
    expect(VISION_CREDIT_IMPACT).toBe("NONE");
  });

  it("V26 deterministic processing is idempotent", async () => {
    const artifacts = [typedArtifact(0, "12")];
    const a = await runExtractionPipeline({ attemptId: "attempt-x", responseFormat: "SHORT_ANSWER", artifacts, clock: fixedClock });
    const b = await runExtractionPipeline({ attemptId: "attempt-x", responseFormat: "SHORT_ANSWER", artifacts, clock: fixedClock });
    expect(a).toEqual(b);
    expect(a.run?.extractionRunId).toBe("attempt-x#ext1");
  });

  it("V27 stale confirmation target (version mismatch) is rejected", async () => {
    const regions = [region({ role: "EXPONENT", rawText: "x^2", confidence: "AMBIGUOUS" })];
    const first = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions });
    const result = applyExtractionConfirmation({
      attemptId: "attempt-1",
      expectedExtractionVersion: 2,
      run: first.run!,
      corrections: [{ regionId: first.run!.regions[0].regionId, confirmedRawText: "x^2", acceptedAsIs: true }],
      clock: fixedClock,
    });
    expect(result.status).toBe("REJECTED");
    expect(result.reasons).toContain("STALE_EXTRACTION_VERSION");
  });

  it("V28 wrong-attempt confirmation is rejected", async () => {
    const regions = [region({ role: "EXPONENT", rawText: "x^2", confidence: "AMBIGUOUS" })];
    const first = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions });
    const result = applyExtractionConfirmation({
      attemptId: "attempt-OTHER",
      expectedExtractionVersion: 1,
      run: first.run!,
      corrections: [{ regionId: first.run!.regions[0].regionId, confirmedRawText: "x^2", acceptedAsIs: true }],
      clock: fixedClock,
    });
    expect(result.status).toBe("REJECTED");
    expect(result.reasons).toContain("WRONG_ATTEMPT");
  });

  it("V29 unavailable evidence needs re-upload", async () => {
    const result = await run({
      responseFormat: "FULL_SOLUTION",
      artifacts: [imageArtifact(0, { evidenceRef: "unavailable:erased" })],
      regions: [region()],
    });
    expect(result.readiness.status).toBe("NEEDS_REUPLOAD");
    expect(result.readiness.failureStates).toContain("EVIDENCE_UNAVAILABLE");
  });

  it("V30 READY only after all critical issues resolved", async () => {
    const regions = [region({ role: "OPERATOR_SIGN", rawText: "+", confidence: "AMBIGUOUS" })];
    const before = await run({ responseFormat: "FULL_SOLUTION", artifacts: [imageArtifact(0)], regions });
    expect(before.readiness.status).toBe("NEEDS_CONFIRMATION");
    const confirmation = applyExtractionConfirmation({
      attemptId: "attempt-1",
      expectedExtractionVersion: 1,
      run: before.run!,
      corrections: [{ regionId: before.run!.regions[0].regionId, confirmedRawText: "+", acceptedAsIs: true }],
      clock: fixedClock,
    });
    const after = assessReadinessForRun(confirmation.run!, [imageArtifact(0)]);
    expect(after.status).toBe("READY_FOR_EVALUATION");
  });
});
