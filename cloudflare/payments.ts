/** Cloudflare only. APP 3b3b869 payment-v1 is the sole persistence authority. */
export type Env = {
  PAYMENT_MODE?: string; PAYMENT_ORIGIN?: string;
  PAYMENT_SUPABASE_URL?: string; PAYMENT_SUPABASE_PUBLISHABLE_KEY?: string;
  PAYMENT_FINANCE_TOKEN?: string; PAYMENT_SUPPORT_SUBJECTS?: string;
  TOSS_TEST_CLIENT_KEY?: string; TOSS_TEST_SECRET_KEY?: string; TOSS_MID?: string;
};
type Json = Record<string, unknown>;
type IO = typeof fetch;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class Fault extends Error { constructor(public status: number, public code: string) { super(code); } }
const fail = (status: number, code: string): never => { throw new Fault(status, code); };
const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
function object(v: unknown): Json { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(422, 'INVALID_BODY'); return v as Json; }
async function read(response: Response | Request, max: number): Promise<Json> {
  if (!response.body) return fail(422, 'INVALID_BODY');
  const reader = response.body.getReader(); let size = 0; const chunks: Uint8Array[] = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); return fail(413, 'BODY_TOO_LARGE'); } chunks.push(value); }
  const bytes = new Uint8Array(size); let at = 0; for (const c of chunks) { bytes.set(c, at); at += c.length; }
  try { return object(JSON.parse(new TextDecoder().decode(bytes))); } catch { return fail(422, 'INVALID_BODY'); }
}
function exact(p: Json, keys: string[]) { if (Object.keys(p).some(k => !keys.includes(k)) || keys.some(k => !(k in p))) fail(422, 'INVALID_FIELDS'); }
function text(v: unknown, max = 200): string { if (typeof v !== 'string' || !v.length || v.length > max) return fail(422, 'INVALID_FIELD'); return v; }
function id(v: unknown): string { const s = text(v, 36); if (!uuid.test(s)) fail(422, 'INVALID_ID'); return s; }
function config(e: Env) {
  if (e.PAYMENT_MODE !== 'TEST' || !/^test_ck_/.test(e.TOSS_TEST_CLIENT_KEY || '') || !/^test_sk_/.test(e.TOSS_TEST_SECRET_KEY || '') || !e.TOSS_MID || !e.PAYMENT_FINANCE_TOKEN || !e.PAYMENT_SUPABASE_PUBLISHABLE_KEY) fail(503, 'PAYMENT_NOT_CONFIGURED');
  const origin = e.PAYMENT_ORIGIN;
  if (!origin || !/^https:\/\/[a-z0-9.-]+(?::\d+)?$/.test(origin)) fail(503, 'PAYMENT_NOT_CONFIGURED');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(e.PAYMENT_SUPABASE_URL || '')) fail(503, 'PAYMENT_NOT_CONFIGURED');
  return origin;
}
async function call(io: IO, url: string, init: RequestInit): Promise<Response> {
  try {
    const response = await io(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(10000) });
    if (response.status >= 300 && response.status < 400) return fail(503, 'RECONCILIATION_REQUIRED');
    return response;
  } catch { return fail(503, 'RECONCILIATION_REQUIRED'); }
}
function safeOrder(o: Json): Json {
  if (o.dto_version !== 'payment-v1' || o.mode !== 'TEST' || !uuid.test(String(o.id)) || o.order_id !== 'ls_' + String(o.id).replaceAll('-', '') || !Number.isSafeInteger(o.amount) || Number(o.amount) <= 0 || o.currency !== 'KRW' || (o.provider !== undefined && o.provider !== 'TOSS') || !['NONE','TEST_RECORDED','REVOKED'].includes(String(o.grant_state))) fail(502, 'INVALID_ORDER');
  const keys = ['dto_version','order_id','id','mode','sku','amount','quantity','currency','state','grant_state','expires_at','paid_at','credit_expires_at'];
  return Object.fromEntries(keys.map(k => [k, o[k]]));
}
export async function payment(request: Request, env: Env, io: IO = fetch): Promise<Response> {
  try {
    const origin = config(env); const url = new URL(request.url);
    if (url.origin !== origin || request.headers.get('origin') !== origin) fail(403, 'ORIGIN_DENIED');
    if (request.method !== 'POST') fail(405, 'METHOD_NOT_ALLOWED');
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') fail(415, 'CONTENT_TYPE');
    const bearer = request.headers.get('authorization');
    if (!bearer || !/^Bearer [A-Za-z0-9._-]{10,8192}$/.test(bearer)) fail(401, 'AUTH_REQUIRED');
    const p = await read(request, 2048);
    const rpc = async (name: string, body: Json, finance = false) => {
      const r = await call(io, `${env.PAYMENT_SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: env.PAYMENT_SUPABASE_PUBLISHABLE_KEY!, Authorization: finance ? `Bearer ${env.PAYMENT_FINANCE_TOKEN}` : bearer!, 'Content-Type': 'application/json' }, body: JSON.stringify({ p: { dto_version: 'payment-v1', ...body } }) });
      if (!r.ok) { const status = [401,403,404,409,422].includes(r.status) ? r.status : 503; fail(status, status === 503 ? 'RECONCILIATION_REQUIRED' : 'ORDER_REQUEST_REJECTED'); }
      return read(r, 16384);
    };
    const action = url.pathname.replace(/\/$/, '').split('/').pop();
    if (action === 'orders') {
      exact(p, ['sku','request_key']); id(p.request_key);
      if (!['1c','3c','5c','10c'].includes(String(p.sku))) fail(422, 'UNSUPPORTED_SKU');
      const o = safeOrder(await rpc('payment_order', { action: 'create', ...p }));
      return Response.json({ order: o, checkout: { clientKey: env.TOSS_TEST_CLIENT_KEY, customerKey: o.id, orderId: o.order_id, orderName: `LegendStudy ${o.quantity} Credits TEST`, amount: { currency: 'KRW', value: o.amount }, successUrl: `${origin}/payments/success/`, failUrl: `${origin}/payments/fail/` } }, { headers });
    }
    const shape: Record<string,string[]> = { status: ['id'], confirm: ['id','request_key','payment_key','amount'], reconcile: ['id'], cancel: ['id','request_key'] };
    if (!action || !shape[action]) fail(404, 'NOT_FOUND'); exact(p, shape[action!]); id(p.id);
    // Buyer JWT goes to APP for fresh ownership/lifecycle checks, including all retries.
    const order = safeOrder(await rpc('payment_order', { action: 'get', id: p.id }));
    const result = (o: Json) => Response.json({ order: safeOrder(o) }, { headers });
    if (action === 'status') return result(order);
    if (action === 'cancel') {
      id(p.request_key);
      const r = await call(io, `${env.PAYMENT_SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.PAYMENT_SUPABASE_PUBLISHABLE_KEY!, Authorization: bearer! } });
      if (!r.ok) fail(401, 'AUTH_REQUIRED'); const user = await read(r, 32768);
      if (!(env.PAYMENT_SUPPORT_SUBJECTS || '').split(',').filter(Boolean).includes(String(user.id))) fail(403, 'SUPPORT_REQUIRED');
      // Test support operator must own the synthetic test order as well. No arbitrary-order authority.
    }
    const process = (body: Json) => rpc('payment_process', { id: p.id, ...body }, true);
    let op: Json;
    if (action === 'confirm') {
      id(p.request_key); text(p.payment_key); if (p.amount !== order.amount) fail(422, 'AMOUNT_MISMATCH');
      op = await process({ action: 'confirm_begin', request_key: p.request_key, payment_key: p.payment_key, amount: order.amount });
    } else if (action === 'cancel') op = await process({ action: 'cancel_begin', request_key: p.request_key });
    else op = await process({ action: 'get' });
    safeOrder(op);
    if (!op.operation_id) return result(op);
    if (op.operation_state === 'SUCCEEDED') return result(op);
    const key = text(op.payment_key); const cancel = op.state === 'CANCEL_PENDING';
    if (!['AUTHORIZATION_PENDING','CANCEL_PENDING'].includes(String(op.state))) return result(op);
    const provider = async (path: string, body?: Json) => {
      const r = await call(io, `https://api.tosspayments.com/v1/payments/${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Basic ${btoa(env.TOSS_TEST_SECRET_KEY + ':')}`, 'Content-Type': 'application/json', ...(body ? { 'Idempotency-Key': text(op.provider_idempotency_key) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (!r.ok) return fail(503, 'RECONCILIATION_REQUIRED');
      return read(r, 65536);
    };
    const verify = (v: Json) => { if (v.paymentKey !== key || v.orderId !== order.order_id || v.mId !== env.TOSS_MID || v.currency !== 'KRW' || v.totalAmount !== order.amount) fail(502, 'PROVIDER_MISMATCH'); };
    try {
      // Lookup first: network timeouts/retries never mean definitive rejection.
      let v = await provider(encodeURIComponent(key)); verify(v);
      if (!cancel && v.status === 'IN_PROGRESS') {
        v = await provider('confirm', { paymentKey: key, orderId: order.order_id, amount: order.amount }); verify(v);
      }
      if (cancel && v.status === 'DONE') {
        if (Number(op.operation_amount) < Number(order.amount) && v.isPartialCancelable !== true) fail(409, 'PARTIAL_CANCEL_UNSUPPORTED');
        v = await provider(`${encodeURIComponent(key)}/cancel`, { cancelReason: 'TEST general refund', cancelAmount: op.operation_amount }); verify(v);
      }
      if (cancel) {
        const cancels = Array.isArray(v.cancels) ? v.cancels as Json[] : [];
        if (!['CANCELED','PARTIAL_CANCELED'].includes(String(v.status)) || cancels.length !== 1 || cancels[0].cancelStatus !== 'DONE' || cancels[0].cancelAmount !== op.operation_amount || v.balanceAmount !== Number(order.amount) - Number(op.operation_amount)) fail(503, 'RECONCILIATION_REQUIRED');
        op = await process({ action: 'cancel_finish', operation_id: op.operation_id, payment_key: key, amount: op.operation_amount });
      } else {
        if (v.status !== 'DONE' || typeof v.approvedAt !== 'string' || !Number.isFinite(Date.parse(v.approvedAt)) || v.balanceAmount !== order.amount) fail(503, 'RECONCILIATION_REQUIRED');
        op = await process({ action: 'confirm_finish', operation_id: op.operation_id, payment_key: key, amount: order.amount, paid_at: v.approvedAt });
      }
      return result(op);
    } catch {
      // Even a rejected HTTP response may hide a successful prior request. Never release the fence on guesswork.
      try { await process({ action: 'outcome', operation_id: op.operation_id, outcome: 'UNKNOWN' }); } catch { /* durable pending operation is already the recovery anchor */ }
      return fail(503, 'RECONCILIATION_REQUIRED');
    }
  } catch (e) {
    const f = e instanceof Fault ? e : new Fault(503, 'RECONCILIATION_REQUIRED');
    return Response.json({ error: f.code }, { status: f.status, headers });
  }
}
