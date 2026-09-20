// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { EssayEditor } from "./essay-editor";
import { syntheticQuestion } from "@/fixtures/public-metadata";

describe("EssayEditor", () => {
  beforeEach(() => {
    window.localStorage.clear();
    push.mockReset();
  });

  it("counts characters and saves a temporary browser-local draft", async () => {
    const user = userEvent.setup();
    render(<EssayEditor question={syntheticQuestion} />);
    const textarea = screen.getByLabelText("합성 문제 답안 작성");
    await user.type(textarea, "가 나");
    expect(screen.getByText("2자")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "임시 저장" }));
    expect(window.localStorage.getItem("ls-lab-phase2-synthetic-q-01-draft")).toBe("가 나");
    expect(screen.getByText("방금 이 브라우저에 임시 저장됨")).toBeInTheDocument();
  });

  it("requires a confirmation before navigating to the synthetic evaluation result", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<EssayEditor question={syntheticQuestion} />);
    await user.click(screen.getByRole("button", { name: /Mock 제출/ }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: /Mock 제출/ }));
    expect(push).toHaveBeenCalledWith("/essay-lab/evaluation/mock-attempt-001");
  });
});
