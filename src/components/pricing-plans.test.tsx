// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PricingPlans } from "./pricing-plans";
import { defaultSelectedCredits, pricingPlans } from "@/lib/pricing";

const signedIn = { auth: { getSession: async () => ({ data: { session: { access_token: "synthetic-session" } } }) } };
vi.mock("@/lib/browser-auth-client", () => ({ getBrowserAuthClient: () => signedIn }));

function runtime(state: string, consumerPurchase = false) {
  return vi.fn().mockResolvedValueOnce(Response.json({ state, consumer_purchase: consumerPurchase }));
}

beforeEach(() => {
  cleanup();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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

  it("opens the checkout for the selected pack once the server authorizes it", async () => {
    vi.stubGlobal("fetch", runtime("LIVE"));
    render(<PricingPlans />);
    await waitFor(() => expect(screen.getByText("결제하기")).not.toBeDisabled());
    const link = screen.getByText("결제하기").closest("a");
    // Next normalizes the trailing slash of a generated href, so compare the
    // route and the query semantically instead of the exact string.
    const href = new URL(link?.getAttribute("href") ?? "", "https://lab.legendstudy.com");
    expect(href.pathname.replace(/\/$/, "")).toBe("/payments/checkout");
    expect(href.searchParams.get("sku")).toBe(`${defaultSelectedCredits}c`);
  });
});
