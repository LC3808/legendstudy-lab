import type { Env } from './payments';

/** Fixed read-only probes. No caller-controlled URL, order, token or action. */
export async function paymentDiagnostics(env: Env, io: typeof fetch): Promise<Record<string, unknown>> {
  const probe = async (url: string, init: RequestInit) => {
    try {
      const r = await io(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(10000) });
      const body = await r.json().catch(() => ({})) as Record<string, unknown>;
      const code = ['PT404','PGRST301','PGRST302','PGRST303','42501','UNAUTHORIZED_KEY','INVALID_API_KEY','API_KEY_ACCESS_DENIED','NOT_FOUND_PAYMENT'].includes(String(body.code)) ? body.code : 'UNCLASSIFIED';
      return { status: r.status, code, mid_matches: r.ok && body.mId === 'leglabn24k' };
    } catch { return { status: 0, code: 'UNAVAILABLE', mid_matches: false }; }
  };
  const finance = await probe(`${env.PAYMENT_SUPABASE_URL}/rest/v1/rpc/payment_process`, {
    method: 'POST', headers: { apikey: env.PAYMENT_SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${env.PAYMENT_FINANCE_TOKEN}`, 'Content-Type': 'application/json' },
    // Inspected production definition: get + absent ID raises PT404 before any write.
    body: JSON.stringify({ p: { dto_version: 'payment-v1', action: 'get', id: '00000000-0000-0000-0000-000000000000' } }),
  });
  const provider = await probe('https://api.tosspayments.com/v1/payments/orders/ls_662851a377ec4a17b83e7707d41c5ac3', {
    method: 'GET', headers: { Authorization: `Basic ${btoa(env.TOSS_LIVE_SECRET_KEY + ':')}` },
  });
  return { finance, finance_read_authorized: finance.status === 404 && finance.code === 'PT404', provider, client_secret_pair_verified: false, read_only: true };
}
