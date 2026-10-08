// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MathInputFlow } from "./math-input-flow";
import { region } from "@/lib/math-input/fixtures";
import type { ReadinessResult } from "@/lib/math-input/types";

const ready: ReadinessResult = {
  status: "READY_FOR_EVALUATION",
  failureStates: [],
  confirmationRequired: [],
  readyInput: null,
};

function needsConfirmation(): ReadinessResult {
  return {
    status: "NEEDS_CONFIRMATION",
    failureStates: ["CRITICAL_UNCERTAINTY", "CONFIRMATION_REQUIRED"],
    confirmationRequired: [region({ role: "EXPONENT", rawText: "x^3", normalizedMath: "x^3", confidence: "AMBIGUOUS" })],
    readyInput: null,
  };
}

describe("MathInputFlow", () => {
  it("shows the ready state", () => {
    render(<MathInputFlow readiness={ready} onConfirm={() => {}} />);
    expect(screen.getByText("평가 준비 완료")).toBeInTheDocument();
  });

  it("renders only the ambiguous region and confirms the provider candidate", () => {
    const onConfirm = vi.fn();
    const readiness = needsConfirmation();
    render(<MathInputFlow readiness={readiness} onConfirm={onConfirm} />);
    expect(screen.getByText("확인 필요")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(onConfirm).toHaveBeenCalledWith({
      regionId: readiness.confirmationRequired[0].regionId,
      confirmedRawText: "x^3",
      acceptedAsIs: true,
    });
  });

  it("raises a correction when the student edits the value", () => {
    const onConfirm = vi.fn();
    const readiness = needsConfirmation();
    render(<MathInputFlow readiness={readiness} onConfirm={onConfirm} />);
    fireEvent.change(screen.getByLabelText("수정할 내용"), { target: { value: "x^2" } });
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    expect(onConfirm).toHaveBeenCalledWith({
      regionId: readiness.confirmationRequired[0].regionId,
      confirmedRawText: "x^2",
      acceptedAsIs: false,
    });
  });

  it("shows a re-upload message for unreadable evidence", () => {
    render(
      <MathInputFlow
        readiness={{ status: "NEEDS_REUPLOAD", failureStates: ["CRITICAL_UNCERTAINTY"], confirmationRequired: [], readyInput: null }}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText(/다시 올려야/)).toBeInTheDocument();
  });
});
