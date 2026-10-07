// @vitest-environment jsdom

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QualityConsole } from "./quality-console";
import { QualityError } from "@/lib/quality/errors";
import {
  qualityCaseDetailFixture,
  qualityListEnvelopeEmptyFixture,
  qualityListEnvelopePopulatedFixture,
} from "@/lib/quality/fixtures";
import { parseListEnvelope } from "@/lib/quality/contract";

const mocks = vi.hoisted(() => ({
  auth: { status: "authenticated" as string, client: {} as unknown, user: { id: "u-1", email: "op@example.com" } as unknown },
  quality: {
    isOperator: vi.fn(),
    listCases: vi.fn(),
    getCaseDetail: vi.fn(),
  },
}));

vi.mock("@/components/auth-context", () => ({
  useAuth: () => mocks.auth,
}));

vi.mock("@/lib/quality/client", () => ({
  createQualityClient: () => mocks.quality,
}));

const populatedPage = parseListEnvelope(qualityListEnvelopePopulatedFixture);
const emptyPage = parseListEnvelope(qualityListEnvelopeEmptyFixture);

afterEach(() => {
  vi.clearAllMocks();
  mocks.auth.status = "authenticated";
  mocks.auth.client = {};
});

describe("QualityConsole auth gate", () => {
  it("T1: signed-out shows a login gate and fetches no Quality data", async () => {
    mocks.auth.status = "anonymous";
    render(<QualityConsole />);
    expect(await screen.findByText("로그인이 필요합니다.")).toBeInTheDocument();
    expect(mocks.quality.isOperator).not.toHaveBeenCalled();
    expect(mocks.quality.listCases).not.toHaveBeenCalled();
  });

  it("T2: authenticated non-operator shows access denied and no list", async () => {
    mocks.quality.isOperator.mockResolvedValue(false);
    render(<QualityConsole />);
    expect(await screen.findByText("접근 권한이 없습니다.")).toBeInTheDocument();
    expect(mocks.quality.listCases).not.toHaveBeenCalled();
  });

  it("shows unconfigured notice when Supabase is not wired", async () => {
    mocks.auth.status = "unconfigured";
    render(<QualityConsole />);
    expect(await screen.findByText("계정 연결이 준비되지 않았습니다.")).toBeInTheDocument();
  });
});

describe("QualityConsole operator workspace", () => {
  it("T3 + T6: operator with an empty list sees the empty state (not an error)", async () => {
    mocks.quality.isOperator.mockResolvedValue(true);
    mocks.quality.listCases.mockResolvedValue(emptyPage);
    render(<QualityConsole />);
    expect(await screen.findByText("검토할 논술 평가가 아직 없습니다.")).toBeInTheDocument();
  });

  it("T7 + T11: operator sees populated list and NO answer body in the list", async () => {
    mocks.quality.isOperator.mockResolvedValue(true);
    mocks.quality.listCases.mockResolvedValue(populatedPage);
    render(<QualityConsole />);
    await waitFor(() => expect(screen.getAllByText(/경북대학교/).length).toBeGreaterThan(0));
    // The full answer text must not appear anywhere before a detail is opened.
    expect(screen.queryByTestId("ql-answer-full")).not.toBeInTheDocument();
    expect(screen.queryByText(/학생이 제출한 전체 답안 본문/)).not.toBeInTheDocument();
  });

  it("T10: selecting a case fetches detail and renders the FULL answer only in detail", async () => {
    mocks.quality.isOperator.mockResolvedValue(true);
    mocks.quality.listCases.mockResolvedValue(populatedPage);
    mocks.quality.getCaseDetail.mockResolvedValue(qualityCaseDetailFixture);
    render(<QualityConsole />);
    fireEvent.click(await screen.findByText("completed"));
    expect(await screen.findByTestId("ql-answer-full")).toBeInTheDocument();
    expect(screen.getByText(/학생이 제출한 전체 답안 본문/)).toBeInTheDocument();
    expect(mocks.quality.getCaseDetail).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111");
  });

  it("T16: detail renders a generated rewrite distinct from student rewrite", async () => {
    mocks.quality.isOperator.mockResolvedValue(true);
    mocks.quality.listCases.mockResolvedValue(populatedPage);
    mocks.quality.getCaseDetail.mockResolvedValue(qualityCaseDetailFixture);
    render(<QualityConsole />);
    fireEvent.click(await screen.findByText("completed"));
    expect(await screen.findByTestId("ql-generated-rewrite")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /AI 생성 재작성/ })).toBeInTheDocument();
    expect(screen.getByText(/AI가 생성한 모범 재작성 예시 본문/)).toBeInTheDocument();
  });

  it("T15: sentence feedback unavailable renders an explicit unavailable state", async () => {
    mocks.quality.isOperator.mockResolvedValue(true);
    mocks.quality.listCases.mockResolvedValue(populatedPage);
    mocks.quality.getCaseDetail.mockResolvedValue(qualityCaseDetailFixture);
    render(<QualityConsole />);
    fireEvent.click(await screen.findByText("completed"));
    expect(await screen.findByText(/문장 단위 피드백이 제공되지 않았습니다/)).toBeInTheDocument();
  });

  it("T19: no account direct identifiers are rendered (pseudonym only)", async () => {
    mocks.quality.isOperator.mockResolvedValue(true);
    mocks.quality.listCases.mockResolvedValue(populatedPage);
    mocks.quality.getCaseDetail.mockResolvedValue(qualityCaseDetailFixture);
    const { container } = render(<QualityConsole />);
    fireEvent.click(await screen.findByText("completed"));
    await screen.findByTestId("ql-answer-full");
    // The operator's own account email must never leak into the console.
    expect(container.textContent).not.toContain("op@example.com");
    expect(container.textContent).not.toMatch(/@[a-z]+\.[a-z]+/i);
    expect(screen.getByText(/계정 직접 식별정보/)).toBeInTheDocument();
  });

  it("T20: an unauthorized list error shows an error state, never fixture data", async () => {
    mocks.quality.isOperator.mockResolvedValue(true);
    mocks.quality.listCases.mockRejectedValue(new QualityError("UNAUTHORIZED", "operator access required"));
    render(<QualityConsole />);
    expect(await screen.findByText("이 목록을 조회할 권한이 없습니다.")).toBeInTheDocument();
    expect(screen.queryByText(/경북대학교/)).not.toBeInTheDocument();
  });

  it("T8: load-more propagates and appends the next page", async () => {
    mocks.quality.isOperator.mockResolvedValue(true);
    mocks.quality.listCases
      .mockResolvedValueOnce(populatedPage)
      .mockResolvedValueOnce(emptyPage);
    render(<QualityConsole />);
    const more = await screen.findByText("다음 페이지");
    fireEvent.click(more);
    await waitFor(() =>
      expect(mocks.quality.listCases).toHaveBeenLastCalledWith({ cursor: populatedPage.nextCursor }),
    );
  });
});

 it("drops the previous operator workspace immediately on account switch", async () => {
  mocks.auth.status = "authenticated"; mocks.auth.user = { id: "switch-a" };
  mocks.quality.isOperator.mockResolvedValue(true);
  mocks.quality.listCases.mockResolvedValue(emptyPage);
  const { container, rerender } = render(<QualityConsole />);
  await waitFor(() => expect(container.querySelector(".ql-workspace")).not.toBeNull());
  mocks.auth.user = { id: "switch-b" };
  mocks.quality.isOperator.mockReturnValue(new Promise(() => {}));
  rerender(<QualityConsole />);
  expect(container.querySelector(".ql-workspace")).toBeNull();
  mocks.auth.user = { id: "u-1" };
 });
