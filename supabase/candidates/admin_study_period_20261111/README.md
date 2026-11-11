# TASK05-C — dashboard study period candidate

**NOT APPLIED / NOT DEPLOYED. Owner approval required.** Base `2d7d32d`; this replaces only `public.admin_dashboard_study(timestamptz,timestamptz)`. It does not install the withdrawal RPCs.

## Explicit contract

| Inputs | Meaning |
|---|---|
| finite from < to, duration <=400 days | Existing half-open `[from,to)` window; unchanged |
| NULL, NULL | All eligible recorded history, earliest eligible completed session start through statement time |
| one NULL, non-finite, reversed/equal explicit endpoints, >400 days explicit range | PT422 INVALID_PERIOD |

For all-time the lower bound is derived from included, nonempty, completed sessions belonging to currently eligible profiles. The upper bound is `statement_timestamp()`. No epoch/365-day fallback or client-side total summation. An empty source yields actual zero. Current-profile grades and active-account eligibility, active-segment clipping and per-user union (`range_agg`) remain the existing algorithm. No raw duration_seconds summation, ongoing local timers, pause time or double counting.

Other contracts remain untouched: member NULL/NULL means all signup cohorts with active member metric still recent30; learning/admissions/school admin RPCs remain bounded-only; release report already accepts NULL endpoints. The WEB suppresses unsupported all-time learning requests and explicitly displays “기간 선택 필요”; it does not silently use30days. Student school rankings and personal lifetime summaries are separate DTOs/visibility scopes and cannot substitute for this administrator read.

## Files / scope

- `preflight.sql`: baseline definition and ACL drift guard; read-only.
- `apply.sql`: one CREATE OR REPLACE, retains owner/ACL/SECURITY DEFINER/STABLE/empty search_path/8s timeout. No grants, table/RLS/DML or other RPC changes.
- `baseline.sql`: exact prior definition (with executable SQL terminator).
- `verify.sql`: candidate definition/config/ACL guard, read-only.
- `rollback.sql`: candidate hash guard, restore exact prior function only. No record deletion.
- `source-audit.sql`: production-safe READ ONLY aggregate comparison, range union vs independent sweep-line calculation, school/unset decomposition. Exports no member identities.
- `related-fixture.sql`: **isolated test only**, not an installation file.

Baseline definition MD5 `755d8e824f53a2c82a2cc90cbdf660d1`; candidate MD5 `2a74d4b3612953760d4ae73403cb3f96`. `CREATE OR REPLACE` preserves the existing `{postgres=X/postgres,authenticated=X/postgres}` ACL. Guards reject a missing/drifted function rather than accidentally creating an exposed function. No overload is introduced.

## Approval-stage sequence

1. Re-read actual deployment source and live schemas, ACL, RLS, active roles and dependent function hashes. Save preapply non-PII snapshots. Run `preflight.sql`; stop on drift. Capture recent30 result at fixed timestamps and all-history source audit in a consistent read snapshot.
2. After Owner approval create the migration with the installed Supabase CLI, using precisely reviewed `apply.sql`. Apply only the study function. No migration file is fabricated in this candidate stage.
3. Run `verify.sql`, actual signed admin/ordinary/anon API checks, same-window old/new and source checks. Retain failure visibility and 8s timeout. Review query performance at current size; growth requires separate performance review, not truncation.
4. Only after success, re-run withdrawal preflight and apply its two approved read functions when authorized to resume. Verify pending3/current state, role gates, activities and unchanged data. Do not assume current3 will never change naturally.
5. WEB deployment only with separate/combined explicit Owner approval, using the established scoped admin overlay. Recheck actual live source; never overwrite unrelated WEB work with stale main.
6. Rollback: revert the WEB artifact first when needed to avoid candidate calls; restore study with guarded `rollback.sql`. Candidate UI shows actual RPC failure rather than zero if it remains temporarily. Withdrawal has its separate non-destructive rollback. Never roll back students' records, lifecycle state, ledger or unrelated migrations.

## Validation

`python3 scripts/test-admin-study-period.py` uses socket-only temporary PostgreSQL17, existing schema/auth function fixtures and synthetic data. No production URL is accepted. Checks >6-year history, overlaps/pauses, KST clipping, exactly400day vs401day, empty data, school sums, original bounded results, active/non-admin/anon/blocked/expired identities, ACL, other function fingerprints, study row preservation and rollback. `source-audit.sql` was also read on production, and its all/30day totals matched independent calculations plus existing finite-range RPC calls. This is not a deployed-candidate or signed browser E2E PASS.

Full evidence and remaining existing failures: [TASK05-C report](../../../wiki/admin-study-period-contract-20261111.md).
