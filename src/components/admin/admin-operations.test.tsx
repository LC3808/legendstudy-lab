// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock("@/components/auth-context", () => ({ useAuth: mocks.useAuth }));

import { AdminOperationsView } from "./admin-operations-view";

function item(overrides: Record<string, unknown> = {}) {
  return {
    evaluation_id: "f0000000-0000-4000-8000-0000000000f2",
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
    human_review_state: "REVIEWED",
    human_review_disposition: "PASS_WITH_NOTES",
    human_reviewed_at: "2026-10-06T02:00:00Z",
    ...overrides,
  };
}

function essayPage(items: unknown[]) {
  return {
    dto_version: "admin-ops-v1",
    type: "humanities",
    available: true,
    human_review_tracked: true,
    items,
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
  };
}

function mathPage() {
  return {
    dto_version: "admin-ops-v1",
    type: "math",
    available: false,
    reason: "SCHEMA_INCOMPLETE",
    human_review_tracked: false,
    items: [],
    summary: null,
  };
}

function overview() {
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
    math: { available: false, reason: "SCHEMA_INCOMPLETE", summary: null },
  };
}

function setSession(handler: (fn: string) => { data: unknown; error: unknown }) {
  mocks.useAuth.mockReturnValue({
    client: {
      rpc: vi.fn(async (fn: string) => handler(fn)),
      auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: "admin" } } } })) },
    },
    status: "authenticated",
    user: { id: "admin", email: "admin@legendstudy.com" },
    recoveryActive: false,
    completeRecovery: () => {},
    signOut: async () => {},
  });
}

const payloads = (fn: string) => {
  if (fn === "admin_operations_summary") return { data: overview(), error: null };
  if (fn === "admin_math_operations") return { data: mathPage(), error: null };
  return { data: essayPage([item()]), error: null };
};

describe("AdminOperationsView", () => {
  it("reports the pipeline facts an operator needs, without the answer text", async () => {
    setSession(payloads);
    render(<AdminOperationsView />);

    expect(await screen.findByText("인문논술 평가")).toBeInTheDocument();
    expect(screen.getByText("40.0초")).toBeInTheDocument();
    expect(screen.getByText("openai gpt-5 · essay-prompt-v3")).toBeInTheDocument();
    expect(screen.getByText("1 Credit · 차감 완료")).toBeInTheDocument();
    expect(screen.getByText(/검토 완료/)).toBeInTheDocument();
    expect(screen.queryByText(/답안 원문을 열람할 수 있습니다/)).not.toBeInTheDocument();
  });

  it("states the Math release position and never reads an undeployed runtime as zero", async () => {
    setSession(payloads);
    render(<AdminOperationsView />);

    // The release position appears on the metric and again in the empty state,
    // which is intentional: an operator must not have to scroll to learn it.
    const runtime = await screen.findAllByText(/RC READY \/ RUNTIME OFF/);
    expect(runtime.length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText(/수리논술 런타임이 배포되어 있지 않습니다/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/배포되지 않은 런타임은 0건으로 표시하지 않습니다/),
    ).toBeInTheDocument();
  });

  it("links to the existing quality console instead of reimplementing it", async () => {
    setSession(payloads);
    render(<AdminOperationsView />);
    const link = await screen.findByRole("link", { name: "AI 품질 콘솔 열기" });
    expect(link).toHaveAttribute("href", "/ql/");
  });

  it("flags a re-evaluation, an invalidated evaluation and an error code", async () => {
    setSession((fn) =>
      fn === "admin_operations_summary"
        ? { data: overview(), error: null }
        : fn === "admin_math_operations"
          ? { data: mathPage(), error: null }
          : {
              data: essayPage([
                item({
                  is_reevaluation: true,
                  invalidated: true,
                  invalidation_reason: "원문 불일치",
                  error_code: "PROCESSING_FAILED",
                }),
              ]),
              error: null,
            },
    );
    render(<AdminOperationsView />);
    expect(await screen.findByText("재평가 요청입니다.")).toBeInTheDocument();
    expect(screen.getByText(/무효화된 평가입니다 · 원문 불일치/)).toBeInTheDocument();
    expect(screen.getByText(/오류 코드 PROCESSING_FAILED/)).toBeInTheDocument();
  });

  it("shows an empty state rather than a fabricated row when nothing matched", async () => {
    setSession((fn) =>
      fn === "admin_operations_summary"
        ? { data: overview(), error: null }
        : fn === "admin_math_operations"
          ? { data: mathPage(), error: null }
          : { data: essayPage([]), error: null },
    );
    render(<AdminOperationsView />);
    await waitFor(() =>
      expect(screen.getByText("조회된 평가가 없습니다")).toBeInTheDocument(),
    );
  });

  it("surfaces a refusal without rendering pipeline data", async () => {
    setSession((fn) =>
      fn === "admin_operations_summary"
        ? { data: null, error: { message: "FORBIDDEN" } }
        : payloads(fn),
    );
    render(<AdminOperationsView />);
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
  });
});