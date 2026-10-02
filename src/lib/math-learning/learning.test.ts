import { describe, expect, it } from "vitest";

import { baseOutput, evalError, step } from "../math-eval/fixtures";
import { buildCoreView, groupPropagated, referenceLabel } from "./core";
import { buildMath6Handoff, resolveCtaNote } from "./handoff";
import { classifyLeakage, validateHint } from "./hints";
import { coreItem, hint, learningStateFixture, outputWithCore } from "./fixtures";
import { createMockLearningServer, type SeedLearning } from "./runtime/mock-learning-server";
import { LearningRuntimeClient } from "./runtime/learning-client";
import type { HintLevel, LeakagePolicyContext } from "./types";
import type { MathResponseFormat } from "../math-eval/types";

function seededLearningServer(lifecycle?: Record<string, "ACTIVE" | "PENDING" | "ERASING">) {
  const seed: SeedLearning = {
    owner: "student-A",
    state: learningStateFixture(),
    hintBodies: [
      { hintId: "h-l0", coreId: "core-1", level: 0, body: "3단계의 부호 처리를 다시 확인해 보세요." },
      { hintId: "h-l1", coreId: "core-1", level: 1, body: "방향 힌트" },
      { hintId: "h-l2", coreId: "core-1", level: 2, body: "개념 힌트" },
    ],
    solutionBodies: [
      { solutionId: "sol-official", target: "REFERENCE", provenance: "OFFICIAL_SOLUTION", physicalOrigin: "OFFICIAL", body: "공식 해설 본문" },
    ],
  };
  const server = createMockLearningServer(lifecycle ? { lifecycle } : {});
  server.seedLearning(seed);
  return server;
}

const fullCtx: LeakagePolicyContext = { responseFormat: "FULL_SOLUTION" };
const shortCtx: LeakagePolicyContext = { responseFormat: "SHORT_ANSWER", finalAnswer: "12" };

describe("MATH-5B learning guidance — H01–H35", () => {
  it("H01 CORE from one material root", () => {
    const view = buildCoreView(outputWithCore());
    expect(view.primary?.coreId).toBe("core-1");
    expect(view.primary?.errorId).toBe("err-1");
  });

  it("H02 CORE empty is valid", () => {
    const view = buildCoreView(baseOutput({ core: [] }));
    expect(view.primary).toBeNull();
    expect(view.secondary).toEqual([]);
  });

  it("H03 propagated errors grouped under their root", () => {
    const out = baseOutput({
      steps: [step({ id: "s1" }), step({ id: "s2", position: 1, regions: ["rg-2"] }), step({ id: "s3", position: 2, regions: ["rg-3"] })],
      errors: [
        evalError({ id: "root", step_id: "s1", classification: "ROOT", materiality: "MATERIAL" }),
        evalError({ id: "p1", step_id: "s2", classification: "PROPAGATED", materiality: "MATERIAL" }),
        evalError({ id: "p2", step_id: "s3", classification: "PROPAGATED", materiality: "MATERIAL" }),
      ],
      causes: [{ root: "root", consequence: "p1" }, { root: "root", consequence: "p2" }],
    });
    const groups = groupPropagated(out);
    expect(groups).toHaveLength(1);
    expect(groups[0].consequenceErrorIds).toEqual(["p1", "p2"]);
  });

  it("H04 two independent roots + H05 primary/secondary selection", () => {
    const view = buildCoreView(
      outputWithCore({
        core: [coreItem({ id: "c1", position: 0 }), coreItem({ id: "c2", position: 1, error_id: "err-2" })],
        errors: [
          evalError({ id: "err-1", step_id: "step-1", classification: "ROOT", materiality: "MATERIAL" }),
          evalError({ id: "err-2", step_id: "step-1", classification: "ROOT", category: "CASE_OMISSION", materiality: "MATERIAL" }),
        ],
      }),
    );
    expect(view.primary?.coreId).toBe("c1");
    expect(view.secondary.map((s) => s.coreId)).toEqual(["c2"]);
  });

  it("H06 L0 grounded + H07 L0 does not solve (SAFE)", () => {
    const out = outputWithCore();
    const l0 = out.hints.find((h) => h.level === 0)!;
    const v = validateHint(l0, out, fullCtx);
    expect(v.ok).toBe(true);
    expect(v.leakage).toBe("SAFE");
  });

  it("H08 L1 safe direction", () => {
    const out = outputWithCore();
    const v = validateHint(out.hints.find((h) => h.level === 1)!, out, fullCtx);
    expect(v.ok).toBe(true);
    expect(v.leakage).toBe("SAFE");
  });

  it("H09 L1 SHORT_ANSWER answer leak rejected", () => {
    const out = outputWithCore();
    const leaky = hint({ id: "l1", level: 1, body: "정답은 12입니다." });
    const v = validateHint(leaky, { ...out, hints: [leaky] }, shortCtx);
    expect(v.leakage).toBe("FORBIDDEN_LEAK");
    expect(v.ok).toBe(false);
  });

  it("H10 L2 concept reveal allowed", () => {
    const out = outputWithCore();
    const v = validateHint(out.hints.find((h) => h.level === 2)!, out, fullCtx);
    expect(v.ok).toBe(true);
    expect(v.leakage).toBe("POTENTIAL_LEAK");
  });

  it("H11 L2 SHORT_ANSWER answer leak rejected", () => {
    const out = outputWithCore();
    const leaky = hint({ id: "l2", level: 2, leakage_class: "CONCEPT_REVEAL", body: "12를 넣으면 됩니다." });
    const v = validateHint(leaky, { ...out, hints: [leaky] }, shortCtx);
    expect(v.leakage).toBe("FORBIDDEN_LEAK");
  });

  it("H12 FULL_SOLUTION full-derivation (SOLUTION_REVEAL) leak rejected", () => {
    const leaky = hint({ id: "l2", level: 2, leakage_class: "SOLUTION_REVEAL", body: "전체 풀이: …" });
    expect(classifyLeakage(leaky, fullCtx)).toBe("FORBIDDEN_LEAK");
  });

  it("H13 PROOF verbatim proof (SOLUTION_REVEAL) leak rejected", () => {
    const leaky = hint({ id: "l2", level: 2, leakage_class: "SOLUTION_REVEAL", body: "증명 전체" });
    expect(classifyLeakage(leaky, { responseFormat: "PROOF" })).toBe("FORBIDDEN_LEAK");
  });

  it("H14/H15/H16 reference provenance labels", () => {
    expect(referenceLabel("OFFICIAL").label).toBe("대학 공식 해설");
    expect(referenceLabel("VERIFIED_INTERNAL").label).toBe("레전드스터디 검증 풀이");
    expect(referenceLabel("AI_GENERATED_REFERENCE").label).toBe("AI 참고 풀이");
  });

  it("H17 AI reference cannot masquerade as official", () => {
    expect(referenceLabel("AI_GENERATED_REFERENCE").label).not.toBe(referenceLabel("OFFICIAL").label);
  });

  it("H18 L1 progressive reveal via canonical math_learning runtime", async () => {
    const server = seededLearningServer();
    const client = new LearningRuntimeClient(server.studentTransport("student-A"));
    const res = await client.revealHint("eval-1", "h-l1", 1, "csid-1");
    expect(res.level).toBe(1);
    expect(res.body).toBe("방향 힌트");
  });

  it("H19 L2 requires L1 first (progressive gating)", async () => {
    const server = seededLearningServer();
    const client = new LearningRuntimeClient(server.studentTransport("student-A"));
    await expect(client.revealHint("eval-1", "h-l2", 2, "csid-a")).rejects.toMatchObject({ code: "INVALID_OR_STALE" });
    await client.revealHint("eval-1", "h-l1", 1, "csid-b");
    const res = await client.revealHint("eval-1", "h-l2", 2, "csid-c");
    expect(res.level).toBe(2);
  });

  it("H20 early solution reveal allowed + H21 records context (REFERENCE_SOLUTION_REVEALED)", async () => {
    const server = seededLearningServer();
    const client = new LearningRuntimeClient(server.studentTransport("student-A"));
    const res = await client.revealSolution("eval-1", "REFERENCE", "csid-sol", "sol-official");
    expect(res.learning_context).toBe("REFERENCE_SOLUTION_REVEALED");
    expect(server.state.evaluations.get("eval-1")!.solutionExposures).toHaveLength(1);
  });

  it("H22 hint exposure recorded + H25 no scoring + H26 no credit fields", async () => {
    const server = seededLearningServer();
    const client = new LearningRuntimeClient(server.studentTransport("student-A"));
    const res = await client.revealHint("eval-1", "h-l1", 1, "csid-1");
    expect(server.state.evaluations.get("eval-1")!.hintExposures).toHaveLength(1);
    const serialized = JSON.stringify(res).toLowerCase();
    expect(serialized).not.toContain("credit");
    expect(serialized).not.toContain("score");
  });

  it("H23 duplicate exposure idempotent", async () => {
    const server = seededLearningServer();
    const client = new LearningRuntimeClient(server.studentTransport("student-A"));
    await client.revealHint("eval-1", "h-l1", 1, "csid-1");
    const again = await client.revealHint("eval-1", "h-l1", 1, "csid-1");
    expect(again.replayed).toBe(true);
    expect(server.state.evaluations.get("eval-1")!.hintExposures).toHaveLength(1);
  });

  it("H24 changed duplicate (same key, different hint) conflicts", async () => {
    const server = seededLearningServer();
    const client = new LearningRuntimeClient(server.studentTransport("student-A"));
    await client.revealHint("eval-1", "h-l1", 1, "csid-1");
    await expect(client.revealHint("eval-1", "h-l2", 2, "csid-1")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("H27 solution reveal carries no Credit", async () => {
    const server = seededLearningServer();
    const client = new LearningRuntimeClient(server.studentTransport("student-A"));
    const res = await client.revealSolution("eval-1", "REFERENCE", "csid-sol", "sol-official");
    expect(JSON.stringify(res).toLowerCase()).not.toContain("credit");
  });

  it("H28 invalid CORE binding (ungrounded core) rejected", () => {
    const out = outputWithCore({
      core: [coreItem({ id: "core-1", error_id: "ghost", step_id: null })],
      hints: [hint({ id: "l1", core_id: "core-1", level: 1 })],
    });
    const v = validateHint(out.hints[0], out, fullCtx);
    expect(v.ok).toBe(false);
    expect(v.issues).toContain("UNGROUNDED_HINT");
  });

  it("H29 invalid hint/CORE binding rejected", () => {
    const out = outputWithCore();
    const v = validateHint(hint({ id: "l1", core_id: "ghost-core" }), out, fullCtx);
    expect(v.issues).toContain("UNBOUND_HINT");
  });

  it("H30 unknown hint/rubric version rejected", () => {
    const out = outputWithCore({ rubric: { rubric_version: "math-rubric-v2", dimensions: {} } });
    const v = validateHint(out.hints.find((h) => h.level === 1)!, out, fullCtx);
    expect(v.issues).toContain("UNKNOWN_HINT_VERSION");
  });

  it("H31 ungrounded hint rejected", () => {
    const out = outputWithCore({ core: [coreItem({ error_id: null, step_id: null })] });
    const v = validateHint(out.hints.find((h) => h.level === 1)!, out, fullCtx);
    expect(v.issues).toContain("UNGROUNDED_HINT");
  });

  it("H32 re-solve handoff includes prior CORE", () => {
    const view = buildCoreView(outputWithCore());
    const handoff = buildMath6Handoff({ evaluationId: "eval-1", leafId: "leaf-1", coreView: view, exposedLevels: new Set<HintLevel>([1]), referenceSolutionRevealed: false });
    expect(handoff.priorCore?.coreId).toBe("core-1");
    expect(handoff.hintLevelsExposed).toEqual([1]);
    expect(handoff.resolveEligibility).toBe("BACKEND_AUTHORITY");
  });

  it("H33 eligibility unavailable does not promise free reevaluation", () => {
    expect(resolveCtaNote("UNAVAILABLE")).toBeNull();
    expect(resolveCtaNote("UNKNOWN")).toBeNull();
    expect(resolveCtaNote("AVAILABLE")).toContain("Credit");
  });

  it("H34 Human Quality hint evidence is preserved (CORE/hints/leakage/provenance)", () => {
    const out = outputWithCore();
    const l2 = out.hints.find((h) => h.level === 2)!;
    const v = validateHint(l2, out, fullCtx);
    // Frozen evidence a reviewer needs: CORE, hint body+level, leakage classification, provenance.
    expect(out.core.length).toBeGreaterThan(0);
    expect(l2.leakage_class).toBe("CONCEPT_REVEAL");
    expect(v.leakage).toBe("POTENTIAL_LEAK");
    expect(referenceLabel("AI_GENERATED_REFERENCE").label).toBe("AI 참고 풀이");
  });

  it("H35 response-format-aware across all four formats", () => {
    const formats: MathResponseFormat[] = ["SHORT_ANSWER", "SHORT_REASONING", "FULL_SOLUTION", "PROOF"];
    for (const responseFormat of formats) {
      const ctx: LeakagePolicyContext = { responseFormat, finalAnswer: responseFormat === "SHORT_ANSWER" ? "12" : null };
      expect(classifyLeakage(hint({ level: 1, leakage_class: "SAFE_DIRECTION", body: "방향" }), ctx)).toBe("SAFE");
      expect(classifyLeakage(hint({ level: 2, leakage_class: "SOLUTION_REVEAL", body: "전체" }), ctx)).toBe("FORBIDDEN_LEAK");
    }
    expect(classifyLeakage(hint({ level: 1, body: "12" }), { responseFormat: "SHORT_ANSWER", finalAnswer: "12" })).toBe("FORBIDDEN_LEAK");
  });
});
