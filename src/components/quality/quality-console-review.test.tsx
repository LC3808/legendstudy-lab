// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QualityConsole } from "./quality-console";
import { parseListEnvelope } from "@/lib/quality/contract";
import { qualityListEnvelopePopulatedFixture } from "@/lib/quality/fixtures";
import type { HqCaseReviewState } from "@/lib/quality/human-review-contract";

const populatedPage = parseListEnvelope(qualityListEnvelopePopulatedFixture);
const ID1 = "11111111-1111-1111-1111-111111111111";
const ID2 = "22222222-2222-2222-2222-222222222222";

const reviewRows: HqCaseReviewState[] = [
  { evaluation_id: ID1, availability: "AVAILABLE", human_review_state: "REVIEWED_WITH_CONCERNS", active_count: 1, has_material_issue: true },
  { evaluation_id: ID2, availability: "AVAILABLE", human_review_state: "UNREVIEWED", active_count: 0, has_material_issue: false },
];

vi.mock("next/navigation",()=>({useRouter:()=>({back:vi.fn(),replace:vi.fn()})}));

const mocks = vi.hoisted(() => ({
  auth: { status: "authenticated" as string, client: {} as unknown, user: { id: "u-1", email: "op@example.com" } as unknown },
  quality: { isOperator: vi.fn(), listCases: vi.fn(), getCaseDetail: vi.fn() },
  humanReview: { getReviewState: vi.fn(), listJudgments: vi.fn(), submitJudgment: vi.fn() },
}));

vi.mock("@/components/auth-context", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/lib/quality/client", () => ({ createQualityClient: () => mocks.quality }));
vi.mock("@/lib/quality/human-review-client", () => ({ createHumanReviewClient: () => mocks.humanReview }));

afterEach(() => {
  vi.clearAllMocks();
  mocks.auth.status = "authenticated";
});

describe("Quality Console review-state integration", () => {
  it("H4/H5/H6: fetches review-state in one batch after the operator gate and shows badges, without per-row history", async () => {
    mocks.quality.isOperator.mockResolvedValue(true);
    mocks.quality.listCases.mockResolvedValue(populatedPage);
    mocks.humanReview.getReviewState.mockResolvedValue(reviewRows);
    render(<QualityConsole />);

    // review-state is only requested once the operator workspace is up
    await screen.findByText("품질 검토 콘솔");
    await waitFor(() => expect(mocks.humanReview.getReviewState).toHaveBeenCalledTimes(1));
    expect(mocks.humanReview.getReviewState).toHaveBeenCalledWith([ID1, ID2]); // batch, not per row
    expect(await screen.findByText(/검토됨 · 주의/)).toBeInTheDocument();
    expect(screen.getByText("미검토")).toBeInTheDocument();
    // H6: no judgment-history calls for the list
    expect(mocks.humanReview.listJudgments).not.toHaveBeenCalled();
  });

  it("H4: non-operator never triggers review-state fetch", async () => {
    mocks.quality.isOperator.mockResolvedValue(false);
    render(<QualityConsole />);
    expect(await screen.findByText("접근 권한이 없습니다.")).toBeInTheDocument();
    expect(mocks.humanReview.getReviewState).not.toHaveBeenCalled();
    expect(mocks.quality.listCases).not.toHaveBeenCalled();
  });

  it("H7: the 미검토 filter shows only unreviewed cases", async () => {
    mocks.quality.isOperator.mockResolvedValue(true);
    mocks.quality.listCases.mockResolvedValue(populatedPage);
    mocks.humanReview.getReviewState.mockResolvedValue(reviewRows);
    render(<QualityConsole />);
    const concern = await screen.findByText(/검토됨 · 주의/);
    expect(concern).toBeInTheDocument();
    const toggle = screen.getByLabelText(/미검토만/);
    toggle.click();
    await waitFor(() => expect(screen.queryByText(/검토됨 · 주의/)).not.toBeInTheDocument());
    expect(screen.getByText("미검토")).toBeInTheDocument();
  });
});
