/** Cloudflare only. APP 3b3b869 payment-v1 is the sole persistence authority. */
export type Env = {
  PAYMENT_MODE?: string; PAYMENT_ENABLED?: string; PAYMENT_ORIGIN?: string;
  PAYMENT_SUPABASE_URL?: string; PAYMENT_SUPABASE_PUBLISHABLE_KEY?: string;
  PAYMENT_FINANCE_TOKEN?: string; PAYMENT_SUPPORT_SUBJECTS?: string; PAYMENT_REVIEW_SUBJECTS?: string;
  TOSS_LIVE_CLIENT_KEY?: string; TOSS_LIVE_SECRET_KEY?: string;
  TOSS_TEST_CLIENT_KEY?: string; TOSS_TEST_SECRET_KEY?: string; TOSS_MID?: string;
};
type Json = Record<string, unknown>;
type IO = typeof fetch;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class Fault extends Error { constructor(public status: number, public code: string, public diagnostic?: Json) { super(code); } }
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
  const mode = e.PAYMENT_MODE;
  const live = mode === 'LIVE';
  const review = mode === 'REVIEW';
  if (!live && !review && mode !== 'TEST') fail(503, 'PAYMENT_NOT_CONFIGURED');
  // REVIEW is the card-review mode: the real service origin and the real Production
  // database, driven by the Toss TEST merchant. The merchant key family is TEST, so
  // no real charge is possible, and persistence stays on TEST semantics.
  const test = !live;
  const clientKey = test ? e.TOSS_TEST_CLIENT_KEY : e.TOSS_LIVE_CLIENT_KEY;
  const secret = test ? e.TOSS_TEST_SECRET_KEY : e.TOSS_LIVE_SECRET_KEY;
  if (!(test ? /^test_ck_/ : /^live_ck_/).test(clientKey || '') || !(test ? /^test_sk_/ : /^live_sk_/).test(secret || '') || e.TOSS_MID !== 'leglabn24k' || !e.PAYMENT_FINANCE_TOKEN || !e.PAYMENT_SUPABASE_PUBLISHABLE_KEY) fail(503, 'PAYMENT_NOT_CONFIGURED');
  const origin = test && !review ? 'https://legendstudy-lab-payment-test.pages.dev' : 'https://lab.legendstudy.com';
  const db = test && !review ? 'https://wsnrwklplnunjktyfmbr.supabase.co' : 'https://stlhijzpjfgwwdgunlsd.supabase.co';
  if (e.PAYMENT_ORIGIN !== origin || e.PAYMENT_SUPABASE_URL !== db || !['true','false'].includes(e.PAYMENT_ENABLED || '')) fail(503, 'PAYMENT_NOT_CONFIGURED');
  // A review runtime without a reviewer allowlist is a misconfiguration, not a mode.
  if (review && !(e.PAYMENT_REVIEW_SUBJECTS || '').split(',').filter(Boolean).length) fail(503, 'PAYMENT_NOT_CONFIGURED');
  // `mode` stays the persistence and provider mode (TEST|LIVE); `state` is what the browser may see.
  return { origin, clientKey, secret, enabled: e.PAYMENT_ENABLED === 'true', mode: test ? 'TEST' : 'LIVE', state: mode!, review };
}
/**
 * Server-authoritative reviewer identity for REVIEW. The browser only ever holds a
 * session token; the subject is resolved by a fresh Auth lookup on every request and
 * compared against the bounded allowlist, so a browser string can never grant it.
 */
async function reviewer(request: Request, env: Env, io: IO): Promise<boolean> {
  const bearer = request.headers.get('authorization');
  if (!bearer || !/^Bearer [A-Za-z0-9._-]{10,8192}$/.test(bearer)) return false;
  try {
    const r = await call(io, `${env.PAYMENT_SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.PAYMENT_SUPABASE_PUBLISHABLE_KEY!, Authorization: bearer } });
    if (!r.ok) return false;
    const user = await read(r, 32768);
    return uuid.test(String(user.id)) && (env.PAYMENT_REVIEW_SUBJECTS || '').split(',').filter(Boolean).includes(String(user.id));
  } catch { return false; }
}
async function call(io: IO, url: string, init: RequestInit): Promise<Response> {
  try {
    const response = await io(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(10000) });
    if (response.status >= 300 && response.status < 400) return fail(503, 'RECONCILIATION_REQUIRED');
    return response;
  } catch { return fail(503, 'RECONCILIATION_REQUIRED'); }
}
function safeOrder(o: Json, mode: string): Json {
  if (o.dto_version !== 'payment-v1' || o.mode !== mode || !uuid.test(String(o.id)) || o.order_id !== 'ls_' + String(o.id).replaceAll('-', '') || !Number.isSafeInteger(o.amount) || Number(o.amount) <= 0 || o.currency !== 'KRW' || (o.provider !== undefined && o.provider !== 'TOSS') || !(mode === 'TEST' ? ['NONE','TEST_RECORDED','REVOKED'] : ['NONE','POSTED','REVOKED']).includes(String(o.grant_state))) fail(502, 'INVALID_ORDER');
  const keys = ['dto_version','order_id','id','mode','sku','amount','quantity','currency','state','grant_state','expires_at','paid_at','credit_expires_at'];
  return Object.fromEntries(keys.map(k => [k, o[k]]));
}
export async function payment(request: Request, env: Env, io: IO = fetch): Promise<Response> {
  try {
    const cfg = config(env); const { origin } = cfg; const url = new URL(request.url);
    if (url.origin !== origin || request.headers.get('origin') !== origin) fail(403, 'ORIGIN_DENIED');
    if (request.method !== 'POST') fail(405, 'METHOD_NOT_ALLOWED');
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') fail(415, 'CONTENT_TYPE');
    const action = url.pathname.replace(/\/$/, '').split('/').pop();
    if (action === 'runtime') {
      exact(await read(request, 2048), []);
      const allowed = cfg.review ? await reviewer(request, env, io) : false;
      return Response.json({ state: cfg.enabled ? cfg.state : 'PAUSED', mode: cfg.mode, consumer_purchase: cfg.enabled && (cfg.mode === 'LIVE' || allowed) }, { headers });
    }
    const bearer = request.headers.get('authorization');
    if (!bearer || !/^Bearer [A-Za-z0-9._-]{10,8192}$/.test(bearer)) fail(401, 'AUTH_REQUIRED');
    // REVIEW exposes the TEST checkout to the reviewer only. Every authenticated
    // action is gated here, so a non-allowlisted member cannot create an order.
    if (cfg.review && !(await reviewer(request, env, io))) fail(403, 'REVIEW_REQUIRED');
    const p = await read(request, 2048);
    const rpc = async (name: string, body: Json, finance = false) => {
      const r = await call(io, `${env.PAYMENT_SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: env.PAYMENT_SUPABASE_PUBLISHABLE_KEY!, Authorization: finance ? `Bearer ${env.PAYMENT_FINANCE_TOKEN}` : bearer!, 'Content-Type': 'application/json' }, body: JSON.stringify({ p: { dto_version: 'payment-v1', ...body } }) });
      if (!r.ok) {
        const status = [401,403,404,409,422].includes(r.status) ? r.status : 503;
        // REVIEW diagnostics identify only the failed boundary, never an upstream
        // message, JWT, payment key, or arbitrary response body.
        if (cfg.review && status === 401) {
          let code = 'UNCLASSIFIED';
          try { const error = await read(r, 16384); if (['PT401','PGRST301','PGRST302','PGRST303'].includes(String(error.code))) code = String(error.code); } catch { /* preserve original 401 */ }
          throw new Fault(401, 'ORDER_REQUEST_REJECTED', { stage: finance ? 'FINANCE_RPC' : 'BUYER_RPC', code });
        }
        fail(status, status === 503 ? 'RECONCILIATION_REQUIRED' : 'ORDER_REQUEST_REJECTED');
      }
      return read(r, 16384);
    };
    if (action === 'orders') {
      if (!cfg.enabled) fail(409, 'PAYMENT_PAUSED');
      exact(p, ['sku','request_key']); id(p.request_key);
      if (!['1c','3c','5c','10c'].includes(String(p.sku))) fail(422, 'UNSUPPORTED_SKU');
      const o = safeOrder(await rpc('payment_order', { action: 'create', ...p }), cfg.mode);
      if (o.state !== 'ORDER_CREATED' || Date.parse(String(o.expires_at)) <= Date.now()) fail(409, 'ORDER_NOT_CHECKOUT_READY');
      return Response.json({ order: o, checkout: { clientKey: cfg.clientKey, customerKey: o.id, orderId: o.order_id, orderName: `LegendStudy ${o.quantity} Credits${cfg.mode === 'TEST' ? ' TEST' : ''}`, amount: { currency: 'KRW', value: o.amount }, successUrl: `${origin}/payments/success/`, failUrl: `${origin}/payments/fail/` } }, { headers });
    }
    const shape: Record<string,string[]> = { status: ['id'], confirm: ['id','request_key','payment_key','amount'], reconcile: ['id'], cancel: ['id','request_key'], 'support-inspect': ['id','request_key'], 'support-cancel': ['id','request_key'], 'support-reconcile': ['id','request_key'] };
    if (!action || !shape[action]) fail(404, 'NOT_FOUND'); exact(p, shape[action!]); id(p.id);
    const support = action!.startsWith('support-');
    let preview: Json | undefined;
    if (support || action === 'cancel') {
      id(p.request_key);
      const r = await call(io, `${env.PAYMENT_SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.PAYMENT_SUPABASE_PUBLISHABLE_KEY!, Authorization: bearer! } });
      if (!r.ok) fail(401, 'AUTH_REQUIRED'); const user = await read(r, 32768);
      if (!(env.PAYMENT_SUPPORT_SUBJECTS || '').split(',').filter(Boolean).includes(String(user.id))) fail(403, 'SUPPORT_REQUIRED');
      if (support) preview = await rpc('payment_support', { action: action!.slice(8).replace('inspect','inspect'), id: p.id, request_key: p.request_key, operator_id: id(user.id) }, true);
    }
    // Ordinary buyers always pass fresh APP ownership checks. Support passes fresh Auth+allowlist first.
    const order = safeOrder(preview ? object(preview.order) : await rpc('payment_order', { action: 'get', id: p.id }), cfg.mode);
    const result = (o: Json) => Response.json({ order: safeOrder(o, cfg.mode) }, { headers });
    if (action === 'support-inspect') return Response.json({ order, preview: { owner_id: preview!.owner_id, used: preview!.used, remaining: preview!.remaining, reserved: preview!.reserved, refund_amount: preview!.refund_amount, eligible: preview!.eligible, reason: preview!.reason } }, { headers });
    if (action === 'status') return result(order);
    const process = (body: Json) => rpc('payment_process', { id: p.id, ...body }, true);
    let op: Json;
    if (action === 'confirm') {
      id(p.request_key); text(p.payment_key); if (p.amount !== order.amount) fail(422, 'AMOUNT_MISMATCH');
      op = await process({ action: 'confirm_begin', request_key: p.request_key, payment_key: p.payment_key, amount: order.amount });
    } else if (action === 'cancel' || action === 'support-cancel') op = await process({ action: 'cancel_begin', request_key: p.request_key });
    else op = await process({ action: 'get' });
    safeOrder(op, cfg.mode);
    if (!op.operation_id) return result(op);
    if (op.operation_state === 'SUCCEEDED') return result(op);
    const key = text(op.payment_key); const cancel = op.state === 'CANCEL_PENDING';
    if (!['AUTHORIZATION_PENDING','CANCEL_PENDING'].includes(String(op.state))) return result(op);
    let diagnostic: Json = { stage: 'provider_lookup', provider_requests: 0, confirm_sent: false };
    const provider = async (path: string, body?: Json) => {
      diagnostic = { ...diagnostic, stage: body ? (cancel ? 'provider_cancel' : 'provider_confirm') : 'provider_lookup', provider_requests: Number(diagnostic.provider_requests) + 1, confirm_sent: diagnostic.confirm_sent || path === 'confirm' };
      const r = await call(io, `https://api.tosspayments.com/v1/payments/${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Basic ${btoa(cfg.secret + ':')}`, 'Content-Type': 'application/json', ...(body ? { 'Idempotency-Key': text(op.provider_idempotency_key) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (!r.ok) {
        const error = await read(r, 65536);
        // Only bounded provider error identifiers, never payload/message/credentials.
        const code = typeof error.code === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(error.code) ? error.code : 'UNCLASSIFIED';
        diagnostic = { ...diagnostic, provider_http: r.status, provider_code: code };
        return fail(503, 'RECONCILIATION_REQUIRED');
      }
      return read(r, 65536);
    };
    // Verified in Toss dashboard: this TEST order belongs to leglabn24k,
    // while its authenticated Payment response uses tleglabn24k. Exact mapping only.
    const providerMid = cfg.mode === 'TEST' && env.TOSS_MID === 'leglabn24k' ? 'tleglabn24k' : env.TOSS_MID;
    const verify = (v: Json) => {
      const matches = { payment_key: v.paymentKey === key, order_id: v.orderId === order.order_id, mid: v.mId === providerMid, currency: v.currency === 'KRW', amount: v.totalAmount === order.amount };
      if (Object.values(matches).some(x => !x)) { diagnostic = { ...diagnostic, matches, provider_mid: typeof v.mId === 'string' && /^[a-zA-Z0-9_-]{1,14}$/.test(v.mId) ? v.mId : 'INVALID', expected_mid: providerMid }; fail(502, 'PROVIDER_MISMATCH'); }
    };
    try {
      // Lookup first: network timeouts/retries never mean definitive rejection.
      let v = await provider(encodeURIComponent(key)); verify(v);
      if (!cancel && ['ABORTED','EXPIRED'].includes(String(v.status))) return result(await process({ action: 'outcome', operation_id: op.operation_id, outcome: 'REJECTED' }));
      if (!cancel && v.status === 'IN_PROGRESS') {
        if (!cfg.enabled) fail(409, 'PAYMENT_PAUSED');
        v = await provider('confirm', { paymentKey: key, orderId: order.order_id, amount: order.amount }); verify(v);
      }
      if (cancel && v.status === 'DONE') {
        if (Number(op.operation_amount) < Number(order.amount) && v.isPartialCancelable !== true) fail(409, 'PARTIAL_CANCEL_UNSUPPORTED');
        v = await provider(`${encodeURIComponent(key)}/cancel`, { cancelReason: cfg.mode === 'TEST' ? 'TEST general refund' : 'General refund', cancelAmount: op.operation_amount }); verify(v);
      }
      if (cancel) {
        const cancels = Array.isArray(v.cancels) ? v.cancels as Json[] : [];
        if (!['CANCELED','PARTIAL_CANCELED'].includes(String(v.status)) || cancels.length !== 1 || cancels[0].cancelStatus !== 'DONE' || cancels[0].cancelAmount !== op.operation_amount || v.balanceAmount !== Number(order.amount) - Number(op.operation_amount)) fail(503, 'RECONCILIATION_REQUIRED');
        op = await process({ action: 'cancel_finish', operation_id: op.operation_id, payment_key: key, amount: op.operation_amount });
      } else {
        if (v.status !== 'DONE' || typeof v.approvedAt !== 'string' || !Number.isFinite(Date.parse(v.approvedAt)) || v.balanceAmount !== order.amount) fail(503, 'RECONCILIATION_REQUIRED');
        if (support && preview?.compensation_required === true) return result(await rpc('payment_compensate', { id: p.id, request_key: p.request_key, payment_key: key, amount: order.amount, paid_at: v.approvedAt }, true));
        op = await process({ action: 'confirm_finish', operation_id: op.operation_id, payment_key: key, amount: order.amount, paid_at: v.approvedAt });
      }
      return result(op);
    } catch (error) {
      diagnostic = { ...diagnostic, category: error instanceof Fault ? error.code : 'UPSTREAM_OR_LOCAL_EXCEPTION' };
      // Even a rejected HTTP response may hide a successful prior request. Never release the fence on guesswork.
      try { await process({ action: 'outcome', operation_id: op.operation_id, outcome: 'UNKNOWN' }); } catch { /* durable pending operation is already the recovery anchor */ }
      return Response.json({ error: 'RECONCILIATION_REQUIRED', diagnostic }, { status: 503, headers });
    }
  } catch (e) {
    const f = e instanceof Fault ? e : new Fault(503, 'RECONCILIATION_REQUIRED');
    return Response.json({ error: f.code, ...(f.diagnostic ? { diagnostic: f.diagnostic } : {}), ...(f.code === 'PAYMENT_NOT_CONFIGURED' ? { state: 'NOT_READY', consumer_purchase: false } : {}) }, { status: f.status, headers });
  }
}
