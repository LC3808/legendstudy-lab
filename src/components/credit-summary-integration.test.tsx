// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreditBalance } from "@/components/credit-balance";
import { EssayCreditStatus } from "@/components/essay-credit-status";

/**
 * A stand-in for the browser Supabase client. Only the three calls the shared
 * Credit hook makes are implemented, so the test exercises the real hook, the
 * real DTO validation and the real components.
 */
type SessionResult = { data: { session: { user: { id: string } } | null } };

const mockClient = {
  auth: {
    getSession: vi.fn(async (): Promise<SessionResult> => ({ data: { session: { user: { id: "user-1" } } } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
  },
  rpc: vi.fn(),
};

vi.mock("@/lib/browser-auth-client", () => ({
  getBrowserAuthClient: () => mockClient,
}));

const ready = { dto_version: "credit-v1", spendable: 5, paid: 2, free: 3, other: 0, next_expiry: "2027-01-07T14:59:59.000Z" };

beforeEach(() => {
  mockClient.rpc.mockReset();
  mockClient.auth.getSession.mockClear();
});

describe("one Credit authority for MY and 논술 LAB", () => {
  it("shows MY and the 논술 LAB header the same number from one RPC", async () => {
    mockClient.rpc.mockResolvedValue({ data: ready, error: null });
    render(<><CreditBalance /><EssayCreditStatus /></>);

    await waitFor(() => expect(screen.getByText("5개")).toBeInTheDocument());
    expect(screen.getByText(/사용 가능 5 Credits/)).toBeInTheDocument();
    expect(screen.getByText("무료 3 · 구매 2")).toBeInTheDocument();
    expect(screen.getByText("가장 가까운 만료일 2027.01.07")).toBeInTheDocument();
    // One read serves both screens: the header does not open its own query.
    expect(mockClient.rpc).toHaveBeenCalledTimes(2);
    for (const call of mockClient.rpc.mock.calls) expect(call[0]).toBe("credit_summary");
  });

  it("refuses a DTO whose parts do not add up instead of showing it", async () => {
    mockClient.rpc.mockResolvedValue({ data: { ...ready, spendable: 99 }, error: null });
    render(<EssayCreditStatus />);

    await waitFor(() => expect(screen.getByText(/첨삭권을 확인하지 못했습니다/)).toBeInTheDocument());
    expect(screen.queryByText("99개")).not.toBeInTheDocument();
    expect(screen.queryByText("5개")).not.toBeInTheDocument();
  });

  it("refuses an unknown DTO version", async () => {
    mockClient.rpc.mockResolvedValue({ data: { ...ready, dto_version: "credit-v2" }, error: null });
    render(<EssayCreditStatus />);
    await waitFor(() => expect(screen.getByText(/첨삭권을 확인하지 못했습니다/)).toBeInTheDocument());
  });

  it("does not claim a balance when the RPC fails", async () => {
    mockClient.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    render(<EssayCreditStatus />);
    await waitFor(() => expect(screen.getByText(/첨삭권을 확인하지 못했습니다/)).toBeInTheDocument());
    expect(screen.queryByText(/내 첨삭권/)).not.toBeInTheDocument();
  });

  it("renders no balance for an anonymous session", async () => {
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null } });
    render(<EssayCreditStatus />);
    await waitFor(() => expect(screen.getByRole("link", { name: "로그인하고 첨삭권 확인" })).toBeInTheDocument());
    expect(mockClient.rpc).not.toHaveBeenCalled();
  });
});
