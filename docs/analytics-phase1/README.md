# Analytics Phase 1 — Owner review package (2026-11-02)

Implementation only; **NOT DEPLOYED / live Data API and event receipt NOT TESTED**.
APP41, Auth settings, DB/Credit/Ledger/payment/Provider are unchanged.

## Existing infrastructure and exact external blockers
- Google Cloud **LegendStudy**, project `legendstudy`, number `559697965317` confirmed in signed-in Console.
- Enabled APIs list (22 entries) does not contain Analytics Data API. Analytics Hub API is a different API.
- Credentials page shows **no service accounts**. Existing login OAuth clients must not be modified or reused for this server permission.
- Existing GA4 property `396674471`, measurement `G-295EQHYTCK`, stream `5829568136` is preserved.
- LAB property not found in the accessible account during Nov1/Nov2 audit; no assertion about other accounts. Existing home/LAB adapters are disabled pending approved measurement IDs/privacy review.
- No credentials were generated; no permission/API/GA/Cloudflare setting was changed.

## Server read connection to approve
1. Enable `analyticsdata.googleapis.com` in the **existing legendstudy** project.
2. Create a dedicated `legendstudy-ga4-reader` service account (proposed name, not an existing credential). No project Editor/Owner role and no login OAuth changes.
3. Grant that identity **Viewer only** on existing GA4 property 396674471. No domain-wide delegation.
4. Configure server-only secrets `GA4_SERVICE_ACCOUNT_EMAIL` and `GA4_PRIVATE_KEY` in the approved Cloudflare environment. Use secure secret input; never paste private key into chat/Git/NEXT_PUBLIC variables. Prefer a future short-lived workload identity when available; this adapter currently supports RS256 service-account token exchange.
5. Preview origin must be explicitly set with `GA4_REPORT_ORIGIN` (exact origin). Default is lab.legendstudy.com; arbitrary origins and cross-origin requests fail closed.
6. Existing `NEXT_PUBLIC_SUPABASE_URL`/publishable key authenticate caller and call **existing admin_operator**. No service role, new RPC or DB migration. Google is contacted only after admin authorization.
7. Verify with actual admin/non-admin tokens, then Owner UI review. Production deployment remains separately gated.

## Report contract
- GET `/api/admin/ga4?from=YYYY-MM-DD&to=YYYY-MM-DD`, inclusive dates, <=400 calendar days; no arbitrary property/query/dimension access.
- Fixed property/stream plus legendstudy.com/www.legendstudy.com host filter prevents accidentally mixing LAB/home later.
- activeUsers, newUsers, sessions, screenPageViews from GA; returning uses totalUsers filtered by newVsReturning=returning, **not subtraction**. Do not sum distinct-user series or new+returning.
- Daily series <=400 rows. Channel and page rankings top20 (rowCount/limited shown). GA property timezone is returned; if not Asia/Seoul the UI warns, never silently relabels it KST.
- TASK15 4 event names filtered in the report. Missing rows mean NOT_COLLECTED/unconfirmed, not proven zero. Google report latency, thresholding, sampling, other-row loss are shown.
- No page titles, query strings, user IDs or raw referrers returned. Public numeric article/category/tag paths allowed; others masked. HTML is rendered as React text.
- Installation remains NOT_AVAILABLE. Store split requires actual `store` custom dimension registration/validation; eventCount alone cannot assign store or installs.
- Existing server signup/evaluation/payment reports and their scopes are unchanged.
- Credential/token exchanges are server only, readonly scope, 5-minute JWT, fixed Google URLs, timeout, no redirects, no raw upstream error leakage, no shared report cache.

## TASK15 exact replacement — Owner applies only
File: `promo-track-replacement.js`.
Tistory skin HTML -> existing TASK15 app promotion modal script -> section
`/* ===== GA4 안전 전송 (미설정 시 조용히 무시) ===== */`.
Replace only existing `function track(name, params) { ... }` with this file's block.
Do not replace the entire skin, SDK loader, config, show/dismiss/snooze/onCta/onBadge,
CSS, modal text, store URLs, 15-day hide policy, or midnight snooze logic.

The existing fallback pushed an Array. Replacement uses the Google `arguments`
command shape, targets the existing G-ID, queues safely before gtag exists,
allowlists parameters and suppresses duplicate callback delivery per event per document.
It does not create another GA tag or force page_view. A queued command is not proof
of receipt. Without the existing Google tag actually loading, it remains queued.

Before applying: Owner skin backup. After applying: actual mobile Safari/Chrome
show -> click (single callback), separately dismiss/snooze using test-browser state;
inspect outgoing request and GA Realtime/DebugView. Avoid repeated production
click tests; they affect real telemetry. Current actual mobile receipt is BLOCKED
until Owner applies the skin patch. Local tests never contact Google.

## LAB and home — Owner direction after Wiki re-audit
Nov2 Owner directs reuse first, and if absent prepare separate LAB/home web streams
inside existing property 396674471. This is NOT approval to create streams or change
production settings. Full Wiki search found no completed LAB/home stream creation
record; live property All streams shows only 5829568136 (legendstudy.com). Other
accounts remain outside verified scope. Do not copy the main site G-ID blindly or
alter its enhanced measurement.
LAB: NEXT_PUBLIC_ANALYTICS_ENABLED / NEXT_PUBLIC_GA4_MEASUREMENT_ID /
NEXT_PUBLIC_GA4_ALLOWED_ORIGINS / NEXT_PUBLIC_GA4_PRIVACY_REVIEWED.
Home: HOME_ANALYTICS_ENABLED / HOME_GA4_MEASUREMENT_ID /
HOME_GA4_PRIVACY_REVIEWED (existing build.mjs).
Keep flags OFF until approved stream, enhanced-measurement and privacy review.
Native Firebase is out of scope; APP41 stays unchanged.

## Owner review / rollback
Local UI paths: `/admin/data/visitors/`, `/admin/data/installs/` with existing admin login.
Review real data only after secret setup; tests use synthetic fixtures explicitly.
No preview/live figures should be called real reception until Google API succeeds.
Rollback before deployment: revert this WEB change. After a later approved deployment:
restore prior Cloudflare deployment and disable only new read-connection secrets;
restore Owner's skin backup for modal change. Never delete GA property/event history.

## Preservation review (canonical strategy seven questions)
1. Marketing events and retrieval timestamps remain distinct from signup/learning facts.
2. GA remains source; response exposes property/stream/date/timezone/fetchedAt.
3. No raw UPDATE, deletion, backfill or new database is introduced.
4. Existing identity only authenticates admin; no student identity join or transmission.
5. Marketing telemetry is not Learning/Decision/Outcome or authoritative completion.
6. Admin gate + readonly Google scope; no answers/PII; existing consent/retention settings unchanged.
7. Derived reports stay transient, with limitations, rather than becoming a second ledger.

Canonical background: APP Wiki admin-integrated-analytics-task10.md and
analytics-v1-implementation-20261030.md. APP Wiki update is in a separate docs branch,
not the APP41 release branch.

## Verification
WEB TypeScript and production build PASS; Vitest 1600 PASS / 4 SKIP; lint 0 errors / 5 pre-existing warnings. Tests use fixtures, not Google receipt. Production DB read-only catalog confirms 7 analytics reports plus analytics_admin_check and migration 20261101115715 admin_analytics_readonly_task11g. No DB writes.

## Owner-created streams — November 2 follow-up
Owner confirms property396674471 now contains:
- main: G-295EQHYTCK /5829568136 (unchanged)
- LAB https://lab.legendstudy.com: G-MVHZ7HS214 /16254992877
- home https://home.legendstudy.com: G-S4JZMP0141 /16255062112
This supersedes the earlier one-stream observation; it is an Owner-reported configuration, not a receipt test.
Both new streams have Enhanced Measurement ON. Existing runtime requires reviewed automatic measurement OFF (manual page_view, sanitized URL/referrer, no forms/admin routes). Do not set PRIVACY_REVIEWED=true merely because an ID exists. Owner approval to disable EM only on the two new streams is pending; existing main stream stays unchanged.
Exact build inputs are in config/lab.env.candidate and config/home.env.candidate. These are not auto-loaded and remain OFF pending review. No environment or production deployment changed. After EM/privacy verification, enable collection and reviewed flags only in the approved test build. A real-origin preview/test plan and Owner review precede production rollout. Preview origins are not silently allowed; the home runtime intentionally allows only its production origin.
Use existing page_view, essay_lab_view and banner_click; do not introduce alternate names or treat store clicks as installs. Verify exactly one page_view per navigation, actual Google tag load, and DebugView/Realtime receipts separately. No fake signup, evaluation or payment event may be emitted as a test of business completion.
Data API reader remains restricted to main stream; adding LAB/home reports requires explicit source selection and tests, not summing unique users. Server API/Viewer/secret configuration still pending.

## Latest Owner decision: Enhanced Measurement stays ON; server authentication
This section supersedes earlier OFF proposals. Keep Enhanced Measurement on both new streams and preserve manual Analytics v1 business events. No GA console settings have been changed. Check initial config page_view, history page_view, manual page_view separately. Google documents that send_page_view:false does NOT suppress Enhanced Measurement history pageviews: https://developers.google.com/analytics/devguides/collection/ga4/views . Existing runtime manually sends on each pathname, so SPA navigation is an overlap risk; it is not yet an observed live duplicate. Do not mark privacy review or delivery complete. Automatic forms, search terms and sensitive routes also require payload checks before production.

Google Cloud Console confirmed analyticsdata.googleapis.com ENABLED on legendstudy on Nov2. Owner confirms service account legendstudy-ga4-reader@legendstudy.iam.gserviceaccount.com and property396674471 Viewer. No JSON key exists yet per Owner.

Keyless feasibility: Google WIF requires an external trusted identity token (OIDC/SAML/etc.), not just a service account email. No such issuance/federation exists in this repository/deployment design. Reviewed Cloudflare Pages bindings do not establish an ambient Google-compatible workload token. This is not a claim that keyless integration is impossible: an external IdP or Google-hosted attached-service-account backend could provide it, but would add infrastructure/authentication/deployment scope. GitHub CI OIDC is not a persistent Pages runtime credential. Recommend existing service-account JWT flow for Phase1; revisit federation later.
Sources: https://docs.cloud.google.com/iam/docs/workload-identity-federation ; https://developers.cloudflare.com/pages/functions/bindings/ .

### Exact Owner action
1. Google Cloud project legendstudy > IAM & Admin > Service Accounts > legendstudy-ga4-reader@legendstudy.iam.gserviceaccount.com > Keys > Add key > Create new key > JSON. If organization policy prohibits keys, do not bypass it; return to federation design.
2. Save outside all repositories. Do not paste JSON/private_key into chat or screenshots. Provide only its absolute local path so Codex can validate project_id/client_email/type without printing secrets and perform the approved server read test.
3. Current adapter expects two separate server bindings, NOT an entire JSON blob: GA4_SERVICE_ACCOUNT_EMAIL=client_email, GA4_PRIVATE_KEY=decoded private_key PEM (BEGIN/END included). It supports literal escaped newlines too. JSON project_id/private_key_id are not required runtime fields; never put these credentials in NEXT_PUBLIC_*.
4. For an approved private preview: Cloudflare Workers & Pages > legendstudy-lab > Settings > Variables and Secrets > Preview; add both bindings, private key type Secret/encrypted. Configure GA4_REPORT_ORIGIN to exact approved preview origin. Preview settings can cover multiple preview branches, so do not attach the key to an untrusted/shared preview environment; use a dedicated review project if needed. Do not add to home or legendstudy.com projects.
5. Production secret configuration/deployment waits for Owner review. A secret is a runtime binding, not proof of API success. New deployment is needed to use changed bindings. Existing Supabase admin gate remains required; no service-role key.
6. Verify authentication/read responses and permission failures, then actual admin UI. Never log JWT/access token/private key. For rollback revoke/remove the new server credential and restore prior deployment; retain GA data and existing OAuth clients.
Sources: https://docs.cloud.google.com/iam/docs/keys-create-delete ; https://developers.cloudflare.com/pages/functions/bindings/#secrets .

## Service-account key connection verified — 2026-11-02 23:20 KST
Owner supplied a local JSON and explicitly authorized Cloudflare Secret registration. This supersedes the prior key-not-created/credential-blocked status. JSON identity matches legendstudy-ga4-reader@legendstudy.iam.gserviceaccount.com, project legendstudy, service_account type and PKCS8 format. Original JSON was read only; no key/token/JSON was printed or committed.

Existing googleToken() authenticated with Google successfully. Existing handleGaReport() then returned HTTP200 for all report requests using real Google data; only its local Supabase authorization boundary was a fixture. This is NOT live administrator authorization or production UI acceptance. Period 2026-11-01 through2026-11-02 inclusive, property396674471, main stream5829568136 and main-site hosts, timezone Asia/Seoul, fetched2026-11-02T14:20:15.867Z:
- activeUsers12795; newUsers8493; sessions26978; screenPageViews49837; filtered returning totalUsers4922.
- daily2 rows, channels7, pages top20. No sampling/thresholding/other-row loss reported. Current-day totals can change.
- Four app_promo_* event report has no rows: actual receipt remains unconfirmed, not proven zero activity. LAB/home event receipt is not covered by this main-site report.

Cloudflare account b9d221b20fdf8b9a9a8df0971a6b2347 / Pages legendstudy-lab / custom domain lab.legendstudy.com verified. Production-only GA4_SERVICE_ACCOUNT_EMAIL plain_text and GA4_PRIVATE_KEY secret_text added through a narrow project PATCH. Before/after comparison verified all43 pre-existing production bindings unchanged and Preview configuration unchanged. No credential copied into Preview or other projects. Canonical deployment remains bd8f7da4-9565-49aa-bec5-8fc8cbe69c4d. Secret registration is NOT deployment or runtime receipt verification.

Focused server/admin-component tests:25 PASS,2 files; fixtures cover anonymous/non-admin rejection, origin/date validation, error states and Google JWT contract. Runtime code unchanged. Existing administrator visitors/installs UI consumes this response contract but production login→report rendering remains NOT_TESTED pending Owner-approved deployment. Owner approval is required before deploying the recovery branch. APP41/Auth/DB/Credit/payment unchanged.

Rollback of this configuration-only step: remove only the two new GA4 bindings; do not replace deployment_configs or delete existing secrets. If abandoning the connection, revoke the newly supplied service-account key through Owner-controlled Google IAM. Preserve source JSON and GA history. Deployment rollback after approval uses the recorded prior artifact.

## Owner-approved production reporting rollout — 2026-11-02
**DEPLOYED / VERIFIED** for visitors and installs report screens only. Approved baseline369b7d9; final runtime SHA c9bda913cb26784fb8e3755a5fbc48cc446ab266 contains the minimal Workers compatibility correction described below. Final Cloudflare production deployment **aaf80a93-c43f-4de0-afde-69d8f7ecb67e** on lab.legendstudy.com. Prior/rollback artifact **bd8f7da4-9565-49aa-bec5-8fc8cbe69c4d**.

Initial e97587f7-4938-4126-8c43-8b759887a5b5 failed real admin reporting: Workers rejects fetch redirect:error. Rolled back successfully to prior artifact, reproduced locally in workerd, replaced only this module's fetch options with redirect:manual. Existing non-2xx checks reject redirects without credential forwarding. Added redirect regression coverage;26 focused server/UI tests PASS,TypeScript PASS; Node22 production build PASS. No API/GA/RLS permission widening. First build through pnpm used Node24 shim; final static artifact rebuilt directly with Node22.

Deployment overlays only /admin/data/visitors/ and /admin/data/installs/ plus their RSC files and new hashed static assets. Adds exact /api/admin/ga4 worker route; original21-route compiled worker retained byte-for-byte as separate baseline module. Manifest comparison:10 existing page/RSC files changed,1236 other existing assets unchanged;11 new hashed assets. Production and Preview settings byte-equivalent before/after. No collection flags enabled. Private config/manifests/compiled modules/deploy script/plan and screenshot: /Users/woojinchang/.codex/legendstudy-backups/ga4-reporting-20261102. No private material committed.

Actual logged-in production administrator verification:
- visitors CONNECTED, all5 KPI metrics plus daily/channel/page tables render; installs menu also CONNECTED while installation stays NOT_AVAILABLE.
- Recent7days Oct27–Nov2: active42501/new30755/sessions101893/pageviews183259/returning15246, observed23:45KST.
- Today Nov2: active6190/new3958/sessions13085/pageviews23294/returning2394, observed23:46KST.
- Custom Nov1–Nov2: active13017/new8607/sessions27354/pageviews50556/returning4992 at23:47:37KST. Scope remains main stream5829568136/host and Asia/Seoul. Current-day numbers may change; independently fetched reports need not form an atomic snapshot.
- Empty custom dates show validation rather than stale/zero metrics. Actual invalid date entry was corrected through native date controls; browser automation fill alone did not populate this native input.
- Existing conversion page still renders server-source signup62/completed user1/success92.3%, existing payment definition and cohort notes; not GA visitor counts. Its old readiness copy and other non-target pages are unchanged by this scoped deployment. No new ledger accuracy certification.
- Live unauthenticated/invalid token401; foreign Origin403. Ordinary authenticated non-admin denial is covered by tests, not a new live non-admin account test. Initial real runtime error displayed explicit connection error, never zero visitors.

Remaining: four app_promo_* events have no report rows; modal transport/receipt, LAB/home receipt/reporting, native installation attribution remain follow-up and are not deployed here. APP41, production DB/Auth/Credit/Ledger/payment unchanged.
Rollback: Cloudflare Workers & Pages > legendstudy-lab > Deployments > prior bd8f7da4 deployment > Rollback. API equivalent POST /accounts/b9d221b20fdf8b9a9a8df0971a6b2347/pages/projects/legendstudy-lab/deployments/bd8f7da4-9565-49aa-bec5-8fc8cbe69c4d/rollback. Preserve existing settings and GA history. This rollback route was actually exercised successfully after the first attempt.

## Phase 2 collection recovery — 2026-11-03 KST

Owner keeps the Phase1 report deployment aaf80a93 unchanged. Existing 31 events/14 keys,
property396674471 and three streams are reused. No APP41 or DB/Auth/financial changes.

- Live Tistory source still has the ordinary-Array fallback and drops early events if
  dataLayer is absent. Owner chose **code only**: use the exact replacement above;
  no live skin edit is authorized. Receipt remains pending Owner application.
- LAB's actual Google tag has history pageviews enabled. An isolated local browser
  with the existing runtime sent one initial page_view and **two** page_views for
  one /pricing history transition. This is live transport evidence, not production
  receipt. The test generated no signup, purchase or evaluation events.
- Signup was missing from the safe path allowlist. Added /signup without query/hash;
  home.legendstudy.com is now a recognized origin-only referrer. On blocked routes
  an already initialized tag is disabled using the documented ga-disable flag.
- LAB entry now calls existing essay_lab_view at actual LAB entry, with the same
  existing onceKey used by exam selection to prevent duplicate reporting.
- Read-only receipt CLI: scripts/analytics/audit-ga4-events.mjs reads a private key
  path in memory, fixed Viewer identity/property/streams, never logs credentials.
  --realtime returns stream/event counts for the last30minutes; daily reports have
  ingestion delay. It emits no measurement events and is not a new reporting backend.
- Nov3 00:02:46KST daily report Nov2–today: main page_view24232; all requested promo,
  LAB and home rows absent. Absence is unconfirmed receipt, not assumed zero usage.
- Nov3 00:07:27KST realtime: main page_view570/session_start293/first_visit109/other2;
  LAB/home absent. Local sendBeacon observation does not establish GA ingestion.

Automatic measurement remains ON. Individual LAB history/search/forms/outbound/
file options are awaiting Owner decision; do not mark PRIVACY_REVIEWED true for LAB
or activate its production bundle until this check is resolved. Home contains no
forms/search/private routes, has fixed public outbound links and no SPA transitions.
Store banner_click is navigation intent, never installation or purchase completion.

Sources: https://developers.google.com/analytics/devguides/collection/ga4/views
and https://developers.google.com/analytics/devguides/reporting/data/v1/realtime-api-schema .
