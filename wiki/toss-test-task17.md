# TASK17 — isolated Toss TEST recovery

2026-11-02. Branch `codex/toss-test-task17`, isolated worktree `/Users/woojinchang/development/legendstudy-toss-test-task17`, base WEB843f3a8. APP39 binary source a0aa618 / release branch aa4c2e4 preserved, including untracked supabase/.temp. WEB origin fetched and baseline matched; no dirty source changes copied. Managed-worktree API rejected cross-project sourceRoot, so standard Git worktree was used.

Canonical APP Wiki AGENTS/index/current-status/payment foundation and WEB existing Toss review docs read. WEB has no index/current-status canonical files; its feature Wiki supplements the unified APP Wiki, not a replacement.

Existing payment implementation is retained. `/payments/test/` wrongly enabled only TEST runtime, excluding the existing REVIEW runtime even for server-authorized reviewers. Now REVIEW is allowed only with `consumer_purchase=true`; LIVE/PAUSED/NOT_READY and unauthorized REVIEW stay disabled. Existing server allowlist, TEST order mode, no spendable grant rules remain unchanged. No API/ledger/schema/auth/payment-provider change.

Tests: payment server/checkout/runtime/test-entry 123 PASS; TypeScript PASS; changed-file ESLint PASS; Next production build PASS. Initial symlinked node_modules build failed outside Turbopack root; local cloned dependencies fixed it. This is not a provider/payment E2E PASS.

Production before change: canonical deployment9b7a63ba-448b-498e-acf3-705f7b821040. POST /api/payments/runtime returns PAYMENT_NOT_CONFIGURED/NOT_READY. Project and canonical metadata retain REVIEW, PAYMENT_ENABLED=true and expected origin/MID/key-family; secret bindings are redacted in API. Thus their actual validity cannot be inferred from listed binding names. Existing credentials were not replaced. Wrangler OAuth refreshed normally; no broader access granted.

Deployment uses existing artifact-overlay method, replacing only payments/test HTML/RSC and adding immutable new Next assets. All other routes, existing compiled API bundle/environment/headers/redirects remain preserved. Snapshot and manifest stored privately under /Users/woojinchang/.codex/legendstudy-backups/task17. Production deployment and browser evidence to follow. Runtime configuration recovery and authenticated TEST approval E2E remain unresolved; do not call restoration complete.

Rollback: restore prior Pages production deployment9b7a63ba; no DB rollback or APP rebuild. Commerce/social development must use another branch. Real payments, Credit grants, evaluation Provider calls0.

## Production checkpoint

Source3e6022245ab4f576432e5b3a92fb44a86a64e18b, deployment **2b5b0656-5b53-49e3-bad4-94fc4699bb15**. Canonical production deployment success independently re-read; production configuration byte-equivalent to snapshot. Overlay1170→1178 manifest entries,12 changed/new assets; essay pages changed0. Actual https://lab.legendstudy.com/payments/test/ renders four TEST buttons disabled, real-charge/no-spendable-Credit disclaimer and policy/support navigation. Screenshot /tmp/task17-production.png. Runtime still PAYMENT_NOT_CONFIGURED/NOT_READY, so **DEPLOYED / PARTIAL**, not TEST payment restoration complete. No order/confirm/payment invoked. Need verify existing server TEST secret, finance capability and reviewer allowlist values in the authorized configuration source; binding-name presence/redacted metadata does not establish validity. No secret value requested in chat or guessed. Rollback9b7a63ba remains available.

## Continuation preflight — 2026-11-02 09:34 KST

Historical preflight instruction, superseded by the environment recheck below: Owner key rotation is now ON HOLD. No keys in chat. Account `b9d221b20fdf8b9a9a8df0971a6b2347` → Workers & Pages → `legendstudy-lab` → Settings → Variables and Secrets → **Production**. Update `TOSS_TEST_CLIENT_KEY` (`test_ck_…`) and encrypted `TOSS_TEST_SECRET_KEY` (`test_sk_…`) from the same `leglabn24k` API individual-integration merchant. Widget/group `test_gck_`/`test_gsk_` keys do not satisfy this runtime. Redeploy after saving; do not rebuild/deploy unrelated routes.

Keep `PAYMENT_MODE=REVIEW`, `PAYMENT_ENABLED=true`, origin `https://lab.legendstudy.com`, existing Production payment DB and reviewer allowlist. REVIEW is TEST provider/persistence on the real review domain; changing this project to plain TEST would require the separate TEST origin/DB and fail configuration validation. No LIVE keys or activation. Finance token and reviewer subjects remain secrets; API redaction cannot prove their contents/validity.

Cloudflare read-only API reconfirmed canonical deployment `2b5b0656-5b53-49e3-bad4-94fc4699bb15`, with the expected configuration names/types in both project and deployment. Runtime HTTP503 `PAYMENT_NOT_CONFIGURED`/`NOT_READY` reproduced with browser user-agent. This is a local configuration guard, not proof of a Toss authentication failure. Initial Python default-user-agent request was Cloudflare403/1010; not counted as payment evidence.

Read-only Production DB baseline at `2026-11-02 00:34:22.785853+00`: configuration TEST; TEST orders11, PAID/TEST_RECORDED/no-grant3, TEST grant links0, LIVE orders0. Credit grants35, transactions124. Ordered full-row MD5 digests for before/after integrity comparison: LIVE orders `d41d8cd98f00b204e9800998ecf8427e`; grants `2fd5855c56ac54fb2d22120c3e7377e2`; transactions `8bdfd595021a08028984ae23c0e54eb4`. These are aggregate evidence, not a backup. Re-baseline immediately before payment; investigate legitimate concurrent activity rather than claiming unchanged totals prove lineage.

Public HTTP200: `/`, `/pricing/`, `/payments/test/`, `/payments/checkout/`, `/payments/success/`, `/payments/fail/`, `/terms/`, `/privacy/`, `/refund/`, `/support/`. Page reachability does not prove callback or approval success. Existing payment suites123 PASS.

Historical pending plan (superseded below): Owner key registration, then fresh configuration-preserving deployment, authenticated reviewer checkout, TEST approval/callback, failure flow, PAID/TEST_RECORDED/grant NULL and CONFIRM SUCCEEDED verification, payment-linked Credit delta0 and existing LIVE/credit row integrity comparison. Preserve TEST audit rows; no deletion, manual Credit, SQL changes or LIVE activation. Re-submission report is **NOT READY** until these gates pass. No email or external re-submission sent.

Official setup references: [Cloudflare Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/) and [Toss API keys](https://docs.tosspayments.com/reference/using-api/api-keys).

## Environment recheck — 2026-11-02 09:40 KST

Owner corrected the next step: inspect the existing payment-test project before any rotation/re-registration. No new keys are requested. Reuse the existing TEST environment when verified, keep LAB LIVE disabled, and make only changes needed for re-review.

| Verified item | LAB | Existing payment-test |
|---|---|---|
| Cloudflare project | `legendstudy-lab` | `legendstudy-lab-payment-test` |
| Canonical deployment | `2b5b0656-5b53-49e3-bad4-94fc4699bb15` | `bb59b083-c33a-46ee-9eae-2374c086c26f` |
| Deployment source | TASK17 `3e602224` (Nov02) | `713f01c6`, `manus/toss-review-ready-1` (Oct06) |
| Production PAYMENT_MODE | REVIEW | TEST |
| PAYMENT_ENABLED | true | true |
| PAYMENT_ORIGIN | `https://lab.legendstudy.com` | `https://legendstudy-lab-payment-test.pages.dev` |
| PAYMENT_SUPABASE_URL | `https://stlhijzpjfgwwdgunlsd.supabase.co` | `https://wsnrwklplnunjktyfmbr.supabase.co` |
| Reviewer allowlist metadata | present | absent (plain TEST does not require it) |
| Anonymous runtime POST | HTTP503 PAYMENT_NOT_CONFIGURED | HTTP200 TEST/TEST/consumer_purchase=false |

Both project settings AND canonical deployment metadata agree with this table. Neither project's Preview settings contain payment mode/origin/DB. The Owner-observed REVIEW/real-domain combination matches LAB, not payment-test's currently measured Production setting. Existing TEST client keys match byte-for-byte (values not output), MID matches. Secret bindings are encrypted/redacted, so equality/validity cannot be inferred. LAB's non-secret config checks pass; remaining secret-binding/runtime checks are unresolved. No remote config, keys, deploys, DB settings or schema were changed.

Exact failing URL: `POST https://lab.legendstudy.com/api/payments/runtime`, JSON `{}`, same-origin header; HTTP503 NOT_READY. Also reproduced on LAB pages.dev alias (not a supported payment origin). APIs run on each URL's own Pages project through its deployed Functions; the frontend calls relative `/api/payments/*`. No forwarding from LAB to payment-test was introduced. TASK17 was deployed to LAB only, not to the existing payment-test project.

### Existing TEST checkout evidence

Browser existing TEST login reused. `https://legendstudy-lab-payment-test.pages.dev/payments/test/` → 1 Credit TEST4900 → TEST DB order `71562f30-883c-489f-92ac-ff05b702585e`, ORDER_CREATED/NONE/grant NULL. Same-order retry after an initially blank iframe did not create a second order. Official `payment-gateway-sandbox.tosspayments.com` rendered the TEST disclaimer, card choices and Shinhan card authentication. No card number or personal authentication data entered by agent. Owner authentication is pending in the preserved browser tab; no approval/callback success is claimed. The initial blank iframe cleared on one reload/same-order retry; no code change justified.

TEST DB baseline after order creation: modeTEST, orders8, LIVE0, TEST grant links0, grants2/transactions2. Full-row MD5 grants `3968b67b98b33bb9d556366d95305655`, transactions `9dd61311d60a740a905ba523002b3be8`. Earlier existing signup grants remain untouched. Latest order CONFIRM SUCCEEDED count0 at this checkpoint.

TEST success/fail/pricing/refund/terms/support URLs all HTTP200; this is reachability, not approval or failure callback evidence. [Official TEST environment](https://docs.tosspayments.com/guides/v2/get-started/environment) confirms virtual approvals, not actual charges. Card authentication may still require the Owner's real payment-method interaction.

### Re-submission status / minimum remaining scope

Existing TEST request and client-key/SDK path: PASS; TEST server secret/finance approval: PENDING actual confirmation; success and failure callbacks: PENDING; TEST grant/ledger before-after and Production preservation: baseline captured, final comparison pending. Existing TEST path is reusable without re-registering keys; do not migrate its config to REVIEW or use Production identities/tokens against the TEST DB.

LAB REVIEW503 remains a separate unresolved configuration issue. A TEST-domain success alone is not proof of the real service review path: [Toss review guidance](https://www.tosspayments.com/blog/articles/21130) also requires checkout integration on the actual selling site. Keep re-submission **NOT_READY** until actual approval and the real-domain review gate are addressed. Do not send any email or submit this pending report as completed evidence. Current minimum change is documentation correction only; no redeployment needed for the already working TEST request path.

## Owner decision — dedicated payment_review account (2026-11-02)

Supersedes the prior TEST-domain-only continuation. Use existing Production `/pricing/` and its four unchanged prices4900/11900/17900/29900. Only `payment@legendstudy.com` receives `payment_review`; `review@legendstudy.com`, ordinary users and admins remain HOLD. Existing Supabase Auth and server-resolved UUID permission are mandatory; email/UI/user_metadata never authorizes payment. No admin grant, no LIVE activation or spendable TEST Credit.

Read-only Auth inspection: payment account already exists, email confirmed, UUID `6eda61e2-be13-4793-a094-5500309b5b4d`; not in admin_users. Review account is separately identified and non-admin. No account creation/password/email changes needed.

Implementation choice: existing encrypted `PAYMENT_REVIEW_SUBJECTS` is the server-only payment_review permission, set to the dedicated UUID only. Existing `/auth/v1/user` verification gates every REVIEW action (orders/confirm/status and other actions), with no administrator bypass. No new role/schema/auth system. This configuration is distinct from PAYMENT_SUPPORT_SUBJECTS/admin_users. Revocation: set PAYMENT_ENABLED=false and remove/empty the review allowlist, then redeploy existing preserved artifacts; verify purchase=false and order/confirm/status denied. Keep TEST orders/history; never delete the account or ledger as a revocation mechanism. No automatic future activation authorized.

Preservation review7: (1) existing order/event timestamps remain authoritative; (2) TEST/payment/Credit history retained; (3) allowlist changes current capability only, no history UPDATE; (4) canonical auth.users UUID reused; (5) payment authorization is separate from learning/admission facts; (6) one account only, no admin or new personal-data collection, existing retention unchanged; (7) permission boolean is not a financial outcome or analytical fact.

Local139 tests PASS including preparation/approval/status anonymous and unprivileged/admin/email-spoof denial, revoked-session denial and REVIEW TEST_RECORDED/no Credit endpoint. Configuration-only deployment script snapshots remote state, checks exact current deployment/manifest, PATCHes only PAYMENT_REVIEW_SUBJECTS (never redacted secrets), and preserves every asset and compiled API byte. Production application/E2E results follow; not yet COMPLETE.

## Dedicated account deployment checkpoint — 2026-11-02 09:57 KST

PARTIAL / FINANCE_BINDING_MISSING, not E2E complete. Existing confirmed payment account reused; no new Auth user/password/admin grant. PAYMENT_REVIEW_SUBJECTS updated to its one UUID via narrow Cloudflare PATCH. Config-only deployment `834eae8c-ebb4-4a0e-9e50-560ff86e770a` preserved assets/API. It did not resolve pre-existing503.

Bounded configuration diagnostics were added without returning any value, token, prefix/length or user identity. Latest verified Production deployment **ed3c8c8b-4dfb-4373-b63b-aff40afa307b**, source **d326e67ff02b1aa9a46d8251d05d65b16f68b18e**. Actual response: CONFIG checks client_key_family=true, secret_key_family=true, merchant=true, finance_present=false, publishable_present=true. Therefore PAYMENT_FINANCE_TOKEN is missing/empty in the actual LAB runtime. Toss TEST key format is valid; provider secret validity/approval remains untested. No TEST key re-registration needed on this evidence. Restore the existing Production-specific finance credential through the authorized secure source; never copy the separate TEST DB token or substitute service_role. Local narrow search found no existing finance credential in the task/release .env files or ~/.config/legendstudy.

The diagnostic overlay replaces only the compiled config validation function; all1178 static assets exactly equal the prior manifest, other API functions/headers/routes preserved. No pricing markup, price, authority bypass or ledger code change.139 tests plus the new secret-redaction case =140 PASS; final server104 PASS and TypeScript PASS. Existing branch push auto-builds Preview. Pages returned existing Preview76374300 twice for an already-built SHA despite the requested main branch; neither was promoted. A new committed SHA deployed BEFORE push yielded the verified Production ID above. No source/hash fabrication.

Owner logged into the prepared isolated browser. Account page visibly identifies payment@legendstudy.com; pricing shows existing prices and disabled payment with configuration-unavailable notice. Browser session remains available. Authenticated REVIEW-specific acceptance is blocked by config, so do not label A/B/C/D live authorization complete. Local A/B/C/D boundary tests pass; actual anonymous API503 and payment-account UI HOLD are confirmed. General/admin live session acceptance and actual TEST confirm/success/failure remain pending finance restoration.

Production integrity at09:57: TEST orders11/recorded3/grant links0, LIVE orders0 unchanged. Original grants35 and transactions124 full-row hashes exactly match09:34 baseline. Total now grants37/transactions126: two new signup_bonus_v1 entries sum+6 (reserved0), not payment purchase grants. Do NOT claim total Credit is unchanged or delete legitimate signup history. Payment-attributable grant0 and pre-existing rows unchanged; no TEST request was sent on Production during this phase.

Login path: `https://lab.legendstudy.com/login/` → payment account → `/pricing/`. No credential included in Git/report. For review completion, recover finance binding, redeploy preserved artifacts against a fresh snapshot, validate all four identities then one TEST approval and failure flow, verify TEST_RECORDED/grant NULL/one confirmation and before-after lineage. Disable review after review ends via PAYMENT_ENABLED=false plus empty review subjects and redeploy; keep order records and ordinary HOLD. LIVE still prohibited. No external submission/email sent.

## Finance binding diagnosis — 2026-11-02 10:10 KST

Owner prohibits deletion/replacement of existing Secrets, ledger/Credit mutations and LIVE activation. Registration confirmed by Owner and independent API metadata. Earlier wording “missing/unregistered finance secret” was too broad: `finance_present=false` alone only established a falsy runtime value. No additional registration request is made in this follow-up.

Current verified LAB deployment **88a28465-0c5f-46ad-b76c-9323b3dfd606**, Production, source **fccff254bb933e2f4d786f576360a06c0f34ddce**. Project and deployment both contain secret_text metadata for PAYMENT_FINANCE_TOKEN and PAYMENT_REVIEW_SUBJECTS. Exact Production configuration comparison before/after TRUE; all1178 static assets unchanged. Only the existing config diagnostic was extended to booleans distinguishing omitted vs empty bindings.141 payment/checkout/runtime tests PASS; TypeScript PASS. No new authorization or validation bypass.

Actual `POST https://lab.legendstudy.com/api/payments/runtime` HTTP503:
- finance_key_present=true
- finance_is_string=true
- finance_is_empty_string=true
- reviewer_key_present=true, reviewer_nonempty=true
- TEST client/secret family, MID and publishable-presence checks=true

No secret value, token claims, length or prefix is logged/returned. This establishes an **existing runtime property delivered as an empty string**, not a missing variable name and not a rejected Supabase token. Pages context.env is passed unchanged to payment(); the compiled Worker has no overwrite/default for this field. A fresh deployment preserving all settings reproduces the empty string. API metadata redacts secrets; it cannot distinguish an empty encrypted value at rest from a Cloudflare secret materialization problem. Neither origin is proven. Do not claim a Cloudflare bug or require new Toss keys.

Supabase read-only verification: payment_process EXECUTE is allowed for essay_finance only among anon/authenticated/service_role/essay_finance; the first identity guard requires non-null essay_private.uid(), which also checks account restrictions. Normal RPC credential validation occurs at PostgREST (signature/expiry/role), then function identity and order-mode checks. Empty runtime token fails CONFIG before any RPC/provider call. A nonempty invalid token would instead reach the FINANCE_RPC diagnostic (e.g. HTTP401/PGRST301); that is not the current observed failure. Existing functions and ACLs were not modified.

Existing payment-test runtime remains HTTP200 TEST/TEST; no change or new order/approval was made there. Its earlier card authentication flow remains incomplete, not E2E PASS. Production DB modeTEST/orders11/LIVE0/TEST grant links0; original grants35/transactions124 hashes still match baseline. No Credit/payment writes in this diagnosis.

Outcome: runtime failure boundary narrowed; **recovery remains BLOCKED** under the no-Secret-change constraint. Current binding supplies no usable finance credential, and the application cannot reconstruct a token or safely substitute another project's token. Existing configuration was reused and redeployed without fixing the empty delivery. A secure existing-value recovery or Cloudflare-side investigation remains necessary, but neither a new Secret request nor replacement/deletion was performed. HOLD and permission checks remain intact. Resume from a fresh deployment/config snapshot; do not rerun deployment script with its old fixed checkpoint.


## Finance final recovery diagnosis — 2026-11-02 10:25 KST

Production build-only probe77cc3c43-a759-4568-9bb4-96c8c421a2a9 independently observed PAYMENT_FINANCE_TOKEN present/string/empty=true and PAYMENT_REVIEW_SUBJECTS present/string/empty=false in process.env BEFORE application code. Intentional exit73 stopped at build; deploy remained idle. Original pnpm build restored; environment configuration metadata unchanged; canonical Production88a28465-0c5f-46ad-b76c-9323b3dfd606 unchanged. Probe script records only boolean state and identifiers, never credential values. It temporarily changes the project build command; it is not a zero-mutation operation and must not run alongside a release.

All finance references, Pages context.env → payment(request,env) → config and compiled worker agree; no fallback overwrites the token. The failure belongs to Cloudflare-provided configuration, not application default handling. The build-only evidence rules out a problem exclusive to Pages Functions runtime access. Redacted API metadata alone still cannot prove encrypted at-rest contents or a Cloudflare backend defect.

Canonical APP wiki essay-p0-direct-execution-20261023.md records the Oct23 full deployment_configs replay incident: redacted secret_text empty values were PATCHed, and PAYMENT_FINANCE_TOKEN is explicitly in its impact list. Subsequent documented recovery addressed Essay/Math; no finance recovery after that incident was found. This is the strongest documented explanation consistent with today's build/runtime emptiness, not proof of the exact historical write responsible. Do not replay GET deployment_configs; only patch explicitly approved individual fields.

### Safe Owner recovery procedure (not executed)

1. Prefer the original Production finance JWT from the Owner's secure store/issuer. Do not send it in chat, command arguments, logs or Git. Existing token recovery changes neither the signing key nor the financial authority. No recoverable value is available from Cloudflare's redacted API.
2. Before restoring, verify against Production stlhijzpjfgwwdgunlsd with the existing approved read-only payment_process action=get/nonexistent UUID probe. Expected PT404 means the request passed credential/identity checks and found no order; it is not payment approval evidence. HTTP401/PGRST301 indicates invalid signature/expiry; PT401 indicates function identity rejection. Preserve error distinction without logging request headers/token.
3. If the original JWT is expired/unavailable, Owner must use the existing approved Production issuer/signing source, role essay_finance and existing permitted gateway subject with bounded expiry. Current investigation has not established that subject/signing source, so do not invent it or mint from the TEST helper. service_role, TEST-project JWT, reviewer browser JWT and worker JWT are not replacements. Do not rotate the project signing key or change DB ACLs.
4. After Owner approves the concrete credential restoration, Owner enters only PAYMENT_FINANCE_TOKEN at Cloudflare → Workers & Pages → legendstudy-lab → Settings → Variables and Secrets → Production, type Secret. Save an existing verified value; leave payment-test and every other setting unchanged. This is restoration of an empty value, not a request to add an absent variable. Never delete/recreate all Secrets.
5. Redeploy the preserved current production artifact against a fresh configuration snapshot (not a broad main-branch rebuild). Verify canonical deployment, finance nonempty and all1178 static assets preserved. REVIEW, TEST keys, exact origin and single payment UUID remain unchanged; LIVE prohibited.
6. Verify unauthenticated/ordinary/admin denial and payment account access at /login/ → /pricing/. Complete Owner card authentication, TEST approval, success/failure pages and TEST_RECORDED/no-grant; compare original ledger hashes and LIVE orders. Only then declare recovery/review submission ready.

Final actual checks: production POST /api/payments/runtime503 CONFIG empty; dedicated payment-test same endpoint200 TEST. Original35 grants and124 transactions hashes match the baseline exactly; LIVE orders0; production TEST orders11 with3 TEST_RECORDED and grant links0. No credential replacement, financial write, provider approval or LIVE activation occurred. Approval E2E remains blocked by the empty credential; neither previous card-window entry nor TEST runtime200 proves it. Source deployment remains fccff254bb933e2f4d786f576360a06c0f34ddce. This diagnosis/runbook does not claim restored service.
