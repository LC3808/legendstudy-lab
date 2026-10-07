"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { checkoutOpen, paymentRuntime, type PaymentRuntime } from "@/lib/payment-runtime";
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
 *
 * On the production card-review runtime the control stays disabled for everyone
 * except the allowlisted reviewer, whose authorization the server answers after
 * resolving the session itself.
 */
export function PricingPlanCta({ sku }: { sku: string }) {
  const [runtime, setRuntime] = useState<PaymentRuntime>({ state: "NOT_READY", consumerPurchase: false });

  useEffect(() => {
    let alive = true;
    void paymentRuntime().then((next) => {
      if (alive) setRuntime(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (checkoutOpen(runtime.state, runtime.consumerPurchase)) {
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
