/** LIVE purchase policy. Public sale requires explicit opt-in and fresh Auth; PAUSED still wins. */
export const LIVE_QA_OWNER = 'd5eab102-da92-4c4c-9adb-16d2c9d20e4c';
export const TEST_REVIEWER = 'ddc5ae63-acbb-490b-a423-c996b811dea8';
export type QaEnv = { PAYMENT_PUBLIC_ENABLED?: string; PAYMENT_QA_ONLY?: string; PAYMENT_QA_SUBJECTS?: string; PAYMENT_QA_UNTIL?: string };
export function qaPurchaseAllowed(env: QaEnv, subject: string | undefined, now = Date.now()): boolean {
  if (env.PAYMENT_PUBLIC_ENABLED === 'true') return typeof subject === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subject) && subject !== TEST_REVIEWER;
  const until = Date.parse(env.PAYMENT_QA_UNTIL ?? '');
  return env.PAYMENT_QA_ONLY === 'true' && env.PAYMENT_QA_SUBJECTS === LIVE_QA_OWNER &&
    subject === LIVE_QA_OWNER && Number.isFinite(until) && until > now;
}
export function qaProductAllowed(env: QaEnv, sku: unknown, amount: unknown): boolean {
  if (env.PAYMENT_PUBLIC_ENABLED === 'true') {
    const prices: Record<string, number> = { '1c': 4900, '3c': 11900, '5c': 17900, '10c': 29900 };
    return typeof sku === 'string' && Object.hasOwn(prices, sku) && prices[sku] === amount;
  }
  return sku === '1c' && amount === 4900;
}
