# LDP-1 — Quality / Human Review Console Deployment Readiness Preflight

**Status:** READ-ONLY preflight. **NOT DEPLOYED.** No Cloudflare / DNS / env / secret / backend
change. No `legendstudy-docs` change (Codex ADR-2 concurrently active).
**Date:** 2026-10-01
**Decision:** **READY_WITH_FOLLOW_UPS** (deployable now by the Owner; one bounded ADR-2 follow-up).

## 1. Deployment candidate

| | |
| --- | --- |
| Repository | `LC3808/legendstudy-lab` |
| Branch | `claude/quality-console-v0` |
| HEAD | `ce9d04efa1293b9958435835c77e35a6c0e2ec7a` (clean, `== origin`) |
| `origin/main` | `fd4e1fb77748398960691371adafdea266a8b097` |
| main vs HQR | origin/main 0 ahead, HQR **3 ahead** (325a112 LEC · b9cff1b HQP-1 · ce9d04e HQR-1) |
| Reconciliation | **none** — HQR is a strict superset of `origin/main` (contains every landing commit) |

**DEPLOYMENT_CANDIDATE:** `claude/quality-console-v0 @ ce9d04e`. Do not deploy stale `main`.
No merge/rebase/force-push required.

## 2. What would be deployed

The static export (`out/`) **plus** the existing Cloudflare Pages Functions
(`functions/api/auth/kakao/*`) and `_routes.json`. Static `out/` alone is insufficient (Kakao
OIDC exchange runs server-side) — this is the **existing** LAB deployment model, unchanged by
HQR-1. HQR-1 adds only the client-rendered `/ql` Human Review workflow; it introduces no server
route and does not widen `_routes.json` (still `include: ["/api/auth/kakao/*"]`).

## 3. Preflight gate (fresh run, not reused from HQR-1)

| Gate | Result |
| --- | --- |
| Tests (`vitest run`) | **160 passed** |
| Lint (`eslint`) | PASS |
| Typecheck (`tsc --noEmit`) | PASS |
| Boundary audit | PASS (`client_components=15; server_modules=2; blocked_runtime_dependencies=0`) |
| GitHub-ready audit | PASS (`tracked_files=149; prohibited_paths=0; possible_secret_value_files=0`) |
| Static export build | PASS — `/ql` prerendered `○ (Static)` |

## 4. `/ql` route + discoverability

- Builds to `out/ql/index.html` (static); meta `robots: noindex, nofollow`.
- `out/robots.txt` = `Disallow: /` (whole site, pre-launch); `/ql` absent from `out/sitemap.xml`.
- `/ql` is in **no** nav list (`release-routes.ts`, `site-nav.tsx`, `site-shell.tsx`) — not advertised.
- Security does **not** rely on obscurity: the route may exist publicly; authorization is
  enforced by the DB (`is_quality_operator()` + SECURITY DEFINER RPCs).

## 5. Environment variables (names only)

REQUIRED_PUBLIC_BROWSER_ENV: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`NEXT_PUBLIC_SUPABASE_AUTH_PROVIDERS`, `NEXT_PUBLIC_SITE_URL` (all public, already in the LAB
deployment model). Build-time: `NODE_VERSION=22.13.0`, `PNPM_VERSION=11.24.0` (README).

- **SERVICE_ROLE_REQUIRED: NO** · **NEW_SERVER_SECRET_REQUIRED: NO** ·
  **HQP_SECRET_REQUIRED_IN_LAB: NO** · **BENEFIT_HMAC_SECRET_REQUIRED_IN_LAB: NO**.
- HQR uses the existing authenticated Supabase **browser** session: the Human Review client is
  built from `auth.client` (same `getBrowserAuthClient` instance as auth + `ql-read-v1`) and
  calls only `client.rpc` / `client.auth` — no `fetch`, no `createClient`, no `.from()`, no new
  origin. Existing Kakao Function secrets are server-side and untouched by HQR.

## 6. Authorization boundary

Unchanged and backend-authoritative. Signed-out → login gate; signed-in non-operator →
access-denied; operator gate via `is_quality_operator()`; the Human Review UI renders only after
that gate. No profile/school/email/client-role/hidden-UI inference. `QUALITY_OPERATOR_GATE: PASS`.

## 7. Human Review write safety

`submitJudgment` is called at exactly one site — inside the panel's explicit `submit` handler
(form `onSubmit` → confirmation → submit), never in a mount/`useEffect` path (the effect only
*reads* `listJudgments`). Therefore:

- `PRODUCTION_WRITE_ON_PAGE_LOAD: NO` · no background/auto-save/optimistic write.
- `PRODUCTION_WRITE_REQUIRES_EXPLICIT_OPERATOR_ACTION: YES`.
- Ambiguous failure never auto-retries with a new key; FAIL triggers no invalidate/rerun/refund;
  no fixture fallback; no direct table write.
- `NORMAL_OPERATOR_WRITE_RUNTIME: NOT_ASSESSABLE` (no legitimate evaluation case; none created).

## 8. Mock / fixture + bundle secret scan

- `MOCK_PRODUCTION_FALLBACK: NONE`. Synthetic fixtures live only in test files; `out/` contains
  no fixture identifiers or fixture answer/rewrite strings. `REAL_STUDENT_DATA_IN_BUILD: NO`.
- `out/` scan for `service_role` / Supabase secret / JWT / Kakao secret / private key → **none**.

## 9. CSP / CORS / callback

- `CSP_CORS: NOT_ASSESSABLE` from the repository — response headers are Cloudflare Pages
  configuration, not in-repo (`_headers`/CSP not present). **However**, HQR introduces **no new
  origin or endpoint**: Human Review RPCs hit the same Supabase project already used by auth and
  `ql-read-v1`, so no new CSP/CORS allowance is required. Auth callbacks (Kakao Function;
  Google/Apple browser flow) are unchanged. Owner should confirm the live CSP permits the
  Supabase origin (it already must, for existing auth/reads).

## 10. ADR-2 future integration (concurrent, not implemented here)

When the canonical account-deletion pending-state restriction (ADR-2, `legendstudy-app`) lands,
LAB must honor the shared backend's restricted/denied-session semantics for deletion-pending
accounts. **No client-only pending-user bypass** is created now. Classification:
**ADR2_LAB_INTEGRATION = FOLLOW_UP_BEFORE_ACCOUNT_DELETION_PRODUCTION_ACTIVATION** (not blocking
HQR deployment — the backend remains the authority; HQR adds no account-deletion behavior).

## 11. Rollback

HQR-1 is a frontend consumer of already-deployed backend capability. Rollback = redeploy the
previous known-good LAB static artifact/commit. `ROLLBACK_DB_CHANGE_REQUIRED: NO` (no DB/HQP
migration rollback, no student-data mutation).

## 12. Post-deploy smoke plan (non-destructive; for after Owner deploy)

S1 landing loads · S2 signed-out `/ql` shows login gate · S3 signed-in non-operator denied ·
S4 operator enters console · S5 case list loads · S6 empty state correct when no cases ·
S7/S8 detail + Human Review state/history read **only if a legitimate case exists** (else
`NOT_ASSESSABLE` — do not create one) · S9 no write without explicit submit · S10 landing/auth
callback routes healthy. `POST_DEPLOY_SMOKE_PLAN: READY`.

## 13. Findings

| ID | Sev | Evidence | Required before deploy | Follow-up |
| --- | --- | --- | --- | --- |
| F1 | INFO | Local Node 20 vs `engines >=22`; build passed locally; CF Pages uses `NODE_VERSION=22.13.0` | No | Ensure CF build env pins 22.13.0 (already documented) |
| F2 | INFO | `out/robots.txt` = `Disallow: /` (pre-launch, whole site) | No | `/ql` `noindex` is independent and holds even after public launch |
| F3 | MEDIUM | CSP/CORS headers not in repo (Cloudflare config) | No | Owner confirms live CSP allows the Supabase origin (already required by existing auth) |
| F4 | FOLLOW_UP | ADR-2 account-deletion restriction not yet available | No | Honor restricted-session semantics before account-deletion production activation |
| F5 | INFO | Deployment must include `functions/` + `_routes.json` (Kakao), not static-only | Deploy-step | Existing model; unchanged |

No BLOCKER / HIGH findings. No deployment-critical correction required in LAB code/config.

## 14. Decision

**READINESS_DECISION: READY_WITH_FOLLOW_UPS.** The HQR-1 branch is technically deployable to the
existing LAB Cloudflare Pages static-export model with no new secret, no backend change, and the
operator gate + write-safety intact. The only bounded follow-up is ADR-2 session-restriction
integration before account-deletion production activation. Production normal operator write
remains `NOT_ASSESSABLE` until a legitimate evaluation case exists. **DEPLOYED: NO** — awaiting
Owner/ChatGPT authorization.
