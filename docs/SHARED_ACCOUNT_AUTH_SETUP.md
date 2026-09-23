# LegendStudy Account — Browser Auth Setup

## Purpose

LegendStudy LAB is a static Next.js export. It uses **browser-side Supabase sessions**, with the Kakao-only Pages token-exchange boundary described below, so that a user can hold the same `auth.users.id` identity in LegendStudy+ and LAB without introducing a second database, server-side session store, service-role key, or new Supabase project. The LAB source accepts only the public project URL declared by the LegendStudy app: `https://stlhijzpjfgwwdgunlsd.supabase.co`.

This document records both the deployment setup and the Owner-verified Production state. Credentials and private keys themselves are intentionally excluded.

## 2026-09-23 — token-fetch TypeError resolved locally

Owner Production evidence confirms authorize/OIDC/minimal scope/code/redirect/callback GET/state/tab transaction/Pages routing PASS. Existing Kakao Login/OIDC/account_email and Login Client Secret are ON; nickname/image remain OFF. Cloudflare runtime bindings and Supabase same REST-key client ID are Owner-confirmed. No console changes are needed for this fix. This supersedes the earlier configuration-unknown notes below; end-to-end login/shared identity are still NOT VERIFIED.

**Root cause:** `redirect: "error"` is rejected by workerd while constructing the outbound request, before any network I/O. It is not a Kakao HTTP 400/401 or evidence of a redirect from Kakao. Cloudflare's general Request reference lists `error`, but actual [official workerd implementation](https://github.com/cloudflare/workerd/blob/main/src/workerd/api/http.c++) rejects it in `Request::constructor` and advises `manual` plus status checking. [WHATWG Fetch](https://fetch.spec.whatwg.org/#http-fetch) defines `error` semantics; that standard behavior is not implemented by the tested edge runtime. The [Workers Request reference](https://developers.cloudflare.com/workers/runtime-apis/request/) and [Pages Functions runtime](https://developers.cloudflare.com/pages/functions/) were cross-checked against runtime evidence rather than assumed equivalent to Node/browser fetch.

Minimal fix: `redirect: "manual"`; existing `!response.ok` rejects all 3xx and 4xx/5xx. No auto-follow/retry, Location forwarding, credential forwarding or protocol changes. AbortSignal.timeout(15000), URLSearchParams, Content-Type, default native fetch injection, state/nonce/PKCE and conditional secret remain unchanged. [Kakao token API](https://developers.kakao.com/docs/en/kakaologin/rest-api#request-token) remains the same form-encoded POST. No outbound restriction workaround/TLS weakening was introduced.

Reproduction uses workerd **1.20260921.1**, Miniflare **5.20260921.0-alpha**, compatibility date 2026-09-22, the real exchange function and native fetch. Every outbound request is intercepted locally; synthetic values only. Before: 502 + TypeError, **zero outbound calls**. After changing only redirect: synthetic 200 succeeds; 400 is handled; 301/302/303/307/308 are rejected with exactly one call, never followed. This also rules out the unchanged timeout/body/content-type/function-binding combination as the cause of this deterministic failure. Production deployment runtime/version is not claimed to have been directly inspected.

Repeat locally with an installed Miniflare package (no runtime dependency was added):

```sh
node scripts/test-kakao-workerd.mjs /path/to/node_modules/miniflare
```

Existing safe stage diagnostics remain; no credentials or raw exceptions are logged. Google/Apple/Email code and prior Owner Production PASS are untouched. Owner next action: review the commit, approve push/deploy, then repeat Kakao login and privately compare App/LAB identity. A successful local synthetic response is not Production login verification.

## Current Kakao correction — 2026-09-22

The 2026-09-21 table below is historical Owner evidence. The later Owner report supersedes **LAB Kakao only**: Production KOE205 was reproduced with `account_email profile_image profile_nickname account_email`. Hosted Supabase Kakao defaults add profile scopes; the previous `scopes: "account_email"` only appended email. LAB Email/Google/Apple PASS remains valid. Owner now also reports App Email/Google/Apple/Kakao PASS; this task does not edit the App repository. Shared Kakao App/LAB user-ID equality remains **NOT VERIFIED**.

### Implemented replacement and deployment boundary

- Kakao no longer calls hosted `signInWithOAuth`. Google and Apple still do. Email/signup/recovery remain unchanged.
- Next `output: "export"`, `trailingSlash`, `out/`, and browser Supabase persistent session/storage key are unchanged. No SSR/session-cookie migration.
- Cloudflare Pages routes: `POST /api/auth/kakao/start`, `GET /api/auth/kakao/callback`, `POST /api/auth/kakao/callback`. Static browser completion route: `/auth/kakao/` (noindex).
- `functions/` is at repository root, separate from exported assets; shared server code is `cloudflare/kakao.ts`. `_routes.json` limits invocation to `/api/auth/kakao/*`. Wrangler locally compiles the actual functions. Owner has now verified actual Production Pages Function routing (2026-09-23); root functions must remain included in deployment. Uploading only `out/` through Dashboard is insufficient.
- Runtime fails closed unless `KAKAO_OIDC_ENABLED=true`, existing REST API key, and explicit client-secret mode are configured. Existing browser provider allow-list still controls visibility. Do not expose Kakao until deployment/configuration is ready.

### Protocol and security decisions

1. Browser generates three independent 256-bit random values with Web Crypto: state, raw nonce, PKCE verifier. A tab-scoped transaction in sessionStorage expires after five minutes and is consumed before async completion. No ID/access/refresh token is stored there.
2. Same-origin JSON POST to start sets a five-minute `__Host-` Secure/HttpOnly/SameSite=Lax state cookie. The browser separately retains state; callback must match cookie and tab state. Foreign Origin and malformed input fail closed.
3. Kakao authorization endpoint is `https://kauth.kakao.com/oauth/authorize`. Actual request scope is **`openid,account_email`** (Kakao REST docs specify comma-separated IDs), semantically exactly openid + account_email once. No profile scopes, login hint, forced consent or prompt parameter. Owner reports OIDC ON and same App/LAB Kakao client_id; no new application/key is created. Email claim still requires valid email and consent; OIDC alone does not guarantee every account supplies email.
4. Authorize nonce is lowercase hex SHA-256(raw nonce). Installed `@supabase/auth-js` 2.116.0 supports `provider: "kakao"` and `nonce`; Supabase Auth verifies SHA-256(raw nonce) against the ID-token claim. The browser passes raw nonce to `signInWithIdToken`. It checks claim equality early; **only Supabase performs signature/issuer/audience/expiry verification**. Never disable nonce verification.
5. Kakao's live Discovery document advertises `code_challenge_methods_supported: ["S256"]`. Browser derives base64url SHA-256(verifier); request uses `code_challenge`/`code_challenge_method=S256`, server token request uses `code_verifier`. No plain fallback. Production enforcement remains an E2E gate; metadata and mocked tests are not a live invalid-verifier acceptance test.
6. Callback GET verifies cookie/state and redirects only to fixed `/auth/kakao/` with short-lived code/state in fragment, **never ID token**. Browser immediately replaces that URL, consumes the tab transaction, then POSTs code/verifier/state to the same server callback. Server independently checks Origin and cookie/state before token exchange. Code necessarily arrives in the initial Kakao GET query; Owner must exclude callback query/body data from access-log exports, analytics, tracing and error capture. Referrer-Policy/no-store responses reduce propagation but cannot erase upstream access logs.
7. Server exchanges at fixed `https://kauth.kakao.com/oauth/token`, using exactly the registered callback, 15-second timeout and no redirect following. Kakao client secret is sent only when configured enabled. Only ID token is returned in a no-store same-origin JSON response, with no CORS permission. Kakao access/refresh tokens are discarded. ID token remains in browser memory only until official Supabase sign-in; existing Supabase session persistence continues normally.
8. Replay defense: consumed tab transaction, cookie clearing on terminal exchange/error, five-minute lifetime and Kakao single-use authorization code + PKCE. Concurrent exchanges rely on Kakao code single-use enforcement; there is no invented global atomic ledger. This does **not** claim stolen ID tokens are globally revoked after one Supabase request. Nonce secrecy, no ID-token URL/storage/logging, same-origin delivery and Supabase expiry validation are required boundaries.
9. Cancellation, invalid state/code, exchange failure, missing token, nonce mismatch and Supabase failure return safe login notices. No raw upstream error/token logging. Final navigation reuses the existing local return-path guard; server has no arbitrary redirect input. No inline executable callback payload or CSP relaxation was introduced. Existing external CSP/analytics configuration still needs Owner deployment validation.

### Owner configuration (do not send secrets to chat)

1. **Cloudflare Dashboard → Workers & Pages → legendstudy-lab → Settings → Builds & deployments:** confirm repository root, Git-connected build (or approved Wrangler deployment including `functions/`), existing build command and output `out`. No deployment was performed here. Keep preview disabled for this flow: runtime intentionally accepts only `https://lab.legendstudy.com`.
2. **Kakao Developers → existing app → App → Platform Key → REST API key:** retain the existing key shared with App/Supabase; add redirect `https://lab.legendstudy.com/api/auth/kakao/callback` without removing existing Supabase redirects. Confirm whether Client Secret is enabled; do not create/rotate/disable it merely for this change.
3. **Kakao Login → General → OpenID Connect:** Owner says ON. **Consent items:** keep account_email required, profile_nickname/profile_image unused. Do not enable extra profile collection.
4. **Cloudflare Pages project → Settings → Variables and Secrets → Production:** configure these **runtime** bindings (never `NEXT_PUBLIC_*`):

| Name | Value type / action |
|---|---|
| `KAKAO_REST_API_KEY` | Existing same Kakao app REST API key; no new key |
| `KAKAO_CLIENT_SECRET_MODE` | Exactly `enabled` if current Kakao secret is ON, otherwise `disabled` only after confirming OFF |
| `KAKAO_CLIENT_SECRET` | Existing secret, **encrypted secret binding**, only when mode is enabled; never source/build-public config |
| `KAKAO_OIDC_ENABLED` | `true` only after callback/runtime settings are ready |

Client Secret is required **when its existing setting is ON** (current Kakao docs say new REST keys default ON); Owner has now confirmed that setting is ON (2026-09-23); no secret value was inspected. No secret value was requested or stored. The server uses no service-role/DB credentials. Existing Supabase Kakao enabled/client-ID configuration must accept the same REST-key audience; do not change other provider settings.
5. Keep existing `NEXT_PUBLIC_SUPABASE_*` and Google/Apple allow-list configuration. Include `kakao` in `NEXT_PUBLIC_SUPABASE_AUTH_PROVIDERS` only for the configured deployment. Review log/analytics redaction for `/api/auth/kakao/*` and `/auth/kakao/` before rollout.
6. Owner approval precedes push/deploy. After deploying, verify actual Functions routing, Secure cookie, minimal scope, no ID tokens in URLs, nonce/PKCE and safe failures. Do not infer success from the static Next build.

### Owner Production acceptance

- First Kakao login: only email consent, automatic LAB return, authenticated Home.
- Logout/relogin: no unnecessary repeated consent; session restore; A→logout→B isolation.
- App and LAB same Kakao account: privately compare canonical Supabase `auth.users.id`; no new user, no manual merge, no UUID in docs/source/logs.
- Recheck LAB Email, Google, Apple and recovery; their prior Owner PASS is preserved, not substituted with new E2E claims.
- `LAB_KAKAO_PRODUCTION_E2E: NOT VERIFIED`
- `KAKAO_LAB_APP_SHARED_IDENTITY: NOT VERIFIED`

### Evidence and local validation

Official references: [Kakao REST/OIDC](https://developers.kakao.com/docs/ko/kakaologin/rest-api), [live OIDC Discovery](https://kauth.kakao.com/.well-known/openid-configuration), [Supabase Kakao ID-token flow](https://supabase.com/docs/guides/auth/social-login/auth-kakao), [JS ID-token API](https://supabase.com/docs/reference/javascript/auth-signinwithidtoken), [Pages Functions structure](https://developers.cloudflare.com/pages/functions/get-started/), [Pages routing](https://developers.cloudflare.com/pages/functions/routing/). Installed JS/auth-js version: 2.116.0. Nonce source inspected: Supabase Auth `internal/api/token_oidc.go` at upstream revision `64cfdf22e15278eb7f4e7be541156e1cf94f4431`; this is not a claim about the hosted deployment's revision.

Local verification results are recorded in `todo.md`. No real OAuth request, token exchange, user mutation or deployment was made by these tests.

## Production Auth status (2026-09-21)

Owner completed the following E2E flows on `https://lab.legendstudy.com`:

| Scope | Production result |
|---|---|
| Email signup and email confirmation | PASS |
| Email/password login and logout | PASS |
| Login to `/home/` and reactive Public ↔ Authenticated Header transition | PASS |
| Password recovery email, reset-password entry, password update, recovery-session sign-out, return to `/login/`, and login with the new password | PASS |
| Google OAuth: LAB → Google → Supabase callback → LAB; real Production login | PASS |
| Kakao OAuth: LAB → Kakao → Supabase callback → LAB; real Production login | PASS |
| Apple OAuth: LAB → Apple → Supabase callback → LAB; real Production login | PASS |

```text
LAB_EMAIL_AUTH_PRODUCTION_E2E: PASS
LAB_GOOGLE_OAUTH_PRODUCTION_E2E: PASS
LAB_KAKAO_OAUTH_PRODUCTION_E2E: PASS
LAB_APPLE_OAUTH_PRODUCTION_E2E: PASS
LAB_AUTH_LIFECYCLE: PRODUCTION VERIFIED
APP_SOCIAL_AUTH_PRODUCTION_E2E: PASS (Owner update 2026-09-22)
APP_LAB_ACCOUNT_IDENTITY_E2E: NOT YET VERIFIED
APPLE_SECRET_RENEWAL_GATE: OPEN
APPLE_ACCOUNT_DELETION_REVOKE: OPEN
STORE_RELEASE_READY: NO
```

The following paragraph describes the 2026-09-21 evidence only; the current correction above takes precedence. The verified scope at that date was LAB web only. LAB and LegendStudy+ App use the same Supabase project and intend `auth.users.id` as canonical account identity, but same-ID Production verification between App and LAB has not been completed. This does not verify app-side Google/Kakao/Apple OAuth and does not imply browser/native session sharing. Shared account identity and session sharing are separate: the goal is the same `auth.users.id`, not a shared browser cookie or native session.

### Provider operating notes and open gates

- **Google:** Production OAuth is verified. Rotate the Google client secret as an operations TODO because it was exposed in a setup screen capture. Do not put its value in this repository or Wiki.
- **Kakao:** `account_email` is required for sign-in; `nickname` and `profile_image` are not used. Keep requested personal data to what authentication requires. The current Kakao raster icon may appear lower-resolution than the other provider icons; track SVG or higher-resolution official asset replacement as final UI polish, not an auth release blocker.
- **Apple:** Production OAuth is verified. Configured identifiers are App ID `com.legendstudy.app`, Services ID `com.legendstudy.lab`, and primary app `LegendStudy / com.legendstudy.app`. The Sign in with Apple key and Supabase client secret are configured; do not record private `.p8` key material, OAuth client secret, or JWT values here. Apple client-secret JWT expiration cannot exceed 15777000 seconds (six months); set a renewal reminder, generate a replacement before expiry, and replace it in Supabase. See [Apple: Creating a client secret](https://developer.apple.com/documentation/signinwithapplerestapi/creating-a-client-secret).
- **Apple account deletion:** the production account-deletion flow must revoke the user's Apple authorization/token and handle the related deletion lifecycle. This is OPEN; the Store Release Gate is not closed until revoke is implemented and verified. See [Apple: Handling account deletions and revoking tokens](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple) and [Apple: Token revocation](https://developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens).

### Next official task: App ↔ LAB Shared Account Production Verification

Use the web-verified accounts to verify that the native app resolves to the same `auth.users.id` in Production. Cover:

1. Email account.
2. Google account.
3. Kakao account.
4. Apple account.
5. A → logout → B owner isolation.
6. Session restoration after app relaunch.
7. App/LAB identity equality using the canonical Supabase `auth.users.id`.
8. Existing Materials bookmark and grade owner-scoped data isolation.

Record app OAuth results separately from LAB web results. Shared account does not require shared browser/native session. Preserve the later Owner App-provider PASS report above; keep shared Kakao App/LAB identity NOT VERIFIED until its own comparison passes.

## Cloudflare Pages environment variables

Set these in the existing `legendstudy-lab` Cloudflare Pages project for both the production environment and any deliberately enabled preview environment. Store the values in Cloudflare environment configuration; do not commit them to source files.

| Variable | Required | Value / format | Purpose |
|---|---:|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `https://stlhijzpjfgwwdgunlsd.supabase.co` | Public LegendStudy Supabase project URL. The client rejects any other URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Current `sb_publishable_…` key from the same project | Browser-safe Auth client key. Never substitute a `service_role` key. |
| `NEXT_PUBLIC_SUPABASE_AUTH_PROVIDERS` | No | Comma-separated configured providers, for example `google` | Controls which social buttons are shown. Supported values are `google`, `apple`, and `kakao`. Leave unset until the provider is actually enabled and verified. |
| `NEXT_PUBLIC_SITE_URL` | Existing | `https://lab.legendstudy.com` | Canonical metadata and redirect origin. |

> `NEXT_PUBLIC_*` values become part of the browser bundle. They must contain only public configuration. Do **not** store service-role credentials, database passwords, payment secrets, app signing secrets, or private OAuth secrets in the repository or browser build. The only new exception is the specifically scoped Kakao server runtime secret binding above.

## Supabase Auth URL configuration

The existing Production configuration uses the Auth **Site URL** `https://lab.legendstudy.com` and these production redirect paths:

- `https://lab.legendstudy.com/login/**`
- `https://lab.legendstudy.com/reset-password/**`
- `https://lab.legendstudy.com/account/**`

For local development, register only an intentional local origin such as `http://localhost:3000/**`; do not use broad production wildcards. The production paths are used for email confirmation, password reset, and enabled OAuth providers.

## Email and social authentication

Email/password authentication is the baseline. Hosted Supabase projects commonly require email confirmation; the signup UI therefore reports confirmation as a pending state rather than promising an immediate session. Password-reset requests intentionally return the same user-facing response whether or not an address exists, to avoid account enumeration.

The production provider configuration and logins for Google, Kakao, and Apple have been verified for LAB web. For any future provider, verify its Supabase setting, provider-console redirect, consent text, and Production login before adding it to `NEXT_PUBLIC_SUPABASE_AUTH_PROVIDERS`. A configured list item only controls visibility; it does not create provider credentials.

## Current implemented boundaries

- `/login/`, `/signup/`, `/forgot-password/`, and `/reset-password/` are public auth routes and carry `noindex` metadata.
- `/account/` is session-aware: it presents a sign-in entry to an anonymous visitor and a minimal identity connection state to an authenticated visitor.
- Public LAB information and catalog routes remain public. Existing essay, evaluation, and My routes are still clearly marked as mock/foundation content and do not save user data.
- Sessions use the Supabase browser client’s persistent local storage. No LAB application token, email, password, answer, or evaluation is written to a new server or table by this change.
- Account deletion remains a policy foundation only; this change does not create a deletion request endpoint or alter the existing LegendStudy data-retention model.

## Deployment setup reference

These are configuration references for future environment maintenance; the LAB web Production E2E above confirms the current deployment and provider settings have already been exercised. Never paste secret values into this file. A dedicated expired recovery-link check is not included in the reported Owner E2E, so track it separately if required by a future release acceptance plan.

Account deletion remains an unfinished operational feature. Approve privacy-policy and deletion procedures before representing either as a live service; Apple revoke is specifically a Store Release Gate.
