# TASK06 WEB delivery — 2026-11-01

Existing `/admin/operations/` adds five monitoring tabs using the official admin RPC gate.
Previous single-evaluation/math/quality view remains available. No retry/evaluate/credit-edit action.
Source changes: admin-essay-monitoring.tsx, admin/monitoring.ts, operations/page.tsx, admin-surface.tsx.
Tests: admin-essay-monitoring.test.tsx (6); full suite 1460 PASS / 4 SKIP, TypeScript and production
build PASS, lint 0 errors / 5 preexisting warnings.

**NOT DEPLOYED. SQL APPROVAL REQUIRED.** Canonical Wiki and SQL live in LC3808/legendstudy-app:
- `wiki/essay-operations-monitoring.md`
- `supabase/candidates/essay_operations_v1/README.md`

RPCs: admin_essay_operations, admin_essay_operations_estimate, admin_essay_operations_check_alerts.
SQL grants authenticated execution with official admin_operator + allowed-account enforcement;
ordinary/guest/service-role are denied. UI hiding is not the permission boundary.
No answers/raw Provider errors/credentials are queried. Audit records administrator access.

Important limits: costs without time/model/cache/provenance remain UNKNOWN; cohort costs by request
date are distinct from call-date costs. Prices and thresholds have no invented defaults. Alerts are
explicit administrator checks, not unattended monitoring. Real JWT/production-size performance,
real invoices and browser/device validation remain approval-stage checks.

Rollback: revert WEB monitoring commit first; if needed apply candidate rollback to drop only three
public RPCs. Original operational data and new monitoring audit/pricing snapshots remain intact.
No production DB/Worker/Auth/Credit/History mutation, Provider calls or production deployment.
