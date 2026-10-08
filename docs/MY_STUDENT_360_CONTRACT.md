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
