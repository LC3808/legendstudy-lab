// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LabLanding } from "@/components/lab-landing";

describe("Axis Data Tracks landing", () => {
  it("keeps the fixed two-line Hero and independent three-track narrative", () => {
    const { container } = render(<LabLanding />);

    expect(screen.getByRole("heading", { level: 1, name: "데이터가 쌓일수록,나의 가능성은 선명해집니다." })).toBeInTheDocument();
    expect(screen.getAllByText("하나의 기록으로 연결됩니다.")).toHaveLength(2);

    for (const title of ["내신 분석", "모의고사 · 수능 분석", "논술 첨삭"]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }

    for (const label of ["내신", "모의고사 · 수능", "논술"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(2);
    }

    expect(container.querySelector(".ll-convergence, .ll-ledger, .ll-convergence-node, svg")).toBeNull();
    expect(
      screen.getByRole("heading", { level: 2, name: "내신부터 수시모집과 수능까지, 대입 준비를 하나로 연결하는 세 가지 축." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "연결된 데이터가, 더 나은 대입 전략을 만듭니다." }),
    ).toBeInTheDocument();
    expect(screen.queryByText("기능이 아니라, 데이터가 이어집니다.")).not.toBeInTheDocument();
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
