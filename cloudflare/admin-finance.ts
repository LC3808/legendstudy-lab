/**
 * Server-only finance boundary. Cloudflare runtime only — never import this
 * into a client component.
 *
 * Credit issuance and order actions are finance capabilities. The database
 * grants EXECUTE on `public.essay_admin_grant` and `public.payment_support` to
 * `essay_finance` alone, and that role is never a browser credential: the
 * canonical mechanism (wiki/essay-lab-server-transactions.md) is a short-lived
 * `essay_finance` JWT whose `sub` carries the operator identity.
 *
 * So this boundary does two things and nothing else:
 *   1. Establish that the caller really is an operator, by asking the database
 *      with the caller's own access token (`admin_operator()`), never by
 *      trusting a role or an id in the request body.
 *   2. Mint a narrowly scoped, short-lived finance JWT for that operator and
 *      forward the single intended call.
 *
 * If the signing material is not configured the boundary refuses with 503 and
 * grants nothing. It never falls back to a privileged key, never logs a token,
 * and never returns a provider message.
 */
import { legendStudySupabaseUrl } from "../src/lib/auth-config";
import { CREDIT_GRANT_MAX_QUANTITY, CREDIT_GRANT_REASONS } from "../src/lib/admin/grant-reasons";

export type Env = {
  SUPABASE_PUBLISHABLE_KEY?: string;
  FINANCE_JWT_PRIVATE_KEY?: string;
  FINANCE_JWT_KEY_ID?: string;
  FINANCE_JWT_ISSUER?: string;
  FINANCE_JWT_AUDIENCE?: string;
};

export type Context = { request: Request; env: Env };

export const ORIGIN = "https://lab.legendstudy.com";

const FINANCE_ROLE = "essay_finance";
const JWT_TTL_SECONDS = 120;
const REQUEST_LIMIT_BYTES = 4096;

const MAX_QUANTITY = CREDIT_GRANT_MAX_QUANTITY;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const baseHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: baseHeaders });
}

function sameOrigin(request: Request): boolean {
  return new URL(request.url).origin === ORIGIN && request.headers.get("origin") === ORIGIN;
}

function publishableKey(env: Env): string | null {
  const key = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return null;
  return key;
}

/** The caller's Supabase access token, taken only from the Authorization header. */
function bearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer ([A-Za-z0-9._-]{20,4096})$/.exec(header.trim());
  return match ? match[1] : null;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    throw new Error("request");
  }
  const text = await request.text();
  if (text.length > REQUEST_LIMIT_BYTES) throw new Error("request");
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("request");
  return parsed as Record<string, unknown>;
}

// --- Supabase calls ----------------------------------------------------------

async function callRpc(
  name: string,
  key: string,
  token: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const response = await fetch(`${legendStudySupabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { ok: response.ok, status: response.status, data };
}

// --- finance JWT -------------------------------------------------------------

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlText(value: string): string {
  return base64Url(new TextEncoder().encode(value));
}

/**
 * The private key is supplied as PKCS#8. PEM is accepted for convenience and
 * stripped to its DER body; a bare base64 body is accepted as-is.
 */
function privateKeyBytes(raw: string): ArrayBuffer {
  const trimmed = raw.trim();
  const body = trimmed.includes("-----BEGIN")
    ? trimmed.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")
    : trimmed.replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

async function mintFinanceJwt(env: Env, operatorId: string): Promise<string | null> {
  const material = env.FINANCE_JWT_PRIVATE_KEY?.trim();
  const keyId = env.FINANCE_JWT_KEY_ID?.trim();
  if (!material || !keyId) return null;
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBytes(material),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
  } catch {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", typ: "JWT", kid: keyId };
  const payload = {
    role: FINANCE_ROLE,
    sub: operatorId,
    aud: env.FINANCE_JWT_AUDIENCE?.trim() || "authenticated",
    iss: env.FINANCE_JWT_ISSUER?.trim() || "legendstudy-lab-finance",
    iat: now,
    exp: now + JWT_TTL_SECONDS,
  };
  const signingInput = `${base64UrlText(JSON.stringify(header))}.${base64UrlText(
    JSON.stringify(payload),
  )}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

/**
 * The operator identity used for the finance call.
 *
 * Read from the verified token's `sub`, and cross-checked against the account
 * the database recognised. A caller cannot name the actor.
 */
async function operatorIdentity(key: string, token: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="))) as {
      sub?: unknown;
    };
    if (typeof decoded.sub !== "string" || !UUID.test(decoded.sub)) return null;
    // The database is the authority: the token must still be a live session.
    const probe = await callRpc("admin_operator", key, token, {});
    return probe.ok && probe.data === true ? decoded.sub : null;
  } catch {
    return null;
  }
}

// --- endpoints ---------------------------------------------------------------

export async function creditGrant({ request, env }: Context): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method" }, 405);
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const key = publishableKey(env);
  if (!key) return json({ error: "unavailable" }, 503);

  const token = bearer(request);
  if (!token) return json({ error: "unauthenticated" }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = await readJson(request);
  } catch {
    return json({ error: "request" }, 400);
  }

  const accountId = typeof payload.account_id === "string" ? payload.account_id : "";
  const origin = typeof payload.origin === "string" ? payload.origin : "";
  const reason = typeof payload.reason === "string" ? payload.reason : "";
  const requestKey = typeof payload.request_key === "string" ? payload.request_key : "";
  const quantity = payload.quantity;

  if (!UUID.test(accountId) || !UUID.test(requestKey)) return json({ error: "request" }, 400);
  if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > MAX_QUANTITY) {
    return json({ error: "request" }, 400);
  }
  const allowed = CREDIT_GRANT_REASONS[origin];
  if (!allowed || !allowed.includes(reason)) return json({ error: "request" }, 400);

  const operatorId = await operatorIdentity(key, token);
  if (!operatorId) return json({ error: "forbidden" }, 403);

  const financeToken = await mintFinanceJwt(env, operatorId);
  if (!financeToken) return json({ error: "unavailable" }, 503);

  // p_key is the ledger's idempotency key, so a retry cannot double-issue.
  const result = await callRpc("essay_admin_grant", key, financeToken, {
    p_user: accountId,
    p_quantity: quantity,
    p_origin: origin,
    p_key: requestKey,
    p_reason: reason,
    p_expires: null,
  });

  if (!result.ok) {
    // Only the SQLSTATE class is surfaced. A raw Postgres message could carry a
    // ledger detail an operator should read in the console, not in a browser.
    const status = result.status === 401 || result.status === 403 ? 403 : 400;
    return json({ error: "grant_failed", status: result.status }, status);
  }

  const data = (result.data ?? {}) as Record<string, unknown>;
  return json({
    grant_id: typeof data.grant_id === "string" ? data.grant_id : null,
    quantity: typeof data.quantity === "number" ? data.quantity : quantity,
    origin,
  });
}

const PAYMENT_ACTIONS = new Set(["inspect", "cancel", "reconcile"]);

export async function paymentSupport({ request, env }: Context): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method" }, 405);
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const key = publishableKey(env);
  if (!key) return json({ error: "unavailable" }, 503);

  const token = bearer(request);
  if (!token) return json({ error: "unauthenticated" }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = await readJson(request);
  } catch {
    return json({ error: "request" }, 400);
  }

  const action = typeof payload.action === "string" ? payload.action : "";
  const orderId = typeof payload.order_id === "string" ? payload.order_id : "";
  const requestKey = typeof payload.request_key === "string" ? payload.request_key : "";
  if (!PAYMENT_ACTIONS.has(action) || !UUID.test(orderId) || !UUID.test(requestKey)) {
    return json({ error: "request" }, 400);
  }

  const operatorId = await operatorIdentity(key, token);
  if (!operatorId) return json({ error: "forbidden" }, 403);

  const financeToken = await mintFinanceJwt(env, operatorId);
  if (!financeToken) return json({ error: "unavailable" }, 503);

  const result = await callRpc("payment_support", key, financeToken, {
    p: {
      dto_version: "payment-v1",
      action,
      id: orderId,
      operator_id: operatorId,
      request_key: requestKey,
    },
  });

  if (!result.ok) {
    const status = result.status === 401 || result.status === 403 ? 403 : 400;
    return json({ error: "support_failed", status: result.status }, status);
  }
  return json({ ok: true, action });
}
