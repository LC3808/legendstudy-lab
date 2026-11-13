# Essay university UI and schedules — 2026-11-13

Canonical audit: APP `wiki/essay-university-ui-schedule-20261113.md` and `wiki/evidence/university-ui-schedule-audit-20261113.json`.

Preserves Catalog/Registry IDs, all 304 public questions, API bundle, billing/auth/evaluation, RLS and environment scopes. Adds 25 reviewed university schedules (62 rows), 15 original marketing logo assets, shared branded cards, accessible CTA contrast, current/past schedule separation and removes only the ended beta banner. 42 logos loaded; official numeric colors14 + Owner marketing8, remaining20 neutral pending evidence.

Validation: focused38 PASS; build/TypeScript/changed ESLint PASS. Full1978 PASS/7 baseline failures/5 skipped, baseline admin fixture error1; unchanged boundary checkout-copy failure reproduced on HEAD. Seven responsive widths375–1920 no horizontal overflow.

Deployment uses scripts/deployment/university-ui-preserved.mjs and a private baseline snapshot; no settings PATCH. Production receipt to follow.

Production: `349e36b6-37f8-4e63-adbd-a1b03a8d415e`, source `1119dc90969ea5dcad7e8f7f3644972160361251`, success 2026-11-13 12:03 KST. Settings/function routing/2224 unrelated assets/evaluator deployment unchanged. Authenticated live main/cards/HUFS four schedule rows and 2026 social T2 three-question answer editor verified, no submission. Rollback target `3ebc2fc1-7444-4ff4-9bc6-41c3c195a3f2`; no SQL/config restoration needed.
