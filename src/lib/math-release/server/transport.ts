import { boundedBody } from "./request";
import type { MathRpcTransport } from "../../math-input/runtime/transport";
export interface MathEnvironment {
  MATH_ALLOWED_SUBJECTS?: string; MATH_ENABLED?: string; MATH_PROVIDER_CALLS_ENABLED?: string; MATH_PROVIDER?: string; MATH_PRIMARY_MODEL?: string;
  MATH_PROVIDER_API_KEY?: string; MATH_ORIGIN?: string; MATH_SUPABASE_URL?: string; MATH_PROJECT_REF?: string;
  MATH_SUPABASE_PUBLISHABLE_KEY?: string; MATH_EXTRACTION_WORKER_JWT?: string; MATH_EVALUATION_WORKER_JWT?: string;
}
export function serverTransport(env: MathEnvironment) {
  const url = env.MATH_SUPABASE_URL;
  if (!env.MATH_PROJECT_REF || url !== `https://${env.MATH_PROJECT_REF}.supabase.co` || !env.MATH_SUPABASE_PUBLISHABLE_KEY) throw Error("CONFIGURATION_REQUIRED");
  async function request(path: string, token: string, init: RequestInit = {}) {
    return fetch(url + path, { ...init, redirect: "error", signal: AbortSignal.timeout(20000), headers: {
      apikey: env.MATH_SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${token}`, ...init.headers,
    }});
  }
  async function rpcRaw(name: string, args: unknown, token: string) {
    const res = await request(`/rest/v1/rpc/${name}`, token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
    if (!res.ok) throw Error("RPC_DENIED");
    const body = new TextDecoder().decode(await boundedBody(res,2097152));return JSON.parse(body);
  }
  const rpc = (token: string): MathRpcTransport => ({ rpc: (fn, p_request) => rpcRaw(fn, { p_request }, token) });
  async function subject(token: string) {
    let response: Response;
    try { response = await request("/auth/v1/user", token); }
    catch { console.warn("MATH_AUTH_FAILURE", { stage: "transport" }); throw Error("LOGIN_REQUIRED"); }
    if (!response.ok) { console.warn("MATH_AUTH_FAILURE", { stage: "response", status: response.status }); throw Error("LOGIN_REQUIRED"); } const body = await response.json() as { id?: string };
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) { console.warn("MATH_AUTH_FAILURE", { stage: "identity" }); throw Error("LOGIN_REQUIRED"); }
    // Hosted activation is synthetic-only until a separately approved public release.
    // Match the identity verified by Auth, never a client-supplied/decoded JWT subject.
    const allowed = (env.MATH_ALLOWED_SUBJECTS ?? "").split(",").map(value => value.trim());
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!allowed.length || allowed.length > 10 || allowed.some(value => !uuid.test(value)) ||
      !allowed.some(value => value.toLowerCase() === body.id!.toLowerCase())) { console.warn("MATH_AUTH_FAILURE", { stage: "allowlist" }); throw Error("ACCESS_DENIED"); }
    return body.id;
  }
  return { request, rpcRaw, rpc, subject };
}
