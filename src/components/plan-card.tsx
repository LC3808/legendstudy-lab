import type { CreditPlan } from "@/lib/pricing";

/**
 * A sold Credit pack, as a card.
 *
 * /pricing/ and /payments/checkout/ render the same component with the same
 * class names, so the two pages cannot drift into two visual languages. The card
 * carries quantity and price only; the control is passed in by the page, because
 * what the control does differs (select on the pricing page, pay on checkout).
 *
 * The card markup is identical in every state: recommendation is a badge and the
 * selected state is a data attribute, so nothing about the card changes size and
 * the grid never shifts.
 */
export function PlanCard({
  plan,
  selected,
  headingId,
  children,
}: {
  plan: CreditPlan;
  selected: boolean;
  headingId: string;
  children: React.ReactNode;
}) {
  return (
    <article className="plan-card" data-selected={selected ? "true" : undefined} aria-labelledby={headingId}>
      <h3 className="plan-card__name" id={headingId}>
        {plan.name}
        {plan.recommended ? <span className="plan-card__badge">추천</span> : null}
      </h3>
      <p className="plan-card__price">{plan.priceLabel}</p>
      <p className="plan-card__unit">Credit당 {plan.perCreditLabel}</p>
      <p className="plan-card__value">{plan.valueLine}</p>
      <div className="plan-card__cta">{children}</div>
    </article>
  );
}
