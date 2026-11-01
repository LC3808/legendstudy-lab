# TASK11 WEB 관리자 연결

Canonical Unified Wiki: APP repository `wiki/admin-data-task11.md` (branch `codex/admin-data-task11-20261101`).

30 entries / six groups in `src/lib/admin/navigation.ts`. Existing admin routes preserved. Sixteen static `/admin/data/<section>/` routes reuse Analytics, member/Student360, feedback and quality routes; learning routes consume read-only `admin_learning_analytics` in shared TEST only.

PARTIAL/HOLD: GA4/Firebase actual collection, missing TEST legacy report RPCs, score analytics, persistent insight approval and authenticated browser/mobile E2E remain incomplete. EMPTY source is not zero activity. No production deploy or evaluation/payment execution.

Private review: https://task11.legendstudy-task09.pages.dev/admin/ (existing private TEST access code + separate synthetic TEST owner account).

Full test 1517 pass / 4 skip; final affected admin 155 pass. TS/build pass; lint 0 errors/5 existing warnings. Rollback: revert WEB task commit; SQL read permission revoke candidate is in APP repo. Existing production unchanged.

## TASK11-F — 2026-11-01

Authenticated Chrome PC and 390px mobile: all 30 routes inspected, 28 ordinary admin pages rendered and two specialized review routes correctly denied the TEST owner's narrower role. General TEST student and anonymous users denied on all 30 routes. Existing Analytics/operations/release reporting packages installed in shared TEST only; source packages unchanged. Five operations tabs queried successfully (empty evaluation source).

Fixed Student360 being hidden by unavailable legacy member-detail RPC; each report now retains independent server authorization/error handling. Fixed beta usage table expanding the outer mobile grid. Regression: WEB 1519 PASS / 4 SKIP, TS/build PASS, lint 0 errors / 5 existing warnings; APP 1306 PASS / 7 SKIP, analyze 0. Production untouched.

HOLD remains for missing legacy admin RPCs, specialized review permission, absent evaluation samples, GA4/Firebase configuration/reception, score analysis and persisted insight approvals. TEST student login caused existing profile-bootstrap signup trigger to grant 3 Credit automatically; TEST Credit invariance is **not PASS**. No manual credit adjustment or reversal; runs/evaluations remained unchanged. Canonical APP Wiki contains the menu matrix and exact TEST migration evidence. Subsequent read-only browser tests must precheck that test profiles and signup grants already exist.
