// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EssayCreditStatus, formatExpiry } from "@/components/essay-credit-status";

const mockState: { current: unknown } = { current: { status: "loading" } };

vi.mock("@/components/credit-balance", () => ({
  useCreditSummary: () => ({ state: mockState.current, reload: () => {} }),
}));

function renderWith(state: unknown) {
  mockState.current = state;
  return render(<EssayCreditStatus />);
}

/** Next normalizes a generated trailing slash, so compare the route itself. */
function route(name: string) {
  return screen.getByRole("link", { name }).getAttribute("href")?.replace(/\/$/, "");
}

describe("논술 LAB 첨삭권 현황", () => {
  it("claims no balance before the read resolves", () => {
    renderWith({ status: "loading" });
    expect(screen.getByText("첨삭권을 확인하고 있습니다.")).toBeInTheDocument();
    expect(screen.queryByText(/\d+개/)).not.toBeInTheDocument();
  });

  it("offers sign-in instead of a balance to a signed-out visitor", () => {
    renderWith({ status: "signed-out" });
    expect(route("로그인하고 첨삭 시작")).toBe("/login");
    expect(screen.queryByText(/\d+개/)).not.toBeInTheDocument();
    expect(screen.queryByText(/무료 \d/)).not.toBeInTheDocument();
    expect(screen.queryByText("첨삭권이 없습니다.")).not.toBeInTheDocument();
  });

  it("never renders a zero balance when the read failed", () => {
    renderWith({ status: "error" });
    expect(screen.getByText("첨삭권을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
    expect(screen.queryByText("첨삭권이 없습니다.")).not.toBeInTheDocument();
  });

  it("asks a visitor with no 첨삭권 to buy one", () => {
    renderWith({ status: "ready", value: { dto_version: "credit-v1", spendable: 0, paid: 0, free: 0, other: 0, next_expiry: null } });
    expect(screen.getByText("첨삭권이 없습니다.")).toBeInTheDocument();
    expect(route("첨삭권 구매")).toBe("/pricing");
    expect(screen.queryByRole("link", { name: "나의 첨삭 기록" })).not.toBeInTheDocument();
  });

  it("shows the count, the split, the nearest expiry and both destinations", () => {
    renderWith({
      status: "ready",
      value: { dto_version: "credit-v1", spendable: 5, paid: 2, free: 3, other: 0, next_expiry: "2027-01-07T14:59:59.000Z" },
    });
    expect(screen.getByText(/내 첨삭권/)).toBeInTheDocument();
    expect(screen.getByText("5개")).toBeInTheDocument();
    expect(screen.getByText("무료 3 · 구매 2")).toBeInTheDocument();
    expect(screen.getByText("가장 가까운 만료일 2027.01.07")).toBeInTheDocument();
    // 나의 첨삭 기록 is the MY essay history route: one history, not a second one.
    expect(route("나의 첨삭 기록")).toBe("/my/essays");
    expect(route("첨삭권 구매")).toBe("/pricing");
  });

  it("mentions 기타 only when other Credits exist, and omits a missing expiry", () => {
    renderWith({ status: "ready", value: { dto_version: "credit-v1", spendable: 4, paid: 2, free: 1, other: 1, next_expiry: null } });
    expect(screen.getByText("무료 1 · 구매 2 · 기타 1")).toBeInTheDocument();
    expect(screen.queryByText(/만료일/)).not.toBeInTheDocument();
  });
});

describe("formatExpiry", () => {
  it("formats a date without the visitor's locale", () => {
    expect(formatExpiry("2027-01-07T14:59:59.000Z")).toBe("2027.01.07");
    expect(formatExpiry("2026-12-31T00:00:00.000Z")).toBe("2026.12.31");
  });

  it("refuses an unparseable value rather than inventing a date", () => {
    expect(formatExpiry("not-a-date")).toBeNull();
  });
});
