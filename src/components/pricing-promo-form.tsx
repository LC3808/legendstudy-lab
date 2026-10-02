"use client";

import { paymentState } from "@/lib/pricing";

/**
 * Promotion code shell for the public pricing page.
 *
 * The redemption backend does not exist yet, so the field is rendered for review
 * but the action is disabled and no code is ever reported as accepted. When the
 * backend arrives, the server decides the discount, the Credit bonus,
 * eligibility, expiry and reuse limits; the client only submits the code.
 */
export function PricingPromoForm() {
  const noteId = "pricing-promotion-note";

  return (
    <form
      className="pricing-promo__form"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <label htmlFor="promotion-code">학교 / 이벤트 / 프로모션 코드</label>
      <div className="pricing-promo__row">
        <input
          id="promotion-code"
          name="promotionCode"
          type="text"
          placeholder="예) LS-EVENT-2026"
          autoComplete="off"
          aria-describedby={noteId}
        />
        <button className="button button--outline" type="submit" disabled aria-describedby={noteId}>
          적용하기
        </button>
      </div>
      <p className="pricing-promo__note" id={noteId} role="status">
        {paymentState.promotionNote}
      </p>
    </form>
  );
}