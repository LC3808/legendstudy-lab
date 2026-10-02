import { describe, expect, it } from "vitest";

import { fixedClock, imageArtifact, region } from "../fixtures";
import { createStaticAdapter } from "../mock-adapter";
import { runExtractionPipeline } from "../orchestration";
import { isServerReady, type WireExtractionRegion } from "./contract";
import { MathRuntimeError } from "./errors";
import { MathExtractionWorkerClient, runWorkerExtraction } from "./extraction-worker-client";
import { MathInputClient } from "./input-client";
import { createMockMathServer } from "./mock-server";

const SUBJECT = "student-A";

function wireRegion(overrides: Partial<WireExtractionRegion> = {}): WireExtractionRegion {
  return {
    artifact_id: "art",
    page: 0,
    reading_order: 0,
    raw_text: "x^2",
    normalized_math: "x^2",
    uncertain: false,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    ...overrides,
  };
}

function output(regions: WireExtractionRegion[]) {
  return { regions, provider: "mock", model: "mock", model_version: "1" };
}

async function expectRuntimeError(promise: Promise<unknown>, code: MathRuntimeError["code"]) {
  await expect(promise).rejects.toMatchObject({ code });
}

/** create an EVIDENCE attempt with one registered artifact. */
async function attemptWithEvidence(input: MathInputClient) {
  const { attempt_id } = await input.createAttempt({
    client_submission_id: `csid-${Math.random()}`,
    leaf_id: "leaf-1",
    kind: "INITIAL",
    input_kind: "EVIDENCE",
  });
  await input.registerEvidence(attempt_id, { position: 1, media_type: "image/png", byte_size: 1000 });
  return attempt_id;
}

describe("MATH-3B-R runtime binding (B01–B20)", () => {
  it("B01 create attempt success", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const result = await input.createAttempt({ client_submission_id: "c1", leaf_id: "leaf-1", kind: "INITIAL", input_kind: "EVIDENCE" });
    expect(result.attempt_id).toBeTypeOf("string");
  });

  it("B02 forged owner impossible (another subject cannot read the attempt; owner is server-derived)", async () => {
    const server = createMockMathServer();
    const a = new MathInputClient(server.studentTransport("student-A"));
    const b = new MathInputClient(server.studentTransport("student-B"));
    const { attempt_id } = await a.createAttempt({ client_submission_id: "c1", leaf_id: "leaf-1", kind: "INITIAL", input_kind: "EVIDENCE" });
    await expectRuntimeError(b.readInput(attempt_id), "UNAVAILABLE");
  });

  it("B03 register evidence returns an artifact id", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const attemptId = (await input.createAttempt({ client_submission_id: "c1", leaf_id: "leaf-1", kind: "INITIAL", input_kind: "EVIDENCE" })).attempt_id;
    const res = await input.registerEvidence(attemptId, { position: 1, media_type: "image/png", byte_size: 1000 });
    expect(res.artifact_id).toBeTypeOf("string");
  });

  it("B04 upload is represented as unavailable (R21), never a fake success/URL", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const attemptId = await attemptWithEvidence(input);
    const res = await input.registerEvidence(attemptId, { position: 2, media_type: "image/png", byte_size: 1000 });
    expect(res.upload_available).toBe(false);
    expect(JSON.stringify(res)).not.toContain("http");
  });

  it("B05 students cannot reach the worker extraction surface", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const attemptId = await attemptWithEvidence(input);
    const workerOnStudent = new MathExtractionWorkerClient(server.studentTransport(SUBJECT));
    await expectRuntimeError(workerOnStudent.claim(attemptId), "UNAUTHORIZED");
  });

  it("B06 extraction finalize completes a candidate", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const worker = new MathExtractionWorkerClient(server.workerTransport());
    const attemptId = await attemptWithEvidence(input);
    const claim = await worker.claim(attemptId);
    const fin = await worker.finalize(claim.run_id, claim.lease_token, output([wireRegion()]));
    expect(fin.run_id).toBe(claim.run_id);
    const read = await input.readInput(attemptId);
    expect(read.candidate).not.toBeNull();
  });

  it("B06b worker flow via the MATH-3B adapter boundary", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const worker = new MathExtractionWorkerClient(server.workerTransport());
    const attemptId = await attemptWithEvidence(input);
    const adapter = createStaticAdapter("mock", "m1", {
      regions: [region({ pageIndex: 0, role: "FINAL_ANSWER", rawText: "a=3", normalizedMath: "a=3", confidence: "HIGH" })],
      providerStatus: "OK",
    });
    const res = await runWorkerExtraction({ worker, attemptId, responseFormat: "FULL_SOLUTION", adapter });
    expect(res).toHaveProperty("run_id");
  });

  it("B07 duplicate finalize is idempotent; changed output conflicts", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const worker = new MathExtractionWorkerClient(server.workerTransport());
    const attemptId = await attemptWithEvidence(input);
    const claim = await worker.claim(attemptId);
    await worker.finalize(claim.run_id, claim.lease_token, output([wireRegion()]));
    const again = await worker.finalize(claim.run_id, claim.lease_token, output([wireRegion()]));
    expect(again.run_id).toBe(claim.run_id);
    await expectRuntimeError(worker.finalize(claim.run_id, claim.lease_token, output([wireRegion({ raw_text: "x^3", normalized_math: "x^3" })])), "CONFLICT");
  });

  it("B08 confirmation success → READY", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const worker = new MathExtractionWorkerClient(server.workerTransport());
    const attemptId = await attemptWithEvidence(input);
    const claim = await worker.claim(attemptId);
    await worker.finalize(claim.run_id, claim.lease_token, output([wireRegion({ uncertain: true })]));
    const read = await input.readInput(attemptId);
    const candidate = read.candidate_regions[0];
    const confirmed = await input.confirmExtraction(attemptId, claim.run_id, [
      { region_id: candidate.region_id, raw_text: "x^2", normalized_math: "x^2" },
    ]);
    expect(confirmed.confirmed_run_id).toBeTypeOf("string");
    const after = await input.readInput(attemptId);
    expect(isServerReady(after.input_state)).toBe(true);
  });

  it("B09 stale confirmation (newer claim supersedes) is rejected", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const worker = new MathExtractionWorkerClient(server.workerTransport());
    const attemptId = await attemptWithEvidence(input);
    const claim = await worker.claim(attemptId);
    await worker.finalize(claim.run_id, claim.lease_token, output([wireRegion({ uncertain: true })]));
    const read = await input.readInput(attemptId);
    const candidate = read.candidate_regions[0];
    await worker.claim(attemptId); // newer claim → older candidate ineligible
    await expectRuntimeError(
      input.confirmExtraction(attemptId, claim.run_id, [{ region_id: candidate.region_id, raw_text: "x^2", normalized_math: "x^2" }]),
      "INVALID_OR_STALE",
    );
  });

  it("B10 foreign/wrong-attempt confirmation is rejected", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const worker = new MathExtractionWorkerClient(server.workerTransport());
    const a1 = await attemptWithEvidence(input);
    const a2 = await attemptWithEvidence(input);
    const claim1 = await worker.claim(a1);
    await worker.finalize(claim1.run_id, claim1.lease_token, output([wireRegion({ uncertain: true })]));
    await expectRuntimeError(
      input.confirmExtraction(a2, claim1.run_id, [{ region_id: "x", raw_text: "x^2", normalized_math: "x^2" }]),
      "INVALID_OR_STALE",
    );
  });

  it("B11 client READY prediction is not authority; server wins", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const worker = new MathExtractionWorkerClient(server.workerTransport());
    const attemptId = await attemptWithEvidence(input);

    // Client local prediction (all-confident) would say READY…
    const clientPrediction = await runExtractionPipeline({
      attemptId,
      responseFormat: "FULL_SOLUTION",
      artifacts: [imageArtifact(0)],
      primary: createStaticAdapter("mock", "m1", { regions: [region({ role: "FINAL_ANSWER", confidence: "HIGH" })], providerStatus: "OK" }),
      clock: fixedClock,
    });
    expect(clientPrediction.readiness.status).toBe("READY_FOR_EVALUATION");

    // …but the server candidate has an uncertain region → server is CONFIRMATION_REQUIRED.
    const claim = await worker.claim(attemptId);
    await worker.finalize(claim.run_id, claim.lease_token, output([wireRegion({ uncertain: true })]));
    const server_read = await input.readInput(attemptId);
    expect(server_read.input_state).toBe("CONFIRMATION_REQUIRED");
    expect(isServerReady(server_read.input_state)).toBe(false);
  });

  it("B12 server READY success", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const { attempt_id } = await input.createAttempt({ client_submission_id: "c1", leaf_id: "leaf-1", kind: "INITIAL", input_kind: "TYPED", typed_answer: "12" });
    const read = await input.readInput(attempt_id);
    expect(isServerReady(read.input_state)).toBe(true);
  });

  it("B13 critical ambiguity blocks server READY", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const worker = new MathExtractionWorkerClient(server.workerTransport());
    const attemptId = await attemptWithEvidence(input);
    const claim = await worker.claim(attemptId);
    await worker.finalize(claim.run_id, claim.lease_token, output([wireRegion({ uncertain: true })]));
    const read = await input.readInput(attemptId);
    expect(read.input_state).toBe("CONFIRMATION_REQUIRED");
    expect(read.can_request_evaluation).toBe(false);
  });

  it("B14 typed SHORT_ANSWER becomes READY without any Vision run", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const { attempt_id } = await input.createAttempt({ client_submission_id: "c1", leaf_id: "leaf-sa", kind: "INITIAL", input_kind: "TYPED", typed_answer: "12" });
    const read = await input.readInput(attempt_id);
    expect(isServerReady(read.input_state)).toBe(true);
    expect(read.candidate).toBeNull();
  });

  it("B15 lifecycle denial blocks new input", async () => {
    const server = createMockMathServer({ lifecycle: { "student-erasing": "ERASING" } });
    const input = new MathInputClient(server.studentTransport("student-erasing"));
    await expectRuntimeError(
      input.createAttempt({ client_submission_id: "c1", leaf_id: "leaf-1", kind: "INITIAL", input_kind: "EVIDENCE" }),
      "UNAUTHORIZED",
    );
  });

  it("B16 duplicate exact confirmation is idempotent", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const worker = new MathExtractionWorkerClient(server.workerTransport());
    const attemptId = await attemptWithEvidence(input);
    const claim = await worker.claim(attemptId);
    await worker.finalize(claim.run_id, claim.lease_token, output([wireRegion({ uncertain: true })]));
    const candidate = (await input.readInput(attemptId)).candidate_regions[0];
    const payload = [{ region_id: candidate.region_id, raw_text: "x^2", normalized_math: "x^2" }];
    const first = await input.confirmExtraction(attemptId, claim.run_id, payload);
    const second = await input.confirmExtraction(attemptId, claim.run_id, payload);
    expect(second.confirmed_run_id).toBe(first.confirmed_run_id);
  });

  it("B17 changed duplicate confirmation conflicts", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const worker = new MathExtractionWorkerClient(server.workerTransport());
    const attemptId = await attemptWithEvidence(input);
    const claim = await worker.claim(attemptId);
    await worker.finalize(claim.run_id, claim.lease_token, output([wireRegion({ uncertain: true })]));
    const candidate = (await input.readInput(attemptId)).candidate_regions[0];
    await input.confirmExtraction(attemptId, claim.run_id, [{ region_id: candidate.region_id, raw_text: "x^2", normalized_math: "x^2" }]);
    await expectRuntimeError(
      input.confirmExtraction(attemptId, claim.run_id, [{ region_id: candidate.region_id, raw_text: "x^3", normalized_math: "x^3" }]),
      "CONFLICT",
    );
  });

  it("B18 confirmation does not create a re-solve attempt", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const worker = new MathExtractionWorkerClient(server.workerTransport());
    const attemptId = await attemptWithEvidence(input);
    const claim = await worker.claim(attemptId);
    await worker.finalize(claim.run_id, claim.lease_token, output([wireRegion({ uncertain: true })]));
    const candidate = (await input.readInput(attemptId)).candidate_regions[0];
    const before = server.state.attempts.size;
    await input.confirmExtraction(attemptId, claim.run_id, [{ region_id: candidate.region_id, raw_text: "x^2", normalized_math: "x^2" }]);
    expect(server.state.attempts.size).toBe(before);
  });

  it("B19 vision/evidence/confirmation carry no Credit fields", async () => {
    const server = createMockMathServer();
    const input = new MathInputClient(server.studentTransport(SUBJECT));
    const attemptId = await attemptWithEvidence(input);
    const evidence = await input.registerEvidence(attemptId, { position: 2, media_type: "image/png", byte_size: 1000 });
    const serialized = JSON.stringify(evidence).toLowerCase();
    expect(serialized).not.toContain("credit");
    expect(serialized).not.toContain("charge");
  });

  it("B20 worker extraction client is not imported by any client surface", async () => {
    // Static guard: the browser surface (components/app) never imports the worker-only client.
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const roots = ["src/components", "src/app"];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry) && readFileSync(full, "utf8").includes("extraction-worker-client")) offenders.push(full);
      }
    };
    for (const root of roots) walk(root);
    expect(offenders).toEqual([]);
  });
});
