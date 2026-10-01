# HQR-1 — Human Review Contract Mapping (LAB consumer)

**Status:** LAB-specific implementation mapping. Not a Shared Backend document.
**Date:** 2026-10-01
**Scope:** How the LAB `/ql` console consumes the deployed canonical Human Quality
persistence contract. LAB is a **consumer only**; it owns no HQP schema and makes no
backend change.

**Contract authority (read, not duplicated here):** APP `codex/essay-scaffolding-vnext`
`supabase/migrations/20261001000200_human_quality_persistence.sql` (Production APPLIED),
`20261001000100_quality_read_authorization.sql` (`ql-read-v1`, unchanged), and
`wiki/human-quality-persistence-implementation.md`. Field names/enums below are **copied
from that SQL**, not inferred. LAB types are a consumer representation, never DB authority.

---

## 1. RPC surface consumed

| RPC | Shape | Use |
| --- | --- | --- |
| `ql_review_state(p_evaluation_ids uuid[])` | `jsonb` `hq-read-v1` | per-case review-state badges in the list (batch, ≤100 ids) |
| `ql_list_human_judgments(p_evaluation_id uuid, p_limit int=20, p_before timestamptz=null, p_before_id uuid=null)` | `jsonb` `hq-read-v1` | judgment history for the open case (paired cursor) |
| `ql_submit_human_judgment(p_payload jsonb)` | `jsonb` `hq-write-v1` | submit a review / correction |

`is_quality_operator`, `ql_list_cases`, `ql_case_detail` (`ql-read-v1`) remain **unchanged**
and are still consumed by the existing read console. No direct `human_quality_*` or Essay
table access; all HQP access is through these RPCs via the authenticated browser session.

## 2. Write payload (`hq-write-v1`) — `ql_submit_human_judgment`

Exact allowed keys (server rejects unknown keys / `octet_length > 32768`):

| key | type | notes |
| --- | --- | --- |
| `dto_version` | `"hq-write-v1"` | required |
| `evaluation_id` | uuid string | required |
| `expected_output_sha256` | string | required; must equal `ql_case_detail.provenance.output_sha256` of the reviewed case |
| `client_submission_id` | uuid string | required; **idempotency key** (see §6) |
| `rubric_version` | `"hq-rubric-v1"` | required |
| `overall_disposition` | enum | `PASS \| PASS_WITH_NOTES \| NEEDS_REVIEW \| FAIL` |
| `rubric_result` | object | all 9 dimension keys required (§3) |
| `findings` | array | required; may be `[]`; ≤ 20 (§4) |
| `official_source_reviewed` | `true` | required literal; operator attestation (not server proof) |
| `summary_note` | string\|null | optional; ≤ 2000 chars |
| `supersedes_judgment_id` | uuid string\|null | optional; correction head (§5) |
| `selection_reason` | enum | default `EARLY_CENSUS`; `RANDOM_SAMPLE \| ANOMALY \| USER_REPORT \| OPERATOR_REQUEST \| MODEL_CHANGE_AUDIT \| DISPUTE \| OTHER` |
| `recommended_action` | enum | default `NONE`; `MONITOR \| REVIEW_PROMPT \| REVIEW_EVIDENCE \| RE_EVALUATE \| INVALIDATE_CANDIDATE \| ESCALATE` |

Server-derived (never client-supplied): reviewer identity (`auth.uid()`), `created_at`,
`reviewed_output_sha256`, `reviewed_generated_rewrite_id`. Writer returns only
`{ dto_version, judgment_id, replayed }`.

## 3. Rubric v1 (`hq-rubric-v1`) — `rubric_result`

All **9** keys must be present. Required (verdict `OK|CONCERN|FAIL`):
`diagnosis` · `core_priority` · `actionability` · `evidence_adherence` ·
`stance_preservation` · `hallucination_absence`.
Conditional (verdict `OK|CONCERN|FAIL|NA`): `sentence_feedback` · `progression` ·
`generated_rewrite`.

**Conditional NA rule (server-enforced):** a conditional dimension must be `NA` **iff** the
case lacks the artifact — `sentence_feedback` NA ⇔ no sentence observations; `progression` NA
⇔ no prior-progress context; `generated_rewrite` NA ⇔ no completed generated rewrite. When the
artifact exists the verdict must be a real verdict (not NA). LAB pre-selects/locks these from
the loaded `ql_case_detail`, but the **server is authority** and rejects mismatches
(`invalid conditional NA`, `22023`).

**Disposition consistency (server-enforced, mirrored as lightweight UX):**
`PASS` → all verdicts `OK`/`NA`, **zero findings**. `PASS_WITH_NOTES` → no `FAIL` verdict, only
`MINOR` findings. `NEEDS_REVIEW`/`FAIL` → unrestricted. No numeric score.

## 4. Findings — `findings[]`

Each: `{ issue_category, severity, target_kind, target_ref, note? }` (`note` ≤ 1000).

- `issue_category` ∈ `FALSE_CORRECTION, INVENTED_ERROR, EVIDENCE_MISREAD, UNSUPPORTED_CLAIM,
  STANCE_CHANGE, CORE_PRIORITY_ERROR, SENTENCE_SPAN_ERROR, PROGRESSION_ERROR, OVER_REWRITE,
  UNDER_SPECIFIED_GUIDANCE, MISSING_IMPORTANT_ISSUE, OTHER`.
- `severity` ∈ `MINOR, MATERIAL, CRITICAL`.
- `target_kind` → `target_ref` shape, and the **source of each ref inside the loaded
  `ql_case_detail`** (no typed UUIDs, no invented sentence ids):

| target_kind | target_ref | source in `ql_case_detail` |
| --- | --- | --- |
| `OVERALL` | `null` | — |
| `DIMENSION` | `{ dimension_id }` | `dimensions[].dimension_id` |
| `PROGRESS` | `{ progress_id }` | `improvements[].progress_id` |
| `ISSUE_KEY` | `{ issue_key }` | `improvements[].issue_key` |
| `SENTENCE` | `{ progress_id, observation_key }` | `sentence_feedback[].progress_id` + `.observation_key` |
| `EVIDENCE_LINK` | `{ evidence_id, dimension_id, progress_id }` | `evaluation_evidence_links[]` (dimension_id/progress_id may be null) |
| `GENERATED_REWRITE` | `null` | enabled when `generated_rewrite` present |

Server validates every target resolves to exactly one row **on the same evaluation**.

## 5. Correction / supersession

`supersedes_judgment_id` targets the **current head** of a chain (a judgment not already
superseded) on the **same evaluation**. `supersedes_judgment_id` is UNIQUE → each judgment is
superseded at most once (linear chains, no branch). A correction is a **new** judgment; the
original row is never edited (immutable trigger, `23514`). Independent review = omit
`supersedes_judgment_id`. Owner D3: any authorized operator may correct; the correcting
reviewer is recorded server-side.

## 6. Idempotency

`client_submission_id` is globally UNIQUE. The server stores a normalized-payload hash. On a
repeat with the **same key + same reviewer + same payload** → `{ replayed: true, judgment_id }`.
Same key + **different payload** → `submission key conflict` (`23505`). LAB therefore:
preserves one `client_submission_id` per submission attempt and **re-sends the exact same
payload** on a network-ambiguous retry; a payload change requires a new key. Key order /
whitespace / omitted defaults normalize server-side; **findings array order and values are part
of request identity**, so LAB preserves them for retry.

## 7. Read DTOs (`hq-read-v1`)

**`ql_review_state`** → `{ dto_version:"hq-read-v1", cases:[ … ] }`. Each case:
`{ evaluation_id, availability:"NOT_FOUND" }` or `{ evaluation_id, availability:"AVAILABLE",
human_review_state, active_count, total_count, latest_human_reviewed_at, has_material_issue,
comparison_status, consensus_bucket }`.
`human_review_state` ∈ `UNREVIEWED, REVIEWED_ACCEPTABLE, REVIEWED_WITH_CONCERNS,
REVIEWED_FAILED, MULTIPLE_REVIEWS, DISAGREEMENT` (derived from **active**, i.e. non-superseded,
heads — never latest-wins, never a score). `comparison_status` ∈ `COMPARABLE, NOT_COMPARABLE`
(NOT_COMPARABLE when active heads span different rubric versions).

**`ql_list_human_judgments`** → `{ dto_version:"hq-read-v1", judgments:[ … ], next_cursor:
null | { created_at, judgment_id } }`. Each judgment: `id, evaluation_id,
reviewed_output_sha256, reviewed_generated_rewrite_id, reviewer_user_id, rubric_version,
overall_disposition, rubric_result, selection_reason, recommended_action, summary_note,
supersedes_judgment_id, created_at, reviewer_state, is_active, findings[]`.
`reviewer_state` ∈ `AVAILABLE, DELETED_OR_UNAVAILABLE`. Response omits `client_submission_id`
and `submission_payload_sha256`. Cursor is paired `(created_at, judgment_id)` desc.

## 8. Reconciliation with the existing LEC adapter

- **CORE membership:** the deployed `ql_case_detail` exposes `improvements[].is_core` (derived
  server-side as `status<>'resolved' AND scaffolding_observation.core_focus`), **not** a bare
  `core_focus` as the LEC fixtures assumed. The LAB view helper now prefers `is_core` and falls
  back to `core_focus` (fixture compatibility). CORE order remains `priority` (never a
  heuristic); `CORE=[]` stays valid.
- **New detail fields now used by findings selectors:** `dimensions[].dimension_id`,
  `sentence_feedback[].{progress_id, observation_key}`, `evaluation_evidence_links[]`.
- `ql-read-v1` envelope/version validation stays strict and unchanged.

## 9. Error taxonomy (write + HQP reads)

Mapped from PostgREST/Postgres codes: `42501` → UNAUTHORIZED; `P0002` → NOT_FOUND (note:
missing-case surfaces as **P0002 / HTTP 500**, not 404 — classify internally as NOT_FOUND, show
"평가를 찾을 수 없습니다", never relabel evidence as 404); `22023` → VALIDATION; `23505` →
IDEMPOTENCY_CONFLICT; `23514` → STALE_CORRECTION (correction head) or VALIDATION; thrown
transport → NETWORK_AMBIGUOUS; else UNKNOWN. Errors never carry payloads, answer text, or JWTs.

## 10. Production limitation

No legitimate Production evaluation case exists, so a **real** operator write is
`NOT_ASSESSABLE`. HQR-1 verifies the write/review UI only with synthetic fixtures + mocked RPCs.
HQR-1 never creates a Production HQP row or evaluation. `OPERATOR_WRITE_SUCCESS (Production)`
stays `NOT_ASSESSABLE`.
