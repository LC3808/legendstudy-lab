# Dashboard and member focus — 2026-11-04

Owner approved implementation and production SQL/RPC + WEB deployment. This change is limited to admin readouts and presentation; APP58 and app builds remain separate. No credit allocation/consumption, payment/refund, evaluation or real-user response action is executed.

- Membership period is **signup cohort**, displaying current profile attributes. Options: all, KST today/7/30/90 days, calendar 6 months/1 year, custom <=400 days. Activity counts are study-record holders within that cohort/window (all uses last30 days).
- N수·검정고시 (`academic_status=retaker`) takes precedence over a leftover numeric grade; unknown remains separate. Study cohort uses the same rule.
- Owner explicitly replaced internal admin minimum-five suppression. Three existing read RPCs now return all recorded groups; known empty counts are zero. No operator or lifecycle gate removed. `minimum_sample=1`; frontend accepts both old5/new1 during transition.
- Dashboard: member composition → study time → learning/admissions → support/operations. Study time is hours/minutes; completed active segments are clipped and unioned per member, excluding pauses and overlap. Average denominator is distinct recorders.
- Member list: compact controls, school lookup selection, status/grade filters, distinct email/status/school/grade/current status/major/nickname/date columns. Strong borders, centered data, green/blue subdued surfaces. Expanded rows no longer have orange cell borders.
- Detail: compact identity/status and student aspirations; study/applications once; university-level first/rewrite/completed exam-run counts. Legacy practice data remain separately labelled. Credits are collapsible, with original server classification and reserved delta displayed; no financial write contract change.
- Grade scores are not invented; their source is not yet collected by this read contract.

## Validation

- 65 focused UI/contract tests PASS (including N수, single-user rows, ordering, independent Student360, credit operations regression).
- Disposable PostgreSQL synthetic tests PASS: all five read RPCs, cohorts1/3/4, zero, KST clipping/overlap, signup bounds, member isolation, ACL and lifecycle gates, invalid periods, source fingerprint preservation.
- TypeScript, changed-source ESLint, Next163-route static export PASS.
- TEST dashboard rendered in Chrome for contrast/layout review. Actual production read-only checks follow deployment.

## Deployment boundary

Live baseline deployment `1312670e-30c4-4c58-b4cd-a375ca2b6668`, source `119caea`. Existing live dashboard/credit source was missing from this worktree; dashboard is reconstructed here. Scoped asset manifest replaces dashboard/members/analysis pages and keeps all unscoped student/support/payment/credit assets. Existing API compilation and49 production bindings are preserved.

Migration: `supabase/migrations/20261104095925_admin_member_dashboard_readouts.sql`. Guards existing read-function definition hashes; replaces3 functions, adds2 admin-only read functions. Original definitions/ACL and rollback SQL are in `scripts/deployment/member-dashboard-*`. Rollback touches read functions only, no source data.

Preapply credit ledger cutoff2026-11-04T10:00Z:286 rows, md5 `5a753f5f3e79095f33323051d09a6756`. Verify same fixed cohort after apply (new legitimate activity may continue outside cutoff).
