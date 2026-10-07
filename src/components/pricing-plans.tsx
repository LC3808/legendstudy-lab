import { PaymentCheckout } from "@/components/payment-checkout";

/** Pricing uses the same order creation and Toss entry as the fallback route. */
export function PricingPlans() {
  return <PaymentCheckout embedded />;
}
