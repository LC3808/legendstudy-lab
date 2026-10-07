import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createQualityClient, type QualityRpcClient } from "./client";
import {
  qualityCaseDetailFixture,
  qualityListEnvelopeEmptyFixture,
  qualityListEnvelopePopulatedFixture,
} from "./fixtures";

type RpcResult = { data: unknown; error: unknown };

function makeClient(options: {
  session?: unknown;
  rpc?: (fn: string, params: unknown) => Promise<RpcResult> | RpcResult;
}): { client: QualityRpcClient; rpc: ReturnType<typeof vi.fn> } {
  const rpc = vi.fn((fn: string, params: unknown) =>
    Promise.resolve(options.rpc ? options.rpc(fn, params) : { data: null, error: null }),
  );
  const client = {
    rpc: rpc as unknown as QualityRpcClient["rpc"],
    auth: {
      getSession: () => Promise.resolve({ data: { session: options.session ?? null } }),
    } as unknown as QualityRpcClient["auth"],
  };
  return { client, rpc };
}

const SESSION = { access_token: "test", user: { id: "u-1" } };

describe("QualityClient session gate", () => {
  it("T1: throws UNAUTHENTICATED and does not call any RPC without a session", async () => {
    const { client, rpc } = makeClient({ session: null });
    const quality = createQualityClient(client);
    await expect(quality.isOperator()).rejects.toMatchObject({ kind: "UNAUTHENTICATED" });
    await expect(quality.listCases()).rejects.toMatchObject({ kind: "UNAUTHENTICATED" });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("QualityClient.isOperator", () => {
  it("T3: returns true for an operator", async () => {
    const { client } = makeClient({ session: SESSION, rpc: () => ({ data: true, error: null }) });
    await expect(createQualityClient(client).isOperator()).resolves.toBe(true);
  });

  it("T2: returns false for an authenticated non-operator (not an error)", async () => {
    const { client } = makeClient({ session: SESSION, rpc: () => ({ data: false, error: null }) });
    await expect(createQualityClient(client).isOperator()).resolves.toBe(false);
  });
});

describe("QualityClient.listCases", () => {
  it("T6: returns an empty page", async () => {
    const { client } = makeClient({ session: SESSION, rpc: () => ({ data: qualityListEnvelopeEmptyFixture, error: null }) });
    const page = await createQualityClient(client).listCases();
    expect(page.cases).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it("T7: returns a populated page and default-clamps the limit", async () => {
    const { client, rpc } = makeClient({ session: SESSION, rpc: () => ({ data: qualityListEnvelopePopulatedFixture, error: null }) });
    const page = await createQualityClient(client).listCases();
    expect(page.cases).toHaveLength(2);
    expect(rpc).toHaveBeenCalledWith("ql_list_cases", { p_limit: 50 });
  });

  it("clamps an over-max limit to 100 and a sub-1 limit to 1", async () => {
    const { client, rpc } = makeClient({ session: SESSION, rpc: () => ({ data: qualityListEnvelopeEmptyFixture, error: null }) });
    const quality = createQualityClient(client);
    await quality.listCases({ limit: 9999 });
    expect(rpc).toHaveBeenLastCalledWith("ql_list_cases", { p_limit: 100 });
    await quality.listCases({ limit: 0 });
    expect(rpc).toHaveBeenLastCalledWith("ql_list_cases", { p_limit: 1 });
  });

  it("T8: propagates the paired cursor as p_before + p_before_id", async () => {
    const { client, rpc } = makeClient({ session: SESSION, rpc: () => ({ data: qualityListEnvelopeEmptyFixture, error: null }) });
    await createQualityClient(client).listCases({
      cursor: { requested_at: "2026-10-01T04:00:00.000Z", evaluation_id: "22222222-2222-2222-2222-222222222222" },
    });
    expect(rpc).toHaveBeenCalledWith("ql_list_cases", {
      p_limit: 50,
      p_before: "2026-10-01T04:00:00.000Z",
      p_before_id: "22222222-2222-2222-2222-222222222222",
    });
  });

  it("T20: surfaces an UNAUTHORIZED RPC error and never falls back to fixture data", async () => {
    const { client } = makeClient({
      session: SESSION,
      rpc: () => ({ data: null, error: { code: "42501", message: "not authorized" } }),
    });
    const quality = createQualityClient(client);
    await expect(quality.listCases()).rejects.toMatchObject({ kind: "UNAUTHORIZED" });
  });

  it("T17: surfaces a malformed payload as MALFORMED_RESPONSE, not empty", async () => {
    // Valid version but a non-array `cases` → structural failure, not UNSUPPORTED_DTO.
    const { client } = makeClient({
      session: SESSION,
      rpc: () => ({ data: { dto_version: "ql-read-v1", cases: { nope: true }, next_cursor: null }, error: null }),
    });
    await expect(createQualityClient(client).listCases()).rejects.toMatchObject({ kind: "MALFORMED_RESPONSE" });
  });

  it("T5: surfaces a version-drifted payload as UNSUPPORTED_DTO, not empty", async () => {
    const { client } = makeClient({ session: SESSION, rpc: () => ({ data: { nope: true }, error: null }) });
    await expect(createQualityClient(client).listCases()).rejects.toMatchObject({ kind: "UNSUPPORTED_DTO" });
  });

  it("maps a thrown transport failure to NETWORK", async () => {
    const { client } = makeClient({
      session: SESSION,
      rpc: () => {
        throw new Error("Failed to fetch");
      },
    });
    await expect(createQualityClient(client).listCases()).rejects.toMatchObject({ kind: "NETWORK" });
  });
});

describe("QualityClient.getCaseDetail", () => {
  it("returns a parsed detail for an operator", async () => {
    const { client, rpc } = makeClient({ session: SESSION, rpc: () => ({ data: qualityCaseDetailFixture, error: null }) });
    const detail = await createQualityClient(client).getCaseDetail("11111111-1111-1111-1111-111111111111");
    expect(detail.student_submission?.answer_full_text).toContain("전체 답안");
    expect(rpc).toHaveBeenCalledWith("ql_case_detail", { p_evaluation_id: "11111111-1111-1111-1111-111111111111" });
  });

  it("maps a P0002 not-found to NOT_FOUND", async () => {
    const { client } = makeClient({ session: SESSION, rpc: () => ({ data: null, error: { code: "P0002", message: "case not found" } }) });
    await expect(createQualityClient(client).getCaseDetail("missing")).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });
});

describe("QualityClient logging safety (T18)", () => {
  const spies: Array<ReturnType<typeof vi.spyOn>> = [];
  beforeEach(() => {
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      spies.push(vi.spyOn(console, method).mockImplementation(() => {}));
    }
  });
  afterEach(() => {
    for (const spy of spies) spy.mockRestore();
    spies.length = 0;
  });

  it("never logs the answer body or session token during a detail fetch", async () => {
    const { client } = makeClient({ session: SESSION, rpc: () => ({ data: qualityCaseDetailFixture, error: null }) });
    await createQualityClient(client).getCaseDetail("11111111-1111-1111-1111-111111111111");
    const allConsoleArgs = spies.flatMap((spy) => spy.mock.calls.flat()).join(" ");
    expect(allConsoleArgs).not.toContain("전체 답안");
    expect(allConsoleArgs).not.toContain("test"); // access token value
    expect(spies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
  });
});
