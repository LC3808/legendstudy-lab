// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "./auth-context";
import { PersonalEntry } from "./personal-entry";
import PricingPage from "@/app/pricing/page";
import { CustomerCenterFooterContact } from "./business-info-block";
vi.mock("./pricing-plans", () => ({ PricingPlans: () => <div>상품 목록</div> }));
vi.mock("./pricing-promo-form", () => ({ PricingPromoForm: () => <div>프로모션 입력</div> }));

describe("product entry points", () => {
  it.each(["anonymous", "authenticated"] as const)("sends %s personal entry to the intended destination", (status) => {
    const value = { status, user: status === "authenticated" ? { id: "test" } : null } as AuthContextValue;
    render(<AuthContext.Provider value={value}><PersonalEntry>내 계정 보기</PersonalEntry></AuthContext.Provider>);
    expect(screen.getByRole("link")).toHaveAttribute("href", status === "authenticated" ? "/account" : "/login?next=%2Faccount%2F");
  });
  it("places promotions immediately after products and before purchase guidance", () => {
    render(<PricingPage />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map(h => h.textContent);
    const products = headings.indexOf("판매 상품");
    expect(headings.slice(products, products + 3)).toEqual(["판매 상품", "학교 단체 이용 / 이벤트 프로모션", "구매 안내"]);
  });
  it("labels both footer contact purposes", () => {
    render(<CustomerCenterFooterContact />);
    expect(screen.getByText(/고객 지원/)).toHaveTextContent("support@legendstudy.com");
    expect(screen.getByText(/일반\/제휴 문의/)).toHaveTextContent("contact@legendstudy.com");
  });
});
