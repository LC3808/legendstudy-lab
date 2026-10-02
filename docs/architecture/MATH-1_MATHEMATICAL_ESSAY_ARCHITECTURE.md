# MATH-1 — Mathematical Essay (수리논술) Canonical Product & Learning Architecture v1

**Status:** DESIGN + CONTRACT + ARCHITECTURE ONLY. No implementation, no migration, no Production change.
**Date:** 2026-10-01
**Author role:** LegendStudy LAB mathematical-essay architecture designer (Claude).
**Repository / branch:** `LC3808/legendstudy-lab` · `claude/math-essay-architecture-v1`.
**Base commit:** `253867b91b00429d581946a418b2c82b2163e721` (tip of `claude/quality-console-v0`,
HQR-1 + LDP-1 preserved).
**Successor:** [MATH-2A](MATH-2_CANONICAL_DATA_PERSISTENCE_CONTRACT.md) (persistence) → [MATH-3A](MATH-3_VISION_INPUT_ARCHITECTURE.md) (Vision/input) → [MATH-4A](MATH-4_EVALUATION_ENGINE_CONTRACT.md) (evaluation engine) → [MATH-5A](MATH-5_CORE_HINT_LEARNING_CONTRACT.md) (CORE/hint/re-solve learning contract).

> **This document authorizes nothing.** It contains **no** migration SQL, **no** implementation
> code, **no** Vision/OCR/AI provider integration, and makes **no** change to Production, to
> `legendstudy-app`, to `legendstudy-docs`, to the deployed `ql-read-v1` / `hq-read-v1` contracts,
> or to the Humanities Essay implementation. It proposes a canonical domain architecture for a
> future **Mathematical Essay** LAB domain, for Owner/ChatGPT review before MATH-2.
>
> **Do not** read any status here as an upgrade of the live system. Mathematical Essay is
> `IMPLEMENTATION: NOT_STARTED`, `PRODUCTION: OFF`, `PROVIDER_CALLS: 0`.

Canonical project state remains authoritative in `LC3808/legendstudy-docs`
(`00_PROJECT/CURRENT_STATUS.md`, `SOURCE_OF_TRUTH.md`). Schema/RPC/code authority lives with the
App track (`LC3808/legendstudy-app`) + the live DB. Names used below for existing objects are
**consumer references** to confirm with the App track / Codex, not new canonical declarations.
Per §49 of the brief, this task does **not** touch the Unified Wiki.

---

## 0. Scope, invariants, and what MATH-1 does not do

LAB v1 product launch scope becomes **Humanities Essay (인문논술) + Mathematical Essay (수리논술)**.
Science Essay (Physics/Chemistry/Biology/Earth Science) is **out of scope** for implementation,
but the architecture must not foreclose it (§23).

Mathematical Essay is designed as a **first-class LAB domain**, not an add-on to Humanities. It
reuses the LAB learning philosophy and the cross-domain commercial/quality spines where they are
genuinely common, and introduces new domain objects only where Humanities semantics would be
corrupted by reuse.

**Hard invariants (enforced throughout this document):**

1. **Correct answer ≠ single valid solution.** A mathematically valid alternative path is never
   marked wrong merely for differing from the official solution (§5, §16).
2. **Extraction error ≠ student error.** Low-confidence OCR/Vision extraction is never silently
   converted into `INCORRECT`; it routes to confirmation or human review (§12, §34, §45).
3. **Root error ≠ propagated error.** Downstream consequences of one upstream mistake are not
   counted as independent conceptual weaknesses; CORE targets the root (§7, §17).
4. **Official ≠ AI-generated.** Provenance of every reference artifact is explicit and ranked;
   AI reasoning is never presented as official university material (§4, §15, §36).
5. **Original evidence is authoritative.** The original student image/PDF remains the source of
   truth; structured extraction is a derived, versioned representation (§11–§13).
6. **Append-only history.** Original attempt, feedback, hint exposure, re-solve, and reevaluation
   are preserved; nothing overwrites a prior attempt (§19, §20).
7. **Single commercial authority.** Credit/Billing remains the one wallet; MATH introduces no
   second wallet and no new prices (§25).

**MATH-1 non-goals (§29):** no symbolic CAS engine, theorem prover, graphing engine, handwriting
editor, LaTeX editor, Science Essay, live tutor voice conversation, Production TTS, new payment
system, generic LMS, or generic AI agent.

---

## 1. Shared product philosophy — one learning loop, two domain realizations

The Humanities learning loop is preserved and specialized, not duplicated:

| Stage | Humanities (인문논술) | Mathematical Essay (수리논술) |
| --- | --- | --- |
| Submit | essay answer (text) | solution (image / PDF / tablet / typed math) |
| Evaluate | rubric + sentence feedback | 3-layer math evaluation (answer / path / writing) |
| CORE | smallest high-impact improvement | smallest high-impact **root** error target |
| Focused feedback | sentence-level feedback | step-level feedback + hint ladder |
| Produce again | **rewrite** | **re-solve** |
| Reevaluate | did CORE improve? | was the **root error** removed; is the answer now correct **and** justified? |

The service is **not** "AI gives the answer." Its primary job is to help the student identify the
single most important weakness in their own solution and **solve the problem again themselves**.
This is why Mathematical Essay has a **hint ladder** (§18) rather than an immediate full-solution
reveal, and why full-solution reveal is pedagogically gated (§33).

**Q1 (acceptance): Can Mathematical Essay reuse the Humanities learning loop without corrupting
either domain?** Yes — at the level of the *loop shape* and the *commercial/quality spines*. It
must **not** reuse the Humanities *rubric semantics*, *sentence-feedback structure*, or *rewrite
structure* verbatim, because the domain facts differ (§3). The loop is shared; the domain objects
inside each stage are largely distinct.

---

## 2. Domain difference — where reuse is valid and where it is not

| Humanities focus | Mathematical Essay focus |
| --- | --- |
| prompt understanding | problem / condition understanding |
| source interpretation | concept / theorem selection |
| evidence use | solution strategy |
| argument construction | mathematical reasoning (validity) |
| organization | equation transformation |
| expression | calculation accuracy |
| **sentence** feedback | **solution-step** feedback |
| rewrite | re-solve |

Common abstractions are drawn **only** where genuinely common: identity/attempt lifecycle,
credit, human-quality review spine, provenance discipline, the learning loop, and the
voice-extension contract. Everything downstream of "what is a unit of student work and how is it
judged" is domain-specific: Humanities judges **sentences**; Math judges **solution steps** with
**dependency** and **root/propagated** structure that has no Humanities equivalent.

---

## 3. Common LAB core vs Math-specific model (concept matrix)

**Q2 / Q3 (acceptance): which concepts are genuinely shared canonical facts, and which require
separate Math persistence?**

| Concept | Humanities today | Math | Shared? | Reuse decision | New domain object? |
| --- | --- | --- | --- | --- | --- |
| Identity (`auth.users.id`) | yes | yes | **YES** | reuse as-is | no |
| Source / problem | `essay_questions` (public metadata + synthetic) | problem **with subproblems, formulas, diagrams** | partial | shared discriminator, Math child | **yes** (math problem + subproblem) |
| Official source provenance | partial (links, `official_evidence`) | **strong** (official answer/solution/criteria) | partial | extend provenance model | **yes** (official source artifact + ranked kind) |
| Canonical reference solution | limited | **first-class** (steps, scoring points, alt paths) | no | — | **yes** (canonical solution) |
| Attempt | `essay_attempts` (immutable, append-only) | solution attempt (image-bearing) | **YES (pattern)** | reuse lifecycle pattern | **yes** (math attempt body) |
| Evaluation envelope | `essay_evaluations` (`ql-read-v1`) | `math-eval-v1` | partial | shared envelope fields, Math payload | **yes** (math evaluation) |
| Evaluation dimension | `dimensions[]` | Math rubric dimensions | partial | same *shape*, different *keys* | keys new, shape reused |
| Unit of student work judged | **sentence** | **solution step** | no | — | **yes** (solution step + dependencies) |
| Error structure | implicit (per-issue) | **root/propagated DAG** | no | — | **yes** |
| Progress / improvement | `improvements[]` (`progress_id`, `issue_key`) | per-step / per-error improvement | partial | reuse `progress`+`issue_key` shape | payload new |
| CORE | `core_focus` + `priority` | root-error CORE | **partial** | reuse concept + `core_focus`/priority | CORE **subtype** |
| Focused feedback | `sentence_feedback[]` | step feedback + **hint ladder** | no | — | **yes** (step feedback + hints) |
| Produce-again | student rewrite (`student_attempts[]`) | re-solve (incl. step-retry) | **YES (pattern)** | reuse immutable-attempt pattern | retry granularity new |
| Generated artifact | `generated_rewrite` (AI, separate) | generated solution (AI, separate) | **YES (pattern)** | reuse "separate AI artifact" rule | payload new |
| Reevaluation | re-eval of rewrite | re-eval of re-solve | **YES (pattern)** | reuse linkage | criteria new |
| AI processing run | `essay_ai_processing_runs` | multimodal run (+ Vision) | partial | reuse run pattern | Vision stage added |
| Credit | `credit_*`, `essay_billing_decisions` | same | **YES** | reuse, single authority | no |
| Human Quality | `human_quality_*` (HQP-3) | math review | partial | **additive extension** | additive projection |

**Conclusion:** the genuinely shared canonical facts are **identity, credit, the human-quality
review spine, the attempt/append-only lifecycle pattern, the evaluation envelope, and the
provenance discipline**. The genuinely Math-specific canonical facts are **the problem/subproblem
structure, the official-source provenance hierarchy, the canonical solution, the solution-step +
dependency model, the root/propagated error model, the three-layer evaluation, the hint ladder,
and the Vision/extraction model.**

---

## 4. Official-solution advantage & provenance hierarchy

Unlike Humanities, universities frequently publish official reference material for math essays.
This is a *stronger reference than Humanities usually has* and must be modeled explicitly, ranked,
and never conflated with AI output.

**Reference-kind hierarchy (highest authority first):**

1. `OFFICIAL_SCORING_CRITERIA` — university scoring guide / point allocation (채점 기준).
2. `OFFICIAL_SOLUTION` / `SAMPLE_SOLUTION` — university answer / sample solution (예시답안).
3. `OFFICIAL_EXAMINER_INTENT` — examiner commentary / intent (출제 의도).
4. `VERIFIED_INTERNAL_CANONICAL_SOLUTION` — LegendStudy-authored, human-verified.
5. `AI_GENERATED_ALTERNATIVE_SOLUTION` — model-produced; **never** labeled official.

**Rules:**
- Every reference artifact stores its `reference_kind`, source identity, version/date, and
  verification state (§36, §37).
- The evaluator weights higher-authority references first; where official scoring criteria exist,
  they **override/augment** the common rubric (§10).
- AI-derived criteria or AI-generated solutions carry `origin = ai_generated` / `inferred` and are
  **never** rendered or persisted as official (§8, §15, §36).

---

## 5. Correct answer ≠ single valid solution (core invariant)

Even when the final numerical answer is fixed, the official solution is **not** the only valid
reasoning path. The evaluator classifies the student's **path relationship** to the reference:

- `OFFICIAL_PATH_MATCH` — follows the official reasoning.
- `ALTERNATIVE_VALID_PATH` — different but mathematically valid and sufficiently justified.
- `INVALID_PATH` — reasoning is mathematically wrong.
- `INSUFFICIENT_JUSTIFICATION` — plausible but under-justified.

A path classified `ALTERNATIVE_VALID_PATH` **must not** be marked wrong for differing from the
official solution. When the evaluator cannot establish equivalence, the outcome is
`MATHEMATICAL_EQUIVALENCE_UNCERTAIN → NEEDS_HUMAN_REVIEW` (§34), **never** a silent `INCORRECT`.

**Q9 (acceptance): how are multiple valid paths represented?** By a per-attempt path-relationship
classification plus per-step status (§6B); the canonical solution stores **known** acceptable
alternatives (§15) but absence of a stored alternative does **not** imply invalidity — it implies
the evaluator must reason about equivalence and, if unable, escalate.

---

## 6. Three-layer mathematical evaluation (kept separate, never collapsed)

### 6A. Answer verification — `answer_status`
`CORRECT` · `INCORRECT` · `PARTIALLY_CORRECT` · `NOT_DETERMINABLE`.
Per subproblem (§14). `NOT_DETERMINABLE` covers unreadable/ambiguous/cropped input (§34).

### 6B. Solution-path verification — per-step `step_status`
`VALID` · `INVALID` · `INSUFFICIENT_JUSTIFICATION` · `CALCULATION_ERROR` · `LOGICAL_GAP` ·
`PROPAGATED_ERROR` · `NOT_ASSESSABLE`.
Plus the attempt-level path relationship (§5).

### 6C. Mathematical writing — communication quality
Whether the student adequately communicates conditions, theorem/definition use, transitions, case
distinctions, necessary/sufficient reasoning, calculations, and conclusion (§9 dimension 수학적 서술).

**These three layers are never collapsed into one score.** The two canonical failure modes depend
on this separation:

- **Q12: correct answer, insufficient reasoning** → `answer_status = CORRECT` **but** path layer
  carries `INSUFFICIENT_JUSTIFICATION` / `LOGICAL_GAP`; CORE targets the justification gap, not a
  nonexistent calculation error. The student is **not** told they are simply "right."
- **Q13: incorrect answer, mostly valid reasoning** → `answer_status = INCORRECT` with most steps
  `VALID` and one `ROOT_ERROR`; feedback credits the valid reasoning and targets the single root
  cause, not the whole solution.

---

## 7. Root error / propagated error model (mandatory)

Solution steps form a **dependency DAG** (`depends_on[]` of upstream step ids, §8). Error
classification is computed over this DAG:

- A step is a **ROOT_ERROR** iff it has an intrinsic defect (`INVALID`, `CALCULATION_ERROR`,
  `LOGICAL_GAP`, or `INSUFFICIENT_JUSTIFICATION`) that is **not** solely caused by a defective
  upstream dependency.
- A step is a **PROPAGATED_ERROR** iff its only defect is an incorrect value/result inherited from
  an upstream erroring step, and it would be `VALID` given corrected inputs.

Example:
```
STEP 1 VALID → STEP 2 VALID → STEP 3 CALCULATION_ERROR (ROOT)
                                   → STEP 4 PROPAGATED_ERROR → STEP 5 PROPAGATED_ERROR
```
Here there is **one** conceptual weakness (step 3), not three. The evaluator records:
- `root_errors[]` — step ids with intrinsic defects, ranked by DAG order (earliest/most material
  first).
- `propagation_edges[]` — `{ from_step_id, to_step_id }` linking a root to its downstream
  consequences.

**Q10 (acceptance): how is a root error distinguished from propagated ones?** By the DAG
derivation above: propagated steps are reachable from a root via `depends_on` and are defect-free
once inputs are corrected. **CORE (§17) targets the earliest material root error**, never a
propagated consequence.

---

## 8. Solution-step model

The canonical Math equivalent of the Humanities sentence/progress unit is `SOLUTION_STEP`.

A step may represent: condition extraction · definition/theorem invocation · equation setup ·
transformation · calculation · case split · proof step · graph/diagram interpretation ·
conclusion. (`step_kind` bounded enum.)

**Identity & order semantics:**
- `step_id` — stable, model/extraction-assigned; **not** derived from "one handwritten line = one
  step." One written line may be several logical steps; several lines may be one step.
- `order_index` — reading/logical order within the subproblem.
- `depends_on[]` — upstream `step_id`s (the DAG edges used by §7).
- `subproblem_ref` — which subproblem the step belongs to (§14).
- `source_regions[]` — references into the original evidence (page/region/coordinates, §13).
- `normalized_math` — one normalized representation (LaTeX is **a** normalization, not the sole
  authority, §13); `raw_text` — verbatim extracted text.
- `extraction_confidence` + `extraction_version` — so a step's identity is reproducible against a
  given extraction run, and re-extraction is a new version rather than a silent mutation (§37).

---

## 9. MATH_RUBRIC_V1 (proposed, weights not finalized)

The rubric judges the **solution**, layered over §6. Dimension keys (`math-rubric-v1`):

| # | Dimension key | Korean | Class | Blocking? | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `problem_understanding` | 문제·조건 이해 | REQUIRED | no | did the student read conditions/goal correctly |
| 2 | `concept_selection` | 핵심 개념·정리 선택 | REQUIRED | no | right theorem/definition chosen |
| 3 | `solution_strategy` | 풀이 전략 | REQUIRED | no | viable overall approach |
| 4 | `logical_development` | 논리적 전개 | REQUIRED | **BLOCKING** | reasoning validity (§6B) |
| 5 | `computation_accuracy` | 수식 전개·계산 정확성 | REQUIRED | no | **merged**: equation transformation + calculation |
| 6 | `justification_completeness` | 논증의 완결성 | REQUIRED | **BLOCKING** | necessary/sufficient, no logical gaps |
| 7 | `final_conclusion` | 최종 결론 | REQUIRED | no | conclusion stated & consistent (answer correctness is the §6A layer, not this dimension) |
| 8 | `mathematical_writing` | 수학적 서술 | REQUIRED | no | communication quality (§6C) |
| 9 | `case_analysis` | 경우 분석 완결성 | CONDITIONAL | no | only when the problem requires case distinction |
| 10 | `graph_interpretation` | 그래프·도형 해석 | CONDITIONAL | no | only when a graph/diagram is involved |

**Design decisions requested by the brief:**
- **Separate vs merged:** equation transformation + calculation are **merged** (dimension 5) —
  step-level `CALCULATION_ERROR` already localizes the specific mistake, so two near-identical
  dimensions add no reviewer signal. Strategy (3) and logical development (4) stay **separate**
  (a sound plan can still be executed with invalid reasoning, and vice versa).
- **Conditional:** `case_analysis` and `graph_interpretation` apply only when the problem demands
  them; otherwise `NA` (mirrors the HQP conditional-NA rule so human reviewers and future
  analytics stay consistent).
- **Blocking:** `logical_development` and `justification_completeness` — a solution whose answer
  looks right but whose reasoning is invalid/insufficient is the signature math failure (Q12), so
  these block an overall "clean" verdict even when the number matches.
- **University override:** where official scoring criteria exist, they override/augment these
  common dimensions (§10); the common rubric is the fallback, never a replacement for published
  criteria.
- **Verdict scale:** per-dimension `OK | CONCERN | FAIL | NA` (same shape as HQP for cross-domain
  reviewer consistency). **Weights are intentionally not finalized in MATH-1** — they require an
  evaluation dataset and university-criteria calibration (§46).

---

## 10. University-specific scoring (official precedence)

```
COMMON_MATH_RUBRIC  (§9, fallback)
        +
UNIVERSITY_SCORING_CRITERIA  (official, precedence where available)
```

- Official criteria, official **point allocation**, official **subproblem structure**, and
  official **intent** are preserved verbatim with provenance (§36) and take precedence.
- We do **not** force every university into an invented universal numeric score. If a university
  publishes points, those points are the scoring authority; if it does not, the common rubric
  provides *qualitative* dimension verdicts, not a fabricated number.
- AI-derived criteria (when the university published none) are explicitly `inferred` and never
  shown as official (§8, §36). The product must not invent scoring criteria.

---

## 11. Input model

Mathematical Essay is **not** text-only.

- **Student input:** handwritten photo · tablet handwriting image · PDF · typed text ·
  mathematical notation · diagrams · graphs · tables.
- **Problem input:** text · formulas · diagrams · graphs · tables · multiple subproblems.

Canonical principle: **`ORIGINAL_INPUT` + `STRUCTURED_EXTRACTION`** are both retained. The
original artifact is authoritative; extraction is derived (§12–§13).

---

## 12. Vision / OCR principle — never discard the image

The architecture explicitly rejects `image → OCR text → discard image → evaluate text only`.
Math OCR frequently misreads `+ − = ≠ < >`, super/subscripts, fractions, roots, integrals,
limits, vectors, matrices, and coordinates.

Therefore:
- The **original image/PDF is preserved and remains authoritative** for the life of the attempt
  (subject to retention policy, §43).
- The evaluator can and must **consult the original evidence** when extraction is uncertain.
- Extraction carries explicit **confidence/uncertainty** per region and per step.

**Q11 (acceptance): how do we stop extraction error from being misclassified as student math
error?** Three guards: (1) confidence is attached per step/region and low-confidence regions are
flagged; (2) low-confidence or ambiguous regions route to **extraction confirmation** (§35) or
`NEEDS_INPUT_CONFIRMATION` / `NEEDS_HUMAN_REVIEW` (§34) **before** any `INCORRECT` is emitted;
(3) the failure taxonomy (§45) separates `INPUT_UNREADABLE` / `EXTRACTION_AMBIGUOUS` from student
mathematical error. Extraction uncertainty is **never** silently converted to `INCORRECT`.

---

## 13. Structured math extraction

Conceptual extraction output per region/step: `page` · `region` · `solution_step` ref ·
`raw_text` · `normalized_math` · `formula_representation` · `diagram/graph reference` ·
`confidence` · `uncertainty_reason` · `source_coordinates`.

- **LaTeX is one normalized representation, not the sole canonical truth.** The original evidence
  remains authoritative; `normalized_math` (e.g. LaTeX and/or MathML) is a convenience layer that
  can be wrong and is always traceable back to `source_coordinates`.
- Extraction is **versioned** (`extraction_version`); re-extraction creates a new version and
  never silently rewrites a prior one (§37).

---

## 14. Problem structure (problem / subproblem / conditions)

Support: `problem` → `subproblem[]` (e.g. 문제 1 → (1)(2)(3)); each with `conditions[]`, `given[]`,
`required_conclusion`.

- A student solution may answer **only some** subproblems.
- **Missing subproblem ≠ incorrect step.** An unanswered subproblem is `answer_status` absent /
  `NOT_ATTEMPTED`, which is distinct from `INCORRECT` and never scored as a mathematical error.

**Q14 (acceptance):** subproblems and partial submissions are first-class — evaluation,
answer-status, steps, and CORE are all scoped by `subproblem_ref`, and an unanswered subproblem is
a distinct state.

---

## 15. Canonical solution

A canonical reference structure capable of storing: final answer (per subproblem) · official
solution steps · scoring points · critical transformations · **known acceptable alternative
paths** · theorem/concept dependencies.

**Ingestion (never lose source traceability):**
```
official PDF / image / text / webpage
      → preserved source artifact (raw, provenance-tagged)
      → structured canonical representation (steps, scoring points, alt paths)
      → provenance + verification state
```
Official solutions do **not** arrive machine-structured; structuring is a derived step that must
retain a link to the preserved source. The entire official artifact is **not** flattened into an
AI-generated record that loses traceability (§36). Known acceptable alternatives are stored where
known, but their absence never implies a path is invalid (§5).

---

## 16. Student solution vs reference — comparison semantics

Per-step relationship to the reference (avoid naive text similarity):
`MATCHES_REFERENCE_STEP` · `EQUIVALENT_ALTERNATIVE` · `OMITS_REQUIRED_JUSTIFICATION` ·
`CONTRADICTS_REFERENCE` · `ROOT_ERROR` · `PROPAGATED_ERROR` · `EXTRA_VALID_REASONING` ·
`IRRELEVANT_REASONING`.

Comparison is **semantic/mathematical**, not string similarity. `EQUIVALENT_ALTERNATIVE` and
`EXTRA_VALID_REASONING` are explicitly non-penalized; `EXTRA_VALID_REASONING` is not treated as an
error. When equivalence cannot be established the step is `NOT_ASSESSABLE` → escalation (§34),
not `CONTRADICTS_REFERENCE`.

---

## 17. CORE (reuse the pedagogical concept, add a Math subtype)

Math CORE identifies the **smallest high-impact improvement target**, normally the **earliest
material root error** (§7), not a propagated consequence.

Examples: 극값 조건 이해 · 필요조건/충분조건 구분 · 부호 변화 · 경우의 수 누락 · 벡터 내적 해석 ·
적분구간 설정 · 계산 부호 · 증명 근거 생략.

**CORE_REUSE: PARTIAL.** The CORE *contract* is reused — CORE is still "active improvement with
`core_focus = true`, ordered by `priority`, membership-not-score" (the exact rule the LAB Quality
Console already consumes via `improvements[].is_core`). But Math CORE needs a **domain subtype**
that binds the CORE to a `solution_step_id` + `error_classification` (root vs propagated) so the
console and future voice layer can point at the specific step. So: reuse the CORE selection
semantics and the `core_focus`/priority rule; add a Math-specific CORE payload.

**Q4 (acceptance): can current CORE semantics represent a mathematical root error?** Yes for the
*selection semantics* (smallest high-impact, membership-not-priority-count, `core_focus`), but it
needs the additive step/error binding above — hence PARTIAL, not full, reuse.

---

## 18. Hint ladder (progressive; do not reveal the full solution immediately)

| Level | Content | Launch |
| --- | --- | --- |
| 0 | CORE only (the root weakness named) | **LAUNCH_REQUIRED** |
| 1 | Direction hint (where to look / what to reconsider) | **LAUNCH_REQUIRED** |
| 2 | Concept/theorem hint (which concept applies) | **LAUNCH_REQUIRED** |
| 3 | Critical relationship/equation hint | POST_LAUNCH |
| 4 | Detailed reasoning hint | POST_LAUNCH |
| 5 | Full AI-generated solution | GATED (policy, §33) |

**Launch-minimum ladder: Levels 0–2.** Levels 3–4 are post-launch; Level 5 (full reveal) is
gated behind an explicit student choice and, by default, an encouraged re-solve attempt (§33).

**Unlock & recording semantics:**
- Levels unlock progressively; a later level is available only after the earlier level is seen
  (anti-spoiler), but the product adds no artificial friction purely for engagement (§33).
- **Hint usage is recorded** (`hint_level_reached`, timestamps) as part of learning history —
  it is pedagogical signal for reevaluation (§20) and future analytics, **not** a credit penalty
  (§25).
- **Official-solution interaction:** even when the university solution is publicly available, the
  product does not auto-reveal it before a correction attempt; provenance and student choice still
  govern (§33). Public availability ≠ automatic reveal.

---

## 19. Re-solve (the Math analogue of rewrite)

A re-solve is **not** editing one sentence. Supported forms:
- `FULL_RESOLVE` — a complete new solution.
- `PARTIAL_RESOLVE` — corrected portion.
- `STEP_RETRY` — retry of a specific step.

**Launch-minimum: `FULL_RESOLVE` + `STEP_RETRY`** (`PARTIAL_RESOLVE` is post-launch — it overlaps
`STEP_RETRY` and adds merge complexity).

**History is preserved, append-only** (mirrors the Humanities `student_attempts[]` immutable
pattern): original solution · feedback · hint exposure · re-solve · reevaluation are all retained.
A re-solve is a **new immutable attempt** linked to its predecessor; nothing overwrites the
original attempt.

---

## 20. Reevaluation

Reevaluation answers, explicitly:
- Was the **CORE** corrected?
- Was the **root error** removed?
- Did a **new independent error** appear?
- Is the **final answer** now correct?
- Is the **mathematical justification** now sufficient?

It does **not** evaluate only the final-answer change. Reevaluation links `prior_attempt_id` +
`prior_evaluation_id` and records a per-criterion delta.

**Q5 (acceptance): can current reevaluation semantics represent re-solving rather than
rewriting?** Yes at the *linkage pattern* level (subsequent immutable attempt + re-eval request),
but the **criteria** are Math-specific (root-error removal, new-error detection, answer+
justification), so the reevaluation payload is new while the lifecycle is reused.

---

## 21. Common LAB core vs domain-specific model

See the matrix in §3. Summary:

**COMMON_LAB_CORE (shared canonical / reused):** identity · attempt append-only lifecycle ·
evaluation envelope · credit/billing (single authority) · human-quality review spine · provenance
discipline · the learning loop · the voice-extension contract.

**MATH_SPECIFIC_CORE (new domain objects):** problem/subproblem structure · official-source
provenance hierarchy · canonical solution · solution-step + dependency DAG · root/propagated error
model · three-layer evaluation · hint ladder · Vision/extraction model · re-solve granularity.

Schema reuse is **not** forced merely because names are similar (e.g. Humanities "sentence
feedback" and Math "step feedback" are different facts).

---

## 22. Persistence options & recommendation

| Option | Shape | Pros | Cons |
| --- | --- | --- | --- |
| **A** | Reuse Essay tables with domain/type fields | fastest; one set of tables | **corrupts** Humanities semantics; risky migration on the **stable, Production** Humanities schema; sentence vs step mismatch; image/formula columns bolt-on; CORE/error model doesn't fit |
| **B** | Fully Math-specific persistence | clean Math semantics | **duplicates** credit + human-quality + attempt spines; two commercial/quality authorities drift; worse for future Science |
| **C** | **Shared top-level spine + domain-specific child persistence** | keeps credit + human-quality + attempt/learning-loop **contract** shared; Math facts modeled natively; Humanities untouched; Science extends the same spine | needs a clean domain discriminator + a thin shared envelope; slightly more design up front |
| **D** | Minimal hybrid | — | collapses to A or B under pressure; no distinct advantage here |

**PERSISTENCE_RECOMMENDATION: C.**

**PERSISTENCE_REASON:** Option C maximizes semantic clarity and minimizes risk against every
evaluation axis in the brief (§22):
- **Semantic clarity:** Math facts (steps, DAG, extraction, canonical solution) get native
  structures; Humanities sentence facts are never overloaded.
- **Migration risk / Humanities stability:** the deployed Humanities Essay schema and `ql-read-v1`
  are **not altered** (Option A's fatal flaw); Math is additive new tables.
- **Source provenance & image/formula storage:** modeled natively in Math child persistence with
  a preserved-artifact + provenance pattern, not bolted onto Essay columns.
- **Evaluation DTO:** a shared envelope (`*-eval` identity/version/provenance) with a Math-specific
  payload (`math-eval-v1`, §38).
- **Human Quality & Credit:** reused as the *single* shared spines (Option B's duplication is
  avoided) — Credit as-is, Human Quality via additive extension (§24, §39).
- **Future Science:** Physics/Chem/Bio become additional domains on the same spine + their own
  child persistence (§23), not a new rebuild and not a forced generic schema.
- **Implementation cost:** higher than A's illusory speed but far lower total risk; A's hidden cost
  is a migration on the live Humanities tables plus permanent semantic debt.

In practice "shared top-level" is realized at the **credit spine, the human-quality spine, and the
learning-loop + evaluation-envelope contract** — **not** by retrofitting the existing Humanities
tables. Humanities stays exactly as deployed; Math is a sibling domain sharing the cross-domain
spines. **No migration SQL is created in MATH-1.**

---

## 23. Future Science compatibility

The domain discriminator + shared spine + domain-child-persistence pattern (Option C) lets
Physics/Chemistry/Biology/Earth Science be added later as **additional domains** reusing identity,
credit, human-quality, attempt lifecycle, and the evaluation envelope, each with its own child
persistence (e.g. experimental reasoning, unit/dimension analysis). Crucially, the architecture is
**not** over-generalized into one schema that would strip Math of its step/DAG/root-error
semantics. **Q16 (acceptance): yes** — future science is possible without turning every domain
into one generic schema, because domains share a *spine and a contract*, not a flattened table.

---

## 24. Human Quality

Math evaluation requires Human Quality validation, reusing HQP/HQR concepts where appropriate. The
human reviewer must be able to inspect: original problem · official solution/scoring source ·
original student solution image · extracted steps · AI step evaluation · root/propagated
classification · CORE · hints · generated solution · reevaluation.

**Q6 (acceptance): can existing Human Quality persistence review Math evaluations without
pretending sentence feedback and step feedback are the same thing?** Not as-is — `hq-rubric-v1`
and the `SENTENCE`/`PROGRESSION` finding targets are Humanities-shaped. The answer is an
**additive extension** (§39): a Math rubric version (`hq-math-rubric-v1`) and Math finding targets
(`SOLUTION_STEP`, `ROOT_ERROR`, `EXTRACTION_REGION`, `ALTERNATIVE_PATH`) that **do not** redefine
sentence feedback. The append-only, derived-projection, SECURITY-DEFINER-write spine of HQP is
reused unchanged. **UI is not implemented in MATH-1** (§24 brief); only the future review contract
is designed.

---

## 25. Credit / product

**CREDIT_REUSE: YES.** Math uses the **existing commercial Credit system**; **no second wallet**.

**Q7 (acceptance): can existing Credit/Billing remain the single commercial authority?** Yes.
Humanities initial evaluation, Math initial evaluation, Humanities reevaluation, and Math
reevaluation **share the same credit semantics**, distinguished by the existing `request_kind` /
domain discriminator (the same way initial-eval vs re-eval is already distinguished). **No new
prices are decided in MATH-1** (§25 brief). Hint usage does not consume credit by default (§18);
any future per-level pricing is a separate commercial decision, not an architecture fact.

---

## 26–27. Voice explanation — VOICE-1 (POST-LAUNCH REQUIRED, shared LAB capability)

**Owner product decision (2026-10-01): VOICE-1 is no longer optional.** It is
`POST_LAUNCH_REQUIRED`, target **before end of October 2026**. It does **not** block the first LAB
launch before the Yonsei essay examination (`VOICE_1_BLOCKS_INITIAL_LAUNCH: NO`), but **every**
Humanities and Mathematical Essay canonical DTO/design decision in MATH-1 **must preserve a clean
VOICE-1 consumption path**. **TTS is still not implemented in MATH-1** (§29 non-goal; this section
records the contract, not an implementation).

**VOICE-1 minimum product scope (Owner-defined):**
- Korean **per-item** explanation playback and Korean **full-evaluation** explanation.
- Humanities targets: CORE · rubric dimension · sentence feedback · rewrite guidance.
- Math targets: CORE · solution step · root error · hint · reevaluation change.
- **Pedagogical** explanation, not verbatim screen reading.
- Mathematical-expression-to-natural-Korean speech adaptation.
- Playback controls: **play / pause / replay** and **playback-speed** control.
- VOICE-1 **consumes canonical evaluation facts** and **must not become an independent evaluation
  authority** (no second, contradictory evaluation; the canonical evaluation remains authority).

**Architectural requirements (shared LAB extension point), preserved by MATH-1:**
- `DISPLAY_TEXT ≠ VOICE_EXPLANATION_SCRIPT`. The evaluation DTOs are structured so the VOICE-1
  adapter consumes **structured facts** without scraping rendered UI text.
- Flow: `canonical evaluation → voice-explanation adapter → Korean pedagogical script → TTS →
  audio playback (play/pause/replay/speed)`.
- Voice **explains**, not reads verbatim (bad: "논리적 전개 3점. 계산 정확성 2점." / better: "풀이
  방향은 맞았습니다. 다만 세 번째 단계에서 도함수의 부호를 반대로 판단하면서 이후 계산이 함께 틀어졌습니다…").
- The adapter may verbalize formulas naturally while preserving mathematical meaning (e.g.
  `f'(x)=0` → "에프 프라임 엑스가 0이 되는 지점을 먼저 확인해 보세요"), consuming `normalized_math` (§13).
- **Audio is not persisted by default** pending a future retention/cost decision (§39, §43).

**VOICE_1_ARCHITECTURE_COMPATIBILITY: PASS.** Every VOICE-1 minimum-scope target already maps to a
canonical fact exposed by the MATH-1 design — no DTO redesign is required to add VOICE-1 later:

| VOICE-1 target | Canonical source (unchanged) |
| --- | --- |
| Humanities CORE | `ql-read-v1` `improvements[].is_core` + `priority` |
| Humanities rubric dimension | `ql-read-v1` `dimensions[]` |
| Humanities sentence feedback | `ql-read-v1` `sentence_feedback[]` |
| Humanities rewrite guidance | `ql-read-v1` `improvements[]` / `generated_rewrite` |
| Math CORE | `math-eval-v1` `core { solution_step_id, error_classification }` (§17, §35) |
| Math solution step | `math-eval-v1` `solution_steps[]` (§8, §35) |
| Math root error | `math-eval-v1` `root_errors[]` / `propagation_edges[]` (§7) |
| Math hint | `math-eval-v1` `hint_availability` (§18) |
| Math reevaluation change | `math-eval-v1` `reevaluation_link.deltas` (§20) |
| Formula → natural Korean | `solution_steps[].normalized_math` (§13) |
| Per-item vs full explanation | per-group DTO access + overall `evaluation` group |
| Play / pause / replay / speed | client playback over a per-item audio artifact; **no DTO change** |

**VOICE_EXTENSION_READY: YES.** **Q17 (acceptance): yes** — a future voice layer consumes the
canonical evaluation (identity, CORE, step statuses, root/propagated, hint, reevaluation delta)
without parsing UI strings. The only VOICE-1-specific persistence question deferred to the VOICE-1
phase is the **audio artifact + retention/cost** decision (§39, §43); it does not alter any MATH-1
canonical fact.

---

## 28. Launch v1 scope

**LAUNCH_REQUIRED:** canonical Math problem/source · official solution/scoring provenance ·
student solution image upload · Vision/structured extraction with confidence · Math Rubric v1 ·
answer verification (§6A) · solution-step verification (§6B) · root/propagated errors (§7) ·
CORE (§17) · Hint Ladder Levels 0–2 (§18) · re-solve `FULL_RESOLVE` + `STEP_RETRY` (§19) ·
reevaluation (§20) · Human-Quality **readiness** (contract, not UI, §24) · existing Credit
integration (§25).

**POST_LAUNCH:** **VOICE-1 (POST_LAUNCH_REQUIRED, target before end of 2026-10; does not block
initial launch, §26–27)** · Hint Levels 3–4 · `PARTIAL_RESOLVE` · generated full solution (Level 5)
general availability · advanced reviewer analytics · additional universities' structured criteria
at scale · Quality Console Math UI.

**EXPERIMENTAL:** AI-generated alternative-path equivalence proving beyond heuristic · automated
sampling/anomaly queues · broader multimodal context expansion.

---

## 29. Non-goals

Restated (§0 / §29 brief): no CAS engine, theorem prover, graphing engine, handwriting/LaTeX
editor, Science Essay, live tutor voice conversation, Production TTS, new payment system, generic
LMS, or generic AI agent.

---

## 30. Pedagogical safety / answer-reveal policy (§33)

Distinguish `FEEDBACK` vs `HINT` vs `SOLUTION_REVEAL`.

**Launch recommendation:**
- **CORE** shown immediately after first evaluation (Level 0).
- **Hint Levels 1–2** available on demand after CORE.
- **Detailed reasoning (Levels 3–4)** post-launch; when present, available on demand after the
  earlier levels.
- **Full solution (Level 5)** not auto-revealed after first evaluation; revealed only on explicit
  student choice, with an **encouraged** (not forced) re-solve first.
- A re-solve attempt is **encouraged before full reveal**, but the product adds **no artificial
  friction for engagement** — the goal is learning effectiveness.
- If the university official solution is public, provenance + student choice still govern; public
  availability does **not** compel auto-reveal.

---

## 31. Mathematical correctness / model uncertainty (§34)

The evaluator is **not** forced to issue a confident correctness judgment when evidence is
insufficient. Supported uncertainty outcomes: `NOT_DETERMINABLE` · `NEEDS_INPUT_CONFIRMATION` ·
`NEEDS_HUMAN_REVIEW`. Triggers: unreadable handwriting, ambiguous exponent, cropped equation,
unclear graph annotation, multiple interpretations, or inability to establish alternative-path
equivalence. **Extraction uncertainty is never silently converted into `INCORRECT`.** Handoff:
`Vision uncertainty → (extraction confirmation / input confirmation) → mathematical-evaluation
uncertainty → Human Quality review`.

---

## 32. Extraction confirmation UX (§35)

| Option | Behavior |
| --- | --- |
| A | always require confirmation |
| B | never require confirmation |
| **C (recommended)** | require confirmation only for **low-confidence/ambiguous** regions |

**Recommended for launch: Option C.** Rationale: Option A adds friction to every attempt even
when extraction is clean; Option B risks false error diagnosis on misread notation — the exact
failure the invariants forbid. Option C confirms only flagged regions, balancing friction, OCR
reliability, notation sensitivity, evaluation cost, and false-error avoidance. **No UI is
implemented in MATH-1.**

---

## 33. Official source ingestion (§36)

Preserve: source URL/identity · document version/date (where available) · page/region · raw
artifact reference · extracted representation · provenance · verification state. Do **not** flatten
the whole official artifact into an AI-generated canonical record that loses traceability. Do
**not** invent scoring criteria the university never published; generated/inferred criteria stay
explicitly `inferred` (§4, §10).

---

## 34. Problem / solution versioning (§37)

A problem may later receive a corrected official answer, revised commentary, improved extraction,
or a newly verified alternative. Every evaluation pins the exact versions used at evaluation time:
`problem_version` · `official_source_version` · `rubric_version` (`math-rubric-v1`) ·
`canonical_solution_version` · `extraction_version`. Later source corrections **never** silently
rewrite historical evaluation provenance — old evaluations remain reproducible under their own
versions (same append-only principle as HQP §2).

---

## 35. `math-eval-v1` conceptual DTO (§38)

Compact enough for APP/LAB consumers; **no raw image binaries** embedded (references only);
consumable by VOICE-1 and by the future Quality Console. Conceptual groups:

```
math-eval-v1
  dto_version, evaluation_id, evaluation_version
  problem_ref { problem_id, problem_version, subproblem_ref }
  source_provenance { reference_kind[], official_source_version, canonical_solution_version }
  student_solution_ref { attempt_id, extraction_version }      # reference, not pixels
  extraction_summary { overall_confidence, low_confidence_regions[] }
  answer_verification[]        # per subproblem: answer_status (§6A)
  solution_steps[]             # step_id, order_index, step_kind, depends_on[],
                               #   step_status (§6B), reference_relationship (§16),
                               #   normalized_math, source_regions[], extraction_confidence
  root_errors[]                # step_ids (earliest/material first)
  propagation_edges[]          # { from_step_id, to_step_id }
  rubric_result                # math-rubric-v1 dimension verdicts (§9)
  university_scoring_result?   # official points/criteria outcome where available (§10)
  core { core_focus, priority, solution_step_id, error_classification }   # §17
  hint_availability { max_level, levels[] }                               # §18 (availability, not credit)
  generated_solution_ref?      # origin=ai_generated, separate artifact (§4)
  reevaluation_link?           # prior_attempt_id, prior_evaluation_id, deltas (§20)
  uncertainty { outcome, reasons[] }                                      # §31
  model_provenance { model_provider, model_name, prompt_version, contract_version }
```

**Q: does `math-eval-v1` need its own identity/version, provenance, step structure, error
relationships, CORE, hint availability, generated-solution provenance, reevaluation linkage, and
model metadata?** Yes to all — enumerated above. It deliberately stores **references** to images
and generated artifacts, never the binaries.

---

## 36. Human Review DTO / Quality direction (§39)

`ql-read-v1` and `hq-read-v1` are **not changed in MATH-1.** The future direction (minimum):
- Extend the Human-Quality **read** projection additively (e.g. a Math-specific `hq-math` group or
  a `qlm-read-v1`) that surfaces, for the reviewer: original image evidence · extraction
  uncertainty · official source · mathematical step structure · root/propagated relationship ·
  alternative-path judgment — **none** of which the current Humanities projection carries.
- Add a Math rubric version (`hq-math-rubric-v1`) and Math finding targets (`SOLUTION_STEP`,
  `ROOT_ERROR`, `EXTRACTION_REGION`, `ALTERNATIVE_PATH`) **without** redefining Humanities
  sentence feedback.
- Reuse the HQP append-only + derived-projection + SECURITY-DEFINER-write + idempotency spine
  unchanged. This is a MATH-7 deliverable, not MATH-1.

---

## 37. VOICE-1 extension contract (§40–§42)

Recorded as a **future shared capability** (not implemented). Targets eventually: Humanities
(overall, dimension, CORE, sentence feedback, rewrite guidance) and Math (overall, dimension,
CORE, solution step, root error, hint, reevaluation change). Voice consumes **structured canonical
facts** (§35), may simplify formulas into natural Korean while preserving meaning, and stores no
contradictory second evaluation. **Provider options to investigate later** (A browser/device TTS ·
B cloud neural TTS · C generated/cached audio · D on-demand streamed), weighed on Korean
naturalness, formula pronunciation, cost, latency, accessibility, replay, privacy, retention,
APP/web compatibility. **No provider is selected in MATH-1.**

---

## 38. Accessibility (§42)

Architectural compatibility only: the structured extraction + `normalized_math` + canonical
evaluation enable future screen-reader-friendly formulas, Korean spoken explanations, image
alternative descriptions, keyboard navigation, and formula text equivalents. Not implementation
scope.

---

## 39. Security / privacy (§43)

Future privacy boundaries to resolve **before** a Production Math launch (design-only here):
handwritten answer images · uploaded PDFs · student names accidentally visible in photos · EXIF
metadata · temporary Vision processing · generated structured extraction · Human-Quality access ·
any future audio. **No indefinite raw-image retention by default.** Human Quality stores
**references and provenance, not student content** (reused from HQP §17). **An explicit
retention-policy work item is required before Production Math launch** (§46). `PRIVACY_FOLLOW_UP_
REQUIRED: YES`.

---

## 40. Cost model (§44)

Major incremental cost drivers vs Humanities (no prices computed): image upload/storage · Vision/
OCR · larger multimodal context · mathematical evaluation · alternative-path verification ·
reevaluation · optional generated solution · future TTS. **Safe reuse:** official-source
structured extraction is reusable across students (it is not personal data). **Never cache student
personal answers across users.**

---

## 41. Failure model (§45)

Conceptual failures, defined separately and **never** classified as student error when they are
infrastructure/model failures:
`INPUT_UNREADABLE` · `EXTRACTION_AMBIGUOUS` · `PROBLEM_SOURCE_INCOMPLETE` ·
`OFFICIAL_SOLUTION_UNAVAILABLE` · `MATHEMATICAL_EQUIVALENCE_UNCERTAIN` · `EVALUATION_FAILED` ·
`MODEL_OUTPUT_INVALID` · `HUMAN_REVIEW_REQUIRED`.

---

## 42. Launch acceptance criteria (§46)

Measurable, dataset-honest (no invented accuracy percentages):
- official source provenance preserved (§33, §34);
- student original solution preserved per approved retention (§39);
- extraction uncertainty visible (§12, §31);
- no low-confidence OCR error silently scored as a math error (invariant 2);
- final-answer verification separated from reasoning verification (§6);
- alternative valid path accepted (§5, §16);
- root vs propagated error represented (§7);
- CORE generated from a material root issue (§17);
- hint ladder works without forced full-solution reveal (§18, §30);
- re-solve history preserved (§19);
- reevaluation identifies improvement (§20);
- Human Quality review path exists (contract, §24, §36);
- Credit authority remains single (§25);
- no Production AI activation implied by architecture completion (§0).

---

## 43. Implementation phasing (§47)

| Phase | Scope | Parallelizable with |
| --- | --- | --- |
| **MATH-2** | Canonical data/source/persistence **contract** (Option C spine + Math child persistence; problem/subproblem/official-source/canonical-solution) | — (gates the rest) |
| **MATH-3** | Vision / handwritten-solution ingestion + structured extraction + confidence | MATH-4 contract design |
| **MATH-4** | Math evaluation engine + `math-eval-v1` (answer + path + writing + root/propagated) | MATH-3 (interface-first) |
| **MATH-5** | CORE + Hint Ladder (Levels 0–2) | after MATH-4 |
| **MATH-6** | Re-solve + Reevaluation | after MATH-5 |
| **MATH-7** | Human Quality / Quality Console Math extension (additive) | can start contract after MATH-4 |
| **MATH-8** | Production E2E / launch gate (retention policy, privacy, acceptance §42) | last |
| **VOICE-1** | Korean pedagogical voice explanation (Humanities + Math), playback (play/pause/replay/speed), voice-script adapter, audio artifact + retention decision — **POST_LAUNCH_REQUIRED, target before end of 2026-10; does not block initial launch** | consumes MATH-4+ DTO; can start adapter design after MATH-4 |

MATH-3 and MATH-4 can proceed in parallel once MATH-2 fixes the contract (interface-first).
MATH-7's contract can be drafted alongside MATH-4. MATH-2 is the single hard gate. VOICE-1 is a
**separate shared track** (not Math-only): it consumes the canonical Humanities + Math evaluation
facts and runs after the initial launch, in parallel with MATH-5+ once the evaluation DTO is fixed.

---

## 44. Architecture acceptance questions (§32) — consolidated

- **Q1** loop reuse without corruption — §1 (yes, loop shared; rubric/sentence/rewrite not).
- **Q2** genuinely shared facts — §3, §21 (identity, credit, HQ spine, attempt lifecycle, envelope,
  provenance, loop, voice contract).
- **Q3** Math facts needing separate persistence — §3, §21, §22 (problem/subproblem, official
  source, canonical solution, step+DAG, root/propagated, 3-layer eval, hints, Vision).
- **Q4** CORE for a math root error — §17 (PARTIAL: reuse selection, add step/error binding).
- **Q5** reevaluation as re-solve — §20 (linkage reused, criteria new).
- **Q6** HQ reviews Math without conflating sentence vs step — §24, §36 (additive extension).
- **Q7** single Credit authority — §25 (yes).
- **Q8** official vs AI-generated — §4, §15, §36 (ranked `reference_kind`; AI never labeled
  official).
- **Q9** multiple valid paths — §5, §16 (path relationship + per-step; uncertainty escalates).
- **Q10** root vs propagated — §7 (DAG derivation; CORE targets root).
- **Q11** extraction error ≠ student error — §12, §31, §32, §41 (confidence + confirmation +
  taxonomy).
- **Q12** correct answer, insufficient reasoning — §6 (answer CORRECT, path/justification flagged).
- **Q13** incorrect answer, mostly valid — §6 (answer INCORRECT, credit valid steps, target root).
- **Q14** subproblems & partial submissions — §14 (first-class; missing ≠ incorrect).
- **Q15** minimum hint ladder — §18 (Levels 0–2).
- **Q16** future science without one generic schema — §23 (yes; spine+contract, not flattening).
- **Q17** voice consumes canonical eval, no UI parsing — §26–27, §37 (yes).
- **Q18** smallest MATH-2 slice — §43 / below (canonical data/source/persistence contract).

---

## 45. Required decision output (§31)

```
MATH_1_ARCHITECTURE:            COMPLETE
LAUNCH_SCOPE:                   Humanities + Mathematical Essay (Math v1 = §28 LAUNCH_REQUIRED)
COMMON_LAB_CORE:                identity, credit, human-quality spine, attempt append-only
                               lifecycle, evaluation envelope, provenance discipline, learning
                               loop, voice-extension contract
MATH_SPECIFIC_CORE:            problem/subproblem, official-source provenance hierarchy, canonical
                               solution, solution-step + dependency DAG, root/propagated error
                               model, three-layer evaluation, hint ladder, Vision/extraction model,
                               re-solve granularity
PERSISTENCE_RECOMMENDATION:    C
PERSISTENCE_REASON:            shared cross-domain spine (credit + human-quality + learning-loop/
                               envelope contract) with Math-specific child persistence; Humanities
                               schema + ql-read-v1 untouched (A's migration risk avoided), no
                               duplicated wallet/quality spine (B's drift avoided), future Science
                               extends the same spine (§22)
MATH_RUBRIC_V1:                math-rubric-v1 — 8 required (problem_understanding, concept_selection,
                               solution_strategy, logical_development[BLOCKING], computation_accuracy,
                               justification_completeness[BLOCKING], final_conclusion,
                               mathematical_writing) + 2 conditional (case_analysis,
                               graph_interpretation); verdicts OK/CONCERN/FAIL/NA; weights DEFERRED
                               to dataset+university calibration (§9)
OFFICIAL_SOLUTION_PROVENANCE:  ranked reference_kind: OFFICIAL_SCORING_CRITERIA >
                               OFFICIAL_SOLUTION/SAMPLE_SOLUTION > OFFICIAL_EXAMINER_INTENT >
                               VERIFIED_INTERNAL_CANONICAL_SOLUTION > AI_GENERATED_ALTERNATIVE (§4)
ANSWER_VERIFICATION:           CORRECT/INCORRECT/PARTIALLY_CORRECT/NOT_DETERMINABLE, per subproblem (§6A)
SOLUTION_PATH_VERIFICATION:    per-step VALID/INVALID/INSUFFICIENT_JUSTIFICATION/CALCULATION_ERROR/
                               LOGICAL_GAP/PROPAGATED_ERROR/NOT_ASSESSABLE + attempt path
                               relationship (§5, §6B)
ROOT_ERROR_MODEL:             earliest material intrinsic-defect step over the dependency DAG (§7)
PROPAGATED_ERROR_MODEL:       downstream step defective only via upstream inputs; propagation_edges[]
                               (§7)
SOLUTION_STEP_MODEL:          stable step_id, order_index, step_kind, depends_on[], source_regions[],
                               normalized_math, extraction_confidence/version; not 1 line = 1 step (§8)
ALTERNATIVE_VALID_PATH:       OFFICIAL_PATH_MATCH/ALTERNATIVE_VALID_PATH/INVALID_PATH/
                               INSUFFICIENT_JUSTIFICATION; never wrong merely for differing; unknown
                               equivalence → NEEDS_HUMAN_REVIEW (§5, §16)
CORE_REUSE:                   PARTIAL (reuse core_focus+priority selection; add step/error subtype) (§17)
HINT_LADDER:                  Levels 0–5; launch Levels 0–2; progressive unlock; usage recorded, not
                               charged; full reveal gated (§18, §30)
RE_SOLVE_MODEL:              FULL_RESOLVE + STEP_RETRY at launch (PARTIAL_RESOLVE post-launch);
                               append-only immutable attempts (§19)
REEVALUATION_MODEL:          CORE corrected? root removed? new error? answer now correct?
                               justification now sufficient? linked to prior attempt/eval (§20)
VISION_INPUT_MODEL:          ORIGINAL_INPUT + STRUCTURED_EXTRACTION; image/PDF/tablet/typed (§11, §12)
ORIGINAL_IMAGE_AUTHORITY:    original evidence authoritative; extraction derived + versioned (§12, §13)
STRUCTURED_EXTRACTION:       page/region/step/raw_text/normalized_math/formula/diagram-ref/confidence/
                               uncertainty/source_coordinates (§13)
FORMULA_REPRESENTATION:      LaTeX is one normalization, not sole canonical; original authoritative (§13)
EXTRACTION_UNCERTAINTY:      per-region confidence; low-confidence → confirm/escalate; never silent
                               INCORRECT (§12, §31, §32)
UNIVERSITY_SCORING_INTEGRATION: COMMON_MATH_RUBRIC + UNIVERSITY_SCORING_CRITERIA (official precedence;
                               AI-derived labeled inferred) (§10)
HUMAN_QUALITY_REUSE:         additive extension (hq-math-rubric-v1 + Math finding targets); spine
                               reused; ql-read-v1/hq-read-v1 unchanged (§24, §36)
CREDIT_REUSE:                YES — single wallet; initial/re-eval share semantics; no new price (§25)
VOICE_EXTENSION_READY:       YES (§26–27, §37)
VOICE_1_PRIORITY:            POST_LAUNCH_REQUIRED (Owner decision 2026-10-01) (§26–27)
VOICE_1_TARGET:              BEFORE_2026_10_END
VOICE_1_BLOCKS_INITIAL_LAUNCH: NO
VOICE_1_ARCHITECTURE_COMPATIBILITY: PASS (every minimum-scope target maps to an existing canonical
                               fact; no DTO redesign needed; only audio artifact/retention deferred) (§26–27)
SCIENCE_FUTURE_COMPATIBILITY: additional domains on the same spine + child persistence; no forced
                               generic schema (§23)
LAUNCH_REQUIRED:            §28 LAUNCH_REQUIRED list
POST_LAUNCH:                §28 POST_LAUNCH list
EXPERIMENTAL:               §28 EXPERIMENTAL list
NEW_CANONICAL_FACTS_REQUIRED: math problem/subproblem; official-source artifact (ranked kind);
                               canonical solution; math attempt (image-bearing); math evaluation
                               (math-eval-v1); solution step + dependency DAG; root/propagated error;
                               math CORE subtype; hint-exposure record; math reevaluation; math human-
                               quality extension
DB_CHANGE_EXPECTED:          YES (future MATH-2; none in MATH-1)
BACKEND_CHANGE_EXPECTED:     YES (future MATH-2+; none in MATH-1)
CURRENT_HUMANITIES_SCHEMA_CHANGED: NO
PRODUCTION_CHANGED:          NO
MIGRATION_CREATED:           NO
PROVIDER_CALLS:              0
PRODUCTION_AI:               OFF
READY_FOR_MATH_2:            YES
MATH_2_RECOMMENDED_SCOPE:    canonical data/source/persistence contract — Option C spine + Math child
                               persistence; problem/subproblem; official-source provenance +
                               preserved artifacts; canonical solution; versioning; no Vision, no
                               evaluation engine, no AI
```

---

## 46. Required final report (§48)

```
MATH_1_ARCHITECTURE:        COMPLETE
REPOSITORY:                 LC3808/legendstudy-lab
BRANCH:                     claude/math-essay-architecture-v1
BASE_COMMIT:                253867b91b00429d581946a418b2c82b2163e721
FINAL_COMMIT:               <filled at closeout>
PRODUCT_LAUNCH_SCOPE:       HUMANITIES + MATHEMATICAL_ESSAY
COMMON_LEARNING_LOOP:       submit → evaluate → CORE → focused feedback → produce-again → reevaluate
                            (Humanities: rewrite/sentence; Math: re-solve/step) (§1)
PERSISTENCE_RECOMMENDATION: C (shared spine + Math child persistence) (§22)
MATH_RUBRIC_V1:             math-rubric-v1 (§9)
OFFICIAL_SOURCE_MODEL:      preserved artifact + ranked reference_kind + version + verification (§4,§33)
CANONICAL_SOLUTION_MODEL:   final answer + official steps + scoring points + alt paths + concept deps,
                            ingested with preserved source traceability (§15)
ALTERNATIVE_VALID_PATH:     accepted; never wrong for differing; uncertainty → human review (§5,§16)
ANSWER_VERIFICATION_MODEL:  4-state per subproblem (§6A)
SOLUTION_STEP_MODEL:        stable id + DAG dependencies + source regions + normalized math (§8)
ROOT_PROPAGATED_ERROR_MODEL: DAG root vs propagated; propagation_edges; CORE targets root (§7)
CORE_MODEL:                 reuse core_focus+priority; Math subtype binds step + error class (§17)
HINT_LADDER:                Levels 0–5; launch 0–2; gated full reveal (§18,§30)
RE_SOLVE_MODEL:             FULL_RESOLVE + STEP_RETRY (launch); append-only (§19)
REEVALUATION_MODEL:         root/new-error/answer/justification deltas, linked to prior (§20)
VISION_INPUT_MODEL:         ORIGINAL_INPUT + STRUCTURED_EXTRACTION; image authoritative (§11,§12)
EXTRACTION_CONFIRMATION:    Option C (confirm low-confidence regions only) (§32)
MATH_EVAL_V1:               conceptual DTO, references not binaries, voice-consumable (§35)
HUMAN_QUALITY_EXTENSION:    additive (hq-math-rubric-v1 + Math targets); spine reused (§24,§36)
CREDIT_REUSE:               YES — single authority (§25)
VOICE_1_EXTENSION:          recorded shared extension point; DISPLAY_TEXT ≠ VOICE_SCRIPT (§26–27,§37)
VOICE_1_PRIORITY:           POST_LAUNCH_REQUIRED
VOICE_1_TARGET:             BEFORE_2026_10_END
VOICE_1_BLOCKS_INITIAL_LAUNCH: NO
VOICE_1_ARCHITECTURE_COMPATIBILITY: PASS
SCIENCE_FUTURE_COMPATIBILITY: same spine + child persistence; no forced generic schema (§23)
PRIVACY_FOLLOW_UP_REQUIRED: YES (retention policy before Production Math) (§39)
DB_CHANGE_EXPECTED:         YES (future; none in MATH-1)
BACKEND_CHANGE_EXPECTED:    YES (future; none in MATH-1)
CURRENT_HUMANITIES_IMPLEMENTATION_CHANGED: NO
MIGRATION_CREATED:          NO
PRODUCTION_CHANGED:         NO
PROVIDER_CALLS:             0
PRODUCTION_AI:              OFF
LAUNCH_REQUIRED:            §28
POST_LAUNCH:                §28
EXPERIMENTAL:               §28
READY_FOR_MATH_2:           YES
MATH_2_RECOMMENDED_SCOPE:   canonical data/source/persistence contract (§45)
FILES_CHANGED:              docs/architecture/MATH-1_MATHEMATICAL_ESSAY_ARCHITECTURE.md (new)
COMMIT:                     <filled at closeout>
PUSH:                       <filled at closeout>
LOCAL_REMOTE_SYNC:          <filled at closeout>
UNIFIED_WIKI_CHANGED:       NO
NEXT:                       OWNER/CHATGPT REVIEW → MATH-2 CANONICAL DATA/PERSISTENCE CONTRACT
                            → MATH-3 VISION INGESTION → MATH-4 EVALUATION ENGINE
```

---

## 47. Simplicity & consistency check

- **Smallest coherent design:** reuses the LAB learning loop, credit spine, and HQP review spine;
  adds Math domain objects **only** where sentence/essay semantics would be corrupted. It avoids a
  CAS/theorem-prover/graphing/editor build (§29), a second wallet (§25), a duplicated quality spine
  (§24), and over-generalization into one generic cross-domain schema (§23).
- **Consistency with deployed contracts:** `ql-read-v1`, `hq-read-v1`, HQP append-only/derived-
  projection/SECURITY-DEFINER discipline, the `core_focus`+priority CORE rule, and the
  immutable-subsequent-attempt rewrite pattern are all honored and extended additively — none is
  altered.
- **No implementation leaked in:** no SQL, no code, no provider call, no Production/Humanities/App/
  docs-repo change. MATH-1 is design only.
