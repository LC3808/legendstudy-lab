/** Local-only real workerd regression. Pass an installed Miniflare package path.
 * node scripts/test-kakao-workerd.mjs /path/to/node_modules/miniflare
 * No credentials, real provider requests, production bindings or deployments.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const { Miniflare, convertV4MiniflareOptions } = require(process.argv[2] || "miniflare");
const source = readFileSync(new URL("../cloudflare/kakao.ts", import.meta.url), "utf8");
assert.match(source, /redirect: "manual"/);
const state = "a".repeat(43);
const env = { KAKAO_OIDC_ENABLED: "true", KAKAO_REST_API_KEY: "test-client", KAKAO_CLIENT_SECRET_MODE: "enabled", KAKAO_CLIENT_SECRET: "test-only" };
for (const scenario of ["before", 200, 400, 301, 302, 303, 307, 308]) {
  let calls = 0;
  let validated = false;
  const input = scenario === "before" ? source.replace('redirect: "manual"', 'redirect: "error"') : source;
  const script = ts.transpileModule(input, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/^export /gm, "") +
    '\nexport default { fetch(request, env) { return exchange({request, env}); } };';
  const options = {
    modules: true, compatibilityDate: "2026-09-22", script, bindings: env,
    outboundService: async (request) => {
      calls++;
      assert.equal(request.url, "https://kauth.kakao.com/oauth/token");
      assert.equal(request.method, "POST");
      assert.equal(request.headers.get("content-type"), "application/x-www-form-urlencoded;charset=utf-8");
      const params = new URLSearchParams(await request.text());
      assert.equal(params.get("grant_type"), "authorization_code");
      assert.equal(params.get("code_verifier"), "d".repeat(43));
      assert.equal(params.get("client_secret"), "test-only");
      assert.equal(params.get("redirect_uri"), "https://lab.legendstudy.com/api/auth/kakao/callback");
      validated = true;
      if (scenario === 200) return Response.json({ id_token: "synthetic-id-token" });
      return new Response(null, { status: Number(scenario), headers: { Location: "https://untrusted.invalid/" } });
    },
  };
  const mf = new Miniflare(convertV4MiniflareOptions ? convertV4MiniflareOptions(options) : options);
  try {
    const response = await mf.dispatchFetch("https://lab.legendstudy.com/api/auth/kakao/callback", {
      method: "POST", headers: { Origin: "https://lab.legendstudy.com", "Content-Type": "application/json", Cookie: `__Host-lab-kakao-state=${state}` },
      body: JSON.stringify({ state, code: "test-code", verifier: "d".repeat(43) }),
    });
    assert.equal(response.status, scenario === 200 ? 200 : 502);
    assert.equal(validated, scenario !== "before");
    assert.equal(calls, scenario === "before" ? 0 : 1);
    assert.deepEqual(await response.json(), scenario === 200 ? { idToken: "synthetic-id-token" } : { error: "exchange" });
    assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
    console.log(`WORKERD PASS scenario=${scenario} outbound_calls=${calls}`);
  } finally { await mf.dispose(); }
}
