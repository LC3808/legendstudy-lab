"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PlanCard } from "@/components/plan-card";
import { checkoutOpen, paymentRuntime, type PaymentRuntime } from "@/lib/payment-runtime";
import { defaultSelectedCredits, pricingPlans, purchaseCta } from "@/lib/pricing";

/**
 * The product grid on /pricing/.
 *
 * One pack is selected at all times, and the selection is decided from the module
 * data alone — never from a runtime answer — so the static export already renders
 * the final labels ("선택하기" on the other packs, "결제하기" on the selected one)
 * and the control does not re-label itself when the page hydrates. The first click
 * on 선택하기 is the selection, so a visitor never has to click the same pack twice.
 *
 * Whether 결제하기 can actually open the checkout is a server fact: the payment
 * backend answers it, and until it does the selected control renders in its
 * truthful disabled state with the same label.
 */
export function PricingPlans() {
  const [selected, setSelected] = useState<number>(defaultSelectedCredits);
  const [runtime, setRuntime] = useState<PaymentRuntime | null>(null);

  useEffect(() => {
    let alive = true;
    void paymentRuntime().then((next) => {
      if (alive) setRuntime(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  const canPay = runtime !== null && checkoutOpen(runtime.state, runtime.consumerPurchase);

  return (
    <div className="pricing-plans">
      {pricingPlans.map((plan) => {
        const isSelected = plan.credits === selected;
        return (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={isSelected}
            headingId={`pricing-plan-${plan.id}`}
          >
            {isSelected ? (
              canPay ? (
                <Link
                  className="button button--accent plan-card__button"
                  href={`${purchaseCta.href}?sku=${plan.credits}c`}
                >
                  {purchaseCta.payLabel}
                </Link>
              ) : (
                <button className="button button--accent plan-card__button" type="button" disabled>
                  {purchaseCta.payLabel}
                </button>
              )
            ) : (
              <button
                className="button button--outline plan-card__button"
                type="button"
                onClick={() => setSelected(plan.credits)}
              >
                {purchaseCta.selectLabel}
              </button>
            )}
          </PlanCard>
        );
      })}
    </div>
  );
}