export type PaymentState = 'NOT_READY' | 'TEST' | 'LIVE' | 'PAUSED';

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
export function checkoutAvailable(state: PaymentState) { return state === 'TEST' || state === 'LIVE'; }

/** Consumer-facing description of what a non-LIVE runtime means on checkout. */
export function checkoutNotice(state: PaymentState): string | null {
  if (state === 'LIVE') return null;
  if (state === 'TEST') return '테스트 결제 환경입니다. 실제 금액이 청구되지 않고 사용 가능한 Credit도 지급되지 않습니다.';
  if (state === 'PAUSED') return '현재 결제가 일시 중지되어 있습니다. 잠시 후 다시 시도해 주세요.';
  return '결제 준비 중입니다. 현재는 결제를 진행할 수 없습니다.';
}

export async function paymentState(): Promise<PaymentState> {
  try {
    const r = await fetch('/api/payments/runtime', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}', cache:'no-store' });
    if (!r.ok) return 'NOT_READY';
    const v = await r.json();
    return ['TEST','LIVE','PAUSED'].includes(v.state) ? v.state : 'NOT_READY';
  } catch { return 'NOT_READY'; }
}
