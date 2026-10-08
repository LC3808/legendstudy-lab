# Shared MY / Student 360 contract — 2026-10-08

Implementation owns function/data only; Manus owns MY visuals. This document is
not a new database authority. APP and LAB share one auth.users.id → profiles.id.

## Preservation review (seven questions)

1. No new fact timestamps: existing created/submitted/completed/invalidated times remain.
2. No answer/history writes or raw-data copy; existing immutable results remain reproducible.
3. School statistics are current-profile projections, not school-history or historical cohorts.
4. Same Auth identity; credit_accounts.id is a different identifier, resolve via user_id.
5. Interested universities are planning preferences, never applications or outcomes.
6. Own MY uses RLS, Admin uses gated RPC; no school/teacher authorization inferred from selection.
7. Counts and level deltas are derived descriptions, not raw scores, probabilities or causal growth.

## Manus view inputs

| Surface | Canonical source | Missing/error rule |
|---|---|---|
| Display name | profiles.display_name, readMyProfile | null → not supplied; do not derive from email |
| Email | Auth session user.email | null supported, do not duplicate in profiles |
| Current status | profiles.academic_status | student=재학생, retaker=N수·검정고시 등, other=기타, null=설정 안 함 |
| Grade | profiles.grade_level (1–3) | display for student; null allowed, other statuses have no grade requirement |
| School | profiles.neis_office_code + neis_school_code | both null=학교 미설정; selected unresolved=학교명 확인 필요 |
| School label | existing /functions/v1/neis exact pair | display only, never a replacement ID; no membership inferred |
| Major | profiles.intended_major | nullable canonical field, existing APP value preserved |
| Universities | student_target_universities, status=interested, owner=user_id; universities.name | empty means none; request failure is error, not empty |
| Division | student_target_universities.intended_division | nullable user preference, not verified admission programme |
| Credit | credit_summary() / useCreditSummary | retain loading/error/signed-out, never substitute 0 |
| Credit breakdown | spendable, free, paid, other, next_expiry | total=spendable; other is not necessarily purely promotional |
| Period entitlement | no existing period subscription reader connected | null; separate from Credit and included Essay rewrite window |
| Essay records | readEssays, own sessions and scoped evaluations | bounded50 sessions/1000 evaluations; limit/error is not empty |

`src/lib/my/contract.ts` supplies identity/usage/goal adapters and a conservative
comparison gate. `readMyProfile` includes display_name. Profile editing deliberately
writes only school pair, status, grade; it never clears display_name/major/onboarding.
Existing retaker/other do NOT enumerate parent, teacher, academy or School Admin.
Do not invent new enums or require school/grade for them. School can remain selected
as academic context; it confers no B2B membership or data access.

## Essay summary / comparison

Existing relation: universities → essay_exams → essay_questions →
essay_practice_sessions → essay_attempts → essay_evaluations → dimensions.
Current read exposes university/question, fetched evaluation count, latest activity
and latest evaluation status plus actual level_1_to_5/explanation per dimension.
An evaluation count is NOT an attempt count (reevaluations exist). Current MY reader
does not fetch attempts; expose attempt count as unavailable/null, never fabricate it.
No student answer text is needed for summary. Display-order indexes are not criterion IDs.

Comparable delta requires completed, non-invalidated results, different ordered
attempts, same question, criterion ID and definition_version, question_metadata_version,
regime_key, evaluation_version, contract_version and evidence manifest. Retain exact
1–5 scale, null when missing/outside range, no percent or 100-point conversion.
Operator reevaluations/supersession are not new learning attempts; excluded by the
conservative gate. Cross-question/changed-rubric comparisons need separately verified
mappings; not implemented. Current MY read lacks the complete comparison context,
so it must NOT draw a cross-evaluation trend from its present DTO. The pure gate is
ready for a future complete adapter; no new chart or growth claim is shipped.

## Student 360 reuse / boundaries

Existing Admin member detail provides identity, provider/confirmation, goals, current
school pair, grade, lifecycle and counts; member Credit is the canonical read model.
Reuse these alongside gated Ops/QL references, not a second student store. School
name lookup and pair identity contract are shared. Current Admin detail has no
academic_status field, so do not infer student/retaker from grade. Add that field
only via a reviewed RPC delta if Student360 rendering needs it; no page built here.
No default answer body, Auth tokens, direct browser profiles table reads in Admin,
new role system, organization membership, Application schema or wallet.

## School aggregate compatibility

20261008000300 adds admin_dashboard.profile.school_distribution_by_identity
[{school_office_code,school_code,count}] (top20) and school_unset_count. Existing
school_distribution remains unchanged for old clients. The new grouping distinguishes
identical school codes in different offices; sum counts are preserved, top20 is not
an all-school total. Unset is additional, not one of the top20 selected schools.
Before migration, old clients' counts still display with unknown school names; the
browser never guesses office codes. After migration, bounded four concurrent exact
pair lookups, max20 distinct groups, cache256 public names (24h successful/60s failed).
No per-user external call, no cache of member counts or identities, no new school master.
Current profile aggregation remains operator-only, not a school-scoped entitlement.

## Runtime status

Existing-profile MY persistence and Admin/normal-user boundaries were Owner-verified.
A new Web-only user exposed a missing profiles row; 4de6dfa repaired initialization.
New-user runtime and signup +3 actual delivery are awaiting Owner results. Worker
heartbeat alone is insufficient. No finance grant or artificial backfill is used.

## 2026-10-08 consolidated follow-up (supersedes runtime status above)

Signup predecessor is CLOSED separately: Owner SQL showed exactly one grant, balance
3, linked delivery and no expiry; Owner confirmed MY/Essay display. No grant code is
changed here. LAB school flow 3c432cd is PRODUCTION_DEPLOYED and OWNER_VERIFIED
(auto student, optional grade, selected grade, reload). New foundation RPCs below are
IMPLEMENTED / LOCAL_VERIFIED candidates, NOT_PRODUCTION_APPLIED until ledger/runtime
postflight is recorded. Manus CSS, spacing, card design and public visual remain unchanged.

### Shared identity and school

Auth email; optional profiles.display_name (canonical, not a new nickname); id is the
same auth.users/profiles key in APP and LAB. academic_status is student/retaker/other;
parent/teacher are not distinct current enum values. Grade is optional 1–3 for a
selected school. Selecting the existing NEIS pair saves student automatically;
unset grade never clears school. Nonstudent flow clears school explicitly.
School storage is **office + school code only**; there is no school_name column.
Names resolve by exact pair via the existing public NEIS proxy, with bounded shared
cache. A client-supplied display name is not persisted. LAB refuses unresolved save;
DB/older APP still perform structural pair validation, not a newly invented national
school master. Unresolved code => 학교명 확인 필요; no code => 학교 미설정.
Admin aggregate uses top20 identity pairs with max4 concurrent/cache resolution,
not one request per member. Existing counts remain unchanged.

### Targets and Applications

Target = interest, Application = explicit self-reported support record, Outcome =
append-only event; no automatic conversion. Target one-step university + division
uses existing universities and intended_division with optional admission_year.
20261008000500 is HELD: existing UNIQUE NULLS NOT DISTINCT(user,university,year)
needs replacement to support different divisions. Candidate normalization is
lower(btrim(coalesce(division,''))); IDs/rows/year/free text are unchanged. Current
APP selects rows and deletes by row ID; its INSERT omits division/year and uses no
ON CONFLICT column list. New APP labels include existing division/year when present.
Old APP can list/remove multiple row IDs but does not display distinct division labels.
Pinned Flutter regression remains NOT_RUN; no claim of Store RC runtime acceptance.
Rollback must refuse if multi-division rows no longer satisfy old uniqueness.

Application P0 (20261008000600): profiles owner FK cascade; required admission_year,
university + historical name snapshot, division/admission_type/admission_name text,
revision and timestamps. Catalog name is resolved server-side on create/change of
university, never updated merely because a catalog changes. Future division_id can be
added without deleting historical text. No nationwide division catalog is shipped.
Events include created/details_changed and independent planned/submitted/stage_pass/
accepted/additional_acceptance/rejected/not_registered/registered facts. No linear
state machine. occurred_at is optional, recorded_at server-owned, supersedes identifies
an append-only correction (one successor, same application/owner). Detail changes
keep before/after snapshots and optimistic revision. Stable request keys make ambiguous
retries idempotent; key reuse with a different command fails. Current event is the
latest non-superseded occurrence (recorded time fallback), not necessarily most recently
entered if backdating. Event UI never deletes an old correction silently.

Self RPCs: my_application_save, my_application_event, my_application_delete,
my_applications(offset), my_application_events(id,offset). No supplied owner UUID.
Table reads own RLS; direct writes revoked. RPCs lock the canonical account subject
and reject pending/erasing lifecycle. Application list25/events100 with explicit more
flags/pages; error is distinct from empty. Explicit student application delete cascades
its event history. Existing Auth deletion cascades profiles -> applications -> events
in the AUTH phase; PERSONAL worker/functions are unmodified. Pending/erasing access
is blocked. No new audit retention exception, orphan PII or future report DB.

### Study handoff

20261008000700 my_study_summary() returns study-summary-v1:
- today_ms, week_ms, last30_ms: integer **milliseconds**, not rounded session sums.
- daily7: chronological [{date: YYYY-MM-DD, milliseconds}], exactly seven KST days.
- timezone Asia/Seoul; week Monday 00:00 through current day; 30d includes today.
- Union completed active_segments in absolute milliseconds across sessions/devices,
  then clip to day boundaries. Respect include_in_study_total (excluded mock sessions
  contribute nothing). Same session UUID is canonical PK, retries do not add a record.
- as_of server query time; source completed_synced_sessions. No running local draft,
  unsynced offline time or real-time cross-device handoff is claimed.
- No records => real zero series; RPC failure => ERROR, never zero. More than2000
  relevant records => STUDY_HISTORY_LIMIT error; no partial total. 24h carry-in covers
  sessions crossing midnight. Source index/segments are unchanged; no Web timer DB.
- Refresh: mount/login, account switch, explicit 새로고침/reload. Owner-bound hook drops
  stale/in-flight responses on logout/switch. Manus converts total ms to display minutes
  with floor(ms/60000); it must not sum/union/rebucket inside a visual component.

### Student 360 / Essay / report facts

20261008000800 admin_student360(auth user UUID) supplements existing memberDetail and
memberCredit; it does not replace them. public.admin_operator + caller lifecycle +
valid active target are required. quality_operators alone gives no Admin rights.
Existing member identity/providers/goals/Credit continue through existing RPCs; new
supplement adds current status, shared Study totals, explicit Applications and Essay.
Internal account UUID is removed from the default member detail; school name stays primary.
period_entitlement and academic_performance are null because no reviewed period-pass or
canonical academic-performance adapter exists here. Existing mock self-practice is not
silently called a standardized grade record.

my_essay_summary() and Admin share the same private read model. Recent50 sessions plus
recent50 evaluations have explicit truncation flags. Session counts are real attempt
counts within that session, not counts of sessions masquerading as attempts; university,
exam year/question, last submitted time, strengths/rewrite checklist and per-criterion
1–5 levels come from existing Essay tables. No answer body is returned. The parser
exposes the comparison context including request_kind; operator reevaluation, invalidated
or superseding results cannot be a learning-growth point. The existing conservative
same-question/criterion/definition/metadata/regime/evaluation/contract/evidence gate
remains; missing context => null, never 100-point normalization or cross-rubric trend.

Future student/admin reports should compose these same DTOs, current memberCredit,
identity and source timestamps under the corresponding authorization. Null, error,
window/truncation and self-reported provenance remain visible. No new report store,
PDF engine, full answer export, admissions prediction or cohort benchmark is implemented.

### Backlog/design authority

Admission Catalog: University -> Academic Year -> canonical division_id; PDF extraction
-> prior-year diff -> human/Owner verification -> publish. Free text remains historical
source. Application does not depend on Essay, and Essay does not require Application.
Cohort insight: NOT_IMPLEMENTED. Future grade/status/performance context, minimum sample
size, suppression, median/mean/sample count/freshness, year and selection bias must be
resolved before claims or delivery. School Admin future organization/membership/role/scope
stays separate from academic school codes and quality allowlist. No new booleans/RBAC.
