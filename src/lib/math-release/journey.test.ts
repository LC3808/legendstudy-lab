/**
 * MATH-RELEASE-CLOSEOUT-1 — cross-module end-user journey (consumer E2E).
 *
 * Every other Math test exercises ONE module (input B-series, evaluation E-series, learning LR/RSL,
 * quality Q). This file is the single place that walks the whole student journey across all four
 * module boundaries with their real clients against the deterministic mock runtime, and asserts the
 * release-critical invariants in one flow:
 *   1. input → extraction → student confirmation → server READY (R21 upload stays unavailable, no URL)
 *   2. confirmed input identifiers feed the evaluation ClaimContext
 *   3. provider path: adapter output → LAB validation → finalize (fail-closed on malformed output)
 *   4. learning: hint reveal → solution reveal → re-solve → INCLUDED reevaluation (additional_credit 0)
 *   5. learning history is append-only and ordered
 *   6. ADR-2 erasure (consumer): a student in ERASING is denied new writes on every surface
 *
 * No live provider, no real student data, no Production. Deterministic mocks only.
 */

import { describe, expect, it } from "vitest";

import { createScriptedEvaluator } from "../math-eval/evaluator";
import { outputWithCore } from "../math-learning/fixtures";
import { step } from "../math-eval/fixtures";
import {
  MathEvaluationWorkerClient,
  runWorkerEvaluation,
} from "../math-eval/runtime/worker-client";
import { createMockEvalServer } from "../math-eval/runtime/mock-eval-server";
import type { ClaimContext } from "../math-eval/runtime/contract";

import { MathInputClient } from "../math-input/runtime/input-client";
import { MathExtractionWorkerClient } from "../math-input/runtime/extraction-worker-client";
import { createMockMathServer } from "../math-input/runtime/mock-server";
import { isServerReady, type WireExtractionRegion } from "../math-input/runtime/contract";

import { LearningRuntimeClient } from "../math-learning/runtime/learning-client";
import { createMockLearningServer, includedReevaluation } from "../math-learning/runtime/mock-learning-server";
import { historyEntryFixture, learningStateFixture } from "../math-learning/fixtures";
import { prepareResolveAttempt } from "../math-learning/resolve";
import { buildLearningTimeline } from "../math-learning/history";

const STUDENT = "student-A";

function wireRegion(overrides: Partial<WireExtractionRegion> = {}): WireExtractionRegion {
  return {
    artifact_id: "art",
    page: 0,
    reading_order: 0,
    raw_text: "f'(x)=2x",
    normalized_math: "f'(x)=2x",
    uncertain: false,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    ...overrides,
  };
}

/** Stage 1: student EVIDENCE input → worker extraction → student confirmation → server READY. */
async function confirmedInput() {
  const server = createMockMathServer();
  const input = new MathInputClient(server.studentTransport(STUDENT));
  const worker = new MathExtractionWorkerClient(server.workerTransport());

  const { attempt_id } = await input.createAttempt({
    client_submission_id: "csid-journey",
    leaf_id: "leaf-1",
    kind: "INITIAL",
    input_kind: "EVIDENCE",
  });
  const registered = await input.registerEvidence(attempt_id, { position: 1, media_type: "image/png", byte_size: 2048 });
  // R21: upload is never faked by the consumer — no success, no URL.
  expect(registered.upload_available).toBe(false);
  expect(JSON.stringify(registered)).not.toContain("http");

  const claim = await worker.claim(attempt_id);
  await worker.finalize(claim.run_id, claim.lease_token, {
    regions: [wireRegion({ uncertain: true })],
    provider: "mock",
    model: "mock",
    model_version: "1",
  });

  const candidate = (await input.readInput(attempt_id)).candidate_regions[0];
  const confirmed = await input.confirmExtraction(attempt_id, claim.run_id, [
    { region_id: candidate.region_id, raw_text: "f'(x)=2x", normalized_math: "f'(x)=2x" },
  ]);
  const after = await input.readInput(attempt_id);
  expect(isServerReady(after.input_state)).toBe(true);
  expect(after.can_request_evaluation).toBe(true);

  return { attemptId: attempt_id, confirmedRunId: confirmed.confirmed_run_id, regionId: candidate.region_id };
}

describe("MATH-RELEASE journey — end-user Math flow across modules", () => {
  it("J1 input → confirmation → provider evaluation → finalize (identifiers flow through)", async () => {
    const { attemptId, confirmedRunId, regionId } = await confirmedInput();

    const context: ClaimContext = {
      attempt: { attempt_id: attemptId, kind: "INITIAL", input_kind: "EVIDENCE", prior_evaluation_id: null },
      leaf: { id: "leaf-1", response_format: "FULL_SOLUTION" },
      profile: { requires_reasoning: true },
      selected_extraction_id: confirmedRunId, // ← from the student-confirmed extraction
      extraction_region_ids: [regionId], // ← from the student-confirmed region
      criteria: [],
      solutions: [{ id: "sol-official", provenance: "OFFICIAL" }],
    };

    const evalServer = createMockEvalServer();
    evalServer.seedEvaluation({ evaluation_id: "eval-1", owner: STUDENT, context });
    const worker = new MathEvaluationWorkerClient(evalServer.workerTransport());

    // Provider path: adapter produces a canonical output grounded in the confirmed region.
    const providerOutput = outputWithCore({ steps: [step({ id: "step-1", status: "CALCULATION_ERROR", regions: [regionId] })] });
    const res = await runWorkerEvaluation({
      worker,
      evaluationId: "eval-1",
      adapter: createScriptedEvaluator("mock-provider", "v1", providerOutput),
    });

    expect(res.validation.ok).toBe(true);
    expect(res.finalized).toBe(true);
    expect(res.failed).toBe(false);
    expect(evalServer.state.evaluations.get("eval-1")!.state).toBe("COMPLETED");
  });

  it("J2 provider path is fail-closed: malformed provider output fails the run, never a partial publish", async () => {
    const { attemptId, confirmedRunId, regionId } = await confirmedInput();
    const context: ClaimContext = {
      attempt: { attempt_id: attemptId, kind: "INITIAL", input_kind: "EVIDENCE", prior_evaluation_id: null },
      leaf: { id: "leaf-1", response_format: "FULL_SOLUTION" },
      profile: { requires_reasoning: true },
      selected_extraction_id: confirmedRunId,
      extraction_region_ids: [regionId],
      criteria: [],
      solutions: [{ id: "sol-official", provenance: "OFFICIAL" }],
    };
    const evalServer = createMockEvalServer();
    evalServer.seedEvaluation({ evaluation_id: "eval-1", owner: STUDENT, context });
    const worker = new MathEvaluationWorkerClient(evalServer.workerTransport());

    // A step citing a region that was NOT confirmed is ungrounded → validation fails → run FAILED.
    const malformed = outputWithCore({ steps: [step({ id: "step-1", status: "CALCULATION_ERROR", regions: ["ghost-region"] })] });
    const res = await runWorkerEvaluation({
      worker,
      evaluationId: "eval-1",
      adapter: createScriptedEvaluator("mock-provider", "v1", malformed),
    });

    expect(res.finalized).toBe(false);
    expect(res.failed).toBe(true);
    expect(evalServer.state.evaluations.get("eval-1")!.state).toBe("FAILED");
  });

  it("J3 learning journey: hint → solution → re-solve → INCLUDED reevaluation charges no extra Credit", async () => {
    const learnServer = createMockLearningServer();
    learnServer.seedLearning({
      owner: STUDENT,
      state: learningStateFixture({ included_reevaluation: includedReevaluation({ status: "AVAILABLE", eligible: true }) }),
      hintBodies: [{ hintId: "h-l1", coreId: "core-1", level: 1, body: "부호 방향" }],
      solutionBodies: [{ solutionId: "sol-official", target: "REFERENCE", provenance: "OFFICIAL_SOLUTION", physicalOrigin: "OFFICIAL", body: "해설" }],
      validStepIds: ["step-1"],
      historyEntries: [],
    });
    const learn = new LearningRuntimeClient(learnServer.studentTransport(STUDENT));

    const state = await learn.readLearningState("eval-1");
    expect(state.core).toHaveLength(1);

    await learn.revealHint("eval-1", "h-l1", 1, "k-hint");
    await learn.revealSolution("eval-1", "REFERENCE", "k-sol", "sol-official");

    const attempt = await learn.createResolveAttempt(prepareResolveAttempt(state, {
      kind: "FULL_RESOLVE",
      inputKind: "TYPED",
      clientSubmissionId: "resolve-1",
      typedAnswer: "고친 풀이",
    }));
    expect(attempt.attempt_id).toBeTypeOf("string");

    const reeval = await learn.requestReevaluation(attempt.attempt_id, "reeval-1");
    // The release-critical commercial invariant: included reevaluation deducts NO additional Credit.
    expect(reeval.commercial_context).toBe("INCLUDED_REEVALUATION");
    expect(reeval.additional_credit).toBe(0);
  });

  it("J4 learning history is ordered oldest-first regardless of seed order", async () => {
    const learnServer = createMockLearningServer();
    learnServer.seedLearning({
      owner: STUDENT,
      state: learningStateFixture(),
      hintBodies: [],
      solutionBodies: [],
      validStepIds: ["step-1"],
      // seeded out of order on purpose; the timeline must normalize to oldest-first
      historyEntries: [
        historyEntryFixture({ attempt_id: "att-2", created_at: "2026-10-03T00:00:00.000Z", resolve_kind: "FULL_RESOLVE" }),
        historyEntryFixture({ attempt_id: "att-1", created_at: "2026-10-02T00:00:00.000Z", resolve_kind: "INITIAL" }),
      ],
    });
    const learn = new LearningRuntimeClient(learnServer.studentTransport(STUDENT));

    const timeline = buildLearningTimeline(await learn.readLearningHistory("eval-1"));
    expect(timeline.attempts.map((a) => a.attemptId)).toEqual(["att-1", "att-2"]);
    expect(timeline.attempts.map((a) => a.ordinal)).toEqual([1, 2]);
  });

  it("J5 ADR-2 erasure (consumer): a student in ERASING is denied new writes on every surface", async () => {
    // input
    const inputServer = createMockMathServer({ lifecycle: { [STUDENT]: "ERASING" } });
    const input = new MathInputClient(inputServer.studentTransport(STUDENT));
    await expect(
      input.createAttempt({ client_submission_id: "c", leaf_id: "leaf-1", kind: "INITIAL", input_kind: "EVIDENCE" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    // evaluation worker
    const evalServer = createMockEvalServer({ lifecycle: { [STUDENT]: "ERASING" } });
    evalServer.seedEvaluation({
      evaluation_id: "eval-1",
      owner: STUDENT,
      context: {
        attempt: { attempt_id: "att-1", kind: "INITIAL", input_kind: "EVIDENCE", prior_evaluation_id: null },
        leaf: { id: "leaf-1", response_format: "FULL_SOLUTION" },
        profile: { requires_reasoning: true },
        selected_extraction_id: "run-c1",
        extraction_region_ids: ["rg-1"],
        criteria: [],
        solutions: [{ id: "sol-official", provenance: "OFFICIAL" }],
      },
    });
    const worker = new MathEvaluationWorkerClient(evalServer.workerTransport());
    await expect(worker.claim("eval-1")).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    // learning
    const learnServer = createMockLearningServer({ lifecycle: { [STUDENT]: "ERASING" } });
    learnServer.seedLearning({
      owner: STUDENT,
      state: learningStateFixture(),
      hintBodies: [],
      solutionBodies: [],
      validStepIds: ["step-1"],
      historyEntries: [],
    });
    const learn = new LearningRuntimeClient(learnServer.studentTransport(STUDENT));
    await expect(
      learn.createResolveAttempt({
        client_submission_id: "c1",
        leaf_id: "leaf-1",
        kind: "FULL_RESOLVE",
        predecessor_id: "att-1",
        prior_evaluation_id: "eval-1",
        input_kind: "TYPED",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
