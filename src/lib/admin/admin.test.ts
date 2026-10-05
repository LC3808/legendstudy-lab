import { describe, expect, it, vi } from "vitest";

import {
  createAdminClient,
  ADMIN_MAX_LIMIT,
  ADMIN_DEFAULT_LIMIT,
  type AdminRpcClient,
} from "./client";
import {
  parseCredit,
  parseDashboard,
  parseInquiryDetail,
  parseInquiryPage,
  parseMemberDetail,
  parsePaymentPage,
  parseSearchPage,
  parseSupportMetrics,
} from "./contract";
import { AdminError, adminErrorCopy, mapRpcError } from "./errors";
import {
  accountStateLabel,
  creditOriginLabel,
  formatCount,
  formatCredit,
  formatDelta,
  formatDuration,
  gradeLabel,
  inquiryStatusLabel,
  transactionTypeLabel,
} from "./format";

// --- fixtures ----------------------------------------------------------------

function dashboardPayload() {
  return {
    dto_version: "admin-v1",
    as_of: "2026-10-05T10:00:00Z",
    members: { total: 12, new_today: 1, new_7d: 4, new_30d: 9, active_30d: 3 },
    profile: {
      grade_distribution: [{ key: "3", count: 7 }],
      school_distribution: [{ school_code: "S100", count: 5 }],
      school_code_note: "school names are not stored; distribution is by NEIS school code only",
    },
    essay: {
      submissions: 30,
      evaluation_requests: 28,
      evaluation_completed: 25,
      evaluation_failed: 2,
      rewrites: 6,
      reevaluations: 4,
    },
    math: {
      installed: false,
      runtime_state: "RUNTIME_OFF",
      runtime_label: "수리논술 평가 기능 비활성 (운영 준비 중)",
      attempts: null,
      evaluations: null,
    },
    credit: {
      spendable: 41,
      expiring_30d: 9,
      granted_total: 60,
      consumed_total: 19,
      available_by_origin: { signup_bonus: 6, purchase: 30, other: 5 },
    },
    payment: {
      installed: false,
      runtime_state: "LIVE_OFF",
      runtime_label: "결제 기능 미활성 (실결제 아님)",
      orders: null,
    },
  };
}

function searchPayload() {
  return {
    dto_version: "admin-v1",
    as_of: "2026-10-05T10:00:00Z",
    query: "member@legendstudy.com",
    limit: 25,
    offset: 0,
    items: [
      {
        account_id: "22222222-2222-4222-8222-222222222222",
        email: "member@legendstudy.com",
        created_at: "2026-09-25T10:00:00Z",
        display_name: "회원",
        grade_level: "3",
        school_code: "S100",
        account_state: "NORMAL",
        spendable: 7,
      },
    ],
  };
}

function detailPayload() {
  return {
    dto_version: "admin-v1",
    as_of: "2026-10-05T10:00:00Z",
    member: {
      account_id: "22222222-2222-4222-8222-222222222222",
      email: "member@legendstudy.com",
      created_at: "2026-09-25T10:00:00Z",
      display_name: "회원",
      grade_level: "3",
      school_code: "S100",
      school_office_code: "B10",
    },
    account: { state: "NORMAL", deletion: null },
    usage: {
      study: { sessions_total: 2, sessions_30d: 2, active_seconds_total: 5400, last_started_at: null },
      essay: { attempts: 3, submitted: 3, evaluations: 3, last_submitted_at: null },
      math: { installed: false, runtime_state: "RUNTIME_OFF", attempts: null, evaluations: null },
      mock: { attempts: 1, last_submitted_at: null },
      library: { bookmarks: 4, recent_views: 9, last_viewed_at: null },
    },
  };
}

function creditPayload() {
  return {
    dto_version: "admin-v1",
    as_of: "2026-10-05T10:00:00Z",
    account_id: "22222222-2222-4222-8222-222222222222",
    summary: { spendable: 7, paid: 4, free: 3, other: 0, reserved: 0, next_expiry: null },
    page: { limit: 25, offset: 0, grants_total: 2, transactions_total: 3 },
    grants: [
      {
        grant_id: "b1111111-1111-4111-8111-111111111111",
        origin: "signup_bonus",
        created_at: "2026-09-25T10:00:00Z",
        expires_at: null,
        granted: 3,
        balance: 3,
        reserved: 0,
        available: 3,
        expired: false,
      },
    ],
    transactions: [
      {
        transaction_id: "t1",
        grant_id: "b1111111-1111-4111-8111-111111111111",
        transaction_type: "signup_bonus",
        balance_delta: 3,
        reserved_delta: 0,
        reason_code: "signup",
        actor_kind: "system",
        reversal_of: null,
        created_at: "2026-09-25T10:00:00Z",
      },
    ],
  };
}

// --- contract ----------------------------------------------------------------

describe("admin-v1 contract", () => {
  it("parses a dashboard envelope", () => {
    const parsed = parseDashboard(dashboardPayload());
    expect(parsed.members.total).toBe(12);
    expect(parsed.credit.spendable).toBe(41);
    expect(parsed.credit.availableByOrigin.purchase).toBe(30);
  });

  it("keeps an uninstalled subsystem as null rather than 0", () => {
    const parsed = parseDashboard(dashboardPayload());
    expect(parsed.math.installed).toBe(false);
    expect(parsed.math.attempts).toBeNull();
    expect(parsed.payment.orders).toBeNull();
    expect(parsed.math.attempts).not.toBe(0);
  });

  it("rejects a wrong or missing dto_version", () => {
    const wrong = { ...dashboardPayload(), dto_version: "admin-v2" };
    expect(() => parseDashboard(wrong)).toThrow(AdminError);
    const missing = { ...dashboardPayload() } as Record<string, unknown>;
    delete missing.dto_version;
    expect(() => parseDashboard(missing)).toThrow(AdminError);
  });

  it("fails closed on a missing required field instead of inventing a value", () => {
    const broken = dashboardPayload() as Record<string, unknown>;
    const members = { ...(broken.members as Record<string, unknown>) };
    delete members.total;
    broken.members = members;
    expect(() => parseDashboard(broken)).toThrow(AdminError);
  });

  it("fails closed when a count is not a number", () => {
    const broken = dashboardPayload() as Record<string, unknown>;
    broken.credit = { ...(broken.credit as Record<string, unknown>), spendable: "41" };
    expect(() => parseDashboard(broken)).toThrow(AdminError);
  });

  it("parses search, detail and credit", () => {
    const page = parseSearchPage(searchPayload());
    expect(page.items).toHaveLength(1);
    expect(page.items[0].accountState).toBe("NORMAL");
    expect(page.items[0].spendable).toBe(7);

    const detail = parseMemberDetail(detailPayload());
    expect(detail.member.gradeLevel).toBe("3");
    expect(detail.account.deletion).toBeNull();
    expect(detail.usage.math.attempts).toBeNull();

    const credit = parseCredit(creditPayload());
    expect(credit.summary?.spendable).toBe(7);
    expect(credit.grants[0].origin).toBe("signup_bonus");
    expect(credit.transactions[0].actorKind).toBe("system");
  });

  it("accepts a null credit summary for an account without a wallet", () => {
    const payload = { ...creditPayload(), summary: null };
    expect(parseCredit(payload).summary).toBeNull();
  });

  it("surfaces a deletion request when present", () => {
    const payload = detailPayload();
    const detail = parseMemberDetail({
      ...payload,
      account: {
        state: "DELETION_PENDING",
        deletion: {
          request_id: "bb111111-1111-4111-8111-111111111111",
          state: "DELETION_PENDING",
          phase: "PERSONAL",
          requested_at: "2026-10-01T10:00:00Z",
          scheduled_deletion_at: "2026-10-15T10:00:00Z",
          cancelled_at: null,
          completed_at: null,
        },
      },
    });
    expect(detail.account.state).toBe("DELETION_PENDING");
    expect(detail.account.deletion?.phase).toBe("PERSONAL");
  });
});

// --- error mapping -----------------------------------------------------------

describe("admin error mapping", () => {
  it("maps the canonical SQLSTATEs", () => {
    expect(mapRpcError({ code: "PT401" }).kind).toBe("UNAUTHORIZED");
    expect(mapRpcError({ code: "PT404" }).kind).toBe("NOT_FOUND");
    expect(mapRpcError({ code: "PT422" }).kind).toBe("INVALID_REQUEST");
    expect(mapRpcError({ code: "PGRST202" }).kind).toBe("NOT_INSTALLED");
    expect(mapRpcError({ code: "42501" }).kind).toBe("UNAUTHORIZED");
  });

  it("maps transport and auth failures by message", () => {
    expect(mapRpcError({ message: "JWT expired" }).kind).toBe("UNAUTHORIZED");
    expect(mapRpcError({ message: "Failed to fetch" }).kind).toBe("NETWORK");
  });

  it("never collapses states into one another", () => {
    const kinds = new Set([
      mapRpcError({ code: "PT401" }).kind,
      mapRpcError({ code: "PT404" }).kind,
      mapRpcError({ code: "PGRST202" }).kind,
      mapRpcError({}).kind,
    ]);
    expect(kinds.size).toBe(4);
  });

  it("gives every state operator copy", () => {
    for (const kind of ["UNAUTHENTICATED", "UNAUTHORIZED", "NOT_INSTALLED", "NOT_FOUND"] as const) {
      expect(adminErrorCopy(kind).title.length).toBeGreaterThan(0);
    }
  });
});

// --- client ------------------------------------------------------------------

function stubRpc(handler: (fn: string, params?: Record<string, unknown>) => unknown) {
  const rpc = vi.fn(async (fn: string, params?: Record<string, unknown>) => {
    try {
      return { data: handler(fn, params), error: null };
    } catch (error) {
      return { data: null, error };
    }
  });
  const auth = { getSession: vi.fn(async () => ({ data: { session: { user: { id: "u" } } } })) };
  return { rpc, auth } as unknown as AdminRpcClient;
}

describe("admin client", () => {
  it("denies an anonymous caller before any read", async () => {
    const client = createAdminClient({
      rpc: vi.fn(),
      auth: { getSession: vi.fn(async () => ({ data: { session: null } })) },
    } as unknown as AdminRpcClient);
    await expect(client.dashboard()).rejects.toMatchObject({ kind: "UNAUTHENTICATED" });
  });

  it("reports a non-operator as false rather than throwing", async () => {
    const client = createAdminClient(stubRpc(() => false));
    await expect(client.isOperator()).resolves.toBe(false);
  });

  it("reports an operator as true", async () => {
    const client = createAdminClient(stubRpc(() => true));
    await expect(client.isOperator()).resolves.toBe(true);
  });

  it("sends bounded pagination and never an unbounded limit", async () => {
    let seen: Record<string, unknown> | undefined;
    const client = createAdminClient(
      stubRpc((fn, params) => {
        seen = params;
        return searchPayload();
      }),
    );
    await client.searchMembers("member@legendstudy.com");
    expect(seen).toEqual({
      p_query: "member@legendstudy.com",
      p_limit: ADMIN_DEFAULT_LIMIT,
      p_offset: 0,
    });

    await client.searchMembers("member@legendstudy.com", { limit: 500, offset: -5 });
    expect(seen?.p_limit).toBe(ADMIN_MAX_LIMIT);
    expect(seen?.p_offset).toBe(0);
  });

  it("rejects a short query locally", async () => {
    const client = createAdminClient(stubRpc(() => searchPayload()));
    await expect(client.searchMembers("ab")).rejects.toMatchObject({ kind: "INVALID_REQUEST" });
  });

  it("surfaces a database denial as UNAUTHORIZED", async () => {
    const client = createAdminClient(
      stubRpc(() => {
        throw { code: "PT401", message: "OPERATOR_REQUIRED" };
      }),
    );
    await expect(client.dashboard()).rejects.toMatchObject({ kind: "UNAUTHORIZED" });
  });

  it("surfaces an unapplied read boundary distinctly", async () => {
    const client = createAdminClient(
      stubRpc(() => {
        throw { code: "PGRST202", message: "Could not find the function" };
      }),
    );
    await expect(client.dashboard()).rejects.toMatchObject({ kind: "NOT_INSTALLED" });
  });

  it("exposes no money-moving method", () => {
    const client = createAdminClient(stubRpc(() => null));
    const surface = Object.keys(client);
    // ADMIN-P0-B adds inquiry writes, which are member and operator support
    // actions. It adds no path to the ledger: issuing Credit and acting on an
    // order stay behind the server-only finance boundary.
    expect(surface).toEqual(
      expect.arrayContaining([
        "dashboard",
        "isOperator",
        "memberCredit",
        "memberDetail",
        "searchMembers",
        "paymentOrders",
        "supportMetrics",
        "inquiryList",
        "inquiryDetail",
        "replyInquiry",
        "setInquiryStatus",
        "submitInquiry",
        "myInquiries",
      ]),
    );
    for (const name of surface) {
      expect(name).not.toMatch(/grant|refund|cancel|reconcile|compensate|revoke/i);
    }
  });
});

// --- formatting --------------------------------------------------------------

describe("admin formatting", () => {
  it("renders an uninstalled count as 미설치, never 0", () => {
    expect(formatCount(null)).toBe("미설치");
    expect(formatCount(0)).toBe("0");
  });

  it("labels the canonical lifecycle tokens", () => {
    expect(accountStateLabel("NORMAL").label).toBe("정상");
    expect(accountStateLabel("DELETION_PENDING").label).toBe("삭제 요청됨");
    expect(accountStateLabel("ERASING").label).toBe("삭제 처리 중");
    expect(accountStateLabel("ERASED").label).toBe("삭제 완료");
    expect(accountStateLabel("RESTRICTED").tone).toBe("danger");
  });

  it("maps the numeric grade level to a Korean label", () => {
    expect(gradeLabel("1")).toBe("고1");
    expect(gradeLabel("3")).toBe("고3");
    expect(gradeLabel(null)).toBe("미입력");
    expect(gradeLabel("9")).toBe("기타(9)");
  });

  it("shows a signed delta", () => {
    expect(formatDelta(-1)).toBe("-1");
    expect(formatDelta(3)).toBe("+3");
  });

  it("labels credit origins and transaction types", () => {
    expect(creditOriginLabel("admin_grant")).toBe("운영 지급");
    expect(transactionTypeLabel("expiration")).toBe("만료");
    expect(transactionTypeLabel("unknown_type")).toBe("unknown_type");
    expect(formatCredit(7)).toContain("7");
    expect(formatCredit(null)).toBe("-");
  });
});

// --- ADMIN-P0-B: payment read, inquiry and the finance boundary --------------

describe("payment read contract", () => {
  const order = {
    order_id: "aa111111-1111-4111-8111-111111111111",
    subject_id: "22222222-2222-4222-8222-222222222222",
    sku: "credit_5",
    amount: 4900,
    quantity: 5,
    currency: "KRW",
    mode: "TEST",
    state: "PAID",
    grant_state: "POSTED",
    provider: "TOSS",
    paid_at: "2026-10-04T10:00:00.000Z",
    created_at: "2026-10-04T09:59:00.000Z",
    credit_expires_at: "2027-01-04T09:59:00.000Z",
    reconciliation_required: false,
    refundable: true,
  };

  it("parses an installed order page", () => {
    const page = parsePaymentPage({
      dto_version: "admin-v1",
      as_of: "2026-10-05T00:00:00.000Z",
      installed: true,
      runtime_state: "LIVE_OFF",
      runtime_label: "결제 기능 미활성 (실결제 아님)",
      mode: "TEST",
      total: 1,
      limit: 25,
      offset: 0,
      orders: [order],
    });
    expect(page.installed).toBe(true);
    expect(page.orders).toHaveLength(1);
    expect(page.orders?.[0].refundable).toBe(true);
  });

  it("keeps an uninstalled subsystem null rather than zero", () => {
    const page = parsePaymentPage({
      dto_version: "admin-v1",
      as_of: "2026-10-05T00:00:00.000Z",
      installed: false,
      runtime_state: "LIVE_OFF",
      runtime_label: "결제 기능 미활성 (실결제 아님)",
      mode: "NONE",
      total: null,
      limit: 25,
      offset: 0,
      orders: null,
    });
    expect(page.total).toBeNull();
    expect(page.orders).toBeNull();
    expect(formatCount(page.total)).toBe("미설치");
  });

  it("rejects a malformed order", () => {
    expect(() =>
      parsePaymentPage({
        dto_version: "admin-v1",
        as_of: "2026-10-05T00:00:00.000Z",
        installed: true,
        runtime_state: "LIVE_OFF",
        runtime_label: "x",
        mode: "TEST",
        total: 1,
        limit: 25,
        offset: 0,
        orders: [{ ...order, amount: "4900" }],
      }),
    ).toThrow();
  });
});

describe("inquiry contract", () => {
  it("parses an operator list page", () => {
    const page = parseInquiryPage({
      dto_version: "admin-v1",
      as_of: "2026-10-05T00:00:00.000Z",
      total: 1,
      open: 1,
      limit: 25,
      offset: 0,
      items: [
        {
          inquiry_id: "bb111111-1111-4111-8111-111111111111",
          status: "RECEIVED",
          category: "payment",
          title: "환불 문의드립니다",
          user_id: "22222222-2222-4222-8222-222222222222",
          created_at: "2026-10-05T01:00:00.000Z",
          updated_at: "2026-10-05T01:00:00.000Z",
          reply_count: 0,
          preview: "환불 문의드립니다",
        },
      ],
    });
    expect(page.total).toBe(1);
    expect(inquiryStatusLabel(page.items[0].status).label).toBe("접수");
  });

  it("keeps a related count null when the owning subsystem is absent", () => {
    const detail = parseInquiryDetail({
      dto_version: "admin-v1",
      as_of: "2026-10-05T00:00:00.000Z",
      inquiry: {
        inquiry_id: "bb111111-1111-4111-8111-111111111111",
        category: "payment",
        title: "t",
        body: "b",
        status: "RECEIVED",
        submitted_at: "2026-10-05T01:00:00.000Z",
        updated_at: "2026-10-05T01:00:00.000Z",
        answered_at: null,
        closed_at: null,
      },
      member: { account_id: "22222222-2222-4222-8222-222222222222", grade_level: "3", account_state: "NORMAL", spendable: 3 },
      replies: [],
      status_events: [{ from_status: null, to_status: "RECEIVED", actor_kind: "member", created_at: "2026-10-05T01:00:00.000Z" }],
      related: { essay_evaluations: 0, payment_orders: null },
    });
    expect(detail.related.paymentOrders).toBeNull();
    expect(formatCount(detail.related.paymentOrders)).toBe("미설치");
    expect(formatCount(detail.related.essayEvaluations)).toBe("0");
  });

  it("parses support metrics and never renders a blank duration as zero", () => {
    const metrics = parseSupportMetrics({
      open: 2,
      new_today: 1,
      in_progress: 1,
      answered: 4,
      closed: 3,
      oldest_open_id: null,
      oldest_open_at: null,
      first_response_seconds: null,
      failed_deliveries: 0,
    });
    expect(metrics.firstResponseSeconds).toBeNull();
    expect(formatDuration(metrics.firstResponseSeconds)).toBe("측정값 없음");
  });
});

describe("member inquiry client", () => {
  const session = { auth: { getSession: async () => ({ data: { session: { access_token: "t" } } }) } };

  it("rejects a title that is too short before calling the database", async () => {
    const rpc = vi.fn();
    const client = createAdminClient({ ...session, rpc } as never);
    await expect(
      client.submitInquiry({ category: "payment", title: "짧", body: "충분히 긴 문의 내용입니다", requestKey: "k" }),
    ).rejects.toBeInstanceOf(AdminError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("submits with the caller's own identity and no member id in the payload", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { inquiry_id: "x", created: true }, error: null });
    const client = createAdminClient({ ...session, rpc } as never);
    await client.submitInquiry({
      category: "payment",
      title: "환불 문의드립니다",
      body: "환불 가능 여부를 확인하고 싶습니다.",
      requestKey: "11111111-1111-4111-8111-111111111111",
    });
    const [fn, params] = rpc.mock.calls[0];
    expect(fn).toBe("inquiry_submit");
    expect(Object.keys(params.p).sort()).toEqual(
      ["body", "category", "dto_version", "request_key", "title"].sort(),
    );
  });

  it("never returns an inquiry body from the member list", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { dto_version: "inquiry-v1", items: [
        {
          inquiry_id: "bb111111-1111-4111-8111-111111111111",
          category: "payment",
          title: "t",
          status: "ANSWERED",
          created_at: "2026-10-05T01:00:00.000Z",
          updated_at: "2026-10-05T02:00:00.000Z",
          answered: true,
        },
      ] },
      error: null,
    });
    const client = createAdminClient({ ...session, rpc } as never);
    const rows = await client.myInquiries();
    expect(rows[0].answered).toBe(true);
    expect(Object.keys(rows[0])).not.toContain("body");
  });
});
