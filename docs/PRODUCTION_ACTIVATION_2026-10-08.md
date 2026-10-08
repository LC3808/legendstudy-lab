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


## Owner-assisted activation update — 2026-10-08

Owner executed and returned Production ledger rows for all six candidates.
Signup verified-email guard preserves cutoff/owner/ACL; MY column-only UPDATE
returns true, table UPDATE false, RLS true. Admin bundle SHA256
4286b463667b61d3a648fa02cc551d79c7771258fddb55789ab1cd6fde59af6f
was applied atomically. All 17 public admin function bodies match the reviewed
originals/corrective; anonymous execute denied, internal helpers denied to client
roles. Inquiry RLS is enabled with no direct-access policies, as designed.
Owner reports actual admin session Header/Dashboard/Members/review member Credit
and Ledger/Payment reads/Ops/Inquiries/QL all working. This is Owner-reported
authenticated read verification, not proof of finance writes, normal-user denial,
MY persistence or signup actual E2E. Those remain pending. Finance writes remain off.

School-name follow-up: member detail reuses APP's existing public NEIS Edge
Function with exact office/school pair matching, timeout, retry and stale-response
cancellation. No identity/JWT sent, school names not stored, no DB change.
Member search and dashboard still retain their existing code-based aggregates;
they lack office identity in their current RPC result. No guessed mapping.
Public visual and Payment untouched.

## MY follow-up — 2026-10-08

Owner reports all five actual MY checks PASS: Credit read, goal save, reload,
logout/login persistence, account-switch isolation. Normal/review Admin/QL denial
also Owner-confirmed. Signup actual E2E and safe finance grant remain pending.
Owner then requested APP current school/status and clearer saved-goal presentation.
MY now reads the same profiles NEIS pair, academic_status and grade_level under
owner checks/RLS. APP labels student/retaker/other are reused; school names use the
existing NEIS proxy, no new schema or profile writes. Saved major and target
university/division render as summaries with explicit change controls. Failed saves
stay editable; target cancel discards the draft. Targets are three columns on PC,
one on mobile; university search/add is a separate section. Only MY-scoped CSS is
changed under this explicit Owner request; Public Home/Header/LAB/Pricing untouched.

## Confirmed new-web-account profile gap — 2026-10-08

Owner's targeted Production read: email_verified=true, profile_exists=false,
signup_eligible=true, benefit_delivery_exists=false, signup_grant_count=0.
APP and LAB share the same canonical profiles and RLS. Web previously only updated
profiles; missing rows made major save fail, target insertion violate its profile
FK and prevented the existing benefit worker's profile join from finding the user.

Authenticated non-recovery web sessions now initialize a missing own profile using
only {id}, onConflict=id/ignoreDuplicates=true, owner checked before read/write and
after completion. Existing/concurrently-created APP rows are never overwritten.
Major, target-add and profile editing retry initialization. No new migration, wallet,
bonus path, manual grant, broad user backfill or lifecycle/finance change.

School settings reuse APP's public NEIS search, exact code pair, grade1–3 and
student/retaker/other state contract. Only selected school pair, academic_status,
grade_level are written; name/major/onboarding and unrelated profile fields remain.
Auth signup return adds a confirmation marker on the existing login route; signed-in
return shows completion/continue, and original signup tab replaces its form after
cross-tab sign-in. No window-close workaround and no claim that a bonus was paid.
Manus owns MY visual redesign; this delta only adds the requested functional forms.
Actual Production profile creation and worker delivery need Owner verification after
release. A recent lifecycle heartbeat alone is not evidence of successful benefit work.
