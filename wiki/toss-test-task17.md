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
