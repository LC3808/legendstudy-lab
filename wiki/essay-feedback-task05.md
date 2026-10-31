# TASK05 — feedback / bug report WEB handoff

2026-10-31. Canonical implementation/policy is APP Unified Wiki `essay-feedback-reports.md`, and SQL approval package is APP `supabase/candidates/essay_feedback_v1/`.

Existing feedback_submissions is reused; no second content DB. No Production apply or deployment. `NEXT_PUBLIC_ESSAY_FEEDBACK_V1_ENABLED` defaults false; enable only after Owner SQL approval and authenticated acceptance. `NEXT_PUBLIC_RELEASE_VERSION` identifies client release (fallback unknown).

UI: existing LAB root, /support and student exam result questions section; helpful/unhelpful alone, optional category/message, bug category+description, same request key on failed retry, local lock. Nothing automatically attaches student answers or private data.
Admin: existing AdminSurface → /admin/essay-feedback/, filters/user/date/status/category, 25-row pages, stats, detail/status/notes audit. Server uses official admin_operator plus active account. Owner review reuses `/owner-review/essay/?feedback=<id>` through fixed authenticated admin RPC, scoped to reported question and same-owner parent. Other questions, telemetry, private reviews excluded. Ordinary user and anon denied by DB; no service-role browser key.

Completed-run composite exam result IDs supported; legacy/math standalone IDs and partial-checkpoint admin result preview remain unsupported. Missing error context is omitted, never scraped from logs. Existing generic inquiry and feedback email outbox preserved. No actual evaluation, mail or Provider request in verification.

Validation: new form3, admin2 and scoped Owner endpoint1 regressions; full suite 1454 PASS /4 SKIP,203 files PASS/3 SKIP. TypeScript/build PASS; lint existing5 warnings/0 errors. APP whole suite1306 PASS/7 SKIP and Analyze0issues. Local PostgreSQL ACL/ownership/idempotency/rate/CAS/audit and two-connection concurrency PASS. Live Auth/user submission/read synchronization/production admin preview NOT TESTED. Standalone Owner bundle compile uses synthetic public config in /tmp, not an installable deployed artifact.

Rollback: disable feature flag and restore prior WEB artifact; only if needed apply approved RPC revoke rollback. Never delete feedback/audit/evaluation/credit/history. Existing Production untouched. Source baseline4aaf963. Final SHA in Git history/report.
