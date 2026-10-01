import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { QualityRpcClient } from "./client";
import { createHumanReviewClient } from "./human-review-client";
import { hqJudgmentPageFixture, hqReviewStateFixture, hqSubmitResultFixture } from "./human-review-fixtures";

type RpcResult = { data: unknown; error: unknown };

function makeClient(options: { session?: unknown; rpc?: (fn: string, params: unknown) => RpcResult }) {
  const rpc = vi.fn((fn: string, params: unknown) =>
    Promise.resolve(options.rpc ? options.rpc(fn, params) : { data: null, error: null }),
  );
  const client = {
    rpc: rpc as unknown as QualityRpcClient["rpc"],
    auth: { getSession: () => Promise.resolve({ data: { session: options.session ?? null } }) } as unknown as QualityRpcClient["auth"],
  };
  return { client, rpc };
}

const SESSION = { access_token: "secret-token", user: { id: "u-1" } };

describe("HumanReviewClient session gate", () => {
  it("throws UNAUTHENTICATED and calls no RPC without a session", async () => {
    const { client, rpc } = makeClient({ session: null });
    const hr = createHumanReviewClient(client);
    await expect(hr.getReviewState(["e1"])).rejects.toMatchObject({ kind: "UNAUTHENTICATED" });
    await expect(hr.listJudgments("e1")).rejects.toMatchObject({ kind: "UNAUTHENTICATED" });
    await expect(hr.submitJudgment({} as never)).rejects.toMatchObject({ kind: "UNAUTHENTICATED" });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("getReviewState", () => {
  it("dedupes ids and passes them to the batch RPC", async () => {
    const { client, rpc } = makeClient({ session: SESSION, rpc: () => ({ data: hqReviewStateFixture, error: null }) });
    const rows = await createHumanReviewClient(client).getReviewState(["a", "a", "b"]);
    expect(rows).toHaveLength(4);
    expect(rpc).toHaveBeenCalledWith("ql_review_state", { p_evaluation_ids: ["a", "b"] });
  });

  it("returns [] for an empty id set without calling the RPC", async () => {
    const { client, rpc } = makeClient({ session: SESSION });
    await expect(createHumanReviewClient(client).getReviewState([])).resolves.toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a batch over the maximum", async () => {
    const { client } = makeClient({ session: SESSION });
    const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`);
    await expect(createHumanReviewClient(client).getReviewState(ids)).rejects.toMatchObject({ kind: "VALIDATION" });
  });
});

describe("listJudgments", () => {
  it("passes the paired cursor as p_before + p_before_id", async () => {
    const { client, rpc } = makeClient({ session: SESSION, rpc: () => ({ data: hqJudgmentPageFixture, error: null }) });
    await createHumanReviewClient(client).listJudgments("e1", { cursor: { created_at: "2026-10-01T04:30:00.000Z", judgment_id: "j1" } });
    expect(rpc).toHaveBeenCalledWith("ql_list_human_judgments", { p_evaluation_id: "e1", p_limit: 20, p_before: "2026-10-01T04:30:00.000Z", p_before_id: "j1" });
  });

  it("maps P0002 to NOT_FOUND", async () => {
    const { client } = makeClient({ session: SESSION, rpc: () => ({ data: null, error: { code: "P0002", message: "case not found" } }) });
    await expect(createHumanReviewClient(client).listJudgments("missing")).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });
});

describe("submitJudgment error mapping", () => {
  const cases: Array<[string, string, string]> = [
    ["42501", "not authorized", "UNAUTHORIZED"],
    ["23505", "submission key conflict", "IDEMPOTENCY_CONFLICT"],
    ["23514", "invalid correction head", "STALE_CORRECTION"],
    ["23514", "finding/disposition conflict", "VALIDATION"],
    ["22023", "invalid payload", "VALIDATION"],
    ["P0002", "case not found", "NOT_FOUND"],
  ];
  for (const [code, message, kind] of cases) {
    it(`maps ${code} (${message}) → ${kind}`, async () => {
      const { client } = makeClient({ session: SESSION, rpc: () => ({ data: null, error: { code, message } }) });
      await expect(createHumanReviewClient(client).submitJudgment({} as never)).rejects.toMatchObject({ kind });
    });
  }

  it("maps a thrown transport failure to NETWORK_AMBIGUOUS", async () => {
    const rpc = vi.fn(() => Promise.reject(new Error("Failed to fetch")));
    const client = {
      rpc: rpc as unknown as QualityRpcClient["rpc"],
      auth: { getSession: () => Promise.resolve({ data: { session: SESSION } }) } as unknown as QualityRpcClient["auth"],
    };
    await expect(createHumanReviewClient(client).submitJudgment({} as never)).rejects.toMatchObject({ kind: "NETWORK_AMBIGUOUS" });
  });

  it("returns judgment id + replayed on success", async () => {
    const { client, rpc } = makeClient({ session: SESSION, rpc: () => ({ data: hqSubmitResultFixture, error: null }) });
    const payload = { dto_version: "hq-write-v1", evaluation_id: "e", client_submission_id: "c" } as never;
    const result = await createHumanReviewClient(client).submitJudgment(payload);
    expect(result.judgmentId).toBe("jjjjjjj3-0000-0000-0000-000000000003");
    expect(rpc).toHaveBeenCalledWith("ql_submit_human_judgment", { p_payload: payload });
  });
});

describe("logging safety", () => {
  const spies: Array<ReturnType<typeof vi.spyOn>> = [];
  beforeEach(() => {
    for (const m of ["log", "info", "warn", "error", "debug"] as const) spies.push(vi.spyOn(console, m).mockImplementation(() => {}));
  });
  afterEach(() => {
    for (const s of spies) s.mockRestore();
    spies.length = 0;
  });
  it("never logs the payload or session token during submit", async () => {
    const { client } = makeClient({ session: SESSION, rpc: () => ({ data: hqSubmitResultFixture, error: null }) });
    await createHumanReviewClient(client).submitJudgment({ dto_version: "hq-write-v1", summary_note: "내부 메모" } as never);
    const all = spies.flatMap((s) => s.mock.calls.flat()).join(" ");
    expect(all).not.toContain("secret-token");
    expect(all).not.toContain("내부 메모");
    expect(spies.every((s) => s.mock.calls.length === 0)).toBe(true);
  });
});
