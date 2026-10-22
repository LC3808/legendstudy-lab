# Student material browse release candidate — 2026-10-22

Base: known-good 54f40e18. Scope: 71701 metadata consumer and existing source preservation; admission/mock selector; 16 deferred-college HOLD UI; student missing-body explanation; reviewed official pages (Korea/Soongsil/KAU), canonical links shared with APP. No private question body is published.

No Functions, server, Math provider, image-submit API, auth/payment/credit settings, migration, DB or Storage changes. Existing Backend byte comparison against base PASS.

Validation: 41 related tests, typecheck, lint, build, Boundary and GitHub-ready PASS. Initial build failed only because external node_modules symlink is unsupported by Turbopack; local copy restored, build PASS. Build used public production project config without printing values. It is a compilation check, not a deployable assertion that all production environment variables match.

Before deployment: read actual Pages deployment/source and preserve known-good rollback ID; compare existing public build variables, social providers, bindings and HOLD flags. Rebuild with unchanged approved production variables. This turn does not deploy.

Owner approval requested only for this candidate WEB deployment. Rollback: restore deployment that was live immediately before candidate deployment; no data rollback needed because no DB writes. Postflight: all 11 colleges guest + existing ordinary-account year/type/track/question selection, official materials, HOLD, 360px/200%; do not equate metadata with problem body.

Blockers retained: unpublished question bodies, unverified Sogang/SWU official archive links, Native device QA, historical archive-to-UUID mapping. No Provider/Credit execution.

## Owner phase correction — WEB only

Phase 1 only. Preserve 7b836a2. No APP edits/builds or evaluation/submission-contract changes in this follow-up. Owner WEB acceptance is mandatory before Phase 2; Owner installed APP acceptance before Phase 3.

New: question material links beside the selected year/kind/track/question; mobile question tab opens first. Authenticated singleton year/track/exam auto-selection with admission/mock resets preserved. Official SWU archive verified in browser (2026 admission two PDFs listed); Sogang mock archive and essay guidebook list verified. Generic archive links explicitly do not assert an exact question source match. Private solutions/rubrics remain private.

Captured anonymous 71701 response (metadata only, private local QA file outside Git) reused in DOM component integration: all 11 colleges/128 exams/468 question selections exercised. 30 affected tests PASS. This is captured-response component validation, NOT deployed-browser or Owner acceptance. Existing static Catalog/toggles are not new delivery.

Problem body remains a distinct limit: only existing approved student PDF is rendered. Otherwise official admissions pages are offered at the question. No private PDF republishing. Owner must review this scope; all-question inline problem display is NOT complete.

Replaces the prior candidate approval request: deploy the updated WEB-only commit after preserving actual Production build settings and rollback deployment. No DB, 71702, Backend, Provider, Credit, APP or AI activation. Phase 1 remains PARTIAL until deployed and Owner-verified.
