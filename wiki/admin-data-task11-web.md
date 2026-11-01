# TASK11 WEB 관리자 연결

Canonical Unified Wiki: APP repository `wiki/admin-data-task11.md` (branch `codex/admin-data-task11-20261101`).

30 entries / six groups in `src/lib/admin/navigation.ts`. Existing admin routes preserved. Sixteen static `/admin/data/<section>/` routes reuse Analytics, member/Student360, feedback and quality routes; learning routes consume read-only `admin_learning_analytics` in shared TEST only.

PARTIAL/HOLD: GA4/Firebase actual collection, missing TEST legacy report RPCs, score analytics, persistent insight approval and authenticated browser/mobile E2E remain incomplete. EMPTY source is not zero activity. No production deploy or evaluation/payment execution.

Private review: https://task11.legendstudy-task09.pages.dev/admin/ (existing private TEST access code + separate synthetic TEST owner account).

Full test 1517 pass / 4 skip; final affected admin 155 pass. TS/build pass; lint 0 errors/5 existing warnings. Rollback: revert WEB task commit; SQL read permission revoke candidate is in APP repo. Existing production unchanged.
