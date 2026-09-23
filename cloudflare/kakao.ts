/** Cloudflare runtime only. Never import into a client component. */
export type Env = {
  KAKAO_OIDC_ENABLED?: string;
  KAKAO_REST_API_KEY?: string;
  KAKAO_CLIENT_SECRET_MODE?: string;
  KAKAO_CLIENT_SECRET?: string;
};
export type Context = { request: Request; env: Env };
export const ORIGIN = "https://lab.legendstudy.com";
export const CALLBACK = `${ORIGIN}/api/auth/kakao/callback`;
const COOKIE = "__Host-lab-kakao-state";
const RANDOM = /^[A-Za-z0-9_-]{43}$/;
const HASH = /^[a-f0-9]{64}$/;
const baseHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
function cookie(value: string, maxAge: number) {
  return `${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}
function storedState(request: Request) {
  return request.headers.get("cookie")?.split("; ").find((item) => item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
}
function json(value: unknown, status = 200, binding?: string) {
  return Response.json(value, { status, headers: { ...baseHeaders, ...(binding ? { "Set-Cookie": binding } : {}) } });
}
const KAKAO_ERROR_NAMES = new Set([
  "invalid_request", "invalid_client", "invalid_grant", "unauthorized_client", "unsupported_grant_type", "invalid_scope",
]);
function kakaoDiagnostic(message: string) {
  console.info(`KAKAO_OIDC ${message}`);
}
const KAKAO_ERROR_CODE = /^[A-Za-z0-9_-]{1,32}$/;
async function safeKakaoErrorMetadata(response: Response) {
  try {
    const value = await response.json() as { error?: unknown; error_code?: unknown };
    return {
      error: typeof value.error === "string" && KAKAO_ERROR_NAMES.has(value.error) ? value.error : undefined,
      errorCode: typeof value.error_code === "string" && KAKAO_ERROR_CODE.test(value.error_code) ? value.error_code : undefined,
    };
  } catch { return {}; }
}
function configured(env: Env) {
  return env.KAKAO_OIDC_ENABLED === "true" && Boolean(env.KAKAO_REST_API_KEY) &&
    (env.KAKAO_CLIENT_SECRET_MODE === "disabled" ||
      (env.KAKAO_CLIENT_SECRET_MODE === "enabled" && Boolean(env.KAKAO_CLIENT_SECRET)));
}
function sameOrigin(request: Request) {
  return new URL(request.url).origin === ORIGIN && request.headers.get("origin") === ORIGIN;
}
async function body(request: Request): Promise<Record<string, string>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("request");
  const text = await request.text();
  if (text.length > 8192) throw new Error("request");
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("request");
  return parsed as Record<string, string>;
}
export async function start({ request, env }: Context): Promise<Response> {
  if (!sameOrigin(request) || !configured(env)) return json({ error: "unavailable" }, 403);
  try {
    const { state, nonceHash, challenge } = await body(request);
    if (!RANDOM.test(state ?? "") || !HASH.test(nonceHash ?? "") || !RANDOM.test(challenge ?? "")) throw new Error("request");
    const url = new URL("https://kauth.kakao.com/oauth/authorize");
    url.search = new URLSearchParams({
      client_id: env.KAKAO_REST_API_KEY!, redirect_uri: CALLBACK, response_type: "code",
      // Kakao REST API documents comma-separated consent IDs, not additive Supabase scopes.
      scope: "openid,account_email", state, nonce: nonceHash,
      code_challenge: challenge, code_challenge_method: "S256",
    }).toString();
    return json({ url: url.toString() }, 200, cookie(state, 300));
  } catch { return json({ error: "request" }, 400); }
}
export function callback({ request }: Context): Response {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  let location: string;
  if (url.origin !== ORIGIN || !state || !RANDOM.test(state) || storedState(request) !== state) {
    location = `${ORIGIN}/auth/kakao/#error=failed`;
  } else if (error || !code || code.length > 4096) {
    location = `${ORIGIN}/auth/kakao/#error=${error === "access_denied" ? "cancelled" : "failed"}`;
  } else {
    // Only the short-lived authorization code crosses the fragment, never an ID/access token.
    location = `${ORIGIN}/auth/kakao/#${new URLSearchParams({ code, state })}`;
  }
  return new Response(null, { status: 303, headers: {
    ...baseHeaders, Location: location,
    ...(location.includes("#error=") ? { "Set-Cookie": cookie("", 0) } : {}),
  } });
}
export async function exchange({ request, env }: Context, fetcher: typeof fetch = fetch): Promise<Response> {
  if (!sameOrigin(request) || !configured(env)) return json({ error: "unavailable" }, 403);
  const clear = cookie("", 0);
  try {
    const { state, code, verifier } = await body(request);
    if (!RANDOM.test(state ?? "") || storedState(request) !== state || !RANDOM.test(verifier ?? "") ||
        typeof code !== "string" || !code || code.length > 4096) return json({ error: "request" }, 400, clear);
    kakaoDiagnostic("stage=exchange_request result=start");
    const params = new URLSearchParams({ grant_type: "authorization_code", client_id: env.KAKAO_REST_API_KEY!,
      redirect_uri: CALLBACK, code, code_verifier: verifier });
    if (env.KAKAO_CLIENT_SECRET_MODE === "enabled") params.set("client_secret", env.KAKAO_CLIENT_SECRET!);
    kakaoDiagnostic("stage=kakao_token_exchange result=start");
    const response = await fetcher("https://kauth.kakao.com/oauth/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: params, redirect: "error", signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const { error, errorCode } = await safeKakaoErrorMetadata(response);
      kakaoDiagnostic(`stage=kakao_token_exchange result=failed status=${response.status}${error ? ` error=${error}` : ""}${errorCode ? ` error_code=${errorCode}` : ""}`);
      return json({ error: "exchange" }, 502, clear);
    }
    kakaoDiagnostic("stage=kakao_token_exchange result=success");
    const result = await response.json() as { id_token?: unknown };
    if (typeof result.id_token !== "string" || !result.id_token || result.id_token.length > 16384) {
      kakaoDiagnostic("stage=id_token result=missing");
      return json({ error: "missing_token" }, 502, clear);
    }
    kakaoDiagnostic("stage=id_token result=present");
    // Discard Kakao access/refresh tokens. Supabase verifies the ID token signature/claims.
    return json({ idToken: result.id_token }, 200, clear);
  } catch {
    kakaoDiagnostic("stage=kakao_token_exchange result=failed");
    return json({ error: "exchange" }, 502, clear);
  }
}
