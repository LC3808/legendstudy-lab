import { describe, expect, it, vi } from "vitest";

import { createAdminClient, ADMIN_DEFAULT_LIMIT, type AdminRpcClient } from "./client";
import { parseOpsOverview, parseOpsPage } from "./contract";
import { AdminError } from "./errors";
import {
  formatProcessing,
  humanDispositionLabel,
  humanReviewStateLabel,
  opsBillingLabel,
  opsModelLabel,
  opsOutcomeLabel,
  opsProductLabel,
  opsRequestKindLabel,
  opsStatusLabel,
  opsUnavailableLabel,
} from "./ops-format";
import { mathRuntimeLabel } from "./ops-runtime";

function item(overrides: Record<string, unknown> = {}) {
  return {
    evaluation_id: "e1",
    attempt_id: "a1",
    member_id: "m1",
    attempt_kind: null,
    request_kind: "student",
    status: "completed",
    outcome: "success",
    requested_at: "2026-10-06T01:00:00Z",
    completed_at: "2026-10-06T01:00:40Z",
    processing_ms: 40000,
    is_reevaluation: false,
    invalidated: false,
    invalidation_reason: null,
    error_code: null,
    model_provider: "openai",
    model_name: "gpt-5",
    model_version: null,
    prompt_version: "essay-prompt-v3",
    credits_charged: 1,
    billing_status: "settled",
    billing_reason: "paid_cycle",
    human_review_state: "NOT_REVIEWED",
    human_review_disposition: null,
    human_reviewed_at: null,
    ...overrides,
  };
}

function pagePayload(overrides: Record<string, unknown> = {}) {
  return {
    dto_version: "admin-ops-v1",
    type: "humanities",
    available: true,
    human_review_tracked: true,
    items: [item()],
    summary: {
      total: 5,
      requested: 1,
      processing: 0,
      completed: 3,
      failed: 1,
      cancelled: 0,
      reevaluations: 1,
      last_24h: 5,
      median_processing_ms: 40000,
    },
    ...overrides,
  };
}

function overviewPayload(overrides: Record<string, unknown> = {}) {
  return {
    dto_version: "admin-ops-v1",
    as_of: "2026-10-06T02:00:00Z",
    human_review_tracked: true,
    human_reviewed_cases: 4,
    essay: {
      available: true,
      reason: null,
      summary: {
        total: 5,
        pending: 1,
        succeeded: 3,
        failed: 1,
        last_24h: 5,
        median_processing_ms: 40000,
      },
    },
    math: {
      available: false,
      reason: "SCHEMA_INCOMPLETE",
      summary: null,
    },
    ...overrides,
  };
}

function rpc(result: (fn: string, params?: Record<string, unknown>) => { data: unknown; error: unknown }) {
  const calls: { fn: string; params?: Record<string, unknown> }[] = [];
  const client = {
    rpc: vi.fn(async (fn: string, params?: Record<string, unknown>) => {
      calls.push({ fn, params });
      return result(fn, params);
    }),
    auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: "admin" } } } })) },
  } as unknown as AdminRpcClient;
  return { client, calls };
}

describe("operations contract", () => {
  it("parses an essay page and keeps every pipeline fact", () => {
    const page = parseOpsPage(pagePayload());
    expect(page.type).toBe("humanities");
    expect(page.available).toBe(true);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      evaluationId: "e1",
      memberId: "m1",
      outcome: "success",
      processingMs: 40000,
      modelName: "gpt-5",
      promptVersion: "essay-prompt-v3",
      creditsCharged: 1,
      billingStatus: "settled",
      humanReviewState: "NOT_REVIEWED",
      isReevaluation: false,
    });
    expect(page.summary?.total).toBe(5);
  });

  it("preserves a missing Credits value as null instead of zero", () => {
    const page = parseOpsPage(pagePayload({ items: [item({ credits_charged: null, billing_status: null })] }));
    expect(page.items[0].creditsCharged).toBeNull();
    expect(page.items[0].billingStatus).toBeNull();
  });

  it("reports undeployed Math as unavailable with its reason, not as an empty list", () => {
    const page = parseOpsPage({
      dto_version: "admin-ops-v1",
      type: "math",
      available: false,
      reason: "SCHEMA_INCOMPLETE",
      items: [],
      summary: null,
    });
    expect(page.available).toBe(false);
    expect(page.reason).toBe("SCHEMA_INCOMPLETE");
    expect(page.summary).toBeNull();
  });

  it("rejects an unknown version, type, outcome or reason", () => {
    expect(() => parseOpsPage(pagePayload({ dto_version: "admin-v1" }))).toThrow(AdminError);
    expect(() => parseOpsPage(pagePayload({ type: "science" }))).toThrow(AdminError);
    expect(() => parseOpsPage(pagePayload({ items: [item({ outcome: "maybe" })] }))).toThrow(AdminError);
    expect(() =>
      parseOpsPage(pagePayload({ available: false, reason: "MISSING" })),
    ).toThrow(AdminError);
  });

  it("parses the overview and keeps Math distinct from an idle pipeline", () => {
    const overview = parseOpsOverview(overviewPayload());
    expect(overview.essay.available).toBe(true);
    expect(overview.essay.summary?.succeeded).toBe(3);
    expect(overview.math.available).toBe(false);
    expect(overview.math.reason).toBe("SCHEMA_INCOMPLETE");
    expect(overview.math.summary).toBeNull();
    expect(overview.humanReviewedCases).toBe(4);
  });
});

describe("operations client", () => {
  it("calls the operator reads with clamped, explicit parameters", async () => {
    const { client, calls } = rpc((fn) => ({
      data: fn === "admin_operations_summary" ? overviewPayload() : pagePayload(),
      error: null,
    }));
    const admin = createAdminClient(client);
    await admin.essayOperations({ status: "completed" });
    expect(calls[0]).toEqual({
      fn: "admin_essay_operations",
      params: { p_limit: ADMIN_DEFAULT_LIMIT, p_status: "completed", p_before: null },
    });
    await admin.mathOperations({ before: "2026-10-06T00:00:00Z" });
    expect(calls[1]).toEqual({
      fn: "admin_math_operations",
      params: { p_limit: ADMIN_DEFAULT_LIMIT, p_before: "2026-10-06T00:00:00Z" },
    });
    await admin.operationsSummary();
    expect(calls[2].fn).toBe("admin_operations_summary");
  });

  it("never sends a status the database would reject", async () => {
    const { client, calls } = rpc(() => ({ data: pagePayload(), error: null }));
    const admin = createAdminClient(client);
    await admin.essayOperations({ status: null });
    expect(calls[0].params?.p_status).toBeNull();
  });

  it("surfaces a database refusal as an AdminError", async () => {
    const { client } = rpc(() => ({ data: null, error: { message: "FORBIDDEN" } }));
    const admin = createAdminClient(client);
    await expect(admin.operationsSummary()).rejects.toBeInstanceOf(AdminError);
  });
});

describe("operations labels", () => {
  it("keeps 'not measured' separate from zero", () => {
    expect(formatProcessing(null)).toBe("측정값 없음");
    expect(formatProcessing(400)).toBe("400ms");
    expect(formatProcessing(40000)).toBe("40.0초");
    expect(formatProcessing(600000)).toBe("10.0분");
  });

  it("labels outcomes, states and review state in Korean", () => {
    expect(opsOutcomeLabel("success").label).toBe("성공");
    expect(opsOutcomeLabel("failure").tone).toBe("danger");
    expect(opsOutcomeLabel("invalidated").label).toBe("무효화");
    expect(opsStatusLabel("processing")).toBe("처리 중");
    expect(humanReviewStateLabel("REVIEWED").label).toBe("검토 완료");
    expect(humanReviewStateLabel("NOT_TRACKED").label).toBe("추적 안 됨");
    expect(humanDispositionLabel("PASS_WITH_NOTES")).toBe("조건부 통과");
  });

  it("distinguishes an uninstalled runtime from a partially deployed one", () => {
    expect(opsUnavailableLabel("NOT_INSTALLED")).toBe("런타임 미설치");
    expect(opsUnavailableLabel("SCHEMA_INCOMPLETE")).toBe("런타임 미배포 (부분 스키마)");
  });

  it("names the product line and the Math resolve kind", () => {
    expect(opsProductLabel("humanities", null)).toBe("인문논술");
    expect(opsProductLabel("math", "STEP_RETRY")).toBe("수리논술 · 단계 재시도");
    expect(opsRequestKindLabel("operator_reevaluation")).toBe("재평가");
    expect(opsRequestKindLabel("MATH_REEVALUATION")).toBe("재평가");
  });

  it("shows the model and prompt so a change is visible, and never a fake one", () => {
    expect(opsModelLabel({ modelProvider: "openai", modelName: "gpt-5", promptVersion: "v3", modelVersion: null }))
      .toBe("openai gpt-5 · v3");
    expect(opsModelLabel({ modelProvider: null, modelName: null, promptVersion: null, modelVersion: null }))
      .toBe("-");
  });

  it("says 차감 없음 rather than 0 Credit when nothing was charged", () => {
    expect(opsBillingLabel({ creditsCharged: null, billingStatus: null, billingReason: null })).toBe(
      "차감 없음",
    );
    expect(
      opsBillingLabel({ creditsCharged: 1, billingStatus: "settled", billingReason: "paid_cycle" }),
    ).toBe("1 Credit · 차감 완료");
  });

  it("states the Math release position exactly", () => {
    expect(mathRuntimeLabel()).toBe("RC READY / RUNTIME OFF");
  });
});