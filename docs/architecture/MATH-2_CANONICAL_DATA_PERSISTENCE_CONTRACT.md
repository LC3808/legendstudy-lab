# MATH-2A — Mathematical Essay (수리논술) Canonical Data / Source / Persistence Contract

**Status:** DESIGN + CONTRACT ONLY. No migration, no code, no Production change.
**Date:** 2026-10-02
**Author role:** LegendStudy LAB Math domain contract architect (Claude).
**Repository / branch:** `LC3808/legendstudy-lab` · `claude/math-essay-architecture-v1`.
**Base commit:** `47afbdcc80845e7446495a3cdf5eac8dd5adab4b` (approved MATH-1 tip).
**Authority read:** [MATH-1_MATHEMATICAL_ESSAY_ARCHITECTURE.md](MATH-1_MATHEMATICAL_ESSAY_ARCHITECTURE.md)
(APPROVED). Deployed boundaries preserved: `ql-read-v1`, `hq-read-v1`, HQP-3 persistence, Credit.
**Successor:** [MATH-3A](MATH-3_VISION_INPUT_ARCHITECTURE.md) (Vision/input) → [MATH-4A](MATH-4_EVALUATION_ENGINE_CONTRACT.md) (evaluation engine) → [MATH-5A](MATH-5_CORE_HINT_LEARNING_CONTRACT.md) (CORE/hint learning) → [MATH-6A](MATH-6_RESOLVE_REEVALUATION_LEARNING_HISTORY_CONTRACT.md) (re-solve/reevaluation/history) → [MATH-7A](MATH-7_HUMAN_QUALITY_CONSOLE_CONTRACT.md) (Human Quality / Quality Console).

> **This document authorizes nothing and changes no system.** It contains **no** `CREATE/ALTER
> TABLE`, **no** `CREATE FUNCTION`, **no** policy SQL, **no** migration file, **no** provider code,
> **no** Supabase apply, and **no** Production query/write. Pseudo-schema and entity diagrams are
> conceptual. It turns the approved MATH-1 architecture into a concrete persistence/contract
> proposal for **MATH-2B Codex cross-review** against the real APP/shared backend. MATH-1 is **not
> redesigned**; Persistence **Option C** is **not reopened**. `ql-read-v1` / `hq-read-v1` are **not
> modified.** Production AI stays **OFF**, `PROVIDER_CALLS: 0`.

Canonical project state remains authoritative in `LC3808/legendstudy-docs`. Schema/RPC/code
authority lives with the App track (`LC3808/legendstudy-app`) + the live DB. Every existing-object
name below is a **consumer reference for Codex to confirm**, not a new canonical declaration. Per
§54 this task does **not** touch the Unified Wiki. Codex and Owner are concurrently on ADR-2
Production; MATH-2A touches no docs-repo file and no ADR-2 artifact.

---

## 0. Reading map & classification legend

Every proposed fact is classified on four axes so Codex can review intent, not guess it:

- **Nature:** `CANONICAL` (authoritative fact) · `DERIVED` (computed, not stored as authority) ·
  `EVALUATION_CONFIG` (versioned evaluation authority/config) · `DISPLAY` (presentation only).
- **Visibility:** `PUBLIC` · `STUDENT_PRIVATE` · `OPERATOR_ONLY` · `INTERNAL`.
- **Shape (physical recommendation):** `TABLE` · `JSONB` (bounded, inside a table) · `DERIVED` ·
  `APPLICATION_CONTRACT` (versioned in code/docs, not DB).
- **Identity reuse (for identity layers):** `REUSE_EXISTING` · `EXTEND_EXISTING` · `MATH_NEW`.

---

## 1. Canonical principle — university-specific evaluation authority (`UNIVERSITY_SPECIFIC_EVALUATION: PASS`)

**LAB must not evaluate every university with one universal generic rubric.** Evaluation authority
is **contextual** and resolved along this scope chain:

```
UNIVERSITY → ADMISSION/EXAM TRACK → ACADEMIC YEAR → DOMAIN/DEPT (eligible track)
          → PROBLEM → SUBPROBLEM → OFFICIAL SOURCE / SCORING CRITERIA
          → RESPONSE FORMAT → EVALUATION PROFILE
```

The same university may change format across year, track, department/series, problem, and
subproblem. This variability is modeled as **data + versioned evaluation config**, never as
hardcoded university-name conditionals in application logic. The object that carries contextual
authority is the **Evaluation Profile** (§4), resolved deterministically (§33).

---

## 2. Response format — new required canonical fact (`RESPONSE_FORMAT_CONTRACT`)

Bounded enum `response_format`:

| value | meaning | answer layer | path layer | writing layer |
| --- | --- | --- | --- | --- |
| `SHORT_ANSWER` | final result primarily required | REQUIRED | NA unless criteria require | NA/reduced |
| `SHORT_REASONING` | concise result + essential reasoning | REQUIRED | SELECTED dims only | reduced |
| `FULL_SOLUTION` | conventional math essay | REQUIRED | REQUIRED | REQUIRED |
| `PROOF` | proposition/links/justification central | conclusion REQUIRED but **insufficient alone** | REQUIRED | REQUIRED |
| `MIXED` | parent with heterogeneous subproblem formats | per child | per child | per child |

**Canonical authority location (`RESPONSE FORMAT RESOLUTION`, §34):** `response_format` is
**authoritative at the subproblem** (the leaf that is actually answered and evaluated). A problem
with no subproblems carries the format on the single implicit leaf (§10). Parent/problem-level
format is **DERIVED**: if all child leaves share one format → that format; if they differ → `MIXED`.

**`MIXED_PERSISTED: NO`.** `MIXED` is a derived convenience for catalog display, computed from
heterogeneous child `response_format` values. Persisting it would create a second source of truth
that can silently contradict the leaves. (Owner-materiality: none — pure normalization call, so it
is a recommendation, not an escalation.)

---

## 3. Critical invariant — brevity is not an error (`SHORT_ANSWER_SUPPORT: PASS`)

The evaluator must **never** infer `short response ⇒ INSUFFICIENT_JUSTIFICATION` without consulting
the canonical response requirements. This is made canonically expressible by binding the applicable
evaluation layers to `response_format` via the Evaluation Profile (§4, §15):

- `SHORT_ANSWER` subproblem requiring `"12"`: `answer_status = CORRECT` is a **complete** result;
  the path/writing layers are `NA` unless official criteria say otherwise, so no justification
  penalty can be emitted.
- The **same literal `"12"`** under a `FULL_SOLUTION` profile may be `answer_status = CORRECT` while
  the path/justification layers are `INSUFFICIENT_JUSTIFICATION` — because the profile marks those
  layers REQUIRED.

The **Evaluation Profile decides which layers are applicable**; the three evaluation layers (§6 of
MATH-1) are never collapsed, and "which layers apply" is config, not client UI. This single
mechanism satisfies CASE B/C/D/E of §35.

---

## 4. Evaluation Profile — the pivot canonical object (`EVALUATION_PROFILE`)

An **Evaluation Profile** is the versioned authority that says *how a specific scope is evaluated*.
It is `EVALUATION_CONFIG`, `OPERATOR_ONLY`/`PUBLIC`-metadata-split, `TABLE` + bounded `JSONB`.

Candidate facts, separated by the four axes (the brief's "do not blindly persist" requirement):

| candidate | classification | where |
| --- | --- | --- |
| `response_format` | CANONICAL | subproblem (§2); profile references it |
| official scoring-criteria refs | CANONICAL | FK → `math_scoring_criteria` (§13) |
| official point allocation | CANONICAL | on scoring criteria (§13) |
| required reasoning elements / concepts / intermediate results | EVALUATION_CONFIG | profile `JSONB` (bounded) |
| required justification | EVALUATION_CONFIG | derived default from `response_format`, overridable in profile |
| answer requirement (what counts as "the answer") | CANONICAL | subproblem / profile |
| official format/length constraints | CANONICAL (only if official) | profile `JSONB` |
| acceptable equivalent forms | EVALUATION_CONFIG | profile `JSONB` (bounded) |
| known valid alternative paths | CANONICAL | FK → `math_alternative_paths` (§12) |
| rubric applicability / conditional dimensions | EVALUATION_CONFIG | `rubric_applicability` (§15) |
| official examiner-intent refs | CANONICAL | FK → `math_source_artifacts` (§8) |
| source authority / provenance | CANONICAL | FK → source artifacts + `authority_rank` |
| verification state | CANONICAL | profile lifecycle (§36, §37) |
| version | CANONICAL | `evaluation_profile_version` (§7) |

**Minimum stable contract:** a profile stores (a) its **scope binding**, (b) ordered **references**
to official criteria / solution / examiner-intent / alternative paths, (c) a bounded
**`rubric_applicability`** override, (d) **verification state + version**. It does **not** duplicate
the criteria/solution bodies (those are their own versioned entities) and does **not** store derived
defaults that the versioned applicability contract (§15) already yields.

---

## 5. Evaluation authority precedence (not a simple replacement chain)

MATH-1's ranked `reference_kind` is preserved:

```
OFFICIAL_SCORING_CRITERIA > OFFICIAL_SOLUTION/SAMPLE_SOLUTION > OFFICIAL_EXAMINER_INTENT
  > VERIFIED_INTERNAL_CANONICAL_SOLUTION > AI_GENERATED_ALTERNATIVE_SOLUTION
```

But precedence is **role-separated, not a replacement chain**:
- **Official scoring criteria** define *what earns points* (the scoring authority).
- **Official solution** provides *one valid path* (a reference, not the exclusive gold path).
- Therefore an **alternative mathematically valid path is accepted when the criteria permit it or do
  not prohibit it** — "different from the official solution" is **never** equated with "wrong"
  (MATH-1 invariant §5/§16). The profile carries both kinds of reference with an `authority_rank`;
  future evaluation logic uses criteria for scoring and solution(s) as reference paths.

---

## 6. University / exam / year / problem identity (`REUSE/EXTEND/MATH_NEW`)

**Do not create a second university master.** Prefer references to existing canonical
university/content facts (the same identity surfaced by `ql-read-v1`: `university_name`,
`exam_name`, `admission_year`, `question_id`, `question_label`).

| identity layer | decision | note (Codex confirms exact canonical object) |
| --- | --- | --- |
| university | **REUSE_EXISTING** | APP canonical university/content master; FK, no duplicate master |
| admission/exam track | **REUSE_EXISTING** | existing exam/track identity (`exam_name` scope) |
| academic year | **REUSE_EXISTING** | existing `admission_year` |
| domain / department / series applicability | **MATH_NEW** | math eligibility set has no Humanities equivalent |
| problem set | **MATH_NEW** | structured math container (Humanities `question` ≠ math problem set) |
| problem | **MATH_NEW** | versioned math problem; FK up to reused university/exam/year identity |
| subproblem | **MATH_NEW** | leaf unit carrying `response_format` |

**Principle:** Math problem structures are genuinely new (Humanities `question_id` is a single-prompt
essay question; a math problem set has subproblems, conditions, per-leaf formats), so they are
`MATH_NEW`, **but they FK upward to the reused university/exam/year identity** rather than minting a
parallel university master. Codex §49 confirms the exact canonical identity objects and FK columns.

---

## 7. Versioning (`PROBLEM_VERSIONING` / `SOURCE_VERSIONING` / `EVALUATION_PROFILE_VERSIONING`)

MATH-1 requires an evaluation to pin: `problem_version`, `official_source_version`, `rubric_version`,
`canonical_solution_version`, `extraction_version`. MATH-2A makes each a concrete versioned fact.

Versioning model (uniform): a stable **logical id** + an **immutable version row** chain. New facts
(corrected problem, correction notice, updated official solution, updated scoring guide, improved
extraction, additional verified alternative) create **new immutable version rows**; prior versions
are preserved and never edited.

| versioned entity | logical id | version row | pinned by evaluation as |
| --- | --- | --- | --- |
| problem | `problem_id` | `problem_version` | `problem_version` |
| subproblem | `subproblem_id` | tracks parent problem version + own revision | part of `problem_version` scope |
| official source | `source_id` | `source_version` | `official_source_version` |
| canonical solution | `canonical_solution_id` | `canonical_solution_version` | `canonical_solution_version` |
| scoring criteria | `criteria_set_id` | `criteria_version` | via `evaluation_profile_version` |
| evaluation profile | `evaluation_profile_id` | `evaluation_profile_version` | `evaluation_profile_version` |
| extraction run | `extraction_run_id` | `extraction_version` | `extraction_version` |
| rubric | — | `rubric_version` (`math-rubric-v1`) | `rubric_version` (APPLICATION_CONTRACT, §14) |

Later source corrections **never** silently rewrite historical evaluation provenance — an old
evaluation remains reproducible under its pinned versions. Supersession is an explicit new version +
lifecycle state `SUPERSEDED` (§36), not an in-place edit.

---

## 8. Official source artifact (`OFFICIAL_SOURCE_MODEL`)

`math_source_artifacts` — `CANONICAL`, `PUBLIC`(metadata)/`INTERNAL`(raw), `TABLE`.

Facts: `source_id` · `source_version` · `source_kind` (`PDF | SCANNED_PDF | IMAGE | WEBPAGE |
ANSWER_SHEET | SCORING_GUIDE | EXAMINER_COMMENTARY`) · `reference_kind` (§5 authority) · source
URL/reference · publisher/university (FK to reused identity) · published/retrieved date (where
appropriate) · verification state (§37) · page/region references · **artifact storage reference**
(object-storage key, §40) if retained · **content hash** (§39) · structured-extraction linkage.

Rules: **never lose source traceability**; an **AI-generated extraction is never the official source
itself** (§11, §37). Raw-artifact retention vs reference-only is an Owner/legal decision (§9, §50
D1).

---

## 9. Copyright / storage boundary (four distinct concepts)

| concept | classification | stored as | notes |
| --- | --- | --- | --- |
| **PUBLIC SOURCE METADATA** | CANONICAL / PUBLIC | DB rows | title, publisher, date, URL, status — safe to expose |
| **OFFICIAL SOURCE REFERENCE** | CANONICAL / PUBLIC | DB rows | pointer/URL + hash to the official artifact |
| **INTERNAL STRUCTURED EXTRACTION** | CANONICAL / OPERATOR_ONLY | DB rows + bounded JSONB | derived; provenance-labeled; never "official" |
| **RAW ARTIFACT STORAGE** | CANONICAL / INTERNAL | object storage + DB ref | retention/legality **UNRESOLVED** |

Policy recommendation: **preserve provenance by reference + hash by default**; retain raw artifacts
only in controlled internal storage, behind a legal/copyright review gate — **do not assume every
university PDF is indefinitely copied into private storage**. This is an **explicit unresolved
decision** (§50 D1); provenance-by-reference lets content work proceed without pre-committing to
raw-artifact retention.

---

## 10. Problem / subproblem entities

`math_problem_sets` → `math_problems` → `math_subproblems`. All `CANONICAL`, `PUBLIC`(statement
metadata), `TABLE`, versioned (§7).

Support: problem number · subproblem label · ordering · parent-child relationship · problem
statement · conditions · given facts · required conclusion · `response_format` (subproblem, §2) ·
point allocation (where official, §13) · official-source linkage (§8).

Rules:
- **Subproblems are not required** when a problem has none — a solo problem has one **implicit leaf**
  that carries `response_format` and is the evaluation/answer unit (keeps the resolver uniform
  without forcing a fake subproblem row; implementation may model the solo leaf as a degenerate
  subproblem or as problem-level leaf fields — Codex normalization call §47).
- **Missing answer ≠ incorrect answer** — an unanswered subproblem is `NOT_ATTEMPTED` (attempt
  coverage, §17), never `INCORRECT` (MATH-1 §14).

---

## 11. Canonical solution (`CANONICAL_SOLUTION_MODEL`)

`math_canonical_solutions` + `math_canonical_solution_steps`. `CANONICAL`, `OPERATOR_ONLY` (body),
`TABLE`, versioned (§7).

Support: final answer (per subproblem) · official steps · critical transformations · concept/theorem
dependencies · scoring-point linkage (§13) · known alternative paths (§12) · source provenance (§8)
· verification state (§37) · version.

**Provenance kind is first-class and never conflated** — `solution_origin ∈ { OFFICIAL,
VERIFIED_INTERNAL, AI_GENERATED }`:
- `OFFICIAL` — source authority establishes provenance, but structured **step extraction still
  needs verification** before activation (§38).
- `VERIFIED_INTERNAL` — explicit reviewer + verification state.
- `AI_GENERATED` — **non-authoritative** until separately verified; it **never becomes canonical
  authority merely because it exists** (§38).

---

## 12. Alternative solution paths (`ALTERNATIVE_PATH_MODEL`)

`math_alternative_paths` — `CANONICAL`, `OPERATOR_ONLY`, `TABLE`. Stores **known** alternatives
without attempting to enumerate every possible solution. `path_origin ∈ { KNOWN_VERIFIED_ALTERNATIVE
| AI_PROPOSED_ALTERNATIVE | STUDENT_NOVEL_PATH }`.

- A **student novel path can be valid even if not previously persisted** — the evaluator is **not a
  whitelist** (MATH-1 §5/§16). When equivalence to criteria cannot be established →
  `MATHEMATICAL_EQUIVALENCE_UNCERTAIN → NEEDS_HUMAN_REVIEW`, never silent `INVALID`.
- A `STUDENT_NOVEL_PATH` is recorded as evidence on the evaluation, but **promotion** to
  `KNOWN_VERIFIED_ALTERNATIVE` is a **separate content-review action** (§38), never automatic.

---

## 13. Scoring criteria (`OFFICIAL_SCORING_MODEL`) & coexistence with the common rubric

`math_scoring_criteria` — `CANONICAL`, `OPERATOR_ONLY`/`PUBLIC`(where published), `TABLE` + bounded
`JSONB` for irregular official payloads. Per criterion: `criterion` · `subproblem_ref` · official
points · required element · partial-credit rule · blocking condition · source provenance (§8) ·
`criteria_version`.

**Coexistence rule (no contradiction):**
- Where a university **published** scoring criteria → those criteria **take precedence** and carry
  official points. **Never invent numerical weights the university did not publish.**
- Where none were published → `math-rubric-v1` (§14) is the **fallback/common** structure, producing
  **qualitative** dimension verdicts (not a fabricated number), explicitly provenance-labeled
  non-official (CASE F/H of §35).
- Both coexist: official criteria = scoring authority; common rubric = diagnostic structure. The
  Evaluation Profile (§4) says which applies. (CASE G: criteria + examiner intent + sample solution
  all referenced, no contradiction.)

---

## 14. `math-rubric-v1` persistence (`MATH_RUBRIC_V1 PERSISTENCE`)

The approved dimensions (8 required incl. 2 blocking + 2 conditional) are an **APPLICATION_CONTRACT**,
not DB rows — mirroring HQP's `hq-rubric-v1` decision (definitions in code/docs, referenced by
version). What lives where:

| fact | shape |
| --- | --- |
| rubric version identity (`math-rubric-v1`) | APPLICATION_CONTRACT (pinned on each evaluation) |
| dimension identity, blocking flags, verdict scale | APPLICATION_CONTRACT (versioned in code/docs) |
| dimension **applicability** per response_format | APPLICATION_CONTRACT defaults (§15) |
| per-profile applicability **override** | `EVALUATION_CONFIG` → profile `rubric_applicability` JSONB |
| official-criteria **mapping** to dimensions | `TABLE` (join: criterion ↔ dimension_key) |
| a specific evaluation's dimension **result** | per-evaluation output (§6C / math-eval-v1), not rubric def |

**No arbitrary weights.** Weights remain deferred (MATH-1 §9) to dataset + university calibration;
nothing in MATH-2A assigns them. A new rubric version never reinterprets historical rows.

---

## 15. Response-format → rubric applicability (canonical, not client UI) (`RESPONSE_FORMAT→RUBRIC`)

Applicability defaults are a **versioned APPLICATION_CONTRACT**, overridable per profile:

| response_format | answer verif. | path dims | writing | blocking |
| --- | --- | --- | --- | --- |
| `SHORT_ANSWER` | REQUIRED | NA (unless criteria require) | NA | — |
| `SHORT_REASONING` | REQUIRED | SELECTED required dims | reduced | per criteria |
| `FULL_SOLUTION` | REQUIRED | all applicable | REQUIRED | `logical_development`, `justification_completeness` |
| `PROOF` | conclusion REQUIRED (insufficient alone) | REQUIRED | REQUIRED | `logical_development`, `justification_completeness` (blocking) |

This mapping is **canonical evaluation authority/config**, consumed by the evaluator and by the
future Quality Console — **not** hardcoded in client UI. A profile may override (e.g. a
`SHORT_ANSWER` subproblem whose official criteria *do* demand one reasoning step). Conditional
dimensions (`case_analysis`, `graph_interpretation`) resolve to `NA` unless the problem demands them
(MATH-1 §9), using the same NA discipline as HQP.

---

## 16. Shared spine / Option C — concrete (`PERSISTENCE_OPTION: C`)

Option C is **not reopened**; it is made concrete. **Shared (reused, never duplicated, never
retrofitted into Humanities tables):**

| shared element | reuse mode | how Math uses it |
| --- | --- | --- |
| identity (`auth.users.id`) | REUSE_EXISTING | student + operator identity |
| credit / billing | REUSE + additive request kinds (§42) | single wallet; no Math balance tables |
| human-quality spine | REUSE via additive extension (§26) | append-only + SECURITY DEFINER reused |
| attempt lifecycle **pattern** | REUSE pattern, new tables | append-only immutable attempts (§17) |
| evaluation **envelope** | shared *shape* (identity/version/provenance/model meta) | Math payload = `math-eval-v1` |
| provenance discipline | REUSE principle | §7–§9, §37 |
| learning-loop linkage | REUSE pattern | re-solve/reeval linkage (§24) |

**Math-specific child persistence:** everything in the entity map (§46) — problem/subproblem,
source artifacts, evaluation profiles, scoring criteria, canonical solution (+ steps + alt paths),
attempts (+ artifacts), extraction (runs + regions), evaluations (+ steps + dependencies + errors +
CORE + hints), hint exposures, resolve links.

**Explicitly:** existing Humanities tables are **not** altered or retrofitted "for neatness"; the
sharing is at the **credit + human-quality spines and the learning-loop/evaluation-envelope
contract**, exactly as MATH-1 §22 approved.

---

## 17. Attempt model (`ATTEMPT_MODEL`) — contract for future MATH-3

`math_attempts` — `CANONICAL`, `STUDENT_PRIVATE`, `TABLE`, **append-only, never overwritten**.

Anticipates (contract only — **no Vision/upload implemented here**): typed solution · multi-page
image/PDF/tablet evidence (via `math_attempt_artifacts`, §18) · **subproblem coverage** (which
leaves this attempt answers — distinguishes `NOT_ATTEMPTED` from `INCORRECT`, §10) · original-evidence
reference · structured-extraction version linkage (§19) · attempt kind (`ORIGINAL | FULL_RESOLVE |
STEP_RETRY`, §24).

A re-solve is a **new immutable attempt** linked to its predecessor (§24); the original attempt is
never mutated (MATH-1 §19).

---

## 18. Original evidence reference (`EVIDENCE_MODEL`)

`math_attempt_artifacts` — `CANONICAL`, `STUDENT_PRIVATE`, `TABLE` (metadata) + **object storage**
(binary). **No raw image binaries in evaluation DTOs or relational columns** (MATH-1 §38, §40).

Anticipates: attempt ref · page · region · **storage/object reference** · coordinates · media type ·
hash/version (§39) · retention status. **Retention duration is not finalized here**; Math
privacy-retention is flagged **launch-required before Production** (§29, §41, `PRIVACY_FOLLOW_UP_
REQUIRED: YES`).

---

## 19. Structured-extraction persistence boundary (`EXTRACTION_BOUNDARY`) — for MATH-3

MATH-2A defines **only the persistence boundary** MATH-3 must satisfy; **no OCR/Vision provider is
chosen, no extraction implemented.**

`math_extraction_runs` (`extraction_run_id`, `extraction_version`, attempt ref, run status, model
provenance placeholder) + `math_extraction_regions` (page/region, raw extracted text, normalized
math, confidence, uncertainty reason, source coordinates). Both `CANONICAL` (derived from evidence),
`OPERATOR_ONLY`/`INTERNAL`, `TABLE`. Re-extraction = new `extraction_version`, never a silent
rewrite (MATH-1 §13). Low-confidence regions are flagged for confirmation/escalation (MATH-1 §12,
§31, §32) and are **never** silently scored `INCORRECT`.

---

## 20. Solution-step / DAG persistence (`SOLUTION_STEP_DAG`)

`math_solution_steps` — per-evaluation, `CANONICAL` (evaluation output), `STUDENT_PRIVATE`, `TABLE`:
`step_id` · `evaluation_id` · `subproblem_ref` · `order_index` · `step_kind` · `step_status` (§6B) ·
`reference_relationship` (§16) · `normalized_math` · `source_regions[]` (refs into extraction) ·
`extraction_confidence`.

**DAG edges — recommendation: JOIN RELATION (`TABLE`), not array.** `math_step_dependencies
(from_step_id, to_step_id)`:

| option | integrity | queryability | verdict |
| --- | --- | --- | --- |
| `depends_on uuid[]` array | no FK integrity; dangling ids possible | hard to traverse/validate in DB | rejected |
| **join relation** | **FK both ends; same-evaluation + acyclicity enforceable** | **traversal/query native** | **recommended** |
| fully derived | not reproducible | — | rejected (reproducibility, §21) |
| hybrid (array + table) | redundant | — | rejected (two sources of truth) |

The join relation lets the same-evaluation and acyclicity invariants (§44) be enforced, mirroring
HQP's acyclic `supersedes` discipline.

---

## 21. Root / propagated error (`ROOT_PROPAGATED_PERSISTENCE`)

`math_errors` — per-evaluation, `CANONICAL` (evaluation output, **persisted for reproducibility**),
`STUDENT_PRIVATE`, `TABLE`: `error_id` · `evaluation_id` · `step_id` · `error_kind` (ROOT |
PROPAGATED) · `error_category` (e.g. 부호 변화, 경우의 수 누락, …) · `materiality` · CORE binding (§22).
Propagation edges: reuse the dependency join (§20) tagged, or a sibling `propagation_edges` relation
`{from_step_id,to_step_id}`.

**Persist vs derive:** root/propagated classification is *derivable* from `step_status` + the DAG at
evaluation time, but the **classification result is persisted** because (a) historical
reproducibility must survive future DAG-algorithm changes, and (b) CORE binds to it. We persist the
**result**, not redundant raw inputs. (`materiality` ordering = earliest material root first, MATH-1
§7.)

---

## 22. CORE (`CORE_BINDING`)

`math_core` — per-evaluation, `CANONICAL`, `STUDENT_PRIVATE`, `TABLE`. Reuses MATH-1 CORE selection
semantics (`core_focus = true`, ordered by `priority`, **membership-not-score**) **plus** the
Math-specific binding: `solution_step_id` · `error_classification` (→ `math_errors`) · `issue/
category` · feedback/hint linkage (§23).

**VOICE-1 directly consumable:** `math_core` exposes stable `solution_step_id`, `error` ref,
`priority`, and `issue_category` — the exact structured facts VOICE-1 reads (§27), no UI parsing.

---

## 23. Hint exposure (`HINT_EXPOSURE`) — launch Levels 0–2

Two distinct facts:

| fact | classification | shape | note |
| --- | --- | --- | --- |
| hint **content/availability** (L0–2) | CANONICAL (eval output) | `math_hints` `TABLE` (eval-scoped) | generated with the evaluation; VOICE-1 target |
| hint **exposure event** | CANONICAL (student event) | `math_hint_exposures` `TABLE`, append-only | `level_reached`, timestamp, attempt/eval linkage |

Hint exposure is **learning-history signal** feeding reevaluation (§24), **not a credit charge by
default** (§42, MATH-1 §18). Progressive unlock is enforced at the application/consumer boundary;
the exposure log is the canonical record of what the student actually saw.

---

## 24. Re-solve / reevaluation linkage (`RESOLVE_REEVALUATION_LINKAGE`)

`math_resolve_links` — `CANONICAL`, `STUDENT_PRIVATE`, `TABLE`, **append-only**. Represents the
learning loop without overwriting history:

```
original attempt ──(FULL_RESOLVE | STEP_RETRY)──▶ new attempt
       │                                               │
   evaluation A ◀──reevaluation_link(prior_attempt, prior_evaluation)── evaluation B
```

An evaluation record carries an optional `reevaluation_link { prior_attempt_id, prior_evaluation_id,
deltas }` (MATH-1 §20). Reevaluation deltas (CORE corrected? root removed? new independent error?
answer now correct? justification now sufficient?) are **evaluation output facts**. Predecessor must
belong to the **same student + problem lineage** (§44). No evaluation is implemented here — only the
linkage contract.

---

## 25. Credit integration boundary (`CREDIT_BOUNDARY`)

**Single existing Credit authority. No Math wallet/balance tables.** Math needs only an additive
extension of **request kinds / domain discriminator** on the existing credit/billing contract.
Minimum future extension (Codex to map onto the real contract, §49): recognize `MATH_INITIAL_
EVALUATION` and `MATH_REEVALUATION` request kinds under the existing domain discriminator, reusing
the Humanities initial/re-eval credit semantics. **No prices decided** (§42).

---

## 26. Human Quality boundary (`HUMAN_QUALITY_BOUNDARY`)

**HQP is not redesigned.** Math needs only the future **additive** contract (MATH-1 §24/§36):
`hq-math-rubric-v1` + Math finding targets `SOLUTION_STEP`, `ROOT_ERROR`, `EXTRACTION_REGION`,
`ALTERNATIVE_PATH`. **Math persistence IDs Human Quality will reference** (stable, so HQP can bind
without copying bodies): `math_evaluations.evaluation_id` (+ frozen provenance: `evaluation_version`,
`canonical_solution_version`, `extraction_version`, output hash), `math_solution_steps.step_id`,
`math_errors.error_id`, `math_extraction_regions.region_id`, `math_alternative_paths.path_id`,
`math_core.core_id`. HQP's append-only/derived-projection/SECURITY-DEFINER spine is reused
unchanged; `hq-read-v1` is **not modified**. No HQR Math UI here.

---

## 27. VOICE-1 boundary (`VOICE_1_COMPATIBILITY: PASS`, `VOICE_1_AUDIO_PERSISTENCE: NONE_BY_DEFAULT`)

Owner: VOICE-1 is `POST_LAUNCH_REQUIRED`, target before 2026-10-end, does **not** block initial
launch. Owner decisions honored by the contract:

- **`AUDIO_PERSISTENCE: NONE_BY_DEFAULT`** — no permanent per-student audio storage; audio is
  `ON_DEMAND / EPHEMERAL`. (No `math_audio` table proposed.)
- **Voice script is `DERIVED / NON_CANONICAL`** — not stored as authority; canonical evaluation
  text/facts remain authority; VOICE-1 is never an independent evaluation authority.

MATH-2A **preserves stable IDs/structured facts** for every VOICE-1 target, so the voice adapter
reads facts, not UI:

| VOICE-1 target | stable canonical id/fact |
| --- | --- |
| overall evaluation | `math_evaluations.evaluation_id` + `evaluation` group |
| rubric dimension | dimension result keyed by `math-rubric-v1` dimension_key |
| CORE | `math_core.core_id` (+ `solution_step_id`, `priority`, `issue_category`) |
| solution step | `math_solution_steps.step_id` + `normalized_math` |
| root error | `math_errors.error_id` (+ `error_category`, `step_id`) |
| hint | `math_hints` (level) + exposure linkage |
| reevaluation delta | `reevaluation_link.deltas` |
| normalized math | `math_solution_steps.normalized_math` / extraction region |

No TTS implemented.

---

## 28. Science future compatibility

Option C still permits later Physics/Chemistry/Biology/Earth Science as **additional domains on the
same shared spine** (identity, credit, human-quality, attempt lifecycle, evaluation envelope) with
their **own child persistence** — **without** forcing Math facts into generic flattened structures
and **without** Science tables now. The domain discriminator lives on the shared spine (credit
request kinds, evaluation envelope), not inside Math's step/DAG/error model.

---

## 29. Privacy / account-deletion compatibility (`ACCOUNT_DELETION_COMPATIBILITY`)

ADR-2 (APP/shared backend) is **not modified.** MATH-2A only **identifies** future personal Math
data that account deletion must erase, and the Human-Quality interaction (reuse HQP's `SET NULL` +
no-student-content rule). Full graph in §41. `PRIVACY_FOLLOW_UP_REQUIRED: YES` — Math raw-evidence
retention policy is launch-required before Production.

---

## 30 / 43. Query & index matrix (`LAUNCH_REQUIRED_INDEX_PATTERNS`)

No SQL — product query patterns so Codex can choose real indexes.

| # | QUERY | CONSUMER | CARDINALITY | ORDERING | LAUNCH? | EXPECTED INDEX DIRECTION |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | university/year/track → problem sets | catalog | small | label/number | **YES** | (university, year, track) |
| 2 | problem → subproblems | catalog/student | small | `order_index` | **YES** | (problem_id, order_index) |
| 3 | subproblem → active evaluation profile | resolver | 1 | — | **YES** | unique (scope, ACTIVE) (§33) |
| 4 | problem_version → official sources | catalog/operator | small | — | **YES** | (problem_id, problem_version) |
| 5 | problem_version → canonical solution | evaluator/operator | 1..few | version | **YES** | (problem_id, problem_version, solution_origin) |
| 6 | student → recent attempts | student | medium | `created_at` DESC | **YES** | (student_id, created_at DESC) |
| 7 | attempt → current extraction | worker/operator | 1 | `extraction_version` DESC | **YES** | (attempt_id, extraction_version DESC) |
| 8 | attempt → evaluations | student | small | `created_at` DESC | **YES** | (attempt_id, created_at DESC) |
| 9 | evaluation → steps | student/operator | medium | `order_index` | **YES** | (evaluation_id, order_index) |
| 10 | evaluation → root errors | student/operator | small | materiality | **YES** | (evaluation_id, error_kind) |
| 11 | evaluation → CORE | student/VOICE-1 | 1..few | `priority` | **YES** | (evaluation_id, priority) |
| 12 | evaluation → hint exposure | student | small | `created_at` | **YES** | (evaluation_id) / (attempt_id) |
| 13 | attempt → re-solves | student | small | `created_at` | **YES** | (prior_attempt_id) |
| 14 | Quality → evaluation evidence | operator | bounded | `created_at` DESC | **YES** | (evaluation_id) (via projection) |
| 15 | issue-category frequency, model-drift trend | analytics | large | — | **POST_LAUNCH** | analytic indexes only when needed |
| 16 | step-dependency traversal | evaluator/operator | medium | — | POST_LAUNCH (unless profiling shows) | (from_step_id)/(to_step_id) |

`POST_LAUNCH_INDEX_PATTERNS`: analytics/trend (15), dependency-traversal tuning (16), and any index
added only when a bounded reporting need appears — **no analytics indexes invented for launch**.

---

## 31. RLS / authorization requirements (`RLS_REQUIREMENTS`)

Security requirements only (Codex performs the canonical DB/security review):

- **Public problem/official-source *metadata*** readable where legally/operationally appropriate
  (§9) — never student data.
- **Student-owned** attempt/evidence/evaluation/hints/re-solve: readable/writable **only by owner**;
  RLS by `auth.uid()` ownership; **no cross-student access**.
- **Private raw student artifacts**: no public access; signed/authorized access only (§40), never a
  public bucket.
- **Quality operator** access to student evidence/evaluations **only through approved projections/
  RPCs** gated by `is_quality_operator()` — **no browser-direct access to Human Quality tables**,
  reused from HQP (RLS fail-closed, no client policy, RPC-only).
- **No `service_role` in the browser/runtime** (reused LAB non-negotiable).
- Writes to canonical content (problems/sources/profiles/solutions) are operator/worker-gated via
  SECURITY DEFINER paths, never direct browser inserts.

---

## 32 / 45. RPC / DTO boundary & versioning (`DTO_BOUNDARY`)

Four consumer families, kept separate so raw internal tables are never exposed:

| family | conceptual DTO | consumer | contents |
| --- | --- | --- | --- |
| **A. Public / catalog read** | `math-catalog-v1` | PUBLIC | university/year/track/problem discovery, problem/subproblem metadata, `response_format`, public official-source metadata, published scoring metadata where appropriate |
| **B. Student-owned work** | `math-attempt-v1` + `math-eval-v1` | STUDENT_PRIVATE | own attempt, own evidence refs, own extraction, own evaluation, own hints, own re-solve/reevaluation history |
| **C. Quality / operator read** | `qlm-read-v1` (additive, **new**) | OPERATOR_ONLY | Math Quality projection: original evidence via controlled operator authorization, official refs, extraction uncertainty, step/error/CORE structure, Human Quality history |
| **D. Internal / worker** | (no public DTO) | INTERNAL | Vision/extraction persistence, evaluation finalization, billing/credit integration, generated artifacts, lifecycle cleanup |

**Separate Math RPCs with additive compatibility — not modification of Humanities contracts.**
`ql-read-v1` and `hq-read-v1` are **not changed.** Recommendation: a **new `qlm-read-v1`** Math
Quality projection rather than overloading `ql-read-v1`, because the Math evidence shape (steps,
DAG, extraction regions, root/propagated) has no Humanities analogue; a domain-discriminated shared
envelope would force Humanities consumers to tolerate Math-only groups. The shared *discipline*
(envelope shape, fail-closed version check) is reused; the payloads are domain-specific.

**DTO versioning (`math-catalog-v1`, `math-attempt-v1`, `math-eval-v1`, `qlm-read-v1`):** follow the
existing LAB rule — **consumer fails closed on unsupported DTO version** (reuse LEC-1 §1 behavior:
unknown `dto_version` → `UNSUPPORTED_DTO`, never silent reinterpretation). Change rules: additive
optional field → **same version**; new required field / changed semantics of an existing field →
**new minor contract** (documented, still fail-closed on mismatch); incompatible restructuring →
**new DTO version**. `[]` vs `null` vs absent is preserved (empty ≠ unavailable), reusing the LEC-1
defensive-read discipline.

---

## 33. Evaluation-profile resolution (launch-critical, deterministic)

Given (university, year, track, dept/series applicability, problem, subproblem), the resolver
returns **exactly one** authority or fails closed:

Output: `evaluation_profile_id` · `evaluation_profile_version` · `response_format` · official
criteria refs · rubric applicability · `canonical_solution_version` · source provenance.

**Deterministic precedence (most specific wins, no fuzzy "best match"):**
```
subproblem-bound profile  >  problem-bound  >  track/year-bound  >  COMMON_MATH_RUBRIC fallback
```
- Each profile declares an explicit `scope_binding` + `specificity_rank`. The resolver selects the
  ACTIVE profile at the **finest** matching granularity.
- **Uniqueness invariant (DB-enforceable):** at most **one ACTIVE profile per exact scope**. If two
  ACTIVE profiles match the **same exact** scope → **FAIL CLOSED: `CONTENT_CONFIGURATION_ERROR`**
  (never silently choose one).
- **Fallback:** if no university-specific profile exists, `COMMON_MATH_RUBRIC` fallback is allowed
  **only if explicitly enabled**, and is **provenance-labeled non-official** — fallback criteria are
  **never** presented as official university criteria (CASE H). Owner-materiality: whether fallback
  is enabled per scope is content config, recommend **enabled with explicit non-official labeling**.

---

## 34. Response-format resolution

Canonical authority = **subproblem** (§2). Parent/problem format is **DERIVED** (`MIXED` when
children differ). The contract supports **per-subproblem** resolution (a parent may hold `(1)
SHORT_ANSWER, (2) SHORT_REASONING, (3) FULL_SOLUTION`). If all children share a format, the
parent-level value is a derived convenience. **`MIXED_PERSISTED: NO`** (§2 rationale). This directly
satisfies CASE E.

---

## 35. University-scenario validation (contract, not hardcoded logic)

| case | scenario | contract mechanism | result |
| --- | --- | --- | --- |
| A | full essay, official solution available | `FULL_SOLUTION` profile + `OFFICIAL` canonical solution | all layers; alt paths accepted |
| B | short-answer-heavy | `SHORT_ANSWER` profile; path/writing NA | brevity not penalized (§3) |
| C | short-reasoning | `SHORT_REASONING` profile; selected dims | reduced rubric, no full-essay demand |
| D | proof | `PROOF` profile; logical_development + justification_completeness **blocking** | correct proposition alone insufficient |
| E | mixed set | per-subproblem `response_format`; parent `MIXED` derived | each leaf evaluated by its own format |
| F | official answer + solution, no scoring points | criteria absent → common rubric qualitative; solution = reference path | no invented points |
| G | scoring points + examiner intent + sample solution | criteria = scoring authority; intent + solution referenced | coexist, no contradiction (§13) |
| H | no official solution | `VERIFIED_INTERNAL` or none; fallback labeled non-official | provenance stays non-official (§33) |

Formats are **data per year/track/problem** — no claim that any named university always uses one
format; no university-name conditionals.

---

## 36. Content ingestion workflow & lifecycle

```
official source discovered → source metadata registered → artifact/reference verified
  → problem/subproblem structured → response_format assigned → official answer/solution extracted
  → scoring criteria structured → canonical solution created/verified → evaluation profile assembled
  → Owner/content review → publish/activate version
```

**Lifecycle states (per versioned content entity):** `DRAFT → REVIEWED → ACTIVE → SUPERSEDED →
RETIRED`. Only an `ACTIVE` version is evaluation authority; a new version supersedes (never edits)
the prior. This is **enough discipline to stop unreviewed AI extraction from becoming active
evaluation authority** — deliberately **not** a full CMS.

---

## 37. Human verification of source structuring (`verification_state`)

`verification_state ∈ { UNVERIFIED_EXTRACTION | HUMAN_VERIFIED | OFFICIAL_DIRECT | INFERRED }`.
AI extraction **≠** verified canonical source. A structured scoring criterion extracted from a PDF
**must not become `ACTIVE` merely because a model produced it.**

**Require human verification before activation (launch):** scoring criteria, canonical-solution
steps, `response_format` assignment, evaluation-profile assembly. **Do not require** manual
verification of harmless metadata (source title, URL, published date) where it adds no safety value
(be practical).

---

## 38. Canonical-solution activation rules

- **Official solution:** source authority establishes provenance, but structured **step extraction
  still needs `HUMAN_VERIFIED`** before `ACTIVE`.
- **Verified internal:** explicit reviewer + verification state required.
- **AI-generated alternative:** stays **non-authoritative** until separately verified.
- **Student novel path:** never canonical because one evaluation accepted it; promotion to
  `KNOWN_VERIFIED_ALTERNATIVE` is a **separate content-review action** (§12).

---

## 39. Source hash / immutability (`HASH_*`)

| artifact | recommendation | why |
| --- | --- | --- |
| official raw artifact | **HASH_REQUIRED** | detect changed official PDF, bind extraction to exact bytes, reproducibility, prevent silent replacement |
| structured source representation | **HASH_OPTIONAL** | version id usually suffices; hash to pin to source bytes |
| student raw evidence | **HASH_OPTIONAL** | integrity/dedup; privacy-aware, not required |
| canonical solution version | **HASH_OPTIONAL** | `canonical_solution_version` identity suffices; hash for pinning |
| evaluation profile version | **HASH_OPTIONAL** | `evaluation_profile_version` identity suffices |

Hash is **not** a substitute for provenance (§8). No cryptographic implementation details chosen.

---

## 40. Storage model (`STORAGE` namespaces)

Four separated namespaces; **binaries in object storage + DB metadata reference**, never binary
blobs in relational columns; **no public access to student evidence**:

| namespace | visibility | storage |
| --- | --- | --- |
| `OFFICIAL_SOURCE_ARTIFACT` | OPERATOR/INTERNAL (raw); PUBLIC (metadata) | object storage + DB ref + hash |
| `STUDENT_PRIVATE_EVIDENCE` | STUDENT_PRIVATE | object storage (authorized/signed only) + DB ref |
| `DERIVED_EXTRACTION` | OPERATOR/INTERNAL | DB rows + bounded JSONB (small); large derived artifacts → object storage ref |
| `GENERATED_STUDENT_ARTIFACT` | STUDENT_PRIVATE | object storage + DB ref |

Signed/authorized access is a later decision; no public student-evidence access is designed.

---

## 41. Account-deletion / retention graph (`ACCOUNT_DELETION` — Codex checklist)

ADR-2 **not modified.** Math objects future ADR integration must cover on student deletion:

```
student identity (auth.users.id)
 └─ math_attempts (+ subproblem coverage)
     ├─ math_attempt_artifacts ───▶ STUDENT_PRIVATE_EVIDENCE object storage (erase bytes)
     ├─ math_extraction_runs → math_extraction_regions (DERIVED_EXTRACTION)
     ├─ math_evaluations
     │   ├─ math_solution_steps → math_step_dependencies
     │   ├─ math_errors (+ propagation edges)
     │   ├─ math_core
     │   └─ math_hints
     ├─ math_hint_exposures
     ├─ math_resolve_links
     └─ generated student-specific artifacts (GENERATED_STUDENT_ARTIFACT object storage)
```

Rules: **official/public Math content is NOT deleted** when a student is deleted. **Human Quality**
follows the existing Owner **E1/E2** policy and HQP's `ON DELETE SET NULL` + no-student-content
design (HQP §18) — Math Human-Quality references are by id + frozen provenance, storing no student
content, so nulling the link leaves nothing student-identifying. Object-storage byte erasure
(evidence, generated artifacts) is part of the deletion graph, not just DB rows. No analytics
retention designed here.

---

## 42. Credit / billing request kinds (`CREDIT_BOUNDARY`)

Conceptual request kinds (Codex maps to the real Credit contract, §49): `MATH_INITIAL_EVALUATION`,
`MATH_REEVALUATION`. **`VISION_EXTRACTION` is not independently billable** — Owner direction: no
separate student-visible charge for a required processing stage of Math evaluation; it is an
internal stage of `MATH_INITIAL_EVALUATION`. **Hint Levels 0–2: no credit charge by default.** No
new economic model; no prices.

---

## 44. Data-integrity invariants (`INTEGRITY_INVARIANTS`) — enforcement tier for Codex

| invariant | tier |
| --- | --- |
| at most one ACTIVE evaluation profile per exact scope (§33) | **DB_ENFORCEABLE** (unique partial index) |
| evaluation pins immutable versions (problem/source/rubric/solution/extraction) | **DB_ENFORCEABLE** (NOT NULL version columns) + APPLICATION_CONTRACT (values correct) |
| subproblem belongs to its problem | **DB_ENFORCEABLE** (FK) |
| canonical solution belongs to correct problem/subproblem/version | **DB_ENFORCEABLE** (composite FK) |
| scoring criterion source shares authority/version context | **TRANSACTIONALLY_ENFORCEABLE** + APPLICATION_CONTRACT |
| solution step belongs to one evaluation/attempt context | **DB_ENFORCEABLE** (FK) |
| DAG edge cannot cross evaluations | **DB_ENFORCEABLE** (both endpoints share `evaluation_id`) |
| DAG acyclic | **TRANSACTIONALLY_ENFORCEABLE** (write-time check, like HQP supersedes) |
| CORE cannot reference another evaluation's step | **DB_ENFORCEABLE** (FK + same-evaluation) |
| propagated edge cannot cross evaluation | **DB_ENFORCEABLE** (same-evaluation) |
| hint exposure belongs to correct evaluation/attempt | **DB_ENFORCEABLE** (FK) |
| re-solve predecessor shares student + problem lineage | **TRANSACTIONALLY_ENFORCEABLE** (write-time check) |
| student evidence not referenceable by another student's attempt | **DB_ENFORCEABLE** (ownership FK) + RLS |
| official content cannot reference student-private evidence | **APPLICATION_CONTRACT** + schema separation (§40) |
| mathematical correctness of a step | **APPLICATION_CONTRACT** (never a CHECK constraint) |

Not every semantic math invariant belongs in a CHECK; correctness is evaluator responsibility.

---

## 46. Proposed entity map

Legend: Nature / Visibility / Shape / Versioned / Immutable.

| entity | purpose | nature | visibility | identity | parent | ver? | immut? | key relationships | deletion | authority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `math_problem_sets` | container of problems for a scope | CANONICAL | PUBLIC | `problem_set_id` | reused university/exam/year | yes | ver rows | → problems | retain (official) | TABLE |
| `math_problems` | one math problem | CANONICAL | PUBLIC | `problem_id`+`problem_version` | problem_set | yes | ver rows | → subproblems, sources, canonical_solution | retain | TABLE |
| `math_subproblems` | leaf unit; holds `response_format` | CANONICAL | PUBLIC | `subproblem_id` | problem | tracks parent | ver rows | ← steps/eval scope | retain | TABLE |
| `math_source_artifacts` | official source (ranked kind) | CANONICAL | PUBLIC(meta)/INTERNAL(raw) | `source_id`+`source_version` | problem/subproblem | yes | ver rows | ← extraction, criteria, solution | retain | TABLE + obj storage |
| `math_evaluation_profiles` | contextual evaluation authority | EVALUATION_CONFIG | OPERATOR/PUBLIC(meta) | `evaluation_profile_id`+`version` | scope binding | yes | ver rows | → criteria, solution, alt paths | retain | TABLE + JSONB |
| `math_scoring_criteria` | official scoring criteria | CANONICAL | OPERATOR/PUBLIC(published) | `criteria_set_id`+`criteria_version` | source + profile | yes | ver rows | ↔ rubric dimension map | retain | TABLE + JSONB |
| `math_canonical_solutions` | reference solution (origin-tagged) | CANONICAL | OPERATOR | `canonical_solution_id`+`version` | problem/subproblem | yes | ver rows | → solution_steps, alt paths | retain | TABLE |
| `math_canonical_solution_steps` | official/verified steps | CANONICAL | OPERATOR | `cs_step_id` | canonical_solution | with parent | yes | → scoring points | retain | TABLE |
| `math_alternative_paths` | known valid alternatives | CANONICAL | OPERATOR | `path_id` | canonical_solution/problem | yes | yes | — | retain | TABLE |
| `math_attempts` | student solution attempt | CANONICAL | STUDENT_PRIVATE | `attempt_id` | student + problem | no | **append-only** | → artifacts, extraction, evaluations, resolve_links | **student-delete** | TABLE |
| `math_attempt_artifacts` | evidence metadata + storage ref | CANONICAL | STUDENT_PRIVATE | `artifact_id` | attempt | no | append-only | → object storage | **student-delete (bytes)** | TABLE + obj storage |
| `math_extraction_runs` | extraction run (versioned) | CANONICAL(derived) | OPERATOR/INTERNAL | `extraction_run_id`+`extraction_version` | attempt | yes | append-only | → regions | student-delete | TABLE |
| `math_extraction_regions` | per-region extraction | CANONICAL(derived) | OPERATOR/INTERNAL | `region_id` | extraction_run | with run | append-only | ← steps.source_regions | student-delete | TABLE (+small JSONB) |
| `math_evaluations` | evaluation envelope + `math-eval-v1` | CANONICAL | STUDENT_PRIVATE | `evaluation_id`+`evaluation_version` | attempt | yes | **append-only** | → steps, errors, core, hints; reeval link | **student-delete** | TABLE |
| `math_solution_steps` | per-eval student steps | CANONICAL | STUDENT_PRIVATE | `step_id` | evaluation | with eval | append-only | → dependencies, errors, core | student-delete | TABLE |
| `math_step_dependencies` | DAG edges (join) | CANONICAL | STUDENT_PRIVATE | (`from_step_id`,`to_step_id`) | evaluation | with eval | append-only | same-eval only | student-delete | TABLE |
| `math_errors` | root/propagated classification | CANONICAL | STUDENT_PRIVATE | `error_id` | evaluation/step | with eval | append-only | → core | student-delete | TABLE |
| `math_core` | CORE binding | CANONICAL | STUDENT_PRIVATE | `core_id` | evaluation | with eval | append-only | → step, error, hints | student-delete | TABLE |
| `math_hints` | hint content/availability L0–2 | CANONICAL | STUDENT_PRIVATE | `hint_id` | evaluation | with eval | append-only | ← exposures | student-delete | TABLE (JSONB acceptable) |
| `math_hint_exposures` | student hint-view events | CANONICAL | STUDENT_PRIVATE | `exposure_id` | attempt/evaluation | no | **append-only** | — | student-delete | TABLE |
| `math_resolve_links` | re-solve / reeval linkage | CANONICAL | STUDENT_PRIVATE | `resolve_link_id` | attempt lineage | no | **append-only** | prior↔new attempt/eval | student-delete | TABLE |

MIXED response format: **DERIVED** (not an entity). Rubric definition: **APPLICATION_CONTRACT** (§14).
Voice script/audio: **not persisted** (§27).

---

## 47. Normalization review (relational vs JSONB)

| structure | recommendation | justification |
| --- | --- | --- |
| identity (university/exam/year), problem, subproblem | **relational** | query, FK integrity, versioning |
| source artifact, canonical solution (+steps), alt paths | **relational** | provenance, version, per-step scoring linkage |
| attempt, evaluation, solution step, step dependency, ownership | **relational** | integrity, reproducibility, ownership/RLS, DAG integrity |
| scoring criteria | **relational + bounded JSONB** | criteria are the analytic/scoring unit (relational); irregular official payloads fit bounded JSONB |
| rubric applicability override | **bounded JSONB** (in profile) | small, rubric-evolving, per-profile |
| display formula metadata | **JSONB** | presentation only |
| model-contract output snapshot (`math-eval-v1` as produced) | **JSONB snapshot** (alongside relational projections) | reproducibility of exact model output without schema churn |

Avoids both extremes (one giant JSONB doc / dozens of valueless tiny tables). Mirrors HQP's "normalize
the analytic unit, JSON the evolving bounded payload, version the definition in code" balance.

---

## 50. Owner decisions required (`OWNER_DECISIONS_REQUIRED: 2`)

| # | DECISION | WHY IT MATTERS | OPTIONS | RECOMMENDED DEFAULT | PROCEEDS WITHOUT IT |
| --- | --- | --- | --- | --- | --- |
| D1 | Official **raw-artifact retention / copyright** policy | privacy/legal; official-vs-reference storage | (a) reference+hash only; (b) controlled internal raw retention behind legal review; (c) mixed | **(a) reference+hash by default; raw retention only after legal review** | all catalog/provenance work proceeds by reference; raw retention deferred |
| D2 | Student raw-evidence **retention duration** | privacy; irreversible once set in Production | (a) short default + explicit opt-in extension; (b) per-policy TBD | **TBD before Production; design treats retention as finite + erasable** | full contract/entity design proceeds; only the numeric duration is deferred |

No other Owner decision is manufactured. All naming/index/normalization/MIXED/fallback-label calls
are recommendations above, not escalations.

---

## 48 / 49. MATH-2B Codex cross-review handoff

Codex should **ACCEPT / CORRECT / BLOCK** each, verified against the real APP/shared backend:

1. **Existing university/content tables to reuse** — confirm the canonical university/exam/year/
   content objects and exact FK columns (§6); confirm Math problems are genuinely new vs any
   existing math question row.
2. **Auth identity relationship** — confirm `auth.users.id` linkage for student + operator (§16,
   §31).
3. **Credit `request_kind` / domain constraints** — confirm `MATH_INITIAL_EVALUATION` /
   `MATH_REEVALUATION` are additive to the existing enum/domain; `VISION_EXTRACTION` not separately
   billable; hints uncharged (§25, §42).
4. **Billing / evaluation FK expectations** — confirm how Math evaluation binds to credit/billing
   decisions without a second wallet (§25).
5. **HQP compatibility** — confirm additive `hq-math-rubric-v1` + Math finding targets and the Math
   ids HQP will reference; `hq-read-v1` unchanged (§26).
6. **ADR-2 deletion compatibility** — confirm the Math deletion graph (§41) and E1/E2 Human-Quality
   behavior integrate with ADR-2 without modifying it.
7. **Storage / RLS conventions** — confirm bucket/namespace separation, signed access, no public
   student evidence (§40, §31).
8. **Current public-content RLS patterns** — confirm public catalog metadata exposure pattern (§31).
9. **UUID / version / slug conventions** — confirm id and version-chain conventions (§7).
10. **Existing source-provenance fields** — confirm reuse vs new provenance columns (§8).
11. **Index conventions** — confirm launch indexes (§30/§43) match house conventions.
12. **Function / RPC ownership model** — confirm `qlm-read-v1` + Math RPC families fit ownership
    (§32).
13. **SECURITY DEFINER discipline** — confirm write/operator paths reuse HQP/ql discipline (§31).
14. **Migration ordering** — confirm where Math migrations sit relative to Humanities/HQP/ADR-2.
15. **Current Production object collisions** — confirm no `math_*` name/colliding object exists.
16. **Can Option C remain fully additive?** — confirm nothing here forces a Humanities-table change.
17. **Does any proposed entity duplicate an existing canonical fact?** — especially university
    identity (§6), credit, human-quality, provenance.

---

## 51. Validation (self-check, §53)

- Only architecture docs changed (this new file); MATH-1 unchanged (optional successor pointer only).
- No `CREATE/ALTER TABLE`, `CREATE FUNCTION`, policy SQL, migration, provider code, or Production
  op.
- No secret/token/local-path leakage.
- Consistent with MATH-1 (Option C, 3-layer eval, root/propagated, CORE, hint ladder, VOICE-1).
- `ql-read-v1` / `hq-read-v1` **not modified** (additive `qlm-read-v1` instead, §32).
- No Production status upgraded; AI OFF.
- University-specific evaluation explicit (§1, §33); `SHORT_ANSWER` does **not** inherit
  `FULL_SOLUTION` justification (§3, §15); official vs AI-generated source never confusable (§8,
  §11, §37); student-private evidence cannot become public catalog data (§40, §31); VOICE-1 audio
  not canonical/persistent (§27).

---

## 52. Final report

```
MATH_2A_CONTRACT:            COMPLETE
REPOSITORY:                  LC3808/legendstudy-lab
BRANCH:                      claude/math-essay-architecture-v1   (continued; MATH-1 lives here)
BASE_COMMIT:                 47afbdcc80845e7446495a3cdf5eac8dd5adab4b
FINAL_COMMIT:                <filled at closeout>
MATH_1_PRESERVED:            YES
PERSISTENCE_OPTION:          C
UNIVERSITY_SPECIFIC_EVALUATION: PASS
EVALUATION_PROFILE:          versioned contextual authority; scope-bound; references criteria/
                             solution/examiner-intent/alt-paths + rubric applicability (§4)
RESPONSE_FORMAT_CONTRACT:    SHORT_ANSWER/SHORT_REASONING/FULL_SOLUTION/PROOF/MIXED; authoritative at
                             subproblem (§2)
MIXED_PERSISTED:             NO (derived from heterogeneous child formats, §2/§34)
SHORT_ANSWER_SUPPORT:        PASS      SHORT_REASONING_SUPPORT: PASS
FULL_SOLUTION_SUPPORT:       PASS      PROOF_SUPPORT: PASS
OFFICIAL_SOURCE_MODEL:       math_source_artifacts; ranked reference_kind; version+hash+verification
                             +storage ref (§8)
OFFICIAL_SCORING_MODEL:      math_scoring_criteria (relational+JSONB); official precedence; common
                             rubric fallback; no invented weights (§13)
CANONICAL_SOLUTION_MODEL:    math_canonical_solutions(+steps); origin OFFICIAL/VERIFIED_INTERNAL/
                             AI_GENERATED; activation needs verification (§11,§38)
ALTERNATIVE_PATH_MODEL:      math_alternative_paths; KNOWN_VERIFIED/AI_PROPOSED/STUDENT_NOVEL; not a
                             whitelist (§12)
PROBLEM_VERSIONING:          logical id + immutable version rows; evaluation pins problem_version
                             (§7)
SOURCE_VERSIONING:           source_version + hash; silent replacement prevented (§7,§39)
EVALUATION_PROFILE_VERSIONING: evaluation_profile_version; lifecycle DRAFT→REVIEWED→ACTIVE→
                             SUPERSEDED→RETIRED (§7,§36)
ENTITY_MAP:                  20 Math entities classified TABLE/JSONB/DERIVED/APPLICATION_CONTRACT
                             (§46)
RELATIONAL_VS_JSONB:         relational for identity/version/attempt/eval/step/DAG/ownership; bounded
                             JSONB for criteria payload/applicability/display/model snapshot (§47)
ATTEMPT_MODEL:               append-only math_attempts; ORIGINAL/FULL_RESOLVE/STEP_RETRY; subproblem
                             coverage (§17)
EVIDENCE_MODEL:              math_attempt_artifacts; object storage + DB ref; no binaries in DTO/
                             columns (§18)
EXTRACTION_BOUNDARY:         math_extraction_runs(+regions); versioned; confidence/uncertainty;
                             MATH-3 implements (§19)
SOLUTION_STEP_DAG:           math_solution_steps + math_step_dependencies JOIN RELATION (not array)
                             (§20)
ROOT_PROPAGATED_PERSISTENCE: math_errors persists classification result for reproducibility;
                             propagation edges; CORE binding (§21)
CORE_BINDING:                math_core reuses core_focus+priority + step/error/issue binding;
                             VOICE-1-ready (§22)
HINT_EXPOSURE:               math_hints (content L0–2) + math_hint_exposures (events); uncharged
                             (§23,§42)
RESOLVE_REEVALUATION_LINKAGE: math_resolve_links append-only; reevaluation_link deltas; same
                             student/problem lineage (§24)
CREDIT_BOUNDARY:             single wallet; additive request kinds only; no Math balance tables (§25,
                             §42)
HUMAN_QUALITY_BOUNDARY:      additive hq-math-rubric-v1 + Math targets; Math ids referenced; spine
                             reused; hq-read-v1 unchanged (§26)
VOICE_1_COMPATIBILITY:       PASS
VOICE_1_AUDIO_PERSISTENCE:   NONE_BY_DEFAULT (script DERIVED/NON_CANONICAL; audio on-demand/
                             ephemeral) (§27)
ACCOUNT_DELETION_COMPATIBILITY: Math deletion graph provided; ADR-2 unmodified; E1/E2 HQ behavior
                             reused (§41)
PRIVACY_FOLLOW_UP_REQUIRED:  YES (Math raw-evidence retention before Production) (§29,§41,§50-D2)
LAUNCH_REQUIRED_INDEX_PATTERNS: §30/§43 rows 1–14
POST_LAUNCH_INDEX_PATTERNS:  analytics/trend + dependency-traversal tuning (§30/§43 rows 15–16)
RLS_REQUIREMENTS:            owner-only student data; operator via gated RPC; no browser HQ-table
                             access; no service_role in browser; no cross-student (§31)
DTO_BOUNDARY:                math-catalog-v1 / math-attempt-v1 / math-eval-v1 / qlm-read-v1
                             (additive); ql/hq-read-v1 unchanged; fail-closed versioning (§32,§45)
INTEGRITY_INVARIANTS:        §44 matrix (DB_ENFORCEABLE / TRANSACTIONALLY_ENFORCEABLE /
                             APPLICATION_CONTRACT)
OWNER_DECISIONS_REQUIRED:    2 (D1 raw-artifact/copyright retention; D2 student-evidence retention
                             duration) (§50)
READY_FOR_MATH_2B_CODEX_REVIEW: YES
READY_FOR_DB_IMPLEMENTATION: NO
DB_CHANGED:                  NO     MIGRATION_CREATED: NO     PRODUCTION_CHANGED: NO
PROVIDER_CALLS:              0      PRODUCTION_AI: OFF
FILES_CHANGED:               docs/architecture/MATH-2_CANONICAL_DATA_PERSISTENCE_CONTRACT.md (new)
COMMIT:                      <filled at closeout>
PUSH:                        <filled at closeout>
LOCAL_REMOTE_SYNC:           <filled at closeout>
UNIFIED_WIKI_CHANGED:        NO
NEXT:                        CODEX MATH-2B CANONICAL DB / SECURITY CROSS-REVIEW
```
