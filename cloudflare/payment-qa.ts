/** Owner-only LIVE QA. Never overrides PAYMENT_ENABLED or permits public sale. */
export const LIVE_QA_OWNER = 'd5eab102-da92-4c4c-9adb-16d2c9d20e4c';
export const TEST_REVIEWER = 'ddc5ae63-acbb-490b-a423-c996b811dea8';
export type QaEnv = { PAYMENT_QA_ONLY?: string; PAYMENT_QA_SUBJECTS?: string; PAYMENT_QA_UNTIL?: string };
export function qaPurchaseAllowed(env: QaEnv, subject: string | undefined, now = Date.now()): boolean {
  const until = Date.parse(env.PAYMENT_QA_UNTIL ?? '');
  return env.PAYMENT_QA_ONLY === 'true' && env.PAYMENT_QA_SUBJECTS === LIVE_QA_OWNER &&
    subject === LIVE_QA_OWNER && Number.isFinite(until) && until > now;
}
export function qaProductAllowed(_env: QaEnv, sku: unknown, amount: unknown): boolean {
  return sku === '1c' && amount === 4900;
}
