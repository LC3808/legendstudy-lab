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

## Math WEB / native APP user flow — 2026-10-10

APP `codex/essay-production-user-flow` (implementation56f1635, base6b003888)
and LAB branch of the same name (implementationb4df1936 + credit-refresh9c66fe2,
base8991b51) are pushed. Fetch latest refs before continuing; APP main untouched.
Native Math reuses existing catalog/input/learning/evaluation contracts and WEB
Provider gateway. No new AI engine, schema, Payment/Toss/IAP or Ledger policy.
Device-local introduction is separate from Auth, exits to login choice, supports
Guest without anonymous Auth, and preserves returning Profile/Home routing.
BrandGate paints official symbol and wordmark before routing, without fixed delay.

Validation: Flutter3.47.6 analyze PASS; **1019 tests PASS / 2 opt-in skips / 0 failures**;
Android debug APK, iOS Simulator and signed iPhone debug builds PASS. LAB16 relevant
UI tests, TypeScript, targeted lint and static build PASS. Mock tests are separate
from the following actual Production UI evidence:

- Android SM-G950N: missing Android OAuth client was the configuration cause.
  Owner registered the verified com.legendstudy.app/debug SHA-1 pair; real Google
  chooser → Supabase session → new-user Profile setup/Skip → Home → cold relaunch
  session/Profile persistence PASS. Review-account existing Profile goes straight
  Home. Release SHA unavailable because release signing material is absent.
- WEB, physical Android and physical iPhone each completed an actual Math initial
  evaluation and included reevaluation through their UI, using the same approved
  Auth UID, existing OpenAI/gpt-5.6-sol Provider and canonical backend.
  WEB evaluation prefixes2c6af9ee/4a35ac2b; iPhone0ffeb194/a9e65551;
  Android7432ad79/07512c6f. All six are COMPLETED; no mocked result insertion.
- Actual Credit4→3→2→1: three consume transactions total−3; three included
  reevaluations add no debit. One earlier Android requestce4d77dd timed out after
  entering PROCESSING. Existing math_recover_evaluation after lease expiry marked
  FAILED/TIMEOUT and released its reservation. Four reserves, three consumes,
  one release net reserved0. No direct ledger edits or duplicate charge.
  The original upstream/finalization failure cause remains undetermined; reliable
  automatic orphan recovery needs follow-up before public activation.
- WEB→Android History and APP→WEB History/report/comparison verified. Final WEB,
  Android and iPhone UI balances all1. WEB persistent header could become stale
  after another device spent Credit; route/focus/visibility canonical reload fixes
  this without changing billing. Existing Oct09 records remain intact.
- WEB actual PNG upload → private Storage → actual extraction → confirm four
  regions → evaluation-ready PASS. This uploaded attempt was not evaluated or
  charged; PDF upload and native image/voice submission are not claimed.
- Final post-essay cold relaunch on both physical devices restored Review Home
  directly, with no login/introduction/Profile setup repeat.
- Fresh isolated iOS Simulator Next/Start → login choice → Guest Home → relaunch
  Home PASS; Skip covered by unit tests. Both physical devices used update installs
  to preserve data. Physical clean-install/brand cold-start capture, populated
  school/grade/targets restoration and provider-switching matrix remain limited.
  iPhone Apple button present; Android absent. iPhone Google/Kakao/Apple and Android
  Kakao actual provider login acceptance remain pending Owner-assisted QA.

Production deployed source9c66fe2 via existing Pages procedure; canonical deployment
`92f79bf7-7bb5-4fce-867f-735a6b4b8b99` SUCCESS. Final MATH_ENABLED,
MATH_PROVIDER_CALLS_ENABLED and NEXT_PUBLIC_MATH_ENABLED=false; DB evaluations=false.
One existing approved UID remains allowlisted; no public widening. Public availability
HTTP200 reports all four types false; signed-in UI has no available evaluation entry.
**PUBLIC_ACTIVATION: HOLD.** Humanities/Econ-Business/Science actual Provider QA
not performed and remain unavailable. Worker JWT expiry2026-10-16 18:57:41 KST:
renew using existing dedicated authority before expiry. Migration010 not reapplied;
Target005 HOLD; worker bindings, RLS/private Storage and existing Math E2E preserved.
No APP main merge, Store submission or release-signing change.

Next: finish remaining physical OAuth/first-install/Profile matrix, investigate
orphan evaluation recovery and renew Worker credentials before a separately
approved public release. No further evaluation activation is authorized by this
closeout. Owner-assisted remaining device authentication QA is requested.

## APP WEB UX cleanup — 2026-10-10

Owner-approved UI cleanup on `codex/app-web-ux-cleanup`, based on APP938b02b
and LABc652133 (latest remote refs verified before independent worktrees).
Login hero uses the existing section-title token, two centered lines; policy links
follow Guest at the SafeArea footer. Shared primary buttons are navy/white and
secondary buttons white/gray/navy; destructive and provider brand styles remain.
MY has three divided LAB rows and a compact canonical Credit balance/IAP top-up.
LAB home removes balance categories. Display labels are 논술 LAB / 내신 LAB / 수능 LAB;
settings removes only LAB 이용 안내. Submit buttons are 첨삭 진행 / 재첨삭, with
1 Credit + included same-answer reevaluation within14 days still visible before submit.
WEB guide removes the requested redundant purchase/promo copy; refund copy and
responsive wrapping are corrected without changing amounts, periods or legal rights.

Availability cause: production has0 published general essay_questions but1 ACTIVE
Math problem/set. The existing APP catalog and WEB entry depended on evaluation
availability, so switching evaluation OFF also hid approved Math questions.
Availability now adds `catalog.math` after the existing authenticated allowlist check,
separately from `types.math` (unchanged evaluation meaning). The APP reads this field
with a backward-compatible fallback. Approved accounts can browse while evaluation
is OFF; other/anonymous accounts cannot gain access. UI evaluation actions stay
disabled and the APP rechecks availability before any submission mutation. Existing
server Provider/Worker/DB GATE remains authoritative. No migration/RLS/Storage,
Auth/Profile/Payment/Toss/IAP verification/Ledger or evaluation contract redesign.
No Provider call, new submission, reevaluation or Credit debit was performed for UI QA.

Checks: Flutter3.47.6 analyze PASS (0 issues); full regression1019 PASS/2 opt-in skips;
latest focused31 PASS plus2 Android/iOS login render tests. New widget cases cover
360/375/430dp and100/200% text for hero/footer/compact Credit, plus CTA colors and
catalog-open/evaluation-closed behavior. WEB81 related tests PASS; final copy/gate
subset53 PASS; full ESLint, TypeScript and static production build PASS.
Android debug APK and iOS Simulator builds PASS with existing public configuration.
WEB pricing/refund six viewport widths360/375/390/768/1280/1440 at100% and200%
zoom have no horizontal overflow after the scoped minimum-width correction.
Widget render captures use test fonts: they establish geometry, not Korean visual QA.

Public activation remains HOLD; Math flags and DB evaluation switch stay OFF,
existing single-account allowlist retained. No APP main merge or store submission.
Prior actual Math E2E evidence and its unresolved OAuth/first-install/orphan recovery
and Worker-expiry follow-ups remain in the preceding section, outside this UI task.
