# Overnight Phase C — Admin / QL reconciliation

Status: PARTIAL. Frontend implementation is deployable; hosted Admin RPC installation,
real operator acceptance and finance test grant remain blocked. No DB migration applied.

## Authority and reuse

Base: LAB main `f0e612d`. Selected existing UI/client/contract/tests from LAB
`manus/admin-console-p0-a` (`bbc23cb`); QL subtree matches
`claude/quality-console-v0` (`253867b`). APP Admin source `49c02de`; reconciliation
analysis `claude/admin-ql-reconciliation-doc` (`b3e6af`). No wholesale branch merge,
old Home/Auth/Pricing restoration, new QL architecture or new inquiry system.

Internal routes: `/admin/`, `/admin/members/`, `/admin/credit/`, `/admin/payment/`,
`/admin/operations/`, `/admin/inquiries/`, `/ql/`. IA orders dashboard, members,
Credit, payment, Essay/Math operations, inquiries, existing AI Quality. Operator RPC
and QL allowlists stay separate; no public navigation/sitemap links, noindex/robots
exclusion. Server authorization remains authoritative. No PII/answer text is embedded
in the static export. Account-keyed gates unmount old private state immediately on
switch/logout; query keys hide previous-member results while the next query loads.

No finance server was imported: the branch's independent finance JWT signer and
`functions/api/admin/*` are absent. Credit grant is explicitly disabled. Payment is
read-only; no cancel/refund action. Existing inquiry and Human Review consumers are
reused, but no hosted inquiry/review writes were performed. Math readiness copy is
retained source authority, not a new runtime activation or hosted runtime audit.

## Hosted read-only evidence and migration blockers

Anonymous public-credential probes: `admin_operator` and `admin_dashboard` return
PGRST202 (not exposed in schema cache); `is_quality_operator` returns42501
(permission denied). This confirms neither a migration ledger nor operator membership.
Owner/Claude evidence that admin@legendstudy.com is in both existing allowlists is
preserved; it could not be independently re-read without a privileged connection.
No DB connection/access token or SQL connector is available. No new secret requested,
issued, rotated, or committed.

Existing additive candidates were reviewed, not applied:

- 20261007000100_admin_console_read.sql
- 20261007000200_admin_console_p0b.sql
- 20261007000400_admin_console_p0c.sql

Do NOT apply those files unchanged. Two source discrepancies require reconciliation:

1. `admin_credit_snapshot` and aggregate/member grant availability omit the current
   Payment `CANCEL_PENDING` spendability fence. Canonical `credit_summary()` already
   excludes fenced grants. Correct Admin reads to match that authority without
   editing Payment, then exercise pending cancellation/expiry/reservation cases.
2. P0B `admin_inquiry_detail` passes `i.user_id` to `admin_credit_snapshot`, whose
   argument is a credit_accounts.id. Resolve canonical credit account first, as the
   existing member Credit RPC does; test distinct Auth/credit-account UUIDs.

Before any apply: inspect live migration ledger/function ownership/ACL/allowlist,
resolve collisions, snapshot exact definitions for rollback, then run canonical
verification as anon/nonoperator/operator. Prior APP PostgreSQL16 report (472 checks)
is historical evidence only; it was not rerun against Production in this task.
No claim that these files are Production-ready or deployed.

## Validation and preservation

485 tests /43 files, lint/typecheck/boundary/static build PASS. Added account-switch
regressions for Admin and QL. Boundary audit requires internal route exclusions,
canonical RPC consumers, no browser privileged secrets, and absent finance server.
Browser: 168 conditions (7 routes ×4 widths ×100%/200% text ×3 Auth states)
PASS, no horizontal overflow or browser errors. Nonoperators never request operation
data; logout clears member data and the selected-member grant button is disabled.
Browser checks use synthetic intercepted responses; no synthetic JWT is sent to a
real backend and no new finance JWT is minted. Hosted acceptance remains separate.

Credit ledger, signup benefit, deletion lifecycle, Payment/Toss routes/config,
Home/LAB/Pricing shell, QL contracts and Human Review data preserved. No Application
schema, coupon, bulk writes, actual payment, real user deletion or test credit grant.
