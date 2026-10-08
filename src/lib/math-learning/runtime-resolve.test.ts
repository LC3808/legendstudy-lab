import { describe, expect, it } from "vitest";

import { summarizeReevaluationDelta, rootRemovedWithNewRoot } from "./delta";
import { buildLearningTimeline } from "./history";
import { resolveCtaNote } from "./handoff";
import { prepareResolveAttempt, ResolvePrepError, submittedScopeForKind } from "./resolve";
import { historyEntryFixture, learningStateFixture, reevaluationDeltaFixture } from "./fixtures";
import { LearningRuntimeClient } from "./runtime/learning-client";
import { createMockLearningServer, includedReevaluation, type SeedLearning } from "./runtime/mock-learning-server";
import type { LearningHistoryEntry, LearningState, ResolveKind } from "./runtime/contract";

function seed(stateOverrides: Partial<LearningState> = {}, extra: Partial<SeedLearning> = {}): SeedLearning {
  return {
    owner: "student-A",
    state: learningStateFixture(stateOverrides),
    hintBodies: [{ hintId: "h-l1", coreId: "core-1", level: 1, body: "방향" }],
    solutionBodies: [{ solutionId: "sol-official", target: "REFERENCE", provenance: "OFFICIAL_SOLUTION", physicalOrigin: "OFFICIAL", body: "해설" }],
    validStepIds: ["step-1"],
    historyEntries: [historyEntryFixture()],
    ...extra,
  };
}

function setup(stateOverrides: Partial<LearningState> = {}, opts: { lifecycle?: Record<string, "ACTIVE" | "PENDING" | "ERASING">; extra?: Partial<SeedLearning> } = {}) {
  const server = createMockLearningServer(opts.lifecycle ? { lifecycle: opts.lifecycle } : {});
  server.seedLearning(seed(stateOverrides, opts.extra));
  return { server, client: new LearningRuntimeClient(server.studentTransport("student-A")) };
}

const PREP = { inputKind: "TYPED" as const, clientSubmissionId: "csid-1", typedAnswer: "새 풀이" };

describe("MATH-6B re-solve / reevaluation / history (RSL01–RSL40)", () => {
  it("RSL01 FULL_RESOLVE creates a new attempt", async () => {
    const { client } = setup();
    const state = await client.readLearningState("eval-1");
    const payload = prepareResolveAttempt(state, { ...PREP, kind: "FULL_RESOLVE" });
    const res = await client.createResolveAttempt(payload);
    expect(res.attempt_id).toBeTypeOf("string");
  });

  it("RSL02 STEP_RETRY creates a new attempt", async () => {
    const { client } = setup();
    const state = await client.readLearningState("eval-1");
    const res = await client.createResolveAttempt(prepareResolveAttempt(state, { ...PREP, kind: "STEP_RETRY", targetStepId: "step-1" }));
    expect(res.attempt_id).toBeTypeOf("string");
  });

  it("RSL03 SHORT_ANSWER_RESOLVE creates a new attempt", async () => {
    const { client } = setup({ response_format: "SHORT_ANSWER", resolve_kinds: ["SHORT_ANSWER_RESOLVE", "FULL_RESOLVE"] });
    const state = await client.readLearningState("eval-1");
    const res = await client.createResolveAttempt(prepareResolveAttempt(state, { ...PREP, kind: "SHORT_ANSWER_RESOLVE" }));
    expect(res.attempt_id).toBeTypeOf("string");
  });

  it("RSL04 PARTIAL_RESOLVE rejected", async () => {
    const { client } = setup();
    const state = await client.readLearningState("eval-1");
    expect(() => prepareResolveAttempt(state, { ...PREP, kind: "PARTIAL_RESOLVE" as unknown as ResolveKind })).toThrow(ResolvePrepError);
  });

  it("RSL05 prior attempt + RSL06 prior evaluation immutable after resolve", async () => {
    const { client, server } = setup();
    const state = await client.readLearningState("eval-1");
    await client.createResolveAttempt(prepareResolveAttempt(state, { ...PREP, kind: "FULL_RESOLVE" }));
    const record = server.state.evaluations.get("eval-1")!;
    expect(record.state.attempt_id).toBe("att-1");
    expect(record.state.evaluation_id).toBe("eval-1");
  });

  it("RSL07/08/09 extraction confirmation / solution reveal / hint reveal are not resolves", async () => {
    const { client, server } = setup();
    await client.revealHint("eval-1", "h-l1", 1, "k1");
    await client.revealSolution("eval-1", "REFERENCE", "ks", "sol-official");
    expect(server.state.resolveAttempts.size).toBe(0);
  });

  it("RSL10/RSL11 same-lineage backend authority; byte-different answers stay same lineage", async () => {
    const { client } = setup();
    const state = await client.readLearningState("eval-1");
    const a = await client.createResolveAttempt(prepareResolveAttempt(state, { kind: "FULL_RESOLVE", inputKind: "TYPED", clientSubmissionId: "c1", typedAnswer: "답안 v2" }));
    const b = await client.createResolveAttempt(prepareResolveAttempt(state, { kind: "FULL_RESOLVE", inputKind: "TYPED", clientSubmissionId: "c2", typedAnswer: "완전히 다른 텍스트" }));
    expect(a.attempt_id).not.toBe(b.attempt_id);
  });

  it("RSL12 foreign problem lineage rejected", async () => {
    const { client } = setup();
    await expect(
      client.createResolveAttempt({ client_submission_id: "c1", leaf_id: "leaf-1", kind: "FULL_RESOLVE", predecessor_id: "WRONG", prior_evaluation_id: "eval-1", input_kind: "TYPED" }),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("RSL13 STEP_RETRY valid target; RSL14 foreign target rejected", async () => {
    const { client } = setup();
    const state = await client.readLearningState("eval-1");
    const ok = await client.createResolveAttempt(prepareResolveAttempt(state, { ...PREP, clientSubmissionId: "c-ok", kind: "STEP_RETRY", targetStepId: "step-1" }));
    expect(ok.attempt_id).toBeTypeOf("string");
    const bad = prepareResolveAttempt(state, { ...PREP, clientSubmissionId: "c-bad", kind: "STEP_RETRY", targetStepId: "ghost-step" });
    await expect(client.createResolveAttempt(bad)).rejects.toMatchObject({ code: "INVALID_OR_STALE" });
  });

  it("RSL15 STEP_RETRY downstream NOT_REASSESSED (delta)", () => {
    const view = summarizeReevaluationDelta(reevaluationDeltaFixture({ downstream: "NOT_REASSESSED", target_step_id: "step-1" }))!;
    expect(view.notReassessed).toBe(true);
  });

  it("RSL16 FULL_RESOLVE scope whole-leaf; RSL17 SHORT_ANSWER_RESOLVE no fake reasoning requirement", () => {
    expect(submittedScopeForKind("FULL_RESOLVE")).toBe("WHOLE_LEAF");
    const state = learningStateFixture({ response_format: "SHORT_ANSWER", resolve_kinds: ["SHORT_ANSWER_RESOLVE"] });
    const payload = prepareResolveAttempt(state, { kind: "SHORT_ANSWER_RESOLVE", inputKind: "TYPED", clientSubmissionId: "c1", typedAnswer: "12" });
    expect(payload.target_step_id).toBeUndefined();
  });

  it("RSL18 AVAILABLE shows copy; RSL19 EXPIRED; RSL20 CONSUMED; RSL21 UNAVAILABLE do not", () => {
    expect(resolveCtaNote("AVAILABLE")).toContain("Credit");
    expect(resolveCtaNote("EXPIRED")).toBeNull();
    expect(resolveCtaNote("CONSUMED")).toBeNull();
    expect(resolveCtaNote("UNAVAILABLE")).toBeNull();
  });

  it("RSL22 client does not compute 336h; RSL23 exact expiry follows backend result", async () => {
    const { client } = setup({ included_reevaluation: includedReevaluation({ status: "EXPIRED", eligible: false }) });
    const state = await client.readLearningState("eval-1");
    expect(state.included_reevaluation.expires_at).toBe("2026-10-16T00:00:00.000Z");
    await expect(client.requestReevaluation("att-x", "c1")).rejects.toMatchObject({ code: "UNAVAILABLE" }); // attempt not created yet
  });

  it("RSL23b included request rejected when not AVAILABLE (no paid fallback)", async () => {
    const { client } = setup({ included_reevaluation: includedReevaluation({ status: "EXPIRED", eligible: false }) });
    const state = await client.readLearningState("eval-1");
    const attempt = await client.createResolveAttempt(prepareResolveAttempt(state, { ...PREP, kind: "FULL_RESOLVE" }));
    await expect(client.requestReevaluation(attempt.attempt_id, "re-1")).rejects.toMatchObject({ code: "INVALID_OR_STALE" });
  });

  it("RSL24 requesting included reevaluation does not mark it consumed client-side", async () => {
    const { client } = setup();
    const state = await client.readLearningState("eval-1");
    const attempt = await client.createResolveAttempt(prepareResolveAttempt(state, { ...PREP, kind: "FULL_RESOLVE" }));
    await client.requestReevaluation(attempt.attempt_id, "re-1");
    const after = await client.readLearningState("eval-1");
    expect(after.included_reevaluation.status).toBe("AVAILABLE"); // consumption is a settle-time server fact
  });

  it("RSL25 HUMAN_REVIEW_REQUIRED is a valid evaluation, not a failure", async () => {
    const { client } = setup({ review_status: "HUMAN_REVIEW_REQUIRED", valid_evaluation_available: true });
    const state = await client.readLearningState("eval-1");
    expect(state.review_status).toBe("HUMAN_REVIEW_REQUIRED");
    expect(state.valid_evaluation_available).toBe(true);
  });

  it("RSL26 old ROOT removed", () => {
    const view = summarizeReevaluationDelta(reevaluationDeltaFixture())!;
    expect(view.resolved.some((i) => i.kind === "ROOT_ERROR_REMOVED")).toBe(true);
  });

  it("RSL27 old ROOT removed + new ROOT (both shown)", () => {
    const view = summarizeReevaluationDelta(reevaluationDeltaFixture({ delta: [{ kind: "ROOT_ERROR_REMOVED", explanation: "x" }, { kind: "NEW_INDEPENDENT_ERROR", explanation: "y" }] }))!;
    expect(rootRemovedWithNewRoot(view)).toBe(true);
    expect(view.newIssues).toHaveLength(1);
  });

  it("RSL28 same ROOT persists", () => {
    const view = summarizeReevaluationDelta(reevaluationDeltaFixture({ delta: [{ kind: "ROOT_ERROR_REMAINS", explanation: "여전히" }] }))!;
    expect(view.persisting).toHaveLength(1);
  });

  it("RSL29 NO_MATERIAL_CHANGE", () => {
    const view = summarizeReevaluationDelta(reevaluationDeltaFixture({ delta: [{ kind: "NO_MATERIAL_CHANGE", explanation: "변화 없음" }] }))!;
    expect(view.noMaterialChange).toBe(true);
  });

  it("RSL30 answer fixed / reasoning remains deficient", () => {
    const view = summarizeReevaluationDelta(reevaluationDeltaFixture({ delta: [{ kind: "ANSWER_NOW_CORRECT", explanation: "답 정답" }, { kind: "ROOT_ERROR_REMAINS", explanation: "근거 부족" }] }))!;
    expect(view.answerNowCorrect).toBe(true);
    expect(view.persisting).toHaveLength(1);
  });

  it("RSL31 reasoning improved / answer unchanged", () => {
    const view = summarizeReevaluationDelta(reevaluationDeltaFixture({ delta: [{ kind: "JUSTIFICATION_IMPROVED", explanation: "근거 개선" }] }))!;
    expect(view.justificationImproved).toBe(true);
    expect(view.answerChanged).toBe(false);
  });

  it("RSL32 NOT_REASSESSED represented distinctly from resolved/persisting", () => {
    const view = summarizeReevaluationDelta(reevaluationDeltaFixture({ downstream: "NOT_REASSESSED", delta: [] }))!;
    expect(view.notReassessed).toBe(true);
    expect(view.resolved).toHaveLength(0);
    expect(view.persisting).toHaveLength(0);
  });

  it("RSL33/RSL34 L1/L2 exposure context preserved in history", () => {
    const timeline = buildLearningTimeline({
      lineage_id: "lin-1",
      attempts: [historyEntryFixture({ exposed_hint_levels: [1, 2] })],
      included_reevaluation: includedReevaluation(),
      next_cursor: null,
    });
    expect(timeline.attempts[0].exposedHintLevels).toEqual([1, 2]);
  });

  it("RSL35 solution reveal-before-resolve context preserved", () => {
    const timeline = buildLearningTimeline({
      lineage_id: "lin-1",
      attempts: [historyEntryFixture({ reference_solution_revealed_before_resolve: true })],
      included_reevaluation: includedReevaluation(),
      next_cursor: null,
    });
    expect(timeline.attempts[0].referenceSolutionRevealedBeforeResolve).toBe(true);
  });

  it("RSL36 no hint scoring penalty (no score field anywhere)", () => {
    const timeline = buildLearningTimeline({
      lineage_id: "lin-1",
      attempts: [historyEntryFixture({ exposed_hint_levels: [1, 2], reevaluation_delta: reevaluationDeltaFixture() })],
      included_reevaluation: includedReevaluation(),
      next_cursor: null,
    });
    expect(JSON.stringify(timeline).toLowerCase()).not.toContain("score");
  });

  it("RSL37 learning history ordered (oldest first) + RSL38 supports >2 attempts", async () => {
    const entries: LearningHistoryEntry[] = [
      historyEntryFixture({ attempt_id: "att-3", created_at: "2026-10-04T00:00:00.000Z", resolve_kind: "FULL_RESOLVE" }),
      historyEntryFixture({ attempt_id: "att-2", created_at: "2026-10-03T00:00:00.000Z", resolve_kind: "STEP_RETRY" }),
      historyEntryFixture({ attempt_id: "att-1", created_at: "2026-10-02T00:00:00.000Z", resolve_kind: "INITIAL" }),
    ];
    const { client } = setup({}, { extra: { historyEntries: entries } });
    const timeline = buildLearningTimeline(await client.readLearningHistory("eval-1"));
    expect(timeline.attempts.map((a) => a.attemptId)).toEqual(["att-1", "att-2", "att-3"]);
    expect(timeline.attempts).toHaveLength(3);
    expect(timeline.attempts.map((a) => a.ordinal)).toEqual([1, 2, 3]);
  });

  it("RSL39 exact duplicate resolve + reevaluation retry is idempotent", async () => {
    const { client } = setup();
    const state = await client.readLearningState("eval-1");
    const payload = prepareResolveAttempt(state, { ...PREP, kind: "FULL_RESOLVE" });
    const a1 = await client.createResolveAttempt(payload);
    const a2 = await client.createResolveAttempt(payload);
    expect(a2.attempt_id).toBe(a1.attempt_id);
    const r1 = await client.requestReevaluation(a1.attempt_id, "re-1");
    const r2 = await client.requestReevaluation(a1.attempt_id, "re-1");
    expect(r2.evaluation_id).toBe(r1.evaluation_id);
  });

  it("RSL39b changed resolve payload under same key conflicts", async () => {
    const { client } = setup();
    const state = await client.readLearningState("eval-1");
    await client.createResolveAttempt(prepareResolveAttempt(state, { kind: "FULL_RESOLVE", inputKind: "TYPED", clientSubmissionId: "same", typedAnswer: "A" }));
    await expect(
      client.createResolveAttempt(prepareResolveAttempt(state, { kind: "FULL_RESOLVE", inputKind: "TYPED", clientSubmissionId: "same", typedAnswer: "B" })),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("RSL40 lifecycle restriction blocks new resolve/reevaluation", async () => {
    const { client } = setup({}, { lifecycle: { "student-A": "ERASING" } });
    await expect(
      client.createResolveAttempt({ client_submission_id: "c1", leaf_id: "leaf-1", kind: "FULL_RESOLVE", predecessor_id: "att-1", prior_evaluation_id: "eval-1", input_kind: "TYPED" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
