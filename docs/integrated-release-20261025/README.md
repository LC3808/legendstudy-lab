# 2026-10-25 integrated release

Owner integrated directive supersedes incomplete checkpoints in the [Oct25 handoff](https://github.com/LC3808/legendstudy-docs/blob/main/90_HISTORY/2026-10-25-next-session-essay-release-handoff.md). Preserve the [Oct24 service principle](https://github.com/LC3808/legendstudy-docs/blob/main/90_HISTORY/OWNER_DIRECTIVES/2026-10-24-essay-service-principle-and-execution.md) and [prior verified release](../owner-review-20261024/README.md). No repeated installation of existing SQL.

## Read-only restore

- WEB baseline source `651479b85d485bd0852538df64aaddcad859f0ff`, Production `eba32637-25f3-4d36-bec9-c3acaf4fd99e`; current Cloudflare API verified, not inferred from Git.
- Essay Worker `17b3bd65-8d90-4e8e-8ff6-a696e9575588`, deployment `88c26908-a27b-461e-ba00-dc4175bf3b8c`, 100%. Existing round submission/retry worker reused.
- Math transport is Pages Functions `/api/math/evaluate`, tied to WEB deployment, not a separate Cloudflare Worker or Supabase Edge Function. Existing Math engine and role JWTs reused.
- APP HEAD `a0ec92199896cc3b2001e43ce7552b104296f921`; no APP source edits. WEB task starting HEAD `a18f92f` (docs), last product change `651479b`.
- Existing Math session verification: installed definitions, original owners/ACLs, RLS, binding uniqueness true per Owner result. Existing admin-report/session-retry installs preserved.
- Read-only aggregate actual Math results: TYPED completed9/failed1, EVIDENCE completed1. Existing image completion reused; this is not proof of a new live multi-question image round.

## Aggregate discrepancies and minimal correction

1. `admin_member_detail` reads legacy `essay_attempts`/evaluation tables (submitted0). Current exam Worker stores `essay_exam_private.runs`:30 rounds, initial15/rewrite15, no orphan credit account. Add operator-only `admin_learning_summary`; retain and label legacy single-question figures separately. No sum of incompatible units.
2. `is_published` is false for all700 DB questions, while actual admission is governed by runtime policy + WEB public allowlists. DB has237 exams/26 universities. Display publication flags separately from actual read-only service admission. Reuse `/api/essay/service-status`; failed lookup is unverified, never zero. No activation changes, no hardcoded11.
3. `auth.users`13 vs `profiles`12, one account lacks profile. Directory and dashboard counted different populations. Label both populations explicitly; do not create a profile or alter users to force equality.

`admin-learning-{precheck,apply,postcheck,rollback}.sql` are additive, metadata-only. Owner applied and returned security_definer/stable/fixed path/authenticated_execute/anon_denied/service_role_denied all true. Independent read-only presence confirmed. Original RPCs/records/Ledger untouched. Isolated PostgreSQL17 fixture tests covered global/member counts, operator/role denials and rollback.

## UI changes

- MY intended major and existing university/division editors are inside profile hero. Existing storage/edit/delete operations reused; no duplicate goals section. Facts centered; compact list/cards; section order preserved.
- Share floats over content; desktop anchored popover/mobile compact bottom panel. Existing private PNG reused. Copy public LAB root only; outside click, Escape and close supported; no public individual-result URL.
- Shared admin section/cards/title/select styling; TEST payment separated from LIVE revenue. Existing credit/payment filters retained.
- Round Math entry no longer offers a second per-question paid submission link. Existing single-question route/API remains available for released APP compatibility.
- Vertical growth bars and meaningful stored criterion aliases from previous release retained. User-facing criterion evidence headings use existing concise title projection; raw stored data unchanged.

## Preservation review (seven questions)

1. Original occurrence/record timestamps remain unchanged; aggregate adds statement-time as_of.
2. Immutable answers, results, source pins and billing decisions remain reproducible.
3. No historical fact UPDATE or destructive migration; existing profile edit semantics reused.
4. Existing auth.users identity and credit_accounts user mapping used; no parallel identity.
5. Learning counts remain distinct from applications/outcomes; no inferred admissions prediction.
6. Operator-gated aggregate only, no new collection/retention; no PII/answers in evidence or public docs. Share existing allowlisted PNG only.
7. Counts are derived at read time with explicit units; publication flag is not admission, TEST is not revenue.

## Financial and APP compatibility

Existing contracts: initial round1 Credit independent of count/subset; draft0; included rewrite0 within original set/window/count; newly added question separate paid round; idempotent repeat/retry0; successful checkpoints preserved. Reuse prior isolated 1/2/4-question +8 concurrent Math checks and131 existing Math regressions, Essay round worker checks and prior live1/0 cycle. No new Provider calls for this UI/aggregation release. Math MIXED means typed text plus evidence within existing Math flow; cross-engine Essay+Math atomic round is not newly enabled. Current public Math gate exposes one leaf; live four-Math-question service is not claimed.

Existing APP single-question endpoints/financial contracts retained. Existing round history shared backend retained; new native round composer is outside scope. No new native binary or actual device revalidation in this release.

## Rollback

WEB baseline: Cloudflare Pages deployment `eba32637-25f3-4d36-bec9-c3acaf4fd99e`. New read-only RPC may remain during WEB rollback; Owner can run provided drop-only rollback if required. Do not roll Essay Worker back to old single-question c3fb54be with active round submissions; keep17b3bd65/forward fix. No Secret/payment/registry/engine changes.

Validation and final Production proof are recorded below after deployment. Previously known full-suite catalog6 failures + empty phase1 suite remain distinct from changed-scope regressions.
