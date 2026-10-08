# Production activation closeout — 2026-10-08

Owner scope: functions/data/auth/Credit/Admin. Manus owns public visuals.
Started at b79e9ba; reconciled onto latest main ae44317 before publication.
Manus commits371e30a/ae44317 are retained unchanged. No CSS/Home/LAB/Pricing/Header layout or typography changes.

## Functional delta

- Header account controls contain one conditional `관리자` link to `/admin/`.
  Existing `admin_operator()` is the only authority. Anonymous/loading/recovery,
  false/malformed/error/missing RPC responses render no entry. A key per account
  and post-response session check prevent old operator state after switch/logout.
  No browser email check, admin boolean, new role or new QL implementation.
- Existing Members detail renders confirmed-email state, provider names, desired
  major and interested university/division from the corrected operator RPC. Existing
  style classes reused. Missing legacy RPC fields remain compatible; no credentials,
  identity payloads or student answer bodies are requested.
- Existing credit_summary / Essay header / MY / Payment / QL runtime unchanged.
  Credit grant/refund stays disabled until existing finance authority reuse is safe.

## Backend corrections (APP authority)

Review branch `codex/production-activation-closeout`, based on final Store RC plus
previous verified-signup guard. Original Admin migrations00100/00200/00400 retained;
additive20261008000100 fixes CANCEL_PENDING spendability/reserved/expiry alignment,
Auth-to-credit-account UUID resolution, and bounded member fields. Exact source-body
hash / security-property preflight rejects unknown deployed definitions.

MY runtime SQL exposed a missing UPDATE ACL on profiles.intended_major. Additive
20261008000200 grants only that column, requiring exact existing owner RLS and no
additional permissive user write policy. No MY redesign or adapter workaround.

Signup20261007150000 remains the minimal existing verified-email eligibility guard.
Existing cohort/locks/idempotency/lifecycle preserved; no new wallet/email service.
See [backend closeout](https://github.com/LC3808/legendstudy-app/blob/codex/production-activation-closeout/wiki/production-activation-closeout.md).

## Evidence and truthful limits

LAB496 tests/44 files, lint/typecheck/boundary/build PASS. Browser9 role/route checks
with intercepted Auth/RPC: approved Header entry, ordinary-user denial, logout clear
PASS. These are frontend checks, not real Production account authorization.

Backend: original402 SQL checks, corrective arithmetic/UUID/member/RLS/signup checks;
real local PG17.11 eight-connection signup race yielded exactly one grant/transaction,
+3 and no expiry. Original112 lifecycle checks plus ownership/rollback passed with
verified signup guard. All data is synthetic, in disposable local databases.

Fresh public Production probes: email confirmation ON; admin_operator/admin_dashboard
PGRST202 (not exposed); is_quality_operator and credit_summary deny anon (42501).
Existing Payment runtime is REVIEW/TEST, consumer_purchase=false. Runtime config
presence does not verify finance JWT subject/role or safe audit attribution for grants.
Existing essay_admin_grant derives operator from signed finance subject, so blind
Payment-token reuse could misattribute the actor; no new signer or transport shipped.

Hosted DB/management/session bindings remain absent. Production migration ledger,
exact functions, lifecycle activation/worker, existing admin membership and actual
authenticated data/writes cannot be inspected. No migration apply or real test grant.
Pre-confirm session/bonus actual E2E was not repeated with a new account/email.
Production route, role, data, write and cross-surface axes must remain distinct.

PAYMENT_TOSS_CHANGED: NO. PUBLIC_FRONTEND_VISUAL_CHANGED_BY_CODEX: NO (only the
explicitly approved conditional Header functional entry). DB_APPLIED: NONE.
DESTRUCTIVE_PRODUCTION_ACTIONS: NONE. Overall PARTIAL until hosted gates resolve.
