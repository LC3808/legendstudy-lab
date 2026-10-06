"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { checkoutAvailable, paymentState, type PaymentState } from "@/lib/payment-runtime";
import { purchaseCta } from "@/lib/pricing";

/**
 * Purchase control on a product card.
 *
 * The card markup is the same in both states; only the control changes. Until the
 * payment backend answers, the control is the disabled default a static export
 * can render, so a stale build can never advertise a purchase that cannot happen.
 * Once the backend reports a configured runtime the control becomes a plain link
 * to the real checkout — the link carries a SKU, never a price, a quantity or an
 * owner, and the server remains the only thing that can create an order.
 */
export function PricingPlanCta({ sku }: { sku: string }) {
  const [state, setState] = useState<PaymentState>("NOT_READY");

  useEffect(() => {
    let alive = true;
    void paymentState().then((next) => {
      if (alive) setState(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (checkoutAvailable(state)) {
    return (
      <Link className="button button--outline pricing-plan__cta" href={`${purchaseCta.href}?sku=${sku}`}>
        {purchaseCta.label}
      </Link>
    );
  }

  return (
    <button className="button button--outline pricing-plan__cta" type="button" disabled>
      {purchaseCta.label}
    </button>
  );
}
