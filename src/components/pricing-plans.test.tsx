// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PricingPlans } from "./pricing-plans";
import { defaultSelectedCredits, pricingPlans } from "@/lib/pricing";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));

const signedIn = { auth: { getSession: async () => ({ data: { session: { access_token: "synthetic-session" } } }) } };
vi.mock("@/lib/browser-auth-client", () => ({ getBrowserAuthClient: () => client }));

let client: unknown = signedIn;

function runtime(state: string, consumerPurchase = false) {
  return vi.fn().mockResolvedValueOnce(Response.json({ state, consumer_purchase: consumerPurchase }));
}

beforeEach(() => {
  cleanup();
  client = signedIn;
  sessionStorage.clear();
  window.history.replaceState(null, "", "/pricing/");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete window.TossPayments;
});

describe("pricing product grid", () => {
  /**
   * The Owner-reported defect: every control first read "구매하기", the first
   * click did nothing, and only then did the controls re-label themselves. One
   * pack is now selected from the module data, so the labels are already final in
   * the static render and the runtime answer cannot change them.
   */
  it("renders the selection labels from the module state alone", () => {
    vi.stubGlobal("fetch", runtime("NOT_READY"));
    render(<PricingPlans />);
    expect(screen.getAllByText("선택하기").length).toBe(pricingPlans.length - 1);
    expect(screen.getAllByText("결제하기").length).toBe(1);
    expect(screen.queryByText("구매하기")).toBeNull();
  });

  it("preselects the recommended pack and marks it with a badge, not a border", () => {
    vi.stubGlobal("fetch", runtime("NOT_READY"));
    const { container } = render(<PricingPlans />);
    const selected = container.querySelectorAll('.plan-card[data-selected="true"]');
    expect(selected.length).toBe(1);
    const badge = selected[0].querySelector(".plan-card__badge");
    expect(badge).toBeTruthy();
    const recommended = pricingPlans.find((plan) => plan.credits === defaultSelectedCredits);
    expect(badge?.closest(".plan-card")?.textContent).toContain(recommended?.name);
  });

  it("selects on the first click instead of asking for a second one", () => {
    vi.stubGlobal("fetch", runtime("NOT_READY"));
    const { container } = render(<PricingPlans />);
    const oneCredit = pricingPlans.find((plan) => plan.credits === 1);
    const card = container.querySelector(`#pricing-plan-${oneCredit?.id}`)?.closest(".plan-card");
    const select = card?.querySelector(".plan-card__button");
    expect(select?.textContent).toBe("선택하기");

    fireEvent.click(select as Element);

    expect(card?.getAttribute("data-selected")).toBe("true");
    expect(card?.querySelector(".plan-card__button")?.textContent).toBe("결제하기");
    expect(container.querySelectorAll('.plan-card[data-selected="true"]').length).toBe(1);
  });

  it("never changes a label when the payment runtime answers", async () => {
    vi.stubGlobal("fetch", runtime("TEST"));
    render(<PricingPlans />);
    const before = screen.getAllByText("결제하기").length;
    await waitFor(() => expect(screen.getByText("결제하기")).not.toBeDisabled());
    expect(screen.getAllByText("결제하기").length).toBe(before);
    expect(screen.queryByText("구매하기")).toBeNull();
  });

  it("keeps the selected control disabled until the server authorizes a purchase", async () => {
    vi.stubGlobal("fetch", runtime("REVIEW", false));
    render(<PricingPlans />);
    expect(screen.getByText("결제하기")).toBeDisabled();
    await waitFor(() => expect(screen.getByText("결제하기")).toBeDisabled());
    expect(screen.getAllByText("선택하기").length).toBe(pricingPlans.length - 1);
  });

  it.each(pricingPlans)("opens Toss directly for $credits Credits with only the SKU and request key", async (plan) => {
    const checkout = {
      clientKey: "test_ck_fixture", customerKey: "server-buyer", orderId: "server-order",
      orderName: "Server pack", amount: { currency: "KRW", value: 12345 },
      successUrl: "https://lab.legendstudy.com/payments/success/",
      failUrl: "https://lab.legendstudy.com/payments/fail/",
    };
    const f = runtime("REVIEW", true).mockResolvedValue(Response.json({ order: { id: "server-order" }, checkout }));
    vi.stubGlobal("fetch", f);
    const requestPayment = vi.fn().mockResolvedValue(undefined);
    const payment = vi.fn(() => ({ requestPayment }));
    window.TossPayments = vi.fn(() => ({ payment }));
    window.history.replaceState(null, "", `/pricing/?sku=${plan.credits}c`);
    render(<PricingPlans />);
    const pay = screen.getByRole("button", { name: "결제하기" });
    await waitFor(() => expect(pay).not.toBeDisabled());
    expect(f).toHaveBeenCalledTimes(1); // Mounting or selecting never creates an order.
    fireEvent.click(pay);
    fireEvent.click(pay);
    await waitFor(() => expect(requestPayment).toHaveBeenCalledTimes(1));
    expect(f).toHaveBeenCalledTimes(2);
    expect(f.mock.calls[1][0]).toBe("/api/payments/orders");
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({ sku: `${plan.credits}c`, request_key: expect.any(String) });
    expect(f.mock.calls[1][1].headers.Authorization).toBe("Bearer synthetic-session");
    expect(payment).toHaveBeenCalledWith({ customerKey: "server-buyer" });
    const snapshot = { orderId: checkout.orderId, orderName: checkout.orderName, amount: checkout.amount, successUrl: checkout.successUrl, failUrl: checkout.failUrl };
    expect(requestPayment).toHaveBeenCalledWith({ method: "CARD", ...snapshot });
    expect(window.location.pathname).toBe("/pricing/");
    expect(screen.queryByRole("heading", { name: "상품 선택" })).toBeNull();
  });

  it("preserves the chosen SKU through login without creating an anonymous order", async () => {
    client = { auth: { getSession: async () => ({ data: { session: null } }) } };
    const f = runtime("LIVE"); vi.stubGlobal("fetch", f);
    window.history.replaceState(null, "", "/pricing/?sku=3c");
    render(<PricingPlans />);
    const pay = await screen.findByRole("link", { name: "결제하기" });
    const href = new URL(pay.getAttribute("href")!, "https://lab.legendstudy.com");
    expect(href.pathname.replace(/\/$/, "")).toBe("/login");
    expect(href.searchParams.get("next")).toBe("/pricing/?sku=3c");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("keeps a denied reviewer disabled and never creates an order", async () => {
    const f = runtime("REVIEW", false); vi.stubGlobal("fetch", f);
    render(<PricingPlans />);
    await waitFor(() => expect(f).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "결제하기" }));
    expect(screen.getByRole("button", { name: "결제하기" })).toBeDisabled();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("shows an order failure and allows a retry without opening Toss", async () => {
    const f = runtime("TEST").mockResolvedValue(Response.json({}, { status: 401 })); vi.stubGlobal("fetch", f);
    const toss = vi.fn(); window.TossPayments = toss;
    render(<PricingPlans />);
    await waitFor(() => expect(screen.getByText("결제하기")).not.toBeDisabled());
    fireEvent.click(screen.getByText("결제하기"));
    await screen.findByText(/ORDERS_HTTP_401/);
    expect(toss).not.toHaveBeenCalled();
    expect(screen.getByText("결제하기")).not.toBeDisabled();
  });
});
