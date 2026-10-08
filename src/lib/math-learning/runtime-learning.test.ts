import { describe, expect, it } from "vitest";

import { solutionProvenanceLabel } from "./core";
import { learningStateFixture } from "./fixtures";
import { buildMath6HandoffFromState, resolveCtaNote } from "./handoff";
import { LearningRuntimeClient } from "./runtime/learning-client";
import {
  createMockLearningServer,
  includedReevaluation,
  type SeedLearning,
} from "./runtime/mock-learning-server";
import type { LearningState } from "./runtime/contract";

function baseSeed(stateOverrides: Partial<LearningState> = {}): SeedLearning {
  return {
    owner: "student-A",
    state: learningStateFixture(stateOverrides),
    hintBodies: [
      { hintId: "h-l0", coreId: "core-1", level: 0, body: "L0 무엇을 고칠지" },
      { hintId: "h-l1", coreId: "core-1", level: 1, body: "방향 힌트" },
      { hintId: "h-l2", coreId: "core-1", level: 2, body: "개념 힌트" },
    ],
    solutionBodies: [
      { solutionId: "sol-official", target: "REFERENCE", provenance: "OFFICIAL_SOLUTION", physicalOrigin: "OFFICIAL", body: "공식 해설" },
      { solutionId: "sol-ai", target: "REFERENCE", provenance: "AI_GENERATED_REFERENCE", physicalOrigin: "AI_PROPOSED", body: "AI 참고" },
    ],
  };
}

function setup(opts: { lifecycle?: Record<string, "ACTIVE" | "PENDING" | "ERASING">; state?: Partial<LearningState> } = {}) {
  const server = createMockLearningServer(opts.lifecycle ? { lifecycle: opts.lifecycle } : {});
  server.seedLearning(baseSeed(opts.state));
  return { server, client: new LearningRuntimeClient(server.studentTransport("student-A")) };
}

describe("MATH-5B-R learning runtime binding (LR01–LR20)", () => {
  it("LR01 learning-state binding", async () => {
    const { client } = setup();
    const state = await client.readLearningState("eval-1");
    expect(state.evaluation_id).toBe("eval-1");
    expect(state.hint_availability).toBe("FROM_FROZEN_HINTS");
  });

  it("LR02 foreign state denied", async () => {
    const { server } = setup();
    const foreign = new LearningRuntimeClient(server.studentTransport("student-B"));
    await expect(foreign.readLearningState("eval-1")).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("LR03 hint availability (can_reveal) comes from the server", async () => {
    const { client } = setup();
    const before = await client.readLearningState("eval-1");
    expect(before.hints.find((h) => h.level === 2)!.can_reveal).toBe(false);
    await client.revealHint("eval-1", "h-l1", 1, "k1");
    const after = await client.readLearningState("eval-1");
    expect(after.hints.find((h) => h.level === 2)!.can_reveal).toBe(true);
    expect(after.hints.find((h) => h.level === 1)!.revealed).toBe(true);
  });

  it("LR04 L1 reveal binding", async () => {
    const { client } = setup();
    const res = await client.revealHint("eval-1", "h-l1", 1, "k1");
    expect(res.body).toBe("방향 힌트");
  });

  it("LR05 L2 reveal binding (after L1)", async () => {
    const { client } = setup();
    await client.revealHint("eval-1", "h-l1", 1, "k1");
    const res = await client.revealHint("eval-1", "h-l2", 2, "k2");
    expect(res.level).toBe(2);
  });

  it("LR06 duplicate hint reveal idempotent", async () => {
    const { client } = setup();
    await client.revealHint("eval-1", "h-l1", 1, "k1");
    const again = await client.revealHint("eval-1", "h-l1", 1, "k1");
    expect(again.replayed).toBe(true);
  });

  it("LR07 changed duplicate conflicts", async () => {
    const { client } = setup();
    await client.revealHint("eval-1", "h-l1", 1, "k1");
    await expect(client.revealHint("eval-1", "h-l2", 2, "k1")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("LR08 solution reveal binding", async () => {
    const { client } = setup();
    const res = await client.revealSolution("eval-1", "REFERENCE", "ks", "sol-official");
    expect(res.body).toBe("공식 해설");
    expect(res.learning_context).toBe("REFERENCE_SOLUTION_REVEALED");
  });

  it("LR09 early solution reveal (no hints first) allowed", async () => {
    const { client } = setup();
    const res = await client.revealSolution("eval-1", "REFERENCE", "ks", "sol-official");
    expect(res.exposure_id).toBeTypeOf("string");
  });

  it("LR10 provenance preserved", async () => {
    const { client } = setup();
    const res = await client.revealSolution("eval-1", "REFERENCE", "ks", "sol-official");
    expect(res.provenance).toBe("OFFICIAL_SOLUTION");
    expect(solutionProvenanceLabel(res.provenance)).toBe("대학 공식 해설");
  });

  it("LR11 AI reference cannot become official", async () => {
    const { client } = setup();
    const res = await client.revealSolution("eval-1", "REFERENCE", "ks", "sol-ai");
    expect(res.provenance).toBe("AI_GENERATED_REFERENCE");
    expect(solutionProvenanceLabel(res.provenance)).toBe("AI 참고 풀이");
    expect(solutionProvenanceLabel(res.provenance)).not.toBe("대학 공식 해설");
  });

  it("LR12 duplicate solution reveal idempotent", async () => {
    const { client } = setup();
    const first = await client.revealSolution("eval-1", "REFERENCE", "ks", "sol-official");
    const again = await client.revealSolution("eval-1", "REFERENCE", "ks", "sol-official");
    expect(again.replayed).toBe(true);
    expect(again.exposure_id).toBe(first.exposure_id);
  });

  it("LR13 reveal context reaches the MATH-6 handoff", async () => {
    const { client } = setup();
    await client.revealSolution("eval-1", "REFERENCE", "ks", "sol-official");
    const state = await client.readLearningState("eval-1");
    const handoff = buildMath6HandoffFromState(state);
    expect(handoff.referenceSolutionRevealed).toBe(true);
    expect(handoff.priorCore?.coreId).toBe("core-1");
  });

  it("LR14 eligible reevaluation shows the no-extra-Credit copy", async () => {
    const { client } = setup();
    const handoff = buildMath6HandoffFromState(await client.readLearningState("eval-1"));
    expect(handoff.includedStatus).toBe("AVAILABLE");
    expect(resolveCtaNote(handoff.includedStatus)).toContain("Credit");
  });

  it("LR15 expired reevaluation does not show free copy", async () => {
    const { client } = setup({ state: { included_reevaluation: includedReevaluation({ status: "EXPIRED", eligible: false }) } });
    const handoff = buildMath6HandoffFromState(await client.readLearningState("eval-1"));
    expect(resolveCtaNote(handoff.includedStatus)).toBeNull();
  });

  it("LR16 unavailable eligibility does not show free copy", async () => {
    const { client } = setup({ state: { included_reevaluation: includedReevaluation({ status: "UNAVAILABLE", eligible: false }) } });
    const handoff = buildMath6HandoffFromState(await client.readLearningState("eval-1"));
    expect(resolveCtaNote(handoff.includedStatus)).toBeNull();
  });

  it("LR17 336h window is taken from the server, not recomputed client-side", async () => {
    const serverExpiry = "2026-10-20T00:00:00.000Z";
    const { client } = setup({ state: { included_reevaluation: includedReevaluation({ expires_at: serverExpiry }) } });
    const handoff = buildMath6HandoffFromState(await client.readLearningState("eval-1"));
    expect(handoff.includedExpiresAt).toBe(serverExpiry); // used verbatim; no client date math
  });

  it("LR18 lifecycle denial", async () => {
    const { client } = setup({ lifecycle: { "student-A": "ERASING" } });
    await expect(client.readLearningState("eval-1")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(client.revealHint("eval-1", "h-l1", 1, "k1")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("LR19 hint reveal causes no Credit charge", async () => {
    const { client } = setup();
    const res = await client.revealHint("eval-1", "h-l1", 1, "k1");
    expect(JSON.stringify(res).toLowerCase()).not.toContain("credit");
  });

  it("LR20 solution reveal causes no Credit charge", async () => {
    const { client } = setup();
    const res = await client.revealSolution("eval-1", "REFERENCE", "ks", "sol-official");
    expect(JSON.stringify(res).toLowerCase()).not.toContain("credit");
  });
});
