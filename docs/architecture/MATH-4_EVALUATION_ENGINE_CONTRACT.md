# MATH-4A — Mathematical Essay (수리논술) Evaluation Engine Contract v1 (`math-eval-v1`)

**Status:** ARCHITECTURE / CONTRACT ONLY. No provider calls, no DB schema/migration, no Production
AI, no real student evaluation, no `legendstudy-app`/`legendstudy-docs` change.
**Date:** 2026-10-02
**Author role:** LegendStudy Math Evaluation architecture designer (Claude).
**Repository / branch:** `LC3808/legendstudy-lab` · `claude/math-essay-architecture-v1`.
**Base commit:** `0d8068e883d3eed742b7963f0778af356a3b8800` (MATH-3A tip).
**Authority read:** [MATH-1](MATH-1_MATHEMATICAL_ESSAY_ARCHITECTURE.md) (APPROVED) ·
[MATH-2A](MATH-2_CANONICAL_DATA_PERSISTENCE_CONTRACT.md) (APPROVED, + MATH-2B corrections below) ·
[MATH-3A](MATH-3_VISION_INPUT_ARCHITECTURE.md) (APPROVED).
**Successor:** [MATH-5A](MATH-5_CORE_HINT_LEARNING_CONTRACT.md) (CORE/hint/re-solve learning contract).

> **This document authorizes nothing and changes no system.** No provider/AI call, no DB
> migration/schema, no Production change, **no real student answer evaluated**, no App/docs-repo
> change. MATH-1/2A/3A are **not redesigned**. `ql-read-v1` / `hq-read-v1` remain **unchanged**;
> Math Quality is additive `qlm-read-v1`. Production AI **OFF**, `PROVIDER_CALLS: 0`.

**MATH-2B corrections incorporated as authoritative integration facts** (depend on *semantics*, not
physical names, §72):

- existing **HQP is Essay-bound** and needs a **typed Math extension** (§54, §72).
- **E1:** evaluation deletion **CASCADE** (Math HQ/eval children cascade on evaluation delete).
- **E2:** reviewer identity **SET NULL** (reviewer accountability survives reviewer-account delete).
- **Credit has no generic domain/request-kind;** the **existing Credit Ledger remains authority**;
  **Math requires a typed billing binding/helper** (§51, §57, §72).
- `ql-read-v1` / `hq-read-v1` unchanged; future **`qlm-read-v1` additive** (§54).
- Physical DB names are **not** assumed; MATH-4A reconciles against MATH-2R (§72).

---

## 1. Objective

`math-eval-v1` evaluates a student's submitted mathematical response **according to the exact
university/year/track/problem/subproblem authority** and answers: did the student answer? is the
final answer correct? is the path valid? where is the **first material (root) error**? which later
errors merely **propagated**? is the required justification sufficient? does the response satisfy
this leaf's **`response_format`**? what is the **smallest high-impact improvement (CORE)**? what
next? It evaluates the **student's submitted reasoning** — it is **not** a CAS, theorem prover,
generic solver, or WolframAlpha replacement (§61).

---

## 2. Input authority

MATH-4 consumes `READY_FOR_MATH_EVALUATION_INPUT_V1` (MATH-3A §57: attempt/problem/subproblem
identity, `response_format`, **frozen extraction version**, confirmed text/math, ordered regions,
visual references, **solution-step candidates**, confidence/uncertainty, **authorized** original-
evidence references, confirmation provenance) **plus** canonical evaluation authority: evaluation
profile, official scoring criteria, official answer/solution (where available), examiner intent,
verified canonical solution, known verified alternative paths, `math-rubric-v1`. It **never**
consumes raw provider-specific Vision JSON (MATH-3A §39).

---

## 3. Authority precedence (role-separated, not a replacement chain)

```
OFFICIAL_SCORING_CRITERIA > OFFICIAL_SOLUTION/SAMPLE_SOLUTION > OFFICIAL_EXAMINER_INTENT
  > VERIFIED_INTERNAL_CANONICAL_SOLUTION > AI_GENERATED_ALTERNATIVE_SOLUTION
```

**Scoring authority** (what earns points) and **solution-path reference** (one valid path) are
different concepts. Official solution is **not** "the only valid path" (§12). Precedence orders
*authority of evidence*, not *exclusivity of a path*.

---

## 4. Response format is evaluation authority (`RESPONSE_FORMAT_AWARE: PASS`)

Driven by the canonical leaf `response_format` (MATH-2A §2), **never** by university-name
conditionals (§50). Applicable evaluation layers per format:

| format | answer | path/steps | justification | writing | blocking failures |
| --- | --- | --- | --- | --- | --- |
| `SHORT_ANSWER` | REQUIRED | NA unless profile requires | NA unless profile requires | NA | wrong/indeterminable answer |
| `SHORT_REASONING` | REQUIRED | SELECTED required reasoning | REQUIRED (essential only) | reduced | missing *required* reason; wrong answer |
| `FULL_SOLUTION` | REQUIRED | REQUIRED | REQUIRED | REQUIRED | invalid `logical_development`; insufficient `justification_completeness` |
| `PROOF` | conclusion REQUIRED, **insufficient alone** | REQUIRED | REQUIRED (blocking) | REQUIRED | invalid/ incomplete proof; `logical_development` / `justification_completeness` |
| `MIXED` | per child | per child | per child | per child | per child |

`MIXED` is **derived** across leaves (MATH-2A §2). Blocking failures come from the profile's
applicability (MATH-2A §15), not invented here.

---

## 5. SHORT_ANSWER (`PASS`) — brevity ≠ error

If the canonical leaf requires only an answer, `"12"` may be **complete**. Do **not** require
solution steps, essay-like explanation, or `mathematical_writing` unless the official profile
explicitly requires them. Evaluate primarily: attempted/not-attempted (§20), answer normalization
(§9), answer correctness, required form/units/conditions. Answer uncertain from extraction →
`NOT_DETERMINABLE` → confirmation / human review (§35), never a fabricated justification penalty.

## 6. SHORT_REASONING (`PASS`)

Evaluate: answer · required essential formula/reasoning · critical justification · required
condition. Do **not** demand a full formal derivation the university does not require. **Missing
non-required exposition is not a weakness** (MATH-1 §3).

## 7. FULL_SOLUTION (`PASS`)

Evaluate: answer · strategy · solution steps · logical dependencies · transformations · calculation
· justification · conclusion · mathematical writing. **Correct final answer alone is insufficient
when reasoning is required** (§18).

## 8. PROOF (`PASS`) — correct conclusion ≠ valid proof

Evaluate: premises/conditions · definitions/theorems · logical implication · necessary/sufficient
reasoning · case completeness · unsupported leap · circular reasoning (where detectable) ·
conclusion. **Do not mark a proof complete merely because the target statement is true.** Korean
connective text carries proof logic and is not discarded (MATH-3A §49).

---

## 9. Answer verification (`ANSWER_VERIFICATION`)

**Answer-layer status:** `CORRECT` · `INCORRECT` · `PARTIALLY_CORRECT` · `NOT_DETERMINABLE`.
`NOT_ATTEMPTED` / `NOT_APPLICABLE` belong to the **coverage layer** (§20), **not** the answer layer
— so an unanswered leaf is never an `INCORRECT` answer.

**Answer normalization (bounded, not a CAS):** numbers, fractions, equivalent algebraic forms (safe
rewrites only), sets/intervals, coordinates, vectors, matrices, expressions, multiple answers, units.
Equivalence may be **safely established** only for bounded canonical normalizations and known
accepted forms (from the profile/canonical solution). When equivalence requires open-ended symbolic
proof the evaluator cannot perform → `MATHEMATICAL_EQUIVALENCE_UNCERTAIN` → human review / `NOT_
DETERMINABLE` (§36), **never** a default `INCORRECT`. **No CAS is built** (§61).

---

## 10. Solution-path verification (`SOLUTION_PATH_VERIFICATION`)

**Step status (7, unchanged from MATH-1 — not multiplied):** `VALID` · `INVALID` ·
`INSUFFICIENT_JUSTIFICATION` · `CALCULATION_ERROR` · `LOGICAL_GAP` · `PROPAGATED_ERROR` ·
`NOT_ASSESSABLE`. No additional status is needed for launch.

Each **final** solution step carries: identity · order · kind · student representation ·
source evidence ref · status · reason · dependencies · error binding (if applicable).

---

## 11. Step finalization (`STEP_FINALIZATION`) — MATH-4 owns identity

Vision supplies provisional `SOLUTION_STEP_CANDIDATE` (MATH-3A §15); **MATH-4 owns the final
`solution_step`**. The evaluator may merge / split / preserve candidates, reorder **only when
evidence supports it**, and bind cross-page continuation — but **never invents a student step
unsupported by evidence** (§64). Three distinct concepts kept separate: **student step** (evidence),
**evaluator explanation** (§46), **canonical reference step** (official/verified solution).

---

## 12. Alternative valid path (`ALTERNATIVE_VALID_PATH`)

Per-attempt classification: `OFFICIAL_PATH_MATCH` · `ALTERNATIVE_VALID_PATH` · `INVALID_PATH` ·
`INSUFFICIENT_JUSTIFICATION`. A student path can be valid even if **not** in the official solution
and **not** in known alternatives. **Text similarity is never mathematical validity.** If validity/
equivalence cannot be established → `MATHEMATICAL_EQUIVALENCE_UNCERTAIN` → human review / `NOT_
ASSESSABLE` — **not `INCORRECT` by default** (MATH-1 §5/§16). A `STUDENT_NOVEL_PATH` accepted once
is not auto-promoted to canonical (MATH-2A §12/§38).

---

## 13. Root error (`ROOT_ERROR_MODEL`)

A **ROOT_ERROR** is an **independent material error** (§17) that causes or materially contributes to
downstream incorrect reasoning — **not** solely caused by a defective upstream dependency.

**Launch taxonomy (bounded; maps to MATH-2A `error_category`):** `CONDITION_MISREAD` ·
`CONCEPT_SELECTION` · `STRATEGY` · `LOGICAL_GAP` · `CALCULATION` · `SIGN` ·
`ALGEBRAIC_TRANSFORMATION` · `CASE_OMISSION` · `DOMAIN_RANGE` · `THEOREM_MISUSE` ·
`GRAPH_INTERPRETATION` · `JUSTIFICATION` · `CONCLUSION` · `OTHER`. (`SIGN` kept distinct from
`CALCULATION` — high-frequency, pedagogically specific in 수리논술.) Not an enormous taxonomy; `OTHER`
carries a bounded note.

## 14. Propagated error (`PROPAGATED_ERROR_MODEL`)

A **PROPAGATED_ERROR** is a downstream consequence of an earlier root error; it would be `VALID`
given corrected inputs. Steps 4/5 inheriting a Step-3 sign error are **propagated**, not independent
weaknesses — **unless** they contain an **additional independent** error (then that step is *also* a
root of its own chain, §16).

## 15. Causal graph (`LOGICAL_DEPENDENCY` vs `ERROR_PROPAGATION`)

Two **distinct** edge kinds, both persisted to MATH-2A (`math_step_dependencies` join + propagation
tagging):
- `LOGICAL_DEPENDENCY` — step B uses step A's result (structure of the solution).
- `ERROR_PROPAGATION` — a root error's defect flows from A to B (may be **transitive**).

**Do not fabricate a logical dependency merely to represent propagation.** Propagation edges may
exist along, but are not identical to, logical-dependency edges. Edges are evaluation-time causal
facts suitable for MATH-2A persistence and `qlm-read-v1` review.

## 16. Multiple independent errors (`MULTIPLE_ROOTS`)

Support `ROOT A → {A1,A2}` and `ROOT B → {B1}` simultaneously. **CORE selects the highest-impact
actionable issue, not mechanically the earliest line** — but earliest material root is a strong
selection signal. CORE candidate **ranking inputs** (qualitative, **no arbitrary numeric formula**,
§27): causal impact · official scoring importance · conceptual importance · number/severity of
propagated consequences · correction usefulness · response-format relevance · whether correcting it
enables a meaningful re-solve.

## 17. Error materiality (`ERROR_MATERIALITY`)

Distinguish: `MATERIAL_ERROR` · `MINOR_ERROR` · `PRESENTATION_ISSUE` · `NON_ERROR_VARIATION`. The
following **must not** auto-become `ROOT_ERROR`: harmless notation difference · equivalent algebraic
expression · brevity allowed by `response_format` · an intermediate arithmetic typo corrected
immediately by the student · redundant-but-valid reasoning. **Materiality rule:** an error is
`MATERIAL` iff it changes a required answer/justification layer for this `response_format`, or
invalidates a step other steps depend on. Only `MATERIAL_ERROR` is eligible to be a root error.

---

## 18. Correct answer / bad reasoning (required case)

Preserve **both** facts: `answer_status = CORRECT` **and** path/justification `INVALID|INSUFFICIENT`
— never collapsed into one "correct." For `FULL_SOLUTION`/`PROOF` this is still a **materially
deficient** response; for `SHORT_ANSWER` it may be fully satisfactory. **`response_format`/profile
decides** (§4).

## 19. Incorrect answer / mostly valid reasoning (required case)

Output: `answer = INCORRECT`, `path = MOSTLY_VALID`, `root_error = late calculation/sign/etc.`,
`propagated final result = incorrect`. Feedback **must not** tell the student the entire approach was
wrong — a key pedagogical requirement (§69).

## 20. Partial subproblem coverage (`coverage layer`)

Coverage status per leaf (separate from correctness): `NOT_ATTEMPTED` · `PARTIAL_ATTEMPT` ·
`ATTEMPTED`. A missing subproblem is **never** an invalid solution step. The **parent problem result
is derived** from child leaf results (MATH-2A §34).

---

## 21. Official scoring criteria (`OFFICIAL_SCORING`)

Where official criteria exist, evaluate against them explicitly. Per-criterion result:
`criterion_id` + `criteria_version` · applicability · `satisfied | partially_satisfied |
not_satisfied | not_determinable` · official points **if published** · awarded-point interpretation
**only if product policy + evidence permit** (§67) · supporting student steps/evidence · reason.
**Do not invent official points.** No numeric score is manufactured where the university published
none.

## 22. Partial credit (`PARTIAL_CREDIT`)

Official scoring rules take precedence. Absent official numeric partial-credit rules, `math-rubric-v1`
gives **diagnostic** feedback — but **inferred diagnostic weighting is never presented as official
university points**. Two separate concepts: **`OFFICIAL_SCORE`** vs **`DIAGNOSTIC_ASSESSMENT`**.

## 23. Score output (`UNIVERSAL_SCORE: NO`)

**No universal numeric total score by default** (avoids false precision). Official points/score are
exposed **only** where an official scoring structure supports it (§67); otherwise the result is
dimension verdicts + qualitative assessment (§68).

---

## 24–26. `math-rubric-v1`, verdicts, applicability (`MATH_RUBRIC_V1`, `RUBRIC_APPLICABILITY`)

Approved dimensions (MATH-1 §9 / MATH-2A §14): **REQUIRED** `problem_understanding` ·
`concept_selection` · `solution_strategy` · `logical_development` (blocking) · `computation_accuracy`
· `justification_completeness` (blocking) · `final_conclusion` · `mathematical_writing`;
**CONDITIONAL** `case_analysis` · `graph_interpretation`. Each dimension: purpose · applicability
(profile-driven) · evidence binding · verdict · relationship to official criteria (§21) ·
relationship to `response_format`. **No arbitrary weights** (deferred to calibration).

**Rubric verdict vocabulary (student diagnostic scale) — recommendation:**
`STRONG · ADEQUATE · NEEDS_IMPROVEMENT · INSUFFICIENT` + `NOT_APPLICABLE` + `NOT_ASSESSABLE`.
Rationale: this is the evaluator grading the **student's work** and needs pedagogical gradation;
HQP's `OK/CONCERN/FAIL/NA` is a **different axis** (a human reviewing the **AI's output**) and is
kept for `hq-math-rubric-v1` (§54). **Reconciliation note:** this refines the placeholder
`OK/CONCERN/FAIL/NA` noted provisionally in MATH-2A §9 (which flagged the scale as HQP-shaped and
provisional); the two scales serve different subjects and both are needed. Flagged for MATH-2R (§72)
as a semantics clarification, not a schema blocker.

**Applicability (profile-controlled, NA never penalized):** `SHORT_ANSWER` →
`problem_understanding` inferred only where evidence supports; `computation_accuracy` NA if no
computation shown; `mathematical_writing` often NA. `PROOF` → `logical_development`,
`justification_completeness`, `final_conclusion` REQUIRED. A `NOT_APPLICABLE` dimension **cannot
carry a negative verdict** (§41).

---

## 27. CORE candidate model (`CORE_CANDIDATE_MODEL`)

MATH-4 produces CORE **candidate facts**; MATH-5 owns presentation/hint policy (§71). A CORE binds:
`evaluation_id` · root/material error (where applicable) · solution step (where applicable) · rubric
dimension/category · concise issue · why it matters · recommended correction target. CORE is **not
necessarily** the lowest rubric dimension, the earliest error, or the largest point deduction — it is
the **smallest high-impact actionable improvement** (ranking inputs §16; reuses MATH-1/2A `core_focus`
+ `priority`, membership-not-score).

## 28. CORE may be empty (`CORE_CAN_BE_EMPTY: YES`)

`CORE = []` is a legitimate outcome (SHORT_ANSWER fully correct; FULL_SOLUTION mathematically
complete and adequately written) → emit **positive completion feedback** (§49), never invented
criticism.

## 29. CORE when no math error but writing weak

If reasoning is valid but **required** justification is unclearly expressed, CORE may target
`JUSTIFICATION` / `MATHEMATICAL_WRITING` **if the profile requires them** — **never fabricate a math
root error** to populate CORE.

## 30. Hint handoff (safe fields)

Provide MATH-5 enough to generate L0 CORE / L1 direction / L2 concept-theorem **without revealing the
full solution** (§65): CORE facts, root-error category + bound step, relevant concept/theorem
reference (name/pointer, not full derivation), `response_format`. Hint Ladder is **not** implemented
here (MATH-5).

---

## 31–34. Re-solve / reevaluation (`REEVALUATION`, `STEP_RETRY`, `FULL_RESOLVE`)

MATH-4 supports `INITIAL_EVALUATION` and `REEVALUATION`. Reevaluation receives: prior evaluation,
prior CORE, prior root errors, prior attempt, hint-exposure history, new attempt, and re-solve kind
(`FULL_RESOLVE | STEP_RETRY`). It is **not** an unrelated fresh evaluation.

**Reevaluation delta (`REEVALUATION_DELTA`, compact structured model):** `CORE_CORRECTED` ·
`ROOT_ERROR_REMOVED` · `ROOT_ERROR_REMAINS` · `PROPAGATED_ERROR_REMOVED` · `NEW_INDEPENDENT_ERROR` ·
`ANSWER_CHANGED` · `ANSWER_NOW_CORRECT` · `JUSTIFICATION_IMPROVED` · `NO_MATERIAL_CHANGE`. **Never
compares only final answers.**

- **`STEP_RETRY`:** evaluate the targeted prior step/issue in context. **Do not claim the whole
  solution is now correct** because one step was fixed. If downstream steps depend on the corrected
  step and were **not** resubmitted → mark full-solution consequence `NOT_REASSESSED`.
- **`FULL_RESOLVE`:** evaluate the new complete solution; compare strategy/root-errors/answer/
  justification/CORE to prior; **preserve independent new mistakes**.

---

## 35–38. Uncertainty & conflict (distinct recovery paths)

**Three uncertainty kinds kept separate** (different recovery):
- `EXTRACTION_UNCERTAINTY` (image unclear) → MATH-3 confirmation / re-upload (input gate).
- `MATHEMATICAL_EQUIVALENCE_UNCERTAIN` (novel path/equivalence unverifiable) → human review.
- `REFERENCE_AUTHORITY_INCOMPLETE` (official source missing/incomplete) → content review.

**Outcome placement (no conflicting states):**

| outcome | owned by |
| --- | --- |
| `NEEDS_INPUT_CONFIRMATION` / `NEEDS_REUPLOAD` | input gate (MATH-3) |
| `NOT_DETERMINABLE` | answer layer (§9) |
| `NOT_ASSESSABLE` | step layer (§10) |
| `NEEDS_HUMAN_REVIEW` | overall evaluation (§56) |

**Human-review escalation triggers (§37)** (not every alternative path escalates): critical
extraction unresolved · novel-path equivalence uncertain · proof validity uncertain · official/
reference conflict · model output internally inconsistent · high-impact scoring ambiguity · root
cause not safely establishable. Human review is a **quality/safety path, not a synchronous dependency
for every student**.

**Official source conflict (§38, `REFERENCE_CONFLICT`):** if official answer/solution/scoring guide
are mutually inconsistent, **do not silently resolve** — return `REFERENCE_CONFLICT`, route content
for review, and **do not penalize the student** for canonical-source inconsistency.

## 39. Invalid canonical content (`CONTENT_CONFIGURATION_ERROR`)

Missing problem version · ambiguous profile (MATH-2A §33 fail-closed) · invalid canonical solution ·
unverified official source where required · unsupported rubric version → **fail before student
evaluation** with `CONTENT_CONFIGURATION_ERROR`, and **do not consume student evaluation credit**
(§51, §57).

---

## 40. Evaluator output validation (`EVALUATOR_OUTPUT_VALIDATION`) — untrusted, fail closed

Validate: contract version · required fields · enum values · step references · region references ·
DAG endpoints (same-evaluation) · acyclicity handoff · error bindings · CORE bindings · rubric keys ·
criterion IDs · official points (≤ published max) · response-format applicability · bounded strings/
arrays · unknown fields ignored. **Invalid output does not partially publish**; retry/fallback per
future runtime policy (§43). Reuses the LEC-1/`ql-read-v1` fail-closed discipline. No code here.

## 41. Self-consistency checks (before finalize)

`CORRECT` answer cannot contradict an explicit invalid final derivation without explanation ·
`PROPAGATED_ERROR` must have a valid causal ancestor · a `ROOT_ERROR` is not also classified
propagated · CORE step/error must belong to this evaluation · a `NOT_APPLICABLE` dimension cannot
carry a negative verdict · official awarded points ≤ published maximum · `SHORT_ANSWER` not penalized
for absent full derivation unless the profile requires it. **Not every mathematical truth is encoded
as a mechanical rule** — these are grounding/consistency guards, not a proof engine.

## 42. Evaluation pipeline (`EVALUATION_PIPELINE`)

```
LOAD AUTHORITY → VALIDATE INPUT → DETERMINE RESPONSE REQUIREMENTS → VERIFY ANSWER
  → FINALIZE STUDENT STEPS → VERIFY SOLUTION PATH → BUILD LOGICAL DAG
  → IDENTIFY ROOT/PROPAGATED ERRORS → APPLY OFFICIAL CRITERIA → APPLY DIAGNOSTIC RUBRIC
  → SELECT CORE CANDIDATE → BUILD REEVALUATION DELTA (if applicable)
  → CONSISTENCY VALIDATION → FINALIZE
```
`CONTENT_CONFIGURATION_ERROR` fails at LOAD AUTHORITY (pre-credit, §39); input problems fail at
VALIDATE INPUT; output/consistency failures block FINALIZE (§40,§41).

## 43. Single-pass vs multi-pass (`MODEL_STRATEGY_RECOMMENDATION`)

| option | accuracy | cost | latency | structured output | error localization | alt-path | proof |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A single large prompt | ok | low | low | fragile | weak | weak | weak |
| B staged (answer→path→causality→rubric/CORE) | good | higher | higher | strong | strong | good | good |
| C primary + verifier pass | good | med-high | med | strong | strong | good | good |
| **D hybrid: structured primary + targeted verifier on high-stakes claims** | **best** | **controlled** | **med** | **strong** | **strong** | **good** | **good** |

**Recommendation for MATH-4B: Option D.** A structured primary evaluation pass, with a **targeted
verifier** on high-stakes claims (answer correctness, root-error localization, alternative-path
equivalence, proof validity) — not a full second evaluation of everything. Mirrors MATH-3A's
primary+targeted-fallback cost discipline. No providers called here.

## 44. Model / provider independence (`PROVIDER_INDEPENDENT: PASS`)

```
MathEvaluator.evaluate(EvaluationInputV1) → EvaluationCandidateV1
EvaluationCandidateV1 → validation(§40) → consistency(§41) → canonical finalize
```
`math-eval-v1` exposes **no** vendor-specific fields; model/provider/version are **provenance only**;
provider-specific reasoning traces are **not** canonical facts (§45).

## 45. Chain-of-thought boundary (`CHAIN_OF_THOUGHT_PERSISTENCE: NO`)

**No storage of private model chain-of-thought.** Canonical facts may store student-visible
explanation, structured step judgment, error reason, criterion rationale, CORE rationale — **not**
hidden internal reasoning. Reproducibility relies on input/version/provenance/structured output, not
preserved hidden CoT.

## 46. Generated explanation (separate from judgment)

`CANONICAL JUDGMENT` ≠ `STUDENT-FACING EXPLANATION`. The explanation verbalizes what was correct,
where the path changed, why the root error matters, what to fix — and **must not introduce a
contradictory new judgment**. Prepares VOICE-1.

## 47. VOICE-1 compatibility (`VOICE_1_COMPATIBILITY: PASS`)

`math-eval-v1` exposes structured facts for overall explanation · rubric · CORE · solution step ·
root error · hint handoff · reevaluation delta · normalized-math references. Voice layer is
**derived**; no voice field becomes a second evaluation authority; `AUDIO_PERSISTENCE: NONE_BY_
DEFAULT` unchanged.

---

## 48–50 / 66 / 68–70. Student result & feedback contract

**Information hierarchy (§48, UI not implemented):** 1 overall result → 2 answer verification →
3 CORE → 4 solution flow → 5 root/propagated error → 6 university scoring criteria → 7 Math rubric →
8 next action / re-solve. `SHORT_ANSWER` stays compact; `FULL_SOLUTION`/`PROOF` get full detail
(**result depth respects the task**, §66).

**Positive feedback (§49):** identify correct strategy, strong reasoning, good justification,
efficient valid alternative, successful correction — **where evidence supports**; never manufacture
praise.

**University-specific language (§50, §70):** feedback may say *"이 문항에서는 풀이 과정이
요구됩니다."* when the canonical profile supports it; **never** *"부산대는 항상…", "연세대는 무조건…"* —
evaluation is bound to a specific year/exam/problem/subproblem. Named universities, if ever shown,
are historical/example content requiring year/problem-specific verification.

**Overall diagnostic summary (§68, non-official, derived, does not overwrite facts):**
`ANSWER_CORRECT_AND_REASONING_SUFFICIENT` · `ANSWER_CORRECT_REASONING_INCOMPLETE` ·
`ANSWER_INCORRECT_APPROACH_MOSTLY_VALID` · `FUNDAMENTAL_APPROACH_ERROR` · `NOT_DETERMINABLE`. No
ranking/percentile.

**Feedback language (§69):** specific, concise, instructional, non-punitive, evidence-grounded —
*"3단계에서 부호가 바뀌었습니다. 이후 4~5단계의 오답은 같은 원인에서 이어진 것으로 볼 수 있습니다."* Avoid
*"수학적 사고력이 부족합니다."* / *"개념을 전혀 이해하지 못했습니다."* **Describe the answer, not the
student's ability/personality.**

**Official score presentation (§67):** distinguish `MAX_OFFICIAL_POINTS` · `AWARDED_OFFICIAL_POINTS`
· `AWARD_CONFIDENCE`/`NOT_DETERMINABLE`. **Do not display an official-looking awarded score when the
evaluator cannot reliably map reasoning to published criteria** — report criterion satisfaction
without invented points.

---

## 51. Credit commit boundary (`CREDIT_COMMIT_BOUNDARY`)

Coordinated with Codex MATH-2R; existing **Credit Ledger is authority**; Math uses a **typed billing
binding/helper** (MATH-2B), **no generic domain/request-kind**. Boundary:

```
input ready (gate PASS) → billing authorization/reservation (typed Math helper)
  → evaluator claim (fencing token, §52) → valid canonical evaluation finalized → consume
```
Failure **before** valid finalization → **release/reconcile** per canonical billing semantics.
**No separate Vision charge** (MATH-3A §27). Credit is committed at evaluation start, never at upload.

## 52. Idempotency / retry (contract only)

Future evaluation request requires: request idempotency key · worker claim · **fencing token** ·
retry · timeout · reconcile · **single successful finalize**. Repeated provider calls must **not**
create multiple canonical evaluations or multiple charges (reuses HQP's `client_submission_id`
idempotency discipline).

## 53. Account deletion / lifecycle (`ACCOUNT_DELETION_COMPATIBILITY`)

If the account is deletion-pending/erasing: **no new Math evaluation claim/finalize**; an in-flight
provider completion **must not resurrect** student data. Per MATH-2B **E1** (evaluation deletion
CASCADE) Math evaluation children (steps/dependencies/errors/CORE/hints) cascade; **E2** reviewer
identity SET NULL preserves HQ accountability. ADR-2 owns cleanup; MATH-4A only defines the lifecycle
checks.

## 54. Quality evidence (`QLM_QUALITY_EVIDENCE`)

Future **additive** `qlm-read-v1` reviewer can inspect: input authority · official source · student
evidence · extraction confirmation · answer judgment · solution steps · DAG · root/propagated errors
· criteria results · rubric · CORE · reevaluation delta · model provenance. HQP is **Essay-bound and
gets a typed Math extension** (`hq-math-rubric-v1` + Math finding targets `SOLUTION_STEP`,
`ROOT_ERROR`, `EXTRACTION_REGION`, `ALTERNATIVE_PATH`, MATH-2A §26). `ql-read-v1`/`hq-read-v1`
unchanged. No implementation.

---

## 55. `math-eval-v1` required contract (`MATH_EVAL_V1`)

Conceptual (semantics; no SQL). Required (R) / optional (O):

```
math-eval-v1
  contract_version (R)                    evaluation_id (R)            attempt_id (R)
  evaluation_kind (R: INITIAL|REEVALUATION)
  problem_version_id (R)                  subproblem/leaf_version_id (R per leaf)
  response_format (R)                     evaluation_profile_version_id (R)
  extraction_version_id (R)               authority_refs (R: criteria/solution/intent versions)
  coverage[] (R: leaf → NOT_ATTEMPTED|PARTIAL_ATTEMPT|ATTEMPTED)         # §20
  answer_verification[] (R: leaf → CORRECT|INCORRECT|PARTIALLY_CORRECT|NOT_DETERMINABLE)  # §9
  solution_path_classification (R per leaf: OFFICIAL_PATH_MATCH|ALTERNATIVE_VALID_PATH|
                                 INVALID_PATH|INSUFFICIENT_JUSTIFICATION)   # §12
  solution_steps[] (O: present when steps apply)   # §10,§11
  logical_dependencies[] (O)                        # §15
  error_propagation[] (O)                           # §15
  errors[] (O: root/propagated + category + materiality + bindings)  # §13,§14,§17
  official_criteria_results[] (O: present when official criteria exist)  # §21
  rubric_results[] (O: applicable dimensions only, NA preserved)        # §24-26
  core[] (R, MAY be [])                             # §27,§28
  reevaluation_delta (O: present iff REEVALUATION)  # §32
  uncertainties[] (O: kind + scope + reason)        # §35-38
  overall_status (R)                                # §56
  diagnostic_summary (O, non-official)              # §68
  official_score (O: MAX/AWARDED/confidence, only where supported)  # §67
  student_explanation (R, bounded; no solution reveal)  # §46,§65
  processing_provenance (R: model/provider/version, contract_version)   # §44,§45
```

**Must NOT embed:** raw image binaries · provider raw response · hidden chain-of-thought · browser
secrets · unbounded official-source text (reference + bounded excerpt only). References, not bodies.

## 56. Overall status (`overall_status`)

**Canonical persisted results:** `COMPLETE` · `PARTIAL` (some leaves not determinable/assessable) ·
`NEEDS_HUMAN_REVIEW`. **Processing/lifecycle states (not canonical math facts):** `NEEDS_CONFIRMATION`
(back to input gate) · `FAILED` (see §57). Overall status is a **summary, never a substitute** for
the answer/path/rubric facts.

## 57. Failure taxonomy (`FAILURE TAXONOMY`) — separate from student weakness

| failure | credit | retry | next |
| --- | --- | --- | --- |
| `INPUT_FAILURE` | **no consume** | re-upload | student action (MATH-3) |
| `CONTENT_CONFIGURATION_ERROR` | **no consume** (§39) | after content fix | content review |
| `EVALUATOR_FAILURE` | **release/no consume** | yes (idempotent) | runtime retry/fallback |
| `OUTPUT_VALIDATION_FAILURE` | **release/no consume** | yes | retry/fallback (no partial publish) |
| `MATHEMATICAL_UNCERTAINTY` | consume only if a valid canonical eval finalized with uncertainty facts | no | may route to human review |
| `HUMAN_REVIEW_REQUIRED` | consume only if a valid canonical eval finalized | no | quality/safety path |

**None of these is a student mathematical error.** No financial policy invented beyond current
direction; Codex MATH-2R maps to the real Ledger.

---

## 58. Synthetic test matrix for MATH-4B (`SYNTHETIC_TEST_MATRIX: PASS`)

No real AI; expected **structured facts** per case (abbreviated).

| T | scenario | expected key facts |
| --- | --- | --- |
| T1 | SHORT_ANSWER correct | coverage ATTEMPTED; answer CORRECT; steps/writing NA; CORE [] |
| T2 | SHORT_ANSWER incorrect | answer INCORRECT; no fabricated justification penalty; CORE = answer/concept |
| T3 | SHORT_ANSWER ambiguous extraction | answer NOT_DETERMINABLE; NEEDS_INPUT_CONFIRMATION; no INCORRECT |
| T4 | SHORT_REASONING, right answer / missing required reason | answer CORRECT; justification INSUFFICIENT (required); CORE = JUSTIFICATION |
| T5 | FULL_SOLUTION fully correct | answer CORRECT; path OFFICIAL/ALT valid; rubric STRONG/ADEQUATE; CORE [] |
| T6 | FULL_SOLUTION correct answer / invalid reasoning | answer CORRECT **and** path INVALID; materially deficient; CORE = root reasoning |
| T7 | FULL_SOLUTION wrong answer / late calc root | answer INCORRECT; path MOSTLY_VALID; root = CALCULATION/SIGN late; propagated final |
| T8 | root + multiple propagated | 1 root; propagation edges to downstream; CORE = root (not propagated) |
| T9 | two independent roots | ROOT A + ROOT B; CORE = higher-impact (ranking §16) |
| T10 | valid alternative path | path ALTERNATIVE_VALID_PATH; not penalized for differing |
| T11 | novel path uncertain | MATHEMATICAL_EQUIVALENCE_UNCERTAIN → NEEDS_HUMAN_REVIEW; not INCORRECT |
| T12 | PROOF correct conclusion / incomplete proof | conclusion correct but proof INSUFFICIENT; CORE = justification/case |
| T13 | PROOF valid non-official proof | ALTERNATIVE_VALID_PATH accepted; proof VALID |
| T14 | partial subproblem coverage | per-leaf coverage NOT_ATTEMPTED/PARTIAL/ATTEMPTED; parent derived |
| T15 | graph interpretation | `graph_interpretation` dimension active; visual region consulted |
| T16 | case omission | root = CASE_OMISSION; `case_analysis` dimension active |
| T17 | official criteria with points | official_criteria_results + official_score MAX/AWARDED/confidence |
| T18 | official criteria without points | criterion satisfaction only; no invented points |
| T19 | no official solution / verified internal | authority = VERIFIED_INTERNAL; provenance non-official |
| T20 | canonical source conflict | REFERENCE_CONFLICT; content review; student not penalized |
| T21 | reevaluation CORE corrected | delta CORE_CORRECTED / ROOT_ERROR_REMOVED / ANSWER_NOW_CORRECT |
| T22 | reevaluation new independent error | delta NEW_INDEPENDENT_ERROR preserved |
| T23 | STEP_RETRY corrected, full not reassessed | targeted step re-evaluated; full-solution consequence NOT_REASSESSED |
| T24 | extraction correction provenance | confirmed `x²` evaluated; provider `x³` + confirmation retained |
| T25 | malformed evaluator output | OUTPUT_VALIDATION_FAILURE; no partial publish; no consume |
| T26 | duplicate request/finalize | idempotent; single canonical eval; single charge |
| T27 | deletion-pending during processing | no finalize; no resurrection of student data |

Each case defines expected structured facts; MATH-4B runs the controlled evaluation. **Provider
bake-off criteria (§59):** mathematical correctness · alternative-path acceptance · root-error
localization · propagation attribution · proof evaluation · official-criteria adherence · structured-
output validity · uncertainty calibration · Korean feedback quality · latency · cost. **No provider
selected; no accuracy numbers invented.**

---

## 60. Launch evaluation scope

**LAUNCH_REQUIRED:** profile-specific (university/year/exam/problem/subproblem) evaluation ·
response_format-aware · SHORT_ANSWER · SHORT_REASONING · FULL_SOLUTION · PROOF · answer verification ·
step finalization · path verification · official scoring-criteria application · diagnostic
`math-rubric-v1` · alternative-valid-path acceptance · root vs propagated error · multiple
independent roots · CORE candidate facts · extraction/mathematical uncertainty handling ·
reevaluation delta · strict output validation · human-review escalation · billing/finalize boundary.

**POST_LAUNCH:** richer alternative-path libraries · advanced proof-specialized verification ·
additional domains/notation · deeper automated equivalence tooling · Hint L3–L5 · VOICE-1
implementation. **VOICE-1:** POST_LAUNCH_REQUIRED, target before 2026-10-end. **No launch-critical
correctness/safety requirement is moved to POST_LAUNCH to save effort.**

## 61–65. Guardrails

- **No CAS / theorem prover / generic solver / WolframAlpha** (§61); external verification tools are
  bounded *supporting evidence* later, never the sole authority.
- **Content vs evaluator separation (§62):** the evaluator **never modifies** problem/official
  answer/official criteria/profile/canonical solution; suspected bad content → `REFERENCE_CONFLICT`
  / `CONTENT_REVIEW_REQUIRED`, never silent correction.
- **Student-answer immutability (§63):** never rewrite the student's answer and evaluate the rewrite.
  Permitted: MATH-3 extraction confirmation, structured segmentation, meaning-preserving
  normalization. Not permitted: silently fixing algebra, inserting omitted proof steps, correcting
  meaning-changing notation, filling missing reasoning from the official solution.
- **Hallucination defense (§64):** every step judgment binds to student evidence; every criterion to
  canonical authority; every root error to a student step; every propagated error to a causal
  ancestor; every CORE item to an existing evaluation fact; quoted student content must exist in
  evidence; official point claims must exist in official authority; alternative-path claims require
  validation or uncertainty; no fabricated theorem citation; no invented university requirement.
  **Grounding fails → the unsupported claim is not published.**
- **Reference-solution leakage (§65):** distinguish `JUDGMENT_FACTS` / `STUDENT_FEEDBACK` /
  `SOLUTION_REVEAL_CONTENT`. The full official/canonical solution is **not** embedded in ordinary
  `student_explanation`; MATH-5 controls progressive reveal.

---

## 71. MATH-5A handoff (`MATH_5_HANDOFF_READY: YES`)

MATH-5 receives: evaluation id · response_format · official authority refs · final answer status ·
finalized solution steps · logical DAG · root errors · propagated errors · materiality · official
criterion results · rubric results · CORE candidate(s) · correction target · prior evaluation/
reevaluation delta · uncertainty · **solution-reveal boundary** (§65). MATH-5 **owns** CORE
presentation policy, Hint L0–L2, progressive reveal, student next action — **not** implemented here.

## 72. MATH-2R reconciliation boundary (`MATH_2R_RECONCILIATION_READY: YES`)

MATH-4A depends on **semantic interfaces only** — it does **not** assume physical HQ column names,
billing binding table name, worker role name, or RPC names. Reconciliation items for Codex MATH-2R:

| MATH-4 dependency | semantic interface | resilient to rename? |
| --- | --- | --- |
| billing reserve/consume/release | typed Math billing helper on existing Ledger (MATH-2B) | **yes** |
| HQ review of Math eval | typed Math HQ extension; E1 CASCADE, E2 SET NULL | **yes** |
| worker claim/finalize | fencing-token claim semantics (§52) | **yes** |
| Math eval persistence | MATH-2A entity semantics (steps/DAG/errors/CORE) | **yes** |
| rubric verdict scale refinement (§24) | student diagnostic scale vs HQP AI-review scale | **flag, not blocker** |

After MATH-2R, reconcile physical implementation **without changing evaluation semantics** unless a
real blocker is found.

---

## 73–75. Validation (self-check)

- No implementation code · no migration/SQL · **no provider call** · no Production change · **no real
  student data** · **no hidden chain-of-thought persistence** (§45).
- MATH-1 invariants preserved · MATH-2 university-specific authority preserved · MATH-3 extraction
  uncertainty preserved.
- `SHORT_ANSWER` brevity-not-error (§5) · final answer ≠ reasoning validity (§18) · official solution
  ≠ only valid path (§3,§12) · root ≠ propagated (§13,§14) · official score ≠ diagnostic rubric
  (§22,§23) · **no invented university points** (§21,§67) · **no invented university requirement**
  (§50,§64) · **no reference-solution leakage** into ordinary feedback (§65) · **CORE may be empty**
  (§28) · malformed evaluator output cannot partially publish (§40) · Vision failure ≠ math failure
  (§57) · content-configuration failure does not consume a valid evaluation result (§39,§51,§57).
- `ql-read-v1`/`hq-read-v1` unchanged · VOICE derived (§47) · `OWNER_DECISIONS_REQUIRED: 0`.

**`OWNER_DECISIONS_REQUIRED: 0`.** The §24 verdict-scale refinement is a design recommendation
(semantics clarification for MATH-2R), not a product/privacy/commercial escalation; all prior Owner
decisions are unchanged and not reopened.

---

## 76 / 74. Final report

```
MATH_4A_CONTRACT:            COMPLETE
REPOSITORY:                  LC3808/legendstudy-lab
BRANCH:                      claude/math-essay-architecture-v1
BASE_COMMIT:                 0d8068e883d3eed742b7963f0778af356a3b8800
FINAL_COMMIT:                <filled at closeout>
MATH_EVAL_V1:                conceptual contract §55 (references not binaries; no CoT; bounded)
RESPONSE_FORMAT_AWARE:       PASS
SHORT_ANSWER:                PASS    SHORT_REASONING: PASS    FULL_SOLUTION: PASS    PROOF: PASS
ANSWER_VERIFICATION:         CORRECT/INCORRECT/PARTIALLY_CORRECT/NOT_DETERMINABLE; coverage layer
                             separate; bounded normalization, no CAS (§9)
SOLUTION_PATH_VERIFICATION:  7 step statuses (unchanged); per-step identity/kind/status/reason/deps/
                             error binding (§10)
STEP_FINALIZATION:           Vision candidates → MATH-4 finalizes; never invents steps (§11)
ALTERNATIVE_VALID_PATH:      4-way classification; valid-if-different; uncertain → human review (§12)
ROOT_ERROR_MODEL:            independent material error; 14-term launch taxonomy (§13)
PROPAGATED_ERROR_MODEL:      downstream consequence; valid given corrected inputs (§14)
MULTIPLE_ROOTS:              multiple root chains; CORE = highest-impact (ranking inputs, no formula)
                             (§16)
ERROR_MATERIALITY:           MATERIAL/MINOR/PRESENTATION/NON_ERROR_VARIATION; only MATERIAL → root
                             (§17)
OFFICIAL_SCORING:            per-criterion satisfied/partial/not/ND + points if published; no invented
                             points (§21)
PARTIAL_CREDIT:              official precedence; else diagnostic (never shown as official points)
                             (§22)
UNIVERSAL_SCORE:             NO (§23)
MATH_RUBRIC_V1:              8 required (2 blocking) + 2 conditional; verdicts STRONG/ADEQUATE/
                             NEEDS_IMPROVEMENT/INSUFFICIENT + NA/NOT_ASSESSABLE (§24)
RUBRIC_APPLICABILITY:        profile-controlled; NA never penalized (§26)
CORE_CANDIDATE_MODEL:        binds eval/error/step/dimension/issue/why/correction target; smallest
                             high-impact (§27)
CORE_CAN_BE_EMPTY:           YES (§28)
REEVALUATION:                INITIAL + REEVALUATION; delta model, not answer-only (§31,§32)
STEP_RETRY:                  targeted; downstream NOT_REASSESSED if not resubmitted (§33)
FULL_RESOLVE:                full re-eval + prior comparison; new mistakes preserved (§34)
EXTRACTION_UNCERTAINTY:      input-gate / answer-layer placement; never silent INCORRECT (§35)
MATHEMATICAL_UNCERTAINTY:    equivalence/ reference-incomplete separated from extraction (§36)
HUMAN_REVIEW_ESCALATION:     bounded triggers; safety path not per-student dependency (§37)
REFERENCE_CONFLICT:          returned, not silently resolved; student not penalized (§38)
EVALUATOR_OUTPUT_VALIDATION: strict fail-closed; no partial publish (§40)
SELF_CONSISTENCY:            grounding/consistency guards before finalize (§41)
EVALUATION_PIPELINE:         13-stage conceptual pipeline (§42)
MODEL_STRATEGY_RECOMMENDATION: Option D hybrid (structured primary + targeted verifier) (§43)
PROVIDER_INDEPENDENT:        PASS (§44)
CHAIN_OF_THOUGHT_PERSISTENCE: NO (§45)
VOICE_1_COMPATIBILITY:       PASS (§47)
CREDIT_COMMIT_BOUNDARY:      reserve→claim(fencing)→finalize→consume; release on pre-finalize failure;
                             typed Math helper on existing Ledger; no Vision charge (§51)
ACCOUNT_DELETION_COMPATIBILITY: no claim/finalize when deletion-pending; E1 CASCADE / E2 SET NULL
                             (§53)
QLM_QUALITY_EVIDENCE:        additive qlm-read-v1 review set; HQP typed Math extension (§54)
SYNTHETIC_TEST_MATRIX:       PASS (T1–T27, §58)
MATH_5_HANDOFF_READY:        YES (§71)
MATH_2R_RECONCILIATION_READY: YES (§72)
OWNER_DECISIONS_REQUIRED:    0
READY_FOR_MATH_4B:           YES
READY_FOR_PRODUCTION:        NO
DB_CHANGED:                  NO    MIGRATION_CREATED: NO    PROVIDER_CALLS: 0
PRODUCTION_CHANGED:          NO    PRODUCTION_AI: OFF
FILES_CHANGED:               docs/architecture/MATH-4_EVALUATION_ENGINE_CONTRACT.md (new);
                             MATH-1/2A/3A one-line successor pointers
COMMIT:                      <filled at closeout>
PUSH:                        <filled at closeout>
LOCAL_REMOTE_SYNC:           <filled at closeout>
UNIFIED_WIKI_CHANGED:        NO
NEXT:                        OWNER/CHATGPT REVIEW → MATH-2R RECONCILIATION → MATH-4B EVALUATION
                             IMPLEMENTATION / CONTROLLED BAKE-OFF → MATH-5A CORE + HINT CONTRACT
```
