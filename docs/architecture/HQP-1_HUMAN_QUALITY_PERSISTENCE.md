# HQP-1 — Human Quality Judgment Persistence Architecture + Quality Console Review UX Contract

**Status:** DESIGN + CONTRACT + IMPLEMENTATION PLAN ONLY.
**Date:** 2026-10-01
**Author role:** LAB architecture / operator-UX design (Claude).
**Source branch / baseline:** `legendstudy-lab` `claude/quality-console-v0 @ 325a112`.

> **Successor:** this is historical design evidence. The canonical runtime contract is the
> APP HQP-3 migration `20261001000200_human_quality_persistence`; the LAB consumer mapping and
> UI are in [HQR-1_HUMAN_REVIEW_CONTRACT_MAPPING.md](HQR-1_HUMAN_REVIEW_CONTRACT_MAPPING.md) and
> [HQR-1_HUMAN_REVIEW_CONSOLE.md](HQR-1_HUMAN_REVIEW_CONSOLE.md). This HQP-1 proposal is not
> edited to match the final implementation.
>
> **This document authorizes nothing.** It contains **no** migration SQL. It proposes a
> canonical data/security architecture and a reviewer UX contract for **Codex** to review
> from a DB/security standpoint (HQP-2). It does **not** change any Shared Backend schema,
> RPC, migration, Production state, or the deployed `ql-read-v1` contract, and it adds **no**
> Quality Console write implementation.
>
> **Do not** read any status in this document as an upgrade of the live system. Human Quality
> persistence remains `IMPLEMENTATION: NOT_STARTED`, `PRODUCTION: NOT_APPLIED`.

Canonical project state is authoritative in `LC3808/legendstudy-docs` →
`00_PROJECT/CURRENT_STATUS.md` and `SOURCE_OF_TRUTH.md` (capability #17 = Human Quality
Judgment, systematic persistence MISSING). Schema/RPC authority lives with the App track
(`LC3808/legendstudy-app`) + the live DB. The names used below for existing objects are
**consumer references** to confirm with Codex, not new canonical declarations.

---

## 0. Current canonical facts (unchanged by HQP-1)

| Fact | State |
| --- | --- |
| Quality Authorization | `PRODUCTION_VERIFIED` |
| Quality Console (read) | `IMPLEMENTED / LOCAL_VERIFIED` |
| LAB Quality adapter (`ql-read-v1`) | `IMPLEMENTED / LOCAL_VERIFIED` |
| Production detail runtime | `NOT_ASSESSABLE` (no legitimate evaluation case) |
| Systematic Human Quality persistence | **MISSING / NOT_IMPLEMENTED** |
| Pilot Human Review | historical Owner evidence exists |
| Real-student Pilot | `NOT_STARTED` / `NOT_AUTHORIZED` |
| Production AI | `OFF` · Primary model `NOT_SELECTED` · GPT `PRIMARY_CANDIDATE` only |

HQP-1 does not change any of these.

---

## 1. What a Human Quality Judgment is (and is not)

A **Human Quality Judgment** is *a human's review of a specific AI evaluation/output*, recording:
**who** reviewed, **what** output (immutably identified), **when**, under **which rubric
version**, **what** disposition, **why**, **what issues** were found, **whether** another review
superseded/followed it, and **what non-executing action** (if any) was recommended — **without
mutating any historical AI/Essay fact**.

It is **NOT**: a model evaluation · Essay improvement/progress · AI processing status · owner
lifecycle status · a student outcome · an admission prediction · an analytics event · an
authorization membership.

A Human Quality **PASS** means: *a reviewer judged the evaluated AI feedback acceptable under
the named rubric version.* It does **not** mean the student answer is correct, the student is
high-performing, admission probability is high, the AI output is ground truth, or that future
outputs from the same model are approved.

**Separation invariants (enforced throughout):**
- Human Quality ≠ model evaluation (`essay_evaluations`) — stored in separate tables, FK-linked.
- Human Quality ≠ student progress (`essay_improvement_progress`) — never written here.
- Human Quality write ≠ AI re-evaluation, invalidation, credit change, or student-visible change
  (§16, §27, §28).

---

## 2. Fundamental architecture principle — append-only, history-preserving

Every submitted judgment is an **immutable fact**. Nothing in HQP ever overwrites the student
answer, AI evaluation, dimensions, improvement progress, sentence observations, processing run,
or a **previous Human Quality judgment**.

- A later review is a **new row**, never an in-place edit.
- A correction/supersession is an explicit **relation** (`supersedes_judgment_id`), with the
  original row preserved.
- There is **no** mutable canonical `evaluation.human_quality = 'pass'` column. "Current /
  latest / superseded / disagreement" is a **derived projection** (§12, §13, §14 of this doc),
  computed from the immutable history — not stored authority.

---

## 3. Review subject identity — FK identity vs frozen provenance

A judgment binds to **one immutable `essay_evaluations.id`** via a foreign key (live integrity +
joins). Because an evaluation can later be invalidated, superseded, or re-evaluated, the judgment
**also freezes a minimal review-time provenance snapshot** so it can prove *exactly which output*
the human reviewed, and so a review of evaluation A can never be rendered as approval of a
different output B:

Frozen (immutable, review-time copy — minimal, non-duplicative):
`reviewed_evaluation_ref` (plain uuid copy of the id, no FK — survives erasure, §18),
`reviewed_evaluation_version`, `reviewed_prompt_version`, `reviewed_contract_version`,
`reviewed_model_provider`, `reviewed_model_name`, `reviewed_output_sha256`,
`reviewed_evidence_manifest_sha256`.

**Do not** copy the full evaluation, dimensions, answer, or feedback text. Store the live FK for
joins and only the small set of version/hash fields needed to pin identity. Everything else is
read live from `ql_case_detail` at review time and re-read on display. This is the deliberate
distinction between **FK identity** (mutable join target) and **frozen provenance** (immutable
proof of the reviewed artifact). Codex review Q3 covers whether this binding set is correct.

---

## 4. Reviewer identity

- `reviewer_user_id` → `auth.users.id`, **derived server-side from `auth.uid()`** inside the
  write RPC. Never caller-supplied.
- `quality_operators` is **authorization membership, not a reviewer registry**. If an operator's
  membership is later removed, their historical judgments **remain** (accountability is a
  historical fact, not a function of current membership).
- **No email, no name, no OAuth identifier** is stored in the judgment. Display identity is a
  non-sensitive pseudonym derived from `reviewer_user_id` (same `left(md5(...),12)` style already
  used for `student_pseudonym`), or a future operator alias if an operator-profile is ever added.
- A future **system/model reviewer** is out of scope; if ever added it must be an explicitly
  different reviewer *kind*, never presented as a human review.

---

## 5. Overall disposition vocabulary (v1)

Recommended bounded vocabulary (not a 0–100 score):

`PASS` · `PASS_WITH_NOTES` · `NEEDS_REVIEW` · `FAIL`

- **PASS** — feedback acceptable under the rubric; no material issue.
- **PASS_WITH_NOTES** — acceptable, with minor noted imperfections.
- **NEEDS_REVIEW** — reviewer cannot confidently pass/fail; requires another look / second reviewer.
- **FAIL** — feedback materially misleading/incorrect/unsafe under the rubric.

This is **Owner decision #1** (confirm vocabulary). Rationale for four values: PASS vs
PASS_WITH_NOTES separates "clean" from "usable-with-caveats" for trend analysis; NEEDS_REVIEW
avoids forcing a binary when confidence is low (important during near-census bring-up); FAIL is
the actionable trust signal. A numeric human score is not justified for launch.

### 5.1 Disposition derivation (reviewer-selected + validated)

Option C: the reviewer **explicitly selects** the overall disposition, and the server
**validates consistency** against blocking rubric dimensions — no hidden weights.

Deterministic blocking rule (v1): if any **blocking** dimension (§8) has verdict `FAIL`, the
overall disposition may not be `PASS` or `PASS_WITH_NOTES` (must be `NEEDS_REVIEW` or `FAIL`).
Non-blocking `CONCERN` verdicts permit `PASS_WITH_NOTES`. The rule is transparent and enforced in
the write RPC (§47). This prevents the "dimension FAIL but overall PASS" trap without inventing
scoring weights.

---

## 6. Rubric v1 — minimum useful, near-census-practical

The reviewer already sees (via `ql_case_detail`) the student answer, AI evaluation, dimensions,
CORE/NON-CORE, sentence feedback, rewrite guidance, evidence and provenance. The rubric only
judges **whether the AI feedback is acceptable** — it is not a re-grading of the student.

**REQUIRED (always):**
1. **Diagnosis correctness** — are the AI's identified strengths/issues actually correct?
2. **CORE / priority appropriateness** — is the CORE selection and ordering reasonable? (Judge
   the selection, do not re-score; CORE membership is the Essay-track `core_focus` fact.)
3. **Actionability** — is the guidance concrete and usable by the student?
4. **Evidence adherence** — does the feedback respect the official evidence/criteria, without
   contradicting them?
5. **Stance preservation / minimal-edit discipline** — does guidance preserve the student's
   stance and avoid over-rewriting into a different essay?
6. **Hallucination / invented-error absence** — does the feedback avoid inventing errors or
   unsupported claims? *(blocking — a FAIL here blocks PASS.)*

**CONDITIONAL (only when the referenced artifact exists):**
7. **Sentence-feedback correctness** — only when sentence feedback is present.
8. **Progression correctness** — only when prior progress exists (`previous_progress_id` chain).
9. **Generated-rewrite quality** — only when a generated rewrite exists.

Each dimension verdict ∈ `{ OK, CONCERN, FAIL, NA }` (`NA` only valid for conditional
dimensions whose artifact is absent). **Blocking dimensions (v1): #1 Diagnosis correctness and
#6 Hallucination absence.** Six required + three conditional keeps a single case reviewable in a
realistic near-census time budget while still capturing the failure modes that matter for trust.
Why sufficient: these cover the specific ways AI essay feedback goes wrong (wrong diagnosis,
invented errors, bad priorities, unusable or stance-breaking guidance, evidence drift) plus the
three artifact-specific checks; a 12–15 field checklist would make near-census review
impractical before 2026-10-10 without materially improving signal.

### 6.1 Rubric storage + versioning

- The rubric **result** is stored as a bounded, server-validated **JSONB** object on the judgment
  row: `{ "<dimension_key>": "OK|CONCERN|FAIL|NA", ... }`, with keys restricted to the known v1
  set. Dimension **definitions** (keys, allowed verdicts, blocking flags, conditions) live as a
  **versioned canonical definition in code/docs** (Option A), referenced by `rubric_version`
  (e.g. `hq-rubric-v1`). No DB rubric-definition table and no rubric CMS for launch.
- `rubric_version` is stored on every judgment. Old judgments remain interpretable under their
  own version; a new rubric version never reinterprets or rewrites historical rows; analytics
  segment by `rubric_version`. If a future rubric needs DB-stored definitions, that is a
  deliberate later step (Option B/hybrid), not a launch requirement.

---

## 7. Issue / findings taxonomy

Issues are **0..N per judgment**, stored in a normalized child table (`human_quality_findings`,
§10). Bounded v1 `issue_category`:

`FALSE_CORRECTION` · `INVENTED_ERROR` · `EVIDENCE_MISREAD` · `UNSUPPORTED_CLAIM` ·
`STANCE_CHANGE` · `CORE_PRIORITY_ERROR` · `SENTENCE_SPAN_ERROR` · `PROGRESSION_ERROR` ·
`OVER_REWRITE` · `UNDER_SPECIFIED_GUIDANCE` · `MISSING_IMPORTANT_ISSUE` · `OTHER`

- These are a **fixed canonical enumeration**, not free-form user strings. `OTHER` carries a
  bounded note. Categories map to the rubric dimensions (e.g. `INVENTED_ERROR` ↔ dimension #6),
  letting analytics explain *why* a dimension failed.
- A finding may optionally reference a canonical **target** within the same evaluation
  (`target_kind` ∈ `OVERALL | DIMENSION | PROGRESS | ISSUE_KEY | SENTENCE | EVIDENCE_LINK |
  GENERATED_REWRITE`, plus a `target_ref` string/uuid). The server validates the target belongs
  to the same evaluation (§47). This is the optional, minimal claim-level finding capability
  (§10) — not over-normalized: targets are a thin reference, not a copy of the targeted fact.

### 7.1 Severity

Per-finding `severity` ∈ `MINOR | MATERIAL | CRITICAL`, recommended **included** because it has a
clear operational meaning for triage:
- **MINOR** — feedback remains usable; local imperfection.
- **MATERIAL** — meaningfully misleading/incorrect guidance; operator attention required.
- **CRITICAL** — untrustworthy result that should not stand / needs immediate attention.

`has_material_issue` in the list projection (§13) = any active finding with severity `MATERIAL`
or `CRITICAL`.

---

## 8. Review notes — internal only

- `summary_note` (bounded free-text, required-optional per Owner decision #4; recommend
  **optional** with a length cap, e.g. ≤ 2000 chars) — concise review rationale.
- **All Human Quality notes are INTERNAL by default.** There is **no** `student_visible_note` in
  v1. Any future student-visible correction is a *separate, explicitly designed publication
  workflow* (§15 of the task, §16 here), never an accidental side effect of a review note.
- Guidance embedded in the UX contract and RPC validation: no secrets, no provider payloads, no
  copied full answer text, no chain-of-thought, concise rationale only. Length cap enforced
  server-side.

---

## 9. Lifecycle — smallest viable

- Every **submitted** judgment is **final and append-only**. "DRAFT" exists only in the client
  (unsent form state); it is never persisted as a mutable DB row.
- There is **no** in-place `VOID`/`UPDATE`. A correction or retraction is a **new superseding
  row** (§12). "Superseded" / "current" / "voided" are **derived** from the supersession graph,
  not stored mutable status.
- Supported without workflow engine: initial review → later correction → second independent
  reviewer → preserved disagreement → (future) adjudication. No enterprise QA workflow.

---

## 10. Recommended storage architecture

### Alternatives compared

| | **Option A** single table, rubric + findings both JSON | **Option B** judgment + normalized dimension rows + normalized findings | **Option C** generic review/event framework | **Recommended: Option D (hybrid)** judgment table (rubric as JSON) + normalized findings table |
| --- | --- | --- | --- | --- |
| Launch speed | fast | slow (3+ tables) | slow (abstract) | fast (2 tables) |
| History preservation | good | good | good | good |
| Queryability | weak on issues | strong | weak (polymorphic) | strong where it matters (findings + disposition) |
| Rubric evolution | easy | schema churn per rubric | easy | easy (JSON + version) |
| Schema complexity | lowest | highest | deceptively high | low |
| Security/privacy | simple | more surface | hardest to reason about | simple |
| Handoff clarity | ok | ok | poor | clear |

**Recommended launch architecture: Option D (hybrid).** One append-only judgment table with the
rubric result as a versioned JSONB, **plus one** normalized `human_quality_findings` child table.
Rationale: findings are the cross-case analytic unit (issue-category frequency, severity, model
drift) and benefit from relational querying and canonical targets; rubric dimension verdicts are
per-case and rubric-evolving, so JSON + `rubric_version` avoids schema churn while staying
near-census-fast. This is deliberately **not** the most abstract option (C) and not the most
normalized (B).

### 10.1 Conceptual schema (NO SQL — for Codex review)

**`human_quality_judgments`** — canonical, append-only human review fact.

| Field | Kind | Notes |
| --- | --- | --- |
| `id` | PK uuid | immutable |
| `evaluation_id` | FK → `essay_evaluations.id` | live link; `ON DELETE SET NULL` (§18) |
| `reviewed_evaluation_ref` | uuid, immutable, **no FK** | survives erasure; audit continuity (§18) |
| `reviewed_evaluation_version` / `reviewed_prompt_version` / `reviewed_contract_version` / `reviewed_model_provider` / `reviewed_model_name` / `reviewed_output_sha256` / `reviewed_evidence_manifest_sha256` | immutable frozen provenance | pins the exact reviewed output (§3) |
| `reviewer_user_id` | FK → `auth.users.id` | from `auth.uid()`; `ON DELETE SET NULL` (§18) |
| `rubric_version` | text, immutable | e.g. `hq-rubric-v1` (§6.1) |
| `overall_disposition` | text enum, immutable | `PASS \| PASS_WITH_NOTES \| NEEDS_REVIEW \| FAIL` |
| `rubric_result` | jsonb, immutable | bounded `{dimension_key: verdict}`; validated server-side |
| `recommended_action` | text enum, immutable | non-executing (§36); default `NONE` |
| `selection_reason` | text enum, immutable | operational provenance (§11) |
| `summary_note` | text, immutable | internal-only, length-capped, nullable |
| `supersedes_judgment_id` | FK → `human_quality_judgments.id` (self), immutable | correction relation; same-evaluation, acyclic (§12) |
| `client_submission_id` | uuid, immutable | idempotency key (§28) |
| `created_at` | timestamptz, immutable | review time |

No mutable columns. (A `superseded`/`current` flag is **derived**, not stored.)

**`human_quality_findings`** — 0..N issue findings per judgment.

| Field | Kind | Notes |
| --- | --- | --- |
| `id` | PK uuid | immutable |
| `judgment_id` | FK → `human_quality_judgments.id` `ON DELETE CASCADE` | findings belong to their judgment |
| `issue_category` | text enum, immutable | bounded taxonomy (§7) |
| `severity` | text enum, immutable | `MINOR \| MATERIAL \| CRITICAL` (§7.1) |
| `target_kind` | text enum, immutable, nullable | `OVERALL \| DIMENSION \| PROGRESS \| ISSUE_KEY \| SENTENCE \| EVIDENCE_LINK \| GENERATED_REWRITE` |
| `target_ref` | text/uuid, immutable, nullable | validated same-evaluation (§47) |
| `note` | text, immutable, nullable | internal-only, length-capped |
| `created_at` | timestamptz, immutable | — |

Both tables: RLS enabled, **no client policy** (fail-closed); writes only through a
`SECURITY DEFINER` RPC (§15); reads only through gated RPCs (§13). `CASCADE` on
`findings.judgment_id` is safe because findings are a sub-part of their own judgment, never a
separate historical authority.

---

## 11. Selection reason (operational provenance, not a verdict)

Bounded `selection_reason`: `EARLY_CENSUS` · `RANDOM_SAMPLE` · `ANOMALY` · `USER_REPORT` ·
`OPERATOR_REQUEST` · `MODEL_CHANGE_AUDIT` · `DISPUTE` · `LEGACY_IMPORT` · `OTHER`.

This records **why a case was reviewed**, enabling future sampling/coverage analytics without any
sampling automation now. For launch near-census, the default is `EARLY_CENSUS`. It is operational
provenance, never a Human Quality verdict.

---

## 12. Correction / supersession semantics

- `supersedes_judgment_id = A` on new row B ⇒ **B is a correction of A**; A stays immutable; the
  projection treats A as `superseded` and B as current *within that correction chain*.
- `supersedes_judgment_id = NULL` ⇒ **independent review** (coexists; does not supersede anyone).
- Server rules (§47): supersedes target must be the **same `evaluation_id`**, must exist, and must
  not form a **cycle**. **Owner decision #3:** may any authorized reviewer correct another
  reviewer's judgment, or only the original reviewer? Recommended default: **any authorized
  reviewer may create a superseding correction** (small trusted team; the correction records its
  own `reviewer_user_id`, so authorship stays transparent), revisit when the team grows.

This deliberately distinguishes **CORRECTION** from **INDEPENDENT_REVIEW** — a later review does
**not** implicitly supersede an earlier one.

---

## 13. Multiple reviewers, disagreement, and derived projection

All judgments are preserved; disagreement is **surfaced, never resolved by overwrite**.

**Derived list review-state** (computed from the immutable history, not stored mutable status):

- `UNREVIEWED` — no active (non-superseded) submitted judgment.
- `REVIEWED_ACCEPTABLE` — exactly one effective disposition, in {PASS, PASS_WITH_NOTES}.
- `REVIEWED_WITH_CONCERNS` — effective disposition NEEDS_REVIEW, or PASS_WITH_NOTES carrying a
  MATERIAL/CRITICAL finding.
- `REVIEWED_FAILED` — effective disposition FAIL.
- `MULTIPLE_REVIEWS` — ≥2 active independent judgments that agree (same disposition bucket).
- `DISAGREEMENT` — ≥2 active independent judgments under compatible `rubric_version` major with
  **materially different** dispositions (e.g. PASS vs FAIL). Cheap to derive; recommended for v1.

Projection fields: `human_review_state`, `human_review_count` (active), `latest_human_reviewed_at`,
`has_material_issue`. **No** canonical mutable status column; no single "truth" is manufactured —
`DISAGREEMENT` is preserved, and Owner adjudication (if ever needed) is a future, separate step.

---

## 14. Existing Pilot Human Review — PRESERVED, no auto-backfill

**Default: leave historical Pilot Owner review evidence where it is** (APP wiki closeouts). **No
automatic backfill** into these tables. If Owner later authorizes a curated import, it must carry
`selection_reason = LEGACY_IMPORT`, an explicit historical source + review date + reviewer
provenance, and `rubric_version` marking rubric mismatch/unknown — and must **never fabricate
structured dimension verdicts from old prose**. (Options: A leave / B curated import / C auto —
recommend **A** now, **B** only on explicit authorization.)

---

## 15. Authorization

Writes go through a **`SECURITY DEFINER` RPC**, never a direct browser table `INSERT` and never
RLS-direct insert. Reviewer identity is derived from `auth.uid()` inside the function; no
email/domain/profile/school authorization; no self-enrollment; no caller-provided reviewer
authority; **no privileged service key in the browser or runtime**.

**AUTH-A vs AUTH-B:**
- **AUTH-A** — reuse `quality_operators` for both read and Human Quality write.
- **AUTH-B** — keep `quality_operators` for read, add a narrower human-reviewer role.

**Recommended for launch: AUTH-A**, because operation is Owner/tiny-trusted-team, it is the
least operational complexity, and the write path is itself gated + append-only + audited. **This
is Owner decision #2.** **Revisit trigger (state explicitly):** move to AUTH-B when (a) the
operator set expands beyond the trusted few, (b) read-only operators must exist who cannot write,
or (c) external/institutional reviewers are introduced. No generic RBAC framework is introduced.
"`authenticated` may EXECUTE the gated RPC" ≠ "any authenticated user may submit reviews" —
authorization is enforced inside the function via `is_quality_operator()`.

---

## 16. Privileged-write audit

The append-only `human_quality_judgments` (+ `human_quality_findings`) rows **are** the primary
write history: who (`reviewer_user_id`), what (`evaluation_id` + frozen provenance), when
(`created_at`), why (rubric result + findings + note), supersession (`supersedes_judgment_id`),
and recommended action. No redundant audit universe is created for the judgments themselves.

The **only** additional operational audit needed is for **authorization membership changes**
(who was added/removed from `quality_operators`) — that belongs to the authorization layer
(existing/APP concern), not duplicated in HQP. Codex review Q14 confirms sufficiency.

---

## 17. Privacy & retention

- **No student answer text** stored in HQP (default NO). **No copied AI feedback text** — store
  **references** (`evaluation_id`, canonical target refs), not duplication. **No student account
  identifiers** — reachable only by joining `essay_evaluations → essay_practice_sessions.user_id`.
  **No reviewer email/name.**
- Reviewer accountability is about the reviewer and is independent of student deletion.
- Internal notes are internal-only, length-capped, and subject to the same privacy/retention
  controls; guidance forbids PII/secrets/answer copies/chain-of-thought.
- These are product/data-architecture requirements; HQP-1 makes **no legal conclusions**.

---

## 18. Erasure / historical integrity (FK strategy)

Goal: never block required erasure forever, never cascade-delete operational review history
without intent, never retain student content through copied notes (we copy none).

- **`evaluation_id` → `essay_evaluations.id`: `ON DELETE SET NULL`.** If an evaluation is hard-
  deleted under approved student erasure, the judgment row survives (reviewer accountability +
  model/version/issue analytics), the live link is severed, and the immutable
  `reviewed_evaluation_ref` + frozen provenance (ids/hashes — not student PII) preserve audit
  continuity. Because HQP stores no student content, nothing student-identifying remains after
  the FK is nulled.
- **`reviewer_user_id` → `auth.users.id`: `ON DELETE SET NULL`** (recommended), so a reviewer's
  own account deletion leaves an anonymized historical judgment rather than blocking deletion
  (`RESTRICT`) or destroying review history (`CASCADE`). Trade-off noted: this weakens post-hoc
  reviewer attribution; acceptable for a user-erasure-rights regime, flagged as a minor
  privacy/accountability consideration for Codex (Q4) and Owner awareness.
- **`findings.judgment_id`: `ON DELETE CASCADE`** — findings are sub-parts of their own judgment.
- **Not recommended:** `RESTRICT` on `evaluation_id` (would block erasure) or `CASCADE` on
  `evaluation_id` (would silently erase operator review history). A tombstone pattern is
  effectively achieved via `reviewed_evaluation_ref` + SET NULL.

---

## 19. Canonical vs derived metrics

Judgments/findings are **canonical review facts**. Derived later (NOT stored as permanent
conclusions, NOT canonical student facts): human PASS/fail rate, issue-category frequency,
severity distribution, model/version quality trend, university/question trend, review coverage,
sample rate. HQP must **never** store conclusions like "student X writes poorly" or "model Y is
93% accurate." Analytics is a consumer, never an authority (SOURCE_OF_TRUTH #21). HQP-1
identifies these as future derived metrics and implements **none**.

---

## 20. Read-contract evolution (additive; `ql-read-v1` preserved)

`ql-read-v1` and `ql_case_detail` are **unchanged** (deployed, consumer-stable). Human Quality
becomes visible through **additive** surfaces:

- **List review-state (batch):** `ql_review_state(p_evaluation_ids uuid[])` → derived projection
  per id (§13). One bounded round-trip for the current page; keeps v1 list performance/semantics
  intact and avoids a global join.
- **Detail history:** `ql_list_human_judgments(p_evaluation_id uuid)` → ordered judgment history
  + findings for one case (§21).

Alternative considered: fold review-state into a `ql-read-v2` `ql_list_cases` (LEFT JOIN
projection). Recommended **against for launch** (touches the hot list path and the deployed
contract); keep it as a later consolidation once review volume justifies it. **Do not silently
alter `ql-read-v1` semantics.**

---

## 21. Quality Console reviewer UX contract (NO implementation)

```
/ql
┌ Case list ───────────────────┬ Evaluation detail ───────────────────────────┐
│ [review badge] university     │ Question / Submission (full answer)           │
│ status · pseudonym · time     │ AI Evaluation · Dimensions · CORE / NON-CORE  │
│ core · rewrite · outcome      │ Sentence feedback · Rewrite · Evidence        │
│                               │ Provenance · Processing                       │
│ filters:                      │                                               │
│  unreviewed / failed /        │ ── Human Review ───────────────────────────── │
│  needs-review / reviewed /    │ Previous reviews (history, pseudonym, time,   │
│  disagreement                 │   rubric_version, disposition, verdicts,      │
│ [Next unreviewed →]           │   findings, note*, supersedes, disagreement)  │
│                               │ ── New review form ─────────────────────────  │
│                               │  overall disposition (required)               │
│                               │  rubric verdicts (required/conditional)       │
│                               │  issue findings [+ severity + target]         │
│                               │  recommended_action (default NONE)            │
│                               │  selection_reason (default EARLY_CENSUS)      │
│                               │  internal note*                               │
│                               │  [ Submit review ] → explicit confirm         │
└───────────────────────────────┴───────────────────────────────────────────────┘
```

Requirements: the review panel sits **below** the evidence (reviewer inspects canonical evidence
before judging); model evaluation and human review are **visually distinct**; previous human
reviews and **disagreement** are always visible (never show only the latest implying none
existed); correction/supersession is explicit; reviewer identity/time shown **pseudonymously**;
no raw account PII; **explicit submit confirmation** prevents accidental submission; a
clearly-distinct generated-rewrite section remains separate from the student answer (carried over
from the read console).

### 21.1 Launch-required vs post-launch UX

- **LAUNCH_REQUIRED:** review-state badge in list; Human Review panel; overall disposition;
  minimal rubric verdicts; issue flags; internal note; submit confirmation; previous reviews;
  "next unreviewed" workflow; basic filters (unreviewed / failed / needs-review).
- **POST_LAUNCH (non-blocking):** advanced filters/search, reviewer statistics, sample-rate
  controls, anomaly queues, bulk actions, charts, reviewer-productivity dashboards, Golden Set
  management.

---

## 22. Performance expectations

- **List:** lightweight derived review-state only (`ql_review_state` over the current page's ids);
  no full-answer load, no per-row judgment-history fetch, no full Essay-history fetch, no N+1.
- **Detail:** bounded Human Quality history for the one open case.
- **Full student answer:** detail only (unchanged from the read console).
- No large denormalized dashboard table for launch; projections are RPC/view-derived.

---

## 23. Concurrency / idempotency

- `client_submission_id` (uuid, client-generated per form) + a **partial unique index** on
  `(evaluation_id, reviewer_user_id, client_submission_id)` dedupes accidental double-clicks /
  retries (idempotent insert).
- A genuine **second** judgment by the same or another reviewer is a **new row** (not an error,
  not an overwrite).
- The submit RPC is the single write path; it returns the resulting judgment id.

---

## 24. Human review vs AI re-evaluation — decoupled

A Human `FAIL` records a fact and, optionally, a **non-executing** `recommended_action`
(§36). It must **not** automatically invalidate the AI evaluation, run AI again, change student
progress, alter the answer, publish a correction, or touch credit/billing. Any real privileged
action uses its **own** existing/future authorized path and audit. Review persistence is never
coupled to AI execution (`essay_ai_processing_runs`) or billing (`credit_*`,
`essay_billing_decisions`).

`recommended_action` bounded enum: `NONE` · `MONITOR` · `REVIEW_PROMPT` · `REVIEW_EVIDENCE` ·
`RE_EVALUATE` · `INVALIDATE_CANDIDATE` · `ESCALATE`. **Owner decision #5:** should `FAIL` trigger
any automatic action? **Recommended default: NO** — record only.

---

## 25. Student-facing consequence boundary

Human Quality is **internal by default**. A Human `FAIL` must **not** automatically remove or
modify content already shown to a student. Future cases (review-before-publication,
review-after-publication, dispute, corrected feedback, re-evaluation) are acknowledged but **not**
designed here. For launch: **preserve the Human Quality fact; separate any student-facing
consequence** into a future explicit publication/correction workflow.

---

## 26. Launch migration scope estimate (for Codex review, not authorization)

```
NEW TABLES:            2   (human_quality_judgments, human_quality_findings)
NEW FUNCTIONS/RPCS:    3   (ql_submit_human_judgment, ql_review_state, ql_list_human_judgments)
CHANGED EXISTING RPC:  0   (ql-read-v1 / ql_case_detail untouched)
NEW INDEXES:           ~5 launch-required (see §27)
RLS / POLICY:          2 tables, RLS enabled, NO client policy (fail-closed); RPC-only writes/reads
LAB ADAPTER CHANGE:    additive only — new src/lib/quality human-judgment module + read methods;
                       ql-read-v1 adapter unchanged
QUALITY CONSOLE CHANGE: add review panel + badges (SEPARATE future task; not HQP-1, not here)
MIGRATION COUNT:       likely 1 canonical forward migration (owned by the App track ledger)
```

This is an estimate for Codex review, **not** authorization to implement.

---

## 27. Indexes

- **LAUNCH_REQUIRED:**
  - `human_quality_judgments (evaluation_id, created_at DESC)` — detail history + list projection.
  - `human_quality_judgments (reviewer_user_id, created_at DESC)` — reviewer audit.
  - partial unique `human_quality_judgments (evaluation_id, reviewer_user_id, client_submission_id)` — idempotency.
  - `human_quality_findings (judgment_id)` — findings fetch.
  - `human_quality_findings (issue_category)` — issue-frequency / problem queues.
- **POST_LAUNCH:** `(overall_disposition)`, `(selection_reason)`, `(supersedes_judgment_id)`,
  `human_quality_findings (severity)`, and model/version analytic indexes — added only when
  bounded reporting needs them. No index added merely because a column exists.

---

## 28. Backward compatibility

HQP must be **purely additive**. It must not break: `ql-read-v1`; Quality Authorization; Essay
persistence; Credit/Billing; student RLS; existing invalidation/re-evaluation; the LAB static
export; or current `/ql` read-only behavior. If any accepted design detail would require breaking
one of these, it is flagged here as a **major architecture concern** — none is required by this
design.

---

## 29. Failure modes and expected safe behavior

| Failure mode | Expected safe behavior |
| --- | --- |
| Reviewer double-click | Idempotent via `client_submission_id` unique index; one row. |
| Two reviewers simultaneously | Two independent rows preserved; projection shows MULTIPLE_REVIEWS/DISAGREEMENT. |
| Stale Console detail | Submit validates against live evaluation; frozen provenance pins what was reviewed; stale read never corrupts the fact. |
| Evaluation invalidated after review | Judgment persists; frozen provenance preserves what was reviewed; no retro-mutation. |
| Evaluation superseded / re-evaluated | New evaluation → separate reviews; old judgment stays bound to old output via `reviewed_evaluation_ref`. |
| Operator authorization removed | Historical judgments remain; new writes denied by the gate. |
| Reviewer account deleted | `reviewer_user_id` SET NULL; judgment survives anonymized. |
| Student account erased / evaluation deleted | `evaluation_id` SET NULL; `reviewed_evaluation_ref` + provenance remain; no student content was stored. |
| Malformed rubric payload | Write RPC rejects (bounded keys/verdicts); no partial write. |
| Forged reviewer id | Ignored; reviewer derived from `auth.uid()` only. |
| Cross-evaluation finding target | Rejected by same-evaluation validation. |
| Correction cycle | Rejected by acyclicity check. |
| Note containing copied student PII | Length cap + guidance; reviewer responsibility; no answer text stored by design; flag for operator training. |
| Old rubric history after rubric upgrade | `rubric_version` preserves original semantics; never reinterpreted. |

---

## 30. Owner decisions required (minimized)

| # | Decision | Recommended default | Consequence if deferred |
| --- | --- | --- | --- |
| 1 | Overall disposition vocabulary | `PASS / PASS_WITH_NOTES / NEEDS_REVIEW / FAIL` | Codex cannot finalize the disposition enum / blocking rule. |
| 2 | May Quality operators also write reviews at launch? | **Yes (AUTH-A)**; revisit when team/role scope grows | Blocks the write-authorization design. |
| 3 | May any authorized reviewer correct another's review, or only the author? | **Any authorized reviewer** (correction records its own author) | Blocks supersession authorization rule. |
| 4 | Are internal notes mandatory or optional? | **Optional**, length-capped | Minor; affects form validation only. |
| 5 | Should `FAIL` trigger any automatic action? | **No** — record only; actions use their own paths | Prevents unsafe coupling if deferred wrong. |

These are genuine product-policy questions only; no low-level PostgreSQL decision is escalated.

---

## 31. Codex handoff packet (HQP-2)

```
RECOMMENDED_OPTION:   Option D (hybrid): append-only human_quality_judgments (rubric as versioned
                      JSONB) + normalized human_quality_findings; additive RPCs; reuse
                      quality_operators (AUTH-A) with SECURITY DEFINER write.
WHY:                  Smallest structure that supports near-census launch and survives growing
                      review volume without redesign; append-only history; queryable issues;
                      rubric-evolvable; ql-read-v1 untouched.
CANONICAL_NEW_FACT:   Human Quality Judgment (a human's review of a specific AI evaluation/output)
                      — new canonical fact, separate from model evaluation and student progress.
PROPOSED_OBJECTS:     human_quality_judgments; human_quality_findings (see §10.1).
PROPOSED_RPC_SURFACE: ql_submit_human_judgment(...) [write];
                      ql_review_state(p_evaluation_ids uuid[]) [list projection];
                      ql_list_human_judgments(p_evaluation_id uuid) [detail history].
                      0 changes to ql_case_detail / ql_list_cases (ql-read-v1).
AUTHORIZATION:        SECURITY DEFINER write RPC; reviewer = auth.uid(); gate = is_quality_operator();
                      RLS fail-closed, no client table rights; no privileged service key in browser;
                      no email/profile/school/self-enroll authority.
APPEND_ONLY_RULE:     All judgment/finding rows immutable; no in-place verdict edit; current/
                      superseded/disagreement derived, never stored mutable.
CORRECTION_RULE:      supersedes_judgment_id (self-FK), same-evaluation, acyclic; NULL = independent
                      review; a later review never implicitly supersedes an earlier one.
ERASURE_RULE:         evaluation_id ON DELETE SET NULL (+ immutable reviewed_evaluation_ref);
                      reviewer_user_id ON DELETE SET NULL; findings.judgment_id ON DELETE CASCADE;
                      no student content stored.
RUBRIC_V1:            hq-rubric-v1: 6 REQUIRED (diagnosis, CORE/priority, actionability, evidence,
                      stance/minimal-edit, hallucination[blocking]) + 3 CONDITIONAL (sentence,
                      progression, generated-rewrite); verdicts OK/CONCERN/FAIL/NA; defined in
                      code/docs, referenced by rubric_version.
LIST_PROJECTION:      Derived ql_review_state: human_review_state {UNREVIEWED, REVIEWED_ACCEPTABLE,
                      REVIEWED_WITH_CONCERNS, REVIEWED_FAILED, MULTIPLE_REVIEWS, DISAGREEMENT},
                      human_review_count, latest_human_reviewed_at, has_material_issue.
DETAIL_HISTORY:       ql_list_human_judgments: all judgments (+findings) for the evaluation,
                      ordered, pseudonymous reviewer, rubric_version, disposition, verdicts,
                      findings, note (authorized), supersession, disagreement.
LAUNCH_REQUIRED_INDEXES: judgments(evaluation_id,created_at DESC); judgments(reviewer_user_id,
                      created_at DESC); unique judgments(evaluation_id,reviewer_user_id,
                      client_submission_id); findings(judgment_id); findings(issue_category).
BACKWARD_COMPATIBILITY: additive only; ql-read-v1, Quality Authorization, Essay/Credit/Billing,
                      student RLS, invalidation/re-eval, LAB static export, /ql read-only all
                      preserved.
OPEN_OWNER_DECISIONS: §30 items 1–5.
IMPLEMENTATION_NOT_AUTHORIZED: YES
```

---

## 32. Codex review questions

1. Does the proposed Human Quality fact duplicate any existing Essay canonical fact?
2. Are append-only + correction history sufficient (no mutable verdict)?
3. Is the `evaluation_id` FK + frozen-provenance binding set correct and minimal?
4. Is `auth.users` reviewer reference appropriate for privacy/erasure (SET NULL vs alternatives)?
5. Is reusing `quality_operators` (AUTH-A) acceptable least-privilege for launch, with the stated
   revisit triggers?
6. Is a gated `SECURITY DEFINER` write RPC correct vs any direct table write?
7. Is rubric-as-JSONB + `rubric_version` the right balance of queryability vs versioning?
8. Is the issue/findings structure (normalized child + bounded taxonomy + severity + optional
   target) appropriately scoped — neither over- nor under-normalized?
9. Are the FK/delete policies safe under student erasure and reviewer deletion?
10. Can CORRECTION vs INDEPENDENT review be distinguished unambiguously?
11. Is it acceptable to keep list review-state as a derived projection (no mutable status column)?
12. Can the additive read surface coexist with `ql-read-v1` unchanged?
13. Are the launch-required indexes correct and sufficient (and not excessive)?
14. Is the privileged-write audit requirement met by the append-only record + authorization-layer
    membership audit?
15. Before a real-student Pilot, is there any additional security/data blocker not covered here?

---

## 33. Architecture acceptance checklist (§65) — all addressed

Canonical meaning (§1) · separate from model evaluation (§1) · separate from student progress
(§1, §24) · review subject identity (§3) · reviewer identity (§4) · append-only history (§2) ·
correction/supersession (§12) · independent multiple reviews preserved (§13) · disagreement
semantics (§13) · rubric v1 (§6) · rubric versioning (§6.1) · overall disposition (§5) ·
structured dimensions strategy (§6, §10) · issue taxonomy (§7) · optional claim-level finding
(§7, §10.1) · internal note privacy (§8, §17) · selection reason (§11) · authorization comparison
(§15) · privileged-write audit boundary (§16) · student erasure interaction (§18) · reviewer
deletion/removal interaction (§4, §18) · idempotency/concurrency (§23) · read-contract additive
evolution (§20) · list review-state projection (§13) · detail judgment history (§21) ·
launch-required indexes (§27) · Console reviewer UX contract (§21) · near-census workflow (§21.1) ·
future sampling compatibility (§11, §19) · billing/AI execution decoupling (§24) · `ql-read-v1`
preserved (§20, §28) · Production state unchanged (§0) · Codex handoff packet (§31).

**Simplicity check (§66):** smallest structure (2 tables, 3 additive RPCs, rubric in code) that
supports near-census launch and does not need to be discarded as review volume grows — it avoids
generic RBAC, rubric CMS, workflow/event-sourcing frameworks, moderation platform, Golden Set,
sampling scheduler, and anomaly models, while still making who/what/version/correction/why/
review-state/sampling-provenance all answerable.
