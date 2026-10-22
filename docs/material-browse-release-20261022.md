# Student material browse release candidate — 2026-10-22

Base: known-good 54f40e18. Scope: 71701 metadata consumer and existing source preservation; admission/mock selector; 16 deferred-college HOLD UI; student missing-body explanation; reviewed official pages (Korea/Soongsil/KAU), canonical links shared with APP. No private question body is published.

No Functions, server, Math provider, image-submit API, auth/payment/credit settings, migration, DB or Storage changes. Existing Backend byte comparison against base PASS.

Validation: 41 related tests, typecheck, lint, build, Boundary and GitHub-ready PASS. Initial build failed only because external node_modules symlink is unsupported by Turbopack; local copy restored, build PASS. Build used public production project config without printing values. It is a compilation check, not a deployable assertion that all production environment variables match.

Before deployment: read actual Pages deployment/source and preserve known-good rollback ID; compare existing public build variables, social providers, bindings and HOLD flags. Rebuild with unchanged approved production variables. This turn does not deploy.

Owner approval requested only for this candidate WEB deployment. Rollback: restore deployment that was live immediately before candidate deployment; no data rollback needed because no DB writes. Postflight: all 11 colleges guest + existing ordinary-account year/type/track/question selection, official materials, HOLD, 360px/200%; do not equate metadata with problem body.

Blockers retained: unpublished question bodies, unverified Sogang/SWU official archive links, Native device QA, historical archive-to-UUID mapping. No Provider/Credit execution.
