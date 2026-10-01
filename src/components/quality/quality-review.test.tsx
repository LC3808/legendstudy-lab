// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QualityReviewPanel } from "./quality-review-panel";
import { parseJudgmentPage } from "@/lib/quality/human-review-contract";
import type { HumanReviewClient } from "@/lib/quality/human-review-client";
import { hqJudgmentPageFixture, hqTargetDetailFixture } from "@/lib/quality/human-review-fixtures";
import { HumanReviewError } from "@/lib/quality/human-review-errors";

const EVAL = hqTargetDetailFixture.evaluation_id;

function makeHr(overrides: Partial<HumanReviewClient> = {}): HumanReviewClient & { submitJudgment: ReturnType<typeof vi.fn>; listJudgments: ReturnType<typeof vi.fn> } {
  const hr = {
    getReviewState: vi.fn().mockResolvedValue([]),
    listJudgments: vi.fn().mockResolvedValue(parseJudgmentPage(hqJudgmentPageFixture)),
    submitJudgment: vi.fn().mockResolvedValue({ dtoVersion: "hq-write-v1", judgmentId: "new-1", replayed: false }),
    ...overrides,
  };
  return hr as never;
}

function renderPanel(hr: HumanReviewClient, onReviewed = vi.fn()) {
  return render(<QualityReviewPanel humanReview={hr} evaluationId={EVAL} detail={hqTargetDetailFixture} onReviewed={onReviewed} />);
}

/** Fill a valid PASS review via the DOM (all required + applicable conditional verdicts OK). */
function fillValidPass() {
  // disposition
  const dispo = screen.getByText("종합 판정").closest("fieldset")!;
  fireEvent.click(within(dispo).getByDisplayValue("PASS"));
  // required rubric — click every OK radio in the group
  const required = screen.getByText("필수 평가 항목").closest("fieldset")!;
  required.querySelectorAll('input[type="radio"][value="OK"]').forEach((r) => fireEvent.click(r));
  // conditional rubric — applicable rows (sentence_feedback, generated_rewrite)
  const conditional = screen.getByText("조건부 평가 항목").closest("fieldset")!;
  conditional.querySelectorAll('input[type="radio"][value="OK"]').forEach((r) => fireEvent.click(r));
  // attestation
  fireEvent.click(screen.getByLabelText(/공식 자료·맥락을 확인했습니다/));
}

afterEach(() => vi.clearAllMocks());

describe("Human Review history (H17/H18/H19)", () => {
  it("renders independent, superseded and deleted-reviewer judgments", async () => {
    renderPanel(makeHr());
    expect(await screen.findByText("삭제된 리뷰어")).toBeInTheDocument(); // H63/H17
    expect(screen.getAllByTestId("ql-review-item")).toHaveLength(2); // H18 superseded still visible
    expect(screen.getByText(/정정됨\(이력\)/)).toBeInTheDocument();
    expect(screen.getByText("독립 검토")).toBeInTheDocument(); // H19
    expect(screen.getByText("정정 기록")).toBeInTheDocument();
    // deleted reviewer must never leak an id/email fallback
    const panel = screen.getByTestId("ql-human-review");
    expect(panel.textContent).not.toMatch(/@[a-z]+\.[a-z]+/i);
  });
});

describe("Human Review form canonical contract (H21/H22/H23/H25)", () => {
  it("renders exact dispositions and rubric dimensions; conditional NA shown for inapplicable", async () => {
    renderPanel(makeHr());
    await screen.findByText("삭제된 리뷰어");
    const dispo = screen.getByText("종합 판정").closest("fieldset")!;
    for (const label of ["적합", "적합 · 참고사항", "재검토 필요", "부적합"]) {
      expect(within(dispo).getByText(label)).toBeInTheDocument();
    }
    const required = screen.getByText("필수 평가 항목").closest("fieldset")!;
    expect(within(required).getByText(/진단 정확성 · 차단/)).toBeInTheDocument();
    expect(within(required).getByText(/환각·오류 날조 없음 · 차단/)).toBeInTheDocument();
    // progression is not applicable in the fixture → shown locked as NA
    const conditional = screen.getByText("조건부 평가 항목").closest("fieldset")!;
    expect(within(conditional).getByText("해당 없음 (NA)")).toBeInTheDocument();
  });

  it("H24: submit is disabled until the draft is valid", async () => {
    renderPanel(makeHr());
    await screen.findByText("삭제된 리뷰어");
    expect(screen.getByRole("button", { name: "검토 기록" })).toBeDisabled();
    fillValidPass();
    expect(screen.getByRole("button", { name: "검토 기록" })).not.toBeDisabled();
  });

  it("H30: finding target options come only from the loaded evaluation (no free-text id)", async () => {
    renderPanel(makeHr());
    await screen.findByText("삭제된 리뷰어");
    fireEvent.click(screen.getByRole("button", { name: "+ 이슈 추가" }));
    const targetSelect = screen.getByRole("combobox", { name: "대상" });
    const optionTexts = within(targetSelect).getAllByRole("option").map((o) => o.textContent);
    expect(optionTexts).toContain("전체 평가");
    expect(optionTexts.some((t) => t?.startsWith("차원 · "))).toBe(true);
    expect(optionTexts.some((t) => t?.startsWith("문장 · "))).toBe(true);
    expect(screen.queryByRole("textbox", { name: /uuid/i })).not.toBeInTheDocument();
  });
});

describe("Human Review submission (H33/H34/H35/H36/H45)", () => {
  it("submits a valid review through the canonical RPC and refreshes", async () => {
    const hr = makeHr();
    const onReviewed = vi.fn();
    renderPanel(hr, onReviewed);
    await screen.findByText("삭제된 리뷰어");
    fillValidPass();
    fireEvent.click(screen.getByRole("button", { name: "검토 기록" }));
    fireEvent.click(await screen.findByRole("button", { name: "기록 확정" }));
    await waitFor(() => expect(hr.submitJudgment).toHaveBeenCalledTimes(1));
    const payload = hr.submitJudgment.mock.calls[0][0];
    expect(payload.dto_version).toBe("hq-write-v1");
    expect(payload.overall_disposition).toBe("PASS");
    expect(payload.official_source_reviewed).toBe(true);
    expect(payload.rubric_version).toBe("hq-rubric-v1");
    // H45: submission only records; no extra side-effect methods exist on the client.
    await waitFor(() => expect(onReviewed).toHaveBeenCalledWith(EVAL)); // H35 list refresh
    await waitFor(() => expect(hr.listJudgments).toHaveBeenCalledTimes(2)); // H36 history refresh
  });

  it("H34: a pending submit cannot be double-submitted", async () => {
    let resolve!: (v: unknown) => void;
    const hr = makeHr({ submitJudgment: vi.fn(() => new Promise((r) => { resolve = r; })) as never });
    renderPanel(hr);
    await screen.findByText("삭제된 리뷰어");
    fillValidPass();
    fireEvent.click(screen.getByRole("button", { name: "검토 기록" }));
    const confirm = await screen.findByRole("button", { name: "기록 확정" });
    fireEvent.click(confirm);
    // While pending, the submit control is disabled; a second click is a no-op.
    const pendingButton = screen.getByRole("button", { name: "검토 기록" });
    expect(pendingButton).toBeDisabled();
    fireEvent.click(pendingButton);
    expect(hr.submitJudgment).toHaveBeenCalledTimes(1);
    resolve({ dtoVersion: "hq-write-v1", judgmentId: "x", replayed: false });
  });

  it("H43: same-key/different-payload conflict surfaces a clear operator error", async () => {
    const hr = makeHr({ submitJudgment: vi.fn().mockRejectedValue(new HumanReviewError("IDEMPOTENCY_CONFLICT", "conflict")) as never });
    renderPanel(hr);
    await screen.findByText("삭제된 리뷰어");
    fillValidPass();
    fireEvent.click(screen.getByRole("button", { name: "검토 기록" }));
    fireEvent.click(await screen.findByRole("button", { name: "기록 확정" }));
    expect(await screen.findByText(/동일 제출 키로 다른 내용이 이미 접수/)).toBeInTheDocument();
  });
});

describe("Idempotency key management (H40/H41/H42)", () => {
  it("reuses the submission id on an ambiguous retry and rotates it when the payload changes", async () => {
    const hr = makeHr({ submitJudgment: vi.fn().mockRejectedValue(new HumanReviewError("NETWORK_AMBIGUOUS", "net")) as never });
    renderPanel(hr);
    await screen.findByText("삭제된 리뷰어");
    fillValidPass();

    const submitOnce = async () => {
      fireEvent.click(screen.getByRole("button", { name: "검토 기록" }));
      fireEvent.click(await screen.findByRole("button", { name: "기록 확정" }));
      await waitFor(() => expect(screen.getByText(/네트워크 상태가 불확실/)).toBeInTheDocument());
    };

    await submitOnce();
    const firstId = hr.submitJudgment.mock.calls[0][0].client_submission_id;
    await submitOnce(); // unchanged draft → same id (H40/H41)
    const secondId = hr.submitJudgment.mock.calls[1][0].client_submission_id;
    expect(secondId).toBe(firstId);

    // change the payload (toggle a required verdict to CONCERN) → new id (H42)
    const required = screen.getByText("필수 평가 항목").closest("fieldset")!;
    fireEvent.click(required.querySelectorAll('input[type="radio"][value="CONCERN"]')[0]);
    // CONCERN makes PASS invalid; switch disposition to PASS_WITH_NOTES to stay submittable
    const dispo = screen.getByText("종합 판정").closest("fieldset")!;
    fireEvent.click(within(dispo).getByDisplayValue("PASS_WITH_NOTES"));
    await submitOnce();
    const thirdId = hr.submitJudgment.mock.calls[2][0].client_submission_id;
    expect(thirdId).not.toBe(firstId);
  });
});

describe("Correction flow (H46/H47/H48)", () => {
  it("starts a correction from a historical judgment and submits a superseding review", async () => {
    const hr = makeHr();
    renderPanel(hr);
    await screen.findByText("삭제된 리뷰어");
    fireEvent.click(screen.getByRole("button", { name: "이 검토 정정" })); // active judgment
    expect(await screen.findByText(/정정 기록입니다/)).toBeInTheDocument();
    // original judgments remain visible (H48)
    expect(screen.getAllByTestId("ql-review-item")).toHaveLength(2);
    fillValidPass();
    fireEvent.click(screen.getByRole("button", { name: "검토 기록" }));
    fireEvent.click(await screen.findByRole("button", { name: "기록 확정" }));
    await waitFor(() => expect(hr.submitJudgment).toHaveBeenCalledTimes(1));
    expect(hr.submitJudgment.mock.calls[0][0].supersedes_judgment_id).toBe("jjjjjjj2-0000-0000-0000-000000000002");
  });
});
