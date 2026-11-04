# Dashboard app usage and material rankings

## Scope and current evidence
Owner chose WEB display plus APP integration specification; APP instrumentation, build and release are separate.
App inspected: legendstudy-service-app-20261022 at 80b12ebaa0bb8f6749a52c0cc1634807cfe5d6ca.
- lib/app/navigation_shell.dart: home/materials/study/LAB/MY route selection, no menu telemetry.
- lib/features/content/presentation/content_detail_page.dart invokes touchRecentView.
- lib/features/personal/data/supabase_personal_repositories.dart: recent_views upsert on user_id,content_item_id, not append-only clicks.
- Production recent_views has only id,user_id,content_item_id,viewed_at; no platform or entry source. No general menu telemetry table was found. Analytics launch contract documents client instrumentation as unimplemented.

WEB reuses existing operator-only admin_learning_analytics(p_from,p_to), recent rows already ranked by distinct eligible member count DESC / content ID. No new RPC, DB write, permission change or collection. Existing top10 server limit retained, KST dashboard period and refresh reused.
- Menu TOP3: explicitly NOT_COLLECTED, no invented zero counts or placeholder ranks.
- Materials TOP10: current retained recent-view member counts, not clicks, downloads, searches or APP-library-only events. Repeated views count once per member/material; later views can move records out of prior periods; deleted rows and anonymous views absent.
- Error, loading and empty states are separate.
- This supports relative interest assessment, not chronological journey/funnel or causal marketing analysis.

Read-only production comparison for 2026-10-06 00:00 KST through 2026-11-05 00:00 KST: top counts 26,22,21,19,18,17,16,15,14,13. The first material is 2026학년도 수능 기출. Live counts may change.

## APP handoff specification (proposed; not deployed)
Use first-party narrowly scoped product-usage collection; do not duplicate payment/credit/evaluation facts or use existing recent_views as an event log. Coordinate with canonical APP analytics-p0-launch-contract before implementation.

Events:
| Event | Trigger | Stable target |
| --- | --- | --- |
| menu_select | explicit tap that selects a different app main tab | home, materials, study, lab, my |
| material_open | successfully loaded material detail, once per navigation instance | canonical content_item_id |

Do not record rebuilds/background resumes as clicks. Re-selecting the already selected tab does not count as a new menu transition; a separately defined repeated-tap event could be added only if desired. Opening the same material on a subsequent navigation instance is a new view. Distinguish explicit selection from automatic initial screen/deep link. Do not count failed loads or downloads as views.

Payload allowlist: event_id UUID, event_type, target key or canonical content UUID, source tab (materials/home/bookmarks/recent/search/deep_link), previous menu, session_id (ephemeral), session_sequence, occurred_at, platform ios/android, app version/build, schema_version. Server adds received_at and authenticated subject from auth.uid(); never trust client-supplied account IDs. No essay text, school/name/email, freeform search terms, full URL or financial payload. Guest coverage needs a separate explicit identifier/consent decision; initial authenticated-only coverage must be labeled.

Collection requirements for later APP/backend task:
- Client bounded queue and bounded retry, same event_id on retry, non-blocking failures. Drop expired queue entries under documented retention; do not resurrect another user's queued activity after account switch/logout.
- Server validates finite times, allowed keys, valid target, payload/batch bounds, rate limits, account lifecycle. Unique subject/event_id makes retry idempotent. Deny direct public event reads/writes; owner analytics through existing operator gates only. Set retention and account deletion behavior before production collection.
- Use occurred_at for validated KST periods; retain received_at to detect offline delay. Reject implausible future/old timestamps under a documented ingestion policy.
- Report collection start and supported app versions; older app activity is not zero.
- APP menu TOP3: count menu_select events, descending; also unique members and share among captured menu selections. Ties use fixed menu key.
- APP materials-tab TOP10: material_open events with source_tab=materials, descending; show total views and unique members separately. Other entry sources can be a separate filter, never silently mixed.
- Session ordering permits aggregate previous→next transition analysis later. Rankings alone do not describe a full user journey.
- Read RPC should return coverage state (NOT_COLLECTED / COLLECTING / READY), from/to, collection_start, platform/version coverage, metric basis and ranked rows; historical recent_views stays separately labeled, never backfilled as synthetic events.

Isolated validation required before APP collection release: tap/rebuild semantics, repeat visit, retry idempotency, offline timestamps, KST boundary, source-tab filtering, account switch/logout, deleted account, unauthorized callers, empty/error coverage, top3/top10 ties, no financial effects.

## Verification and deployment
- Targeted UI tests2 PASS (top10/member count semantics, uncollected menu, failure/loading/empty). Changed-source lint PASS, TypeScript and163-route build PASS.
- Production WEB 51f15f6c-4403-4c19-bab9-6efca3627727, source1037c1e015aace86b7393bd92845431584f47f73. Exact asset manifest and existing configuration preserved.
- Existing API source matches pinned baseline a901568;138inputs recompiled with Wrangler4.136.1 because old temporary bundle was gone. Routing matched deployed config; no API source modification.
- Authenticated Chrome production dashboard verified both section headings, explicit menu NOT_COLLECTED message and all10 materials matching read-only SQL counts26/22/21/19/18/17/16/15/14/13.
- No SQL/RPC, account access, financial ledger, APP code or app build changes.
