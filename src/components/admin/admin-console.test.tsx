// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("@/components/auth-context", () => ({ useAuth: mocks.useAuth }));

import { AdminCreditView } from "./admin-credit-view";
import { AdminDashboardView } from "./admin-dashboard-view";
import { AdminMembersView } from "./admin-members-view";
import { AdminGate } from "./admin-surface";

function dashboardPayload(overrides: Record<string, unknown> = {}) {
  return {
    dto_version: "admin-v1",
    as_of: "2026-10-05T10:00:00Z",
    members: { total: 12, new_today: 1, new_7d: 4, new_30d: 9, active_30d: 3 },
    profile: {
      grade_distribution: [{ key: "3", count: 7 }],
      school_distribution: [{ school_code: "S100", count: 5 }],
      school_code_note: "school names are not stored",
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
      available_by_origin: { signup_bonus: 6, purchase: 30 },
    },
    payment: {
      installed: false,
      runtime_state: "LIVE_OFF",
      runtime_label: "결제 기능 미활성 (실결제 아님)",
      orders: null,
    },
    ...overrides,
  };
}

function searchPayload(items: unknown[] = []) {
  return {
    dto_version: "admin-v1",
    as_of: "2026-10-05T10:00:00Z",
    query: "member@legendstudy.com",
    limit: 25,
    offset: 0,
    items,
  };
}

const member = {
  account_id: "22222222-2222-4222-8222-222222222222",
  email: "member@legendstudy.com",
  created_at: "2026-09-25T10:00:00Z",
  display_name: "회원",
  grade_level: "3",
  school_code: "S100",
  account_state: "NORMAL",
  spendable: 7,
};

function directoryPayload(items: unknown[] = [{account_id:member.account_id,email:member.email,display_name:'회원',created_at:member.created_at,account_state:'NORMAL',academic_status:'student',grade_level:3,intended_major:'공학',school_name:'검증고등학교',school_state:'resolved'}],total=items.length,offset=0){
 return {version:'admin-members-v1',as_of:'2026-10-08T00:00:00Z',total,filtered_total:total,limit:25,offset,items};
}

function detailPayload() {
  return {
    dto_version: "admin-v1",
    as_of: "2026-10-05T10:00:00Z",
    member: {
      account_id: member.account_id,
      email: member.email,
      created_at: member.created_at,
      display_name: "회원",
      grade_level: "3",
      school_code: "S100",
      school_office_code: "B10",
      email_confirmed: true, auth_providers: ["email", "google"], intended_major: "공학",
      target_universities: [{ university_name: "검증대학교", intended_division: "컴퓨터공학과" }],
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
    account_id: member.account_id,
    summary: { spendable: 7, paid: 4, free: 3, other: 0, reserved: 0, next_expiry: null },
    page: { limit: 25, offset: 0, grants_total: 1, transactions_total: 1 },
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

type Handler = (fn: string, params?: Record<string, unknown>) => { data?: unknown; error?: unknown };

function payloadFor(fn: string) {
  if (fn === "admin_member_list") return directoryPayload();
  if (fn === "admin_dashboard") return dashboardPayload();
  if (fn === "admin_member_search") return searchPayload([member]);
  if (fn === "admin_member_detail") return detailPayload();
  return creditPayload();
}

/** Only the transport is faked; parsing and error mapping are the real code. */
function makeSupabase(handler: Handler) {
  return {
    rpc: vi.fn(async (fn: string, params?: Record<string, unknown>) => handler(fn, params)),
    auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: "admin" } } } })) },
  };
}

function setSession(
  status: "loading" | "anonymous" | "authenticated" | "unconfigured",
  handler: Handler = (fn) => ({ data: payloadFor(fn), error: null }),
) {
  mocks.useAuth.mockReturnValue({
    client: status === "unconfigured" ? null : makeSupabase(handler),
    status,
    user: status === "authenticated" ? { id: "admin", email: "admin@legendstudy.com" } : null,
    recoveryActive: false,
    completeRecovery: () => {},
    signOut: async () => {},
  });
}

const okOperator: Handler = (fn) =>
  fn === "admin_operator" ? { data: true, error: null } : { data: payloadFor(fn), error: null };

describe("AdminGate", () => {
  it("denies an anonymous visitor and never mounts the console", async () => {
    setSession("anonymous", okOperator);
    render(
      <AdminGate>
        <p>운영 데이터</p>
      </AdminGate>,
    );
    expect(await screen.findByText("로그인이 필요합니다")).toBeInTheDocument();
    expect(screen.queryByText("운영 데이터")).not.toBeInTheDocument();
  });

  it("denies an authenticated non-operator", async () => {
    setSession("authenticated", (fn) =>
      fn === "admin_operator" ? { data: false, error: null } : { data: payloadFor(fn), error: null },
    );
    render(
      <AdminGate>
        <p>운영 데이터</p>
      </AdminGate>,
    );
    expect(await screen.findByText("운영자 권한이 없습니다")).toBeInTheDocument();
    expect(screen.queryByText("운영 데이터")).not.toBeInTheDocument();
  });

  it("mounts the console for an operator", async () => {
    setSession("authenticated", okOperator);
    render(
      <AdminGate>
        <p>운영 데이터</p>
      </AdminGate>,
    );
    expect(await screen.findByText("운영 데이터")).toBeInTheDocument();
  });

  it("reports an unapplied read boundary distinctly from a denial", async () => {
    setSession("authenticated", () => ({ data: null, error: { message: "boom" } }));
    render(
      <AdminGate>
        <p>운영 데이터</p>
      </AdminGate>,
    );
    expect(await screen.findByText("조회하지 못했습니다")).toBeInTheDocument();
    expect(screen.queryByText("운영자 권한이 없습니다")).not.toBeInTheDocument();
  });

  it("waits for the session instead of guessing", () => {
    setSession("loading", okOperator);
    render(
      <AdminGate>
        <p>운영 데이터</p>
      </AdminGate>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("운영 데이터")).not.toBeInTheDocument();
  });
});

describe("AdminDashboardView", () => {
  it("renders observed metrics and marks an uninstalled subsystem", async () => {
    setSession("authenticated", okOperator);
    render(<AdminDashboardView />);
    expect(await screen.findByText("전체 회원")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getAllByText("미설치").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/RUNTIME_OFF/)).toBeInTheDocument();
    expect(screen.getByText(/LIVE_OFF/)).toBeInTheDocument();
  });

  it("shows an error state with a retry when the read fails", async () => {
    setSession("authenticated", () => ({
      data: null,
      error: { code: "PT401", message: "OPERATOR_REQUIRED" },
    }));
    render(<AdminDashboardView />);
    expect(await screen.findByText("운영자 권한이 없습니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });
});

describe("AdminMembersView", () => {
  it("loads a bounded directory immediately with total count and school names", async () => {
    setSession('authenticated');render(<AdminMembersView/>);
    expect(await screen.findByText('전체 1명 · 조회 1명')).toBeInTheDocument();
    expect(screen.getByText(/검증고등학교/)).toBeInTheDocument();
    expect(screen.queryByText(member.account_id)).not.toBeInTheDocument();
    expect(screen.queryByText('학교 코드')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader',{name:'순번'})).toBeInTheDocument();
    expect(screen.getByRole('cell',{name:'1'})).toBeInTheDocument();
  });
  it("passes search, status, grade, sort and server offsets without filtering page rows",async()=>{
    const requests:Record<string,unknown>[]=[];
    setSession('authenticated',(fn,p)=>{if(fn==='admin_member_list'){requests.push(p!);return {data:directoryPayload(undefined,30,p?.p_offset as number),error:null};}return okOperator(fn,p);});
    render(<AdminMembersView/>);await screen.findByText('전체 30명 · 조회 30명');
    await userEvent.click(screen.getByRole('button',{name:'다음'}));await waitFor(()=>expect(requests.at(-1)?.p_offset).toBe(25));
    expect(await screen.findByRole('cell',{name:'26'})).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('이메일·이름·계정 ID 검색'),'회원');
    await userEvent.selectOptions(screen.getByLabelText('현재 상태'),'student');
    await userEvent.selectOptions(screen.getByLabelText('학년'),'3');
    await userEvent.selectOptions(screen.getByLabelText('정렬'),'oldest');
    await userEvent.click(screen.getByRole('button',{name:'검색·필터 적용'}));
    await waitFor(()=>expect(requests.at(-1)).toMatchObject({p_query:'회원',p_offset:0,p_academic_status:'student',p_grade:3,p_sort:'oldest',p_limit:25}));
  });
  it("distinguishes empty database, no results and RPC failure",async()=>{
    setSession('authenticated',()=>({data:directoryPayload([]),error:null}));const view=render(<AdminMembersView/>);
    expect(await screen.findByText('등록된 회원이 없습니다')).toBeInTheDocument();view.unmount();
    setSession('authenticated',()=>({data:{...directoryPayload([],10),filtered_total:0},error:null}));const second=render(<AdminMembersView/>);
    expect(await screen.findByText('조회 결과가 없습니다')).toBeInTheDocument();second.unmount();
    setSession('authenticated',()=>({error:{code:'42501'}}));render(<AdminMembersView/>);
    expect(await screen.findByRole('button',{name:'다시 시도'})).toBeInTheDocument();expect(screen.queryByText('등록된 회원이 없습니다')).not.toBeInTheDocument();
  });

  it("lists a member and opens the detail with credit history", async () => {
    setSession("authenticated", okOperator);
    render(<AdminMembersView />);

    expect(await screen.findByText("member@legendstudy.com")).toBeInTheDocument();
    expect(screen.getAllByText("정상").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: "회원 상세 보기" }));
    expect(await screen.findByText("회원 상세")).toBeInTheDocument();
    expect(screen.getByText("email, google")).toBeInTheDocument();
    expect(screen.getByText("검증대학교 · 컴퓨터공학과")).toBeInTheDocument();
    expect(screen.getAllByText("공학").length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByText("서비스 이용")).toBeInTheDocument());
    expect(screen.getByText("답안 본문은 이 화면에 표시하지 않습니다.")).toBeInTheDocument();
    expect(screen.getAllByText("미설치").length).toBeGreaterThanOrEqual(1);

    // Credit history and authenticated operator grant control.
    expect(await screen.findByText("지급 단위")).toBeInTheDocument();
    // The origin label and the transaction-type label share the same Korean copy.
    expect(screen.getAllByText("신규가입 무료").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /Credit 지급/ })).toBeEnabled();
  });
});

describe("AdminCreditView", () => {
  it("shows the aggregate and grant guidance", async () => {
    setSession("authenticated", okOperator);
    render(<AdminCreditView />);
    expect(await screen.findByText("Credit 현황")).toBeInTheDocument();
    expect(screen.getByText("현재 사용 가능")).toBeInTheDocument();
    expect(
      screen.getByText(/회원 조회 후 운영 Credit을 지급할 수 있습니다/),
    ).toBeInTheDocument();
  });

  it("routes a lookup to one member's credit panel", async () => {
    setSession("authenticated", okOperator);
    render(<AdminCreditView />);
    await userEvent.type(screen.getByLabelText("이메일 또는 계정 ID"), "member@legendstudy.com");
    await userEvent.click(screen.getByRole("button", { name: "조회" }));
    await userEvent.click(await screen.findByRole("button", { name: /member@legendstudy.com/ }));
    expect(await screen.findByText("거래 내역")).toBeInTheDocument();
  });
});

 it("unmounts private views synchronously when the operator account changes", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
  const client = { rpc, auth: { getSession: async () => ({ data: { session: { user: { id: "operator-a" } } } }) } };
  mocks.useAuth.mockReturnValue({ status: "authenticated", user: { id: "operator-a" }, client });
  const { rerender } = render(<AdminGate><p>PRIVATE OPERATOR DATA</p></AdminGate>);
  await screen.findByText("PRIVATE OPERATOR DATA");
  rpc.mockReturnValue(new Promise(() => {}));
  mocks.useAuth.mockReturnValue({ status: "authenticated", user: { id: "operator-b" }, client });
  rerender(<AdminGate><p>PRIVATE OPERATOR DATA</p></AdminGate>);
  expect(screen.queryByText("PRIVATE OPERATOR DATA")).toBeNull();
 });
