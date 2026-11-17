"use client";

import { promotionCopy } from "@/lib/pricing";

/**
 * Coupon / promotion code shell for the public pricing page.
 *
 * The redemption backend does not exist yet, so the field is rendered for review
 * but the action is disabled and no code is ever reported as accepted. When the
 * backend arrives, the server decides the discount, the Credit bonus,
 * eligibility, expiry and reuse limits; the client only submits the code.
 */
export function PricingPromoForm() {

  return (
    <form
      className="pricing-promo__form"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <label htmlFor="promotion-code">{promotionCopy.inputLabel}</label>
      <div className="pricing-promo__row">
        <input
          id="promotion-code"
          name="promotionCode"
          type="text"
          placeholder={promotionCopy.inputPlaceholder}
          autoComplete="off"
        />
        <button className="button button--outline" type="submit" disabled>
          {promotionCopy.ctaLabel}
        </button>
      </div>
    </form>
  );
}