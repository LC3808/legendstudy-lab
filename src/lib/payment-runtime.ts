export type PaymentState = 'NOT_READY' | 'TEST' | 'REVIEW' | 'LIVE' | 'PAUSED';

/** What the server answers about the runtime and about this visitor. */
export type PaymentRuntime = { state: PaymentState; consumerPurchase: boolean };

const NOT_READY: PaymentRuntime = { state: 'NOT_READY', consumerPurchase: false };

/**
 * General consumer purchase is authorized only when the payment runtime is LIVE.
 * TEST is never a public purchase channel: the server refuses to record a
 * spendable Credit grant for a TEST order.
 */
export function purchaseEnabled(state: PaymentState) { return state === 'LIVE'; }

/**
 * Whether the checkout route can start a real server order.
 *
 * `TEST` counts here because it is the merchant/card review path: the official
 * Toss window opens, nothing is charged and no spendable Credit is granted. That
 * distinction is enforced by the payment backend, not by this flag, so a browser
 * cannot turn TEST into a paid purchase.
 */
export function checkoutAvailable(state: PaymentState) { return state === 'TEST' || state === 'REVIEW' || state === 'LIVE'; }

/**
 * Whether *this* visitor may open the checkout.
 *
 * `REVIEW` is the production card-review runtime: it runs on the real service
 * origin against the Production account with the Toss TEST merchant, and only the
 * allowlisted reviewer may enter the checkout. `consumerPurchase` is answered by
 * the server, which resolves the session itself, so it cannot be forged here.
 */
export function checkoutOpen(state: PaymentState, consumerPurchase: boolean) {
  return state === 'TEST' || state === 'LIVE' || (state === 'REVIEW' && consumerPurchase);
}

/**
 * Consumer-facing description of a runtime that cannot take a payment.
 *
 * `TEST` and `REVIEW` return null: those are merchant/card-review runtimes, and
 * the Owner removed the build-state sentence from the checkout. The runtime stays
 * truthful through the control itself, which is disabled until the server
 * authorizes this visitor.
 */
export function checkoutNotice(state: PaymentState): string | null {
  if (state === 'LIVE' || state === 'TEST' || state === 'REVIEW') return null;
  if (state === 'PAUSED') return '현재 결제가 일시 중지되어 있습니다. 잠시 후 다시 시도해 주세요.';
  return '결제 준비 중입니다. 현재는 결제를 진행할 수 없습니다.';
}

/**
 * The runtime plus this visitor's own checkout authorization.
 *
 * The session token is attached when one exists so the server can answer the
 * REVIEW allowlist question itself. Nothing about the answer is decided here.
 */
export async function paymentRuntime(): Promise<PaymentRuntime> {
  try {
    const { getBrowserAuthClient } = await import('./browser-auth-client');
    const client = getBrowserAuthClient();
    const session = client ? (await client.auth.getSession()).data.session : null;
    const r = await fetch('/api/payments/runtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: '{}',
      cache: 'no-store',
    });
    if (!r.ok) return NOT_READY;
    const v = await r.json();
    return {
      state: ['TEST', 'REVIEW', 'LIVE', 'PAUSED'].includes(v.state) ? v.state : 'NOT_READY',
      consumerPurchase: v.consumer_purchase === true,
    };
  } catch {
    return NOT_READY;
  }
}

export async function paymentState(): Promise<PaymentState> {
  return (await paymentRuntime()).state;
}
