import type { SupabaseClient } from "@supabase/supabase-js";
import { getSafeReturnPath } from "@/lib/return-to";

const KEY = "lab-kakao-transaction";
export const KAKAO_FAILURE_PATH = "/login/?kakao=failed";
function kakaoDiagnostic(message: string) {
  console.info(`KAKAO_OIDC ${message}`);
}
function safeCode(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_.-]{1,64}$/.test(value) ? value : "unknown";
}
const random = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}
export async function createKakaoTransaction(returnPath: string) {
  const state = random(), nonce = random(), verifier = random();
  const nonceHash = Array.from(await digest(nonce), (value) => value.toString(16).padStart(2, "0")).join("");
  const challenge = btoa(String.fromCharCode(...await digest(verifier))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { state, nonce, verifier, nonceHash, challenge, createdAt: Date.now(), returnPath: getSafeReturnPath(returnPath) };
}
export async function startKakaoLogin(returnPath: string) {
  try {
    const transaction = await createKakaoTransaction(returnPath);
    sessionStorage.setItem(KEY, JSON.stringify(transaction));
    const response = await fetch("/api/auth/kakao/start", { method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: transaction.state, nonceHash: transaction.nonceHash, challenge: transaction.challenge }),
      signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("unavailable");
    const { url } = await response.json();
    const target = new URL(url);
    if (target.origin !== "https://kauth.kakao.com" || target.pathname !== "/oauth/authorize") throw new Error("redirect");
    window.location.assign(target.toString());
  } catch {
    sessionStorage.removeItem(KEY);
    throw new Error("kakao_unavailable");
  }
}
/** Consumes the browser transaction before any asynchronous work; StrictMode/replay cannot submit twice. */
export function consumeKakaoCallback(fragment: string, storage: Pick<Storage, "getItem" | "removeItem"> = sessionStorage) {
  const raw = storage.getItem(KEY);
  storage.removeItem(KEY);
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  if (params.get("error")) throw new Error(params.get("error") === "cancelled" ? "cancelled" : "failed");
  if (!raw) throw new Error("failed");
  const transaction = JSON.parse(raw) as Awaited<ReturnType<typeof createKakaoTransaction>>;
  const age = Date.now() - transaction.createdAt;
  const code = params.get("code");
  if (!Number.isFinite(age) || age < 0 || age > 300000 || !code || params.get("state") !== transaction.state) throw new Error("failed");
  kakaoDiagnostic("stage=callback_transaction result=success");
  return { ...transaction, code };
}
export async function finishKakaoLogin(client: SupabaseClient, transaction: ReturnType<typeof consumeKakaoCallback>, fetcher: typeof fetch = fetch) {
  const response = await fetcher("/api/auth/kakao/callback", { method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: transaction.state, code: transaction.code, verifier: transaction.verifier }),
    signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    kakaoDiagnostic(`stage=exchange_response result=failed status=${response.status}`);
    throw new Error("failed");
  }
  kakaoDiagnostic("stage=exchange_response result=success");
  const { idToken } = await response.json();
  if (typeof idToken !== "string") throw new Error("failed");
  // This is an early nonce guard, NOT signature validation. Supabase does signature/issuer/audience/expiry validation.
  try {
    const claims = JSON.parse(atob(idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (claims.nonce !== transaction.nonceHash) {
      kakaoDiagnostic("stage=nonce_validation result=failed");
      throw new Error("failed");
    }
  } catch (error) {
    if (!(error instanceof Error && error.message === "failed")) kakaoDiagnostic("stage=nonce_validation result=failed");
    throw new Error("failed");
  }
  kakaoDiagnostic("stage=nonce_validation result=success");
  kakaoDiagnostic("stage=supabase_id_token_exchange result=start");
  let result: Awaited<ReturnType<SupabaseClient["auth"]["signInWithIdToken"]>>;
  try {
    result = await client.auth.signInWithIdToken({ provider: "kakao", token: idToken, nonce: transaction.nonce });
  } catch {
    kakaoDiagnostic("stage=supabase_id_token_exchange result=failed code=unknown");
    throw new Error("failed");
  }
  const { data, error } = result;
  if (error) {
    kakaoDiagnostic(`stage=supabase_id_token_exchange result=failed code=${safeCode(error.code)}`);
    throw new Error("failed");
  }
  if (!data.session) {
    kakaoDiagnostic("stage=session_creation result=missing");
    throw new Error("failed");
  }
  kakaoDiagnostic("stage=success result=complete");
  return getSafeReturnPath(transaction.returnPath);
}
