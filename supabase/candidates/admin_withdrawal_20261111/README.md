# Task 05 — administrator withdrawal read boundary (candidate)

Status: **NOT APPLIED / NOT DEPLOYED**. Owner approval required for production SQL and WEB separately. This is the existing member console, not a deletion executor.

## Scope and dependencies

- Add `public.admin_withdrawal_list(text,text,text,integer,integer,jsonb)` and `public.admin_withdrawal_detail(uuid)` only.
- No tables, indexes, RLS policy changes, existing function replacement, deletion worker changes, grants to source tables, backfill, or retention changes.
- Existing `admin_operator()` + `account_private.allowed(auth.uid())` guard the actor. Only authenticated role has EXECUTE; admin allowlist is checked on the server. Pending/erasing administrator actors are denied.
- Target pending members may be read by an eligible admin via this explicit minimal-data boundary. Existing `admin_student360`, `admin_member_list`, home get/save and the target member's own blocked access remain unchanged.
- Detail reuses `student_private.study_summary` for deduplicated lifetime duration. Remaining metrics are indexed per-user reads of existing records. No material click count is invented.
- List default 25, maximum 50; UI 10. Detail one request; statement timeout 8s. Current request table has 3 rows. No index addition justified. Production load/EXPLAIN for high-activity accounts still requires approval-stage verification.

## Apply procedure after approval

1. Reconfirm live Cloudflare source and changes since `d4ceb2a`; never deploy stale remote main wholesale. Preserve current Worker/API/routes/headers and use the existing scoped admin overlay flow.
2. Run [preflight.sql](preflight.sql) with read-only connection/transaction. Save aggregate results and definition hashes privately. Any unexpected definition/ACL/schema drift stops application.
3. Run [apply.sql](apply.sql) once. CREATE FUNCTION (not replace) prevents overwriting existing objects. Transaction rolls both additions back on error. Record the authorized migration receipt; no migration ledger edit is included here.
4. Run [verify.sql](verify.sql). Compare all seven old function hashes and RLS/policy metadata with preflight; inspect new function definitions against reviewed Git. Expected on 2026-11-11: pending3 / processing0 / failed0 / completed30=0, but investigate natural lifecycle changes rather than hard-code counts.
5. With real approved test sessions call both RPCs: active admin succeeds, ordinary/pending/anonymous fail; production tests must only read. Never forge production JWTs. Check expiry/erased identities without invoking deletion. Use isolated fixtures when states do not exist in production.
6. Only after SQL validation, build and deploy the reviewed WEB admin scope. `NEXT_PUBLIC_ADMIN_WITHDRAWALS_ENABLED=false` can disable the added tab at build time. Preserve existing member screen and all other routes.
7. Admin WEB: members → 탈퇴 관리; compare3pending to DB current state, each detail, filters/search, previous/next, error/uninstalled states. No deletion/grant/payment/evaluation actions.

## Data and pagination

- `as_of` is query time. `next_cursor` carries the first page cutoff and last requested_at/request_id. New requests after cutoff appear on refresh. Keyset paging survives inserts/removals before the current page; same timestamp ties use ID DESC in either sort direction. UI retains cursor stack for previous pages.
- Status/expiry remain live. An expired/processed request can leave a filtered list while browsing; this is intended lifecycle protection, not a frozen historical copy. Refresh resets the cursor. `p_offset` exists for bounded compatibility/tests; UI always uses0 plus cursor.
- KPI definitions are mutually exclusive current request states, not unique lifetime former members. A recorded active error takes priority over pending/processing. Completed KPI covers available, unexpired receipts completed within30days, not all-time erasures.
- Pending detail only: minimal identity and current activity. Erasing/cancelled/erased details: receipt only. Erased subject ID is already nulled by existing processor; this candidate does not retain it. Processing start time is absent in current schema → 미집계, not inferred from phase/update time.
- Error codes pass through an allowlist with Korean labels; arbitrary provider/SQL text is never returned.

## Rollback / immediate disable

- Prefer disable new tab and return to the actual pre-deploy admin artifact; no unrelated route rollback.
- Revoke EXECUTE from authenticated on both candidate functions to stop reads immediately if required.
- [rollback.sql](rollback.sql) drops only the two new functions. No CASCADE and no deletion of accounts, activity, payment/credit/history, or request/audit records. Do not rollback old home or deletion migrations.
- Preserve deployment/approval/test evidence, but do not archive personal member activity dumps.

## Isolated verification

`bash scripts/withdrawal/run-db-test.sh` creates and destroys a socket-only PostgreSQL17 cluster; no production URL is accepted. Production schema/function definitions are used as fixtures, with synthetic accounts/activities only. It verifies apply, aggregate meanings, errors, ACL, ordinary/pending/admin denial, unchanged home gates, all-table content preservation, keyset mutations, and rollback. Production PostgREST/JWT integration remains an approval-stage check.
