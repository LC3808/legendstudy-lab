import { afterEach, describe, it, expect, vi } from "vitest";
import { callback, exchange, start, ORIGIN, CALLBACK, type Env } from "../../cloudflare/kakao";
import { createKakaoTransaction, consumeKakaoCallback, finishKakaoLogin } from "./kakao-oidc";

const env: Env = { KAKAO_OIDC_ENABLED: "true", KAKAO_REST_API_KEY: "test-client", KAKAO_CLIENT_SECRET_MODE: "disabled" };
const state = "a".repeat(43);
const cookie = `__Host-lab-kakao-state=${state}`;
function post(path: string, value: unknown, origin = ORIGIN) {
  return new Request(`${ORIGIN}/api/auth/kakao/${path}`, { method: "POST", headers: {
    origin, cookie, "Content-Type": "application/json",
  }, body: JSON.stringify(value) });
}
const input = { state, nonceHash: "b".repeat(64), challenge: "c".repeat(43) };
const request = () => post("callback", { state, code: "test-code", verifier: "d".repeat(43) });
function browserStorage(transaction: unknown) {
  let value: string | null = JSON.stringify(transaction);
  return { getItem: () => value, removeItem: () => { value = null; } };
}
const token = (nonce: string) => `test.${btoa(JSON.stringify({ nonce }))}.test`;
afterEach(() => vi.restoreAllMocks());

describe("Kakao OIDC server boundary", () => {
  it("uses exact minimal scopes, hashed nonce, S256 and fixed callback", async () => {
    const response = await start({ request: post("start", input), env });
    const url = new URL((await response.json()).url);
    expect(url.origin + url.pathname).toBe("https://kauth.kakao.com/oauth/authorize");
    expect(url.searchParams.get("scope")?.split(",")).toEqual(["openid", "account_email"]);
    expect(url.searchParams.has("scopes")).toBe(false);
    expect(url.toString()).not.toMatch(/profile_nickname|profile_image|prompt=/);
    expect(url.searchParams.get("nonce")).toBe(input.nonceHash);
    expect(url.searchParams.get("state")).toBe(state);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe(input.challenge);
    expect(url.searchParams.get("redirect_uri")).toBe(CALLBACK);
    expect(response.headers.get("set-cookie")).toContain("Secure; HttpOnly; SameSite=Lax; Max-Age=300");
  });
  it("fails closed for unspecified secret policy or disabled integration", async () => {
    for (const setting of [{}, { ...env, KAKAO_CLIENT_SECRET_MODE: "enabled" }, { ...env, KAKAO_OIDC_ENABLED: "false" }]) {
      expect((await start({ request: post("start", input), env: setting })).status).toBe(403);
    }
  });
  it("rejects cross-origin start and exchange without fetching", async () => {
    expect((await start({ request: post("start", input, "https://evil.invalid"), env })).status).toBe(403);
    const fetcher = vi.fn();
    expect((await exchange({ request: post("callback", {}, "https://evil.invalid"), env }, fetcher)).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects malformed random fields", async () => {
    expect((await start({ request: post("start", { ...input, state: "predictable" }), env })).status).toBe(400);
  });
  it.each(["?code=test-code", "?state=wrong&code=test-code", `?state=${state}`])("rejects invalid callback %s", (query) => {
    const result = callback({ request: new Request(CALLBACK + query, { headers: { cookie } }), env });
    expect(result.headers.get("location")).toBe(`${ORIGIN}/auth/kakao/#error=failed`);
  });
  it("maps cancellation without forwarding provider error descriptions", () => {
    const result = callback({ request: new Request(`${CALLBACK}?state=${state}&error=access_denied&error_description=private`, { headers: { cookie } }), env });
    expect(result.headers.get("location")).toBe(`${ORIGIN}/auth/kakao/#error=cancelled`);
    expect(result.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it("passes code only in fragment to fixed destination with no-referrer/no-store", () => {
    const result = callback({ request: new Request(`${CALLBACK}?state=${state}&code=test-code&next=https://evil.invalid`, { headers: { cookie } }), env });
    const target = new URL(result.headers.get("location")!);
    expect(target.origin).toBe(ORIGIN);
    expect(target.search).toBe("");
    expect(target.hash).toContain("code=test-code");
    expect(result.headers.get("referrer-policy")).toBe("no-referrer");
    expect(result.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects state mismatch without token exchange", async () => {
    const fetcher = vi.fn();
    const response = await exchange({ request: post("callback", { state: "x".repeat(43), code: "code", verifier: "d".repeat(43) }), env }, fetcher);
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([new Response("private", { status: 400 }), Response.json({}), Response.json({ id_token: 42 })])("sanitizes exchange failures and clears transaction cookie", async (reply) => {
    const result = await exchange({ request: request(), env }, vi.fn().mockResolvedValue(reply));
    expect(result.status).toBe(502);
    expect(await result.text()).not.toContain("private");
    expect(result.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it("logs only safe provider error details for token exchange HTTP failures", async () => {
    const diagnostic = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const result = await exchange({ request: request(), env }, vi.fn().mockResolvedValue(Response.json({
      error: "invalid_grant", error_code: "KOE320", error_description: "private", access_token: "secret", refresh_token: "secret",
    }, { status: 400 })));
    expect(result.status).toBe(502);
    expect(diagnostic).toHaveBeenCalledWith("KAKAO_OIDC stage=kakao_token_exchange result=failed status=400 error=invalid_grant error_code=KOE320");
    const output = diagnostic.mock.calls.flat().join(" ");
    expect(output).not.toMatch(/private|secret|access_token|refresh_token|error_description/);
  });
  it("omits unallowlisted provider fields from token exchange diagnostics", async () => {
    const diagnostic = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await exchange({ request: request(), env }, vi.fn().mockResolvedValue(Response.json({ error: "provider-private", error_code: "email@example.com" }, { status: 401 })));
    expect(diagnostic).toHaveBeenCalledWith("KAKAO_OIDC stage=kakao_token_exchange result=failed status=401");
    expect(diagnostic.mock.calls.flat().join(" ")).not.toContain("email@example.com");
  });
  it("logs a missing ID token without exposing the provider response", async () => {
    const diagnostic = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await exchange({ request: request(), env }, vi.fn().mockResolvedValue(Response.json({ access_token: "private" })));
    expect(diagnostic).toHaveBeenCalledWith("KAKAO_OIDC stage=id_token result=missing");
    expect(diagnostic.mock.calls.flat().join(" ")).not.toContain("private");
  });
  it("exchanges server-side with PKCE, returns only ID token, and drops provider access tokens", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id_token: "test-id", access_token: "discard", refresh_token: "discard" }));
    const result = await exchange({ request: request(), env: { ...env, KAKAO_CLIENT_SECRET_MODE: "enabled", KAKAO_CLIENT_SECRET: "test-only" } }, fetcher);
    expect(await result.json()).toEqual({ idToken: "test-id" });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://kauth.kakao.com/oauth/token");
    expect(options.body.get("code_verifier")).toBe("d".repeat(43));
    expect(options.body.get("client_secret")).toBe("test-only");
    expect(options.body.get("redirect_uri")).toBe(CALLBACK);
    expect(options.redirect).toBe("error");
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(result.headers.get("cache-control")).toBe("no-store");
  });
  it("sanitizes timeout/network errors", async () => {
    const result = await exchange({ request: request(), env }, vi.fn().mockRejectedValue(new Error("private")));
    expect(await result.json()).toEqual({ error: "exchange" });
  });
});

describe("browser transaction and Supabase session seam", () => {
  it("creates independent random state/nonce/verifier and exact SHA-256 representations", async () => {
    const a = await createKakaoTransaction("//evil.invalid"), b = await createKakaoTransaction("/home/");
    expect(new Set([a.state, a.nonce, a.verifier, b.state, b.nonce, b.verifier]).size).toBe(6);
    expect(a.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const { createHash } = await import("node:crypto");
    expect(a.nonceHash).toBe(createHash("sha256").update(a.nonce).digest("hex"));
    expect(a.challenge).toBe(createHash("sha256").update(a.verifier).digest("base64url"));
    expect(a.returnPath).toBe("/home/");
  });
  it("consumes transaction once and rejects replay", async () => {
    const transaction = await createKakaoTransaction("/home/");
    const storage = browserStorage(transaction);
    expect(consumeKakaoCallback(`#code=test-code&state=${transaction.state}`, storage).code).toBe("test-code");
    expect(() => consumeKakaoCallback(`#code=test-code&state=${transaction.state}`, storage)).toThrow();
  });
  it("rejects expired, missing code and mismatched state", async () => {
    const tx = await createKakaoTransaction("/home/");
    expect(() => consumeKakaoCallback(`#state=${tx.state}`, browserStorage(tx))).toThrow();
    expect(() => consumeKakaoCallback("#code=test-code&state=wrong", browserStorage(tx))).toThrow();
    expect(() => consumeKakaoCallback(`#code=test-code&state=${tx.state}`, browserStorage({ ...tx, createdAt: Date.now() - 301000 }))).toThrow();
  });
  it("uses official kakao ID-token API with raw nonce and existing client", async () => {
    const tx = { ...await createKakaoTransaction("/home/"), code: "test-code" };
    const signInWithIdToken = vi.fn().mockResolvedValue({ data: { session: {} }, error: null });
    const idToken = token(tx.nonceHash);
    const diagnostic = vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect(await finishKakaoLogin({ auth: { signInWithIdToken } } as never, tx, vi.fn().mockResolvedValue(Response.json({ idToken })))).toBe("/home/");
    expect(signInWithIdToken).toHaveBeenCalledWith({ provider: "kakao", token: idToken, nonce: tx.nonce });
    expect(diagnostic).toHaveBeenCalledWith("KAKAO_OIDC stage=success result=complete");
  });
  it("rejects wrong nonce before Supabase and rejects session failure", async () => {
    const tx = { ...await createKakaoTransaction("/home/"), code: "test-code" };
    const signInWithIdToken = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
    const diagnostic = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await expect(finishKakaoLogin({ auth: { signInWithIdToken } } as never, tx, vi.fn().mockResolvedValue(Response.json({ idToken: token("wrong") })))).rejects.toThrow();
    expect(signInWithIdToken).not.toHaveBeenCalled();
    expect(diagnostic).toHaveBeenCalledWith("KAKAO_OIDC stage=nonce_validation result=failed");
    await expect(finishKakaoLogin({ auth: { signInWithIdToken } } as never, tx, vi.fn().mockResolvedValue(Response.json({ idToken: token(tx.nonceHash) })))).rejects.toThrow();
    expect(diagnostic).toHaveBeenCalledWith("KAKAO_OIDC stage=session_creation result=missing");
  });
  it("logs exchange HTTP failures and Supabase failures with safe status/code only", async () => {
    const tx = { ...await createKakaoTransaction("/home/"), code: "test-code" };
    const diagnostic = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const client = { auth: { signInWithIdToken: vi.fn().mockResolvedValue({ data: { session: null }, error: { code: "provider_disabled", message: "private" } }) } } as never;
    await expect(finishKakaoLogin(client, tx, vi.fn().mockResolvedValue(new Response(null, { status: 502 })))).rejects.toThrow();
    expect(diagnostic).toHaveBeenCalledWith("KAKAO_OIDC stage=exchange_response result=failed status=502");
    await expect(finishKakaoLogin(client, tx, vi.fn().mockResolvedValue(Response.json({ idToken: token(tx.nonceHash) })))).rejects.toThrow();
    expect(diagnostic).toHaveBeenCalledWith("KAKAO_OIDC stage=supabase_id_token_exchange result=failed code=provider_disabled");
    expect(diagnostic.mock.calls.flat().join(" ")).not.toContain("private");
  });
});
