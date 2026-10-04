export type PaymentState = 'NOT_READY' | 'TEST' | 'LIVE' | 'PAUSED';
/** Production pricing consumer contract; TEST never enables public purchase. */
export function purchaseEnabled(state: PaymentState) { return state === 'LIVE'; }
export async function paymentState(): Promise<PaymentState> {
  try {
    const r = await fetch('/api/payments/runtime', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}', cache:'no-store' });
    if (!r.ok) return 'NOT_READY';
    const v = await r.json();
    return ['TEST','LIVE','PAUSED'].includes(v.state) ? v.state : 'NOT_READY';
  } catch { return 'NOT_READY'; }
}
