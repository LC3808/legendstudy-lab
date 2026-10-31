# Beta daily v2 — WEB handoff

Canonical Unified Wiki is the APP repository `wiki/essay-beta-daily-v2.md`; SQL candidate lives there. This is a WEB implementation pointer, not a separate policy source.

Owner: 1 humanities allowance/account/KST day, usable through 2026-11-10, exclusive cutoff 2026-11-11 00:00 KST. Existing signup/paid balances remain separate. Existing source confirmation and submission backend unchanged.

`src/components/essay-beta-credit.tsx`: strict v2 server DTO, available/exhausted/final-day/ended banner, once-per-account/campaign/policy modal with server acknowledgement, existing notice links, focus/visibility/midnight/account guards preserved. Missing RPC safely hides unactivated feature. `essay-beta-credit.test.tsx`: 11 tests including final day/no next-day promise, cross-account stale responses, server acknowledgement and notice reopen. Actual synchronized receipts require the SQL candidate to be applied.

Validation: full tests 1,432 PASS / 4 SKIP / 0 FAIL, TypeScript and production build PASS. Lint 0 errors, 5 pre-existing warnings. No Production DB/Worker/Provider/credit writes or WEB deployment. Campaign/notice publication and client rollout remain Owner activation prerequisites. Rollback: disable campaign first, then revert this WEB commit; preserve ledger and accepted requests. Baseline fb7f7dfe1eef5ad7a585bcfa52322b237a82e57c on codex/web-app-release-20261024; final commit identifies this change.
