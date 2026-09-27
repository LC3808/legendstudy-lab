// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LabLanding } from "@/components/lab-landing";

describe("Axis Convergence landing", () => {
  it("keeps the approved three-axis narrative and conceptual convergence diagram", () => {
    render(<LabLanding />);

    expect(screen.getByRole("heading", { level: 1, name: /데이터가 쌓일수록/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /세 입시 데이터 축의 수렴/ })).toBeInTheDocument();

    for (const title of ["내신 분석", "모의고사 · 수능 분석", "논술 첨삭"]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }

    expect(screen.getByText("나의 입시 데이터", { selector: ".ll-convergence__result" })).toBeInTheDocument();
    expect(screen.getByText("기능이 아니라, 데이터가 이어집니다.")).toBeInTheDocument();
  });

  it("retains public CTA destinations rather than adding illustrative product routes", () => {
    render(<LabLanding />);

    expect(screen.getByRole("link", { name: /세 개의 LAB 보기/ })).toHaveAttribute("href", "#three-labs");
    expect(screen.getByRole("link", { name: "이용 안내" })).toHaveAttribute("href", "/lab/how-it-works");
    expect(screen.getByRole("link", { name: /LegendStudy 계정으로 시작하기/ })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "공개 범위 보기" })).toHaveAttribute("href", "/lab/coverage");
    expect(screen.queryByRole("link", { name: /나의 입시 데이터 확인하기/ })).not.toBeInTheDocument();
  });
});
