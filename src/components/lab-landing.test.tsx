// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "@/components/auth-context";
import { LabLanding } from "@/components/lab-landing";

describe("Axis Data Tracks landing", () => {
  it("keeps the fixed two-line Hero and the three service axes", () => {
    const { container } = render(<AuthProvider><LabLanding /></AuthProvider>);

    expect(screen.getByRole("heading", { level: 1, name: "데이터가 쌓일수록,나의 가능성은 선명해집니다." })).toBeInTheDocument();
    expect(screen.getAllByText("하나의 기록으로 연결됩니다.")).toHaveLength(1);

    for (const title of ["내신 LAB", "모의·수능 LAB", "논술 LAB"]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }

    for (const label of ["내신", "모의고사 · 수능", "논술"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    }

    expect(container.querySelector(".ll-convergence, .ll-ledger, .ll-convergence-node, svg")).toBeNull();
    expect(
      screen.getByRole("heading", { level: 2, name: "내신부터 수시모집과 수능까지, 학생의 대입 성공을 이해하는 세 가지 축" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "연결된 데이터가 합격 가능성을 높입니다." }),
    ).toBeInTheDocument();
    expect(screen.queryByText("기능이 아니라, 데이터가 이어집니다.")).not.toBeInTheDocument();
  });

  it("states the value in short copy instead of explaining implementation", () => {
    render(<AuthProvider><LabLanding /></AuthProvider>);

    // One sentence per axis card, and the axis cards carry no status label.
    expect(screen.getByText("과목별 성적과 변화에서 강점과 보완점을 확인합니다.")).toBeInTheDocument();
    expect(screen.getByText("성적의 변화와 현재 위치를 확인합니다.")).toBeInTheDocument();
    expect(screen.getByText("대학별 평가 기준에 맞춰 내 답안을 점검하고 다시 써봅니다.")).toBeInTheDocument();
    for (const status of ["설계 단계", "준비 단계"]) {
      expect(screen.queryByText(status)).not.toBeInTheDocument();
    }

    // Section 3 keeps the two-sentence value statement only.
    expect(
      screen.getByText(
        "내신, 모의고사·수능, 논술을 따로 보지 않습니다. 기록이 쌓일수록 현재 위치와 다음에 보완할 것이 더 선명해집니다.",
      ),
    ).toBeInTheDocument();

    // The removed sections and the removed explanatory copy stay out.
    expect(screen.queryByRole("heading", { level: 2, name: "기록하고, 분석하고, 이해하고, 결정합니다." })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "지금의 위치를 이해하는 것부터." })).not.toBeInTheDocument();
    expect(screen.queryByText(/LegendStudy 계정으로 LAB을 시작하세요/)).not.toBeInTheDocument();
    expect(screen.queryByText(/계정과 개인 기록은 분리해 다룹니다/)).not.toBeInTheDocument();
    expect(screen.queryByText(/이 설명은 제품 방향이며/)).not.toBeInTheDocument();
    expect(screen.queryByText(/각 분석이 서로 다른 계정·프로필·데이터 섬으로 나뉘지 않습니다/)).not.toBeInTheDocument();
    expect(screen.queryByText(/정책·보안·품질 기준이 확정된 뒤/)).not.toBeInTheDocument();
  });

  it("retains public CTA destinations rather than adding illustrative product routes", () => {
    render(<AuthProvider><LabLanding /></AuthProvider>);

    expect(screen.queryByRole("link", { name: /세 개의 LAB 보기/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "이용 안내" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /레전드스터디 계정으로 시작하기/ })).toHaveAttribute("href", "/login?next=%2Faccount%2F");
    expect(screen.queryByRole("link", { name: "공개 범위 보기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /나의 입시 데이터 확인하기/ })).not.toBeInTheDocument();
  });
});
