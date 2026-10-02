# MATH-6A — Mathematical Essay (수리논술) Re-solve / Reevaluation / Learning-History Contract

**Status:** ARCHITECTURE / PRODUCT CONTRACT ONLY. No DB/migration, no Production change, no provider
call, no real student evaluation, no payment implementation, no VOICE-1.
**Date:** 2026-10-02
**Author role:** LegendStudy LAB Mathematical Essay learning-loop architect (Claude).
**Repository / branch:** `LC3808/legendstudy-lab` · `claude/math-essay-architecture-v1`.
**Base commit:** `04ac58b72a550812c40d627e9d56efbbaa8650c9` (MATH-5A tip).
**Authority read:** [MATH-1](MATH-1_MATHEMATICAL_ESSAY_ARCHITECTURE.md) ·
[MATH-2A](MATH-2_CANONICAL_DATA_PERSISTENCE_CONTRACT.md) ·
[MATH-3A](MATH-3_VISION_INPUT_ARCHITECTURE.md) ·
[MATH-4A](MATH-4_EVALUATION_ENGINE_CONTRACT.md) ·
[MATH-5A](MATH-5_CORE_HINT_LEARNING_CONTRACT.md) — all APPROVED. APP authority: MATH-2B
(DB/Security cross-review) + MATH-2R (Shared Integration Contract). Codex MATH-2C implementation is
**concurrent and incomplete** → this contract depends on **MATH-2R semantics, not physical names**
(§17).

> **This document authorizes nothing and changes no system.** No DB migration/SQL, no Production
> change, **no provider call**, **no real student data**, no payment logic, no price/refund change,
> no VOICE/TTS, no UI pixels, no Humanities schema redesign, no `ql-read-v1`/`hq-read-v1` breaking
> change, no chain-of-thought persistence, no MATH-2C implementation. MATH-1→5 are **not
> redesigned**. **MATH-4 remains sole evaluation authority; MATH-5 remains CORE/hint/reveal
> authority; MATH-6 never recomputes mathematical correctness.** Production AI **OFF**,
> `PROVIDER_CALLS: 0`. **MATH-6 decides no prices; the backend Credit/Billing authority is the final
> authority on eligibility.** `UNLIMITED_FREE_REEVALUATION: NO`.

---

## 1. Objective — the canonical answers (§4)

MATH-6 answers 20 questions with a canonical contract; the anchors:

| # | question | answer anchor |
| --- | --- | --- |
| 1 | What is a "re-solve"? | a new immutable student attempt in a lineage (§5) |
| 2 | What is a "reevaluation"? | MATH-4 re-running on a re-solve attempt, producing a delta (§6) |
| 3 | Which reeval is the included one? | the first eligible same-lineage reevaluation per backend (§9, §22-B) |
| 4 | When does the 14-day window start/end? | `initial_evaluation_completed_at` + 14d, UTC (§10, §22-A) |
| 5 | STEP_RETRY vs FULL_RESOLVE scope? | localized step vs whole solution; downstream `NOT_REASSESSED` (§7) |
| 6 | What is compared on reeval? | MATH-4A delta axes (§6) |
| 7 | root removed + new root? | `PREVIOUS_CORE_CORRECTED` + `NEW_INDEPENDENT_ERROR` (§6) |
| 8 | answer changed only? | `ANSWER_CHANGED`/`ANSWER_NOW_CORRECT` w/ reasoning facts intact (§6) |
| 9 | answer same, reasoning improved? | `JUSTIFICATION_IMPROVED` (§6) |
| 10 | no change? | `NO_MATERIAL_CHANGE` (§6) |
| 11 | re-solve after hint/reveal? | learning-context flags recorded (§11, §22-D) |
| 12 | hint/reveal never penalizes? | context-only, never affects correctness/score (§11) |
| 13 | multiple attempts lineage? | append-only, >2 attempts allowed (§8, §22-E) |
| 14 | extra reeval after included used? | backend eligibility (`PAID_REEVALUATION_REQUIRED`) (§9) |
| 15 | reeval after 14 days? | included expired; backend decides (§10, §22-F) |
| 16 | failed eval consumes included? | **NO** (§9, §22-B) |
| 17 | INPUT_FAILED? | not a consume; not a delivered evaluation (§9, §22-B) |
| 18 | HUMAN_REVIEW_REQUIRED? | valid-eval-with-HRR vs processing-failure distinction (§22-C) |
| 19 | account deletion pending? | fence all new work (§22-H) |
| 20 | web/app history parity? | one canonical lineage, derived projection (§8, §12) |

---

## 2–3. Commercial policy & "same answer" meaning (authoritative, not reopened)

**Owner-confirmed product policy (MATH-6 reflects, never redefines):**
- 1 Credit = **최초 첨삭 + 동일 답안 재첨삭 1회** ("최초 첨삭과 동일 답안 재첨삭(1회)까지 이용할 수
  있습니다." · "동일 답안 기준 1 Credit = 총 2회 첨삭").
- Included reevaluation window: **14 days** from the initial-evaluation result-provision date.
- Paid Credit validity: **3 months** from payment. Free signup Credit: **3 Credits**, granted
  immediately, **no Credit expiry** — **but** an initial evaluation paid with a free Credit still has
  a **14-day** included-reevaluation window (§22-G).
- `UNLIMITED_FREE_REEVALUATION: NO`. Backend Credit/Billing is the **final eligibility authority**.

**"동일 답안 재첨삭" ≠ byte-identical** (§3): it is a student revision/re-solve tied to the **same
canonical problem/subproblem + prior evaluation lineage**. The answer content *is expected to change*
— that is the point of a re-solve. Distinguish:

| case | is it a reevaluation? |
| --- | --- |
| **A. EXTRACTION_CONFIRMATION** (OCR read `x³`, student confirms `x²`) | **NO** — the student's math answer did not change (MATH-3A §44) |
| **B. STEP_RETRY** (re-solve a CORE-related step) | **YES** |
| **C. FULL_RESOLVE** (resubmit whole solution) | **YES** |
| **D. SHORT_ANSWER_RESOLVE** (re-enter the answer) | **YES** |
| **E. NEW PROBLEM / NEW LINEAGE** (different problem) | **NO** — not same-lineage |

---

## 5. Re-solve canonical types (`RESOLVE_KINDS`)

Launch kinds: **`STEP_RETRY` · `FULL_RESOLVE` · `SHORT_ANSWER_RESOLVE`**. **`PARTIAL_RESOLVE` is NOT
re-added** (MATH-1 §19 / MATH-5A §30) — if needed, express via `STEP_RETRY`/`FULL_RESOLVE`.

Every re-solve is a **new immutable attempt** appended to the lineage, carrying: `prior_attempt_id` ·
`prior_evaluation_id` · canonical problem/leaf lineage · student ownership · `resolve_kind` ·
`created_at`/server sequence · commercial-eligibility reference · prior CORE reference (where
applicable). **No prior attempt/evaluation is ever overwritten** (append-only, MATH-2A §17/§19).

---

## 6. Reevaluation comparison contract (`REEVALUATION_DELTA`)

Reevaluation is **not** "did the score go up." It consumes MATH-4A's canonical reevaluation facts
(§31–§34 there); **MATH-6 does not recompute correctness.** Comparison axes:

previous CORE corrected? · previous root error removed? · propagated errors removed? · new
independent root error? · answer changed? · answer now correct? · justification improved? · path
validity changed? · mathematical writing improved (where applicable) · official-criterion
satisfaction changed (where applicable) · no material change? · uncertainty resolved? · new
uncertainty introduced?

| required case | canonical representation |
| --- | --- |
| root removed + new root (§7 of brief) | `PREVIOUS_CORE_CORRECTED` + `NEW_INDEPENDENT_ERROR`; select next CORE; never "완전히 해결했습니다" |
| answer changed only (§8) | `ANSWER_CHANGED` / `ANSWER_NOW_CORRECT` while reasoning facts preserved |
| answer same, reasoning improved (§9) | `JUSTIFICATION_IMPROVED` (+ `PATH_VALIDITY_CHANGED` if applicable) |
| no change (§10) | `NO_MATERIAL_CHANGE` stated specifically, not a fabricated new CORE |

Progression is **not binary** (MATH-5A §37).

---

## 7. STEP_RETRY semantics (strict)

If the student resubmits **only** Step 3: Step 3 / prior CORE resolution **is** assessable; Steps 4–5
(not resubmitted) are **not** auto-declared correct — even if the prior propagated error would
*theoretically* vanish once the root is fixed, **full-solution correctness is not auto-confirmed**
when downstream was not resubmitted. Canonical state: **`NOT_REASSESSED`** (or equivalent) for the
unsubmitted downstream scope. **STEP_RETRY must not look like FULL_RESOLVE** (MATH-4A §33, MATH-5A
§39). Student-facing: "해당 단계의 오류는 수정되었습니다. 이후 풀이 전체는 이번 재풀이 범위에 포함되지 않아 다시
판정하지 않았습니다."

---

## 8. Learning history (`LEARNING_HISTORY`, `APPEND_ONLY_HISTORY: YES`)

A student-visible timeline derived from canonical facts:

```
Attempt 1 → Evaluation 1 → CORE: 부호 처리 → L1 viewed → STEP_RETRY
  → Reevaluation → Previous CORE corrected → New CORE: 정의역 확인 → FULL_RESOLVE
  → Reevaluation → Complete
```

**Canonical facts** (authority): attempt · evaluation · CORE · hint exposure · reveal · re-solve ·
reevaluation delta. **Display timeline is a derived projection.** The lineage is **append-only** and
may hold **more than two attempts** (§22-E) — commercial eligibility (how many reevals are *included*)
and learning-history lineage (how many attempts *exist*) are **separate concerns**. **Never** add
mastery %, IQ-like score, admission probability, or an arbitrary growth score (MATH-5A §61). Not an
analytics warehouse.

---

## 9. Commercial eligibility semantic states (`INCLUDED_REEVALUATION_*`)

MATH-6 computes **no** price/billing; it exposes the minimal semantic states a UI/consumer needs
(backend is authority):

`INCLUDED_REEVALUATION_AVAILABLE` · `INCLUDED_REEVALUATION_USED` · `INCLUDED_REEVALUATION_EXPIRED` ·
`PAID_REEVALUATION_REQUIRED` · `NOT_ELIGIBLE` · `BILLING_STATUS_UNAVAILABLE`.

Rules (details in §22-A/B/C):
- Included reeval window = **14 days** from a **valid** initial-evaluation completion.
- A valid canonical initial evaluation must have been **delivered** to count as "최초 첨삭 완료."
- Provider timeout / malformed output / `INPUT_FAILED` → **no valid result delivered → does not
  consume** the included reevaluation.
- Retry/idempotency must **not** double-consume.
- `HUMAN_REVIEW_REQUIRED` as part of a **valid** canonical evaluation vs a **processing failure** are
  distinguished (§22-C).
- **Backend commercial authority makes the final call.** No payment amount/refund formula hardcoded.

---

## 10. 14-day policy (`INCLUDED_REEVALUATION_WINDOW: 14 days`) — see §22-A

```
included_reevaluation_expires_at = initial_evaluation_completed_at + 14 days
```
`initial_evaluation_completed_at` = **server timestamp at which a valid canonical initial evaluation
becomes available to the student** — **not** upload time, request time, provider-start time, or
Vision-completion time. Stored in **UTC**; clients display local time. At the **exact expiry
boundary** the included eligibility is no longer available unless the backend commercial contract
says otherwise — **no client-side grace period.** After expiry: existing results/history remain;
**only** the included reevaluation right expires; a new evaluation follows backend commercial
eligibility (§22-F).

---

## 11. Hint / solution-reveal context (`HINT_USAGE_SCORING_PENALTY: NO`)

Learning-context facts that **may** be recorded: `L0_ONLY` · `L1_VIEWED` · `L2_VIEWED` ·
`REFERENCE_SOLUTION_REVEALED` (+ `..._BEFORE_RESOLVE`, §22-D). These are **not** official-score
deductions, correctness deductions, ability assessments, or evidence of "solved unaided."
**Exposure ≠ cognition** (MATH-5A §24). Usable only as **learning context** in reevaluation
messaging (VOICE-1 §14), never a scoring input.

---

## 12. Response-format awareness (`RESPONSE_FORMAT_AWARE: PASS`, `UNIVERSITY_NAME_HARDCODING: NONE`)

Re-solve/reevaluation respect the canonical leaf `response_format`:
- `SHORT_ANSWER` → "답 다시 입력하기"; **no** full-solution editor forced.
- `SHORT_REASONING` → re-solve the essential reasoning.
- `FULL_SOLUTION` → STEP_RETRY or FULL_RESOLVE.
- `PROOF` → STEP_RETRY may fix a specific logical link, but an **unsubmitted full proof is not
  deemed complete** (§7).

**No university-name hardcoding.** Whether 경북대/부산대/을지대 etc. use short-answer is decided by the
**year/exam/problem/subproblem content profile** (MATH-2A §33), never by name.

---

## 13. Human Quality (`HUMAN_QUALITY_HANDOFF`)

Reevaluation results are HQ-reviewable (HQ-A shared strategy, MATH-2R). Minimum reviewer evidence:
prior evaluation · new evaluation · prior CORE · new CORE · prior/new root errors · reevaluation
delta · **submitted re-solve scope** · hint/reveal exposure context · authority versions · extraction-
confirmation provenance · **minimal commercial-eligibility state only** (full price/payment info
**not** exposed). HQ remains review authority over **AI quality**, never a second student scoring
system. Full MATH-7A handoff in §23.

---

## 14. VOICE-1 (`VOICE_1_COMPATIBILITY: PASS`)

MATH-6 canonical facts directly feed future Korean voice explanations, e.g.:
- "지난 첨삭에서 지적한 부호 오류는 이번 풀이에서 수정되었습니다."
- "다만 정의역을 확인하는 과정에서 새로운 오류가 생겼습니다."
- "최종 답은 맞아졌지만, 풀이의 근거는 아직 충분하지 않습니다."
- "이번 재풀이에서는 해당 단계만 제출했기 때문에 이후 풀이 전체는 다시 판정하지 않았습니다."

Voice script is **DERIVED/NON-CANONICAL**; `AUDIO_PERSISTENCE: NONE_BY_DEFAULT`; VOICE never creates a
new reevaluation judgment.

---

## 15 / 22. Required decision output (A–H)

### A. Included-reevaluation clock
`included_reevaluation_expires_at = initial_evaluation_completed_at + 14 days`;
`initial_evaluation_completed_at` = server timestamp a **valid canonical initial evaluation becomes
available** (not upload/request/provider-start/Vision-completion). Stored **UTC**, displayed local.
Exact boundary → no longer available unless backend says otherwise; **no client-side grace.**

### B. What consumes the included reevaluation
**Consumed only by a successfully accepted and completed eligible same-lineage reevaluation per
backend authority.** The following **do NOT consume it by themselves:** opening the original result ·
viewing CORE · viewing L1 · viewing L2 · revealing a reference solution · creating an extraction
confirmation · starting an upload that fails · `INPUT_FAILED` · provider timeout · malformed evaluator
output · failed finalize · exact idempotent retry · a request rejected before legitimate processing ·
a different-problem submission. Ambiguous financial/evaluation state → **do not guess; use canonical
reconciliation.**

### C. HUMAN_REVIEW_REQUIRED
Distinguish **(1)** a *valid canonical evaluation* whose disposition includes `HUMAN_REVIEW_REQUIRED`/
mathematical uncertainty (may count as a **delivered** evaluation if the student has a meaningful,
safe result and the canonical commercial contract classifies it completed) from **(2)** a *processing
failure* where **no** valid canonical evaluation exists (must **not** consume entitlement). **MATH-6
exposes the semantic distinction; it does not invent the financial classification.**

### D. Reevaluation after early solution reveal
If the student deliberately reveals a reference solution before re-solving, reevaluation remains
allowed **if commercially eligible**. Record `REFERENCE_SOLUTION_REVEALED_BEFORE_RESOLVE = true` (or
equivalent learning-context fact). **Do NOT** reduce correctness/official score, reject the
reevaluation for viewing a solution, or pretend the subsequent solution was unaided. Learning history
may **factually** state the solution was viewed before re-solve; **no motive/quality inference.**

### E. Multiple re-solve attempts
Lineage may contain **more than two** attempts (Attempt 1 → included Reeval Attempt 2 → optional
later **paid** Reeval Attempt 3 → …). Persistence is **not** limited to two attempts just because one
Credit includes one reevaluation. **Commercial eligibility and learning-history lineage are separate
concerns.** All attempts immutable.

### F. Expired included reevaluation
At expiry: original evaluation, CORE, exposed hints/history remain readable; reference-solution access
follows its own reveal/content policy; the **included** eligibility becomes `EXPIRED`; **no data is
deleted** because the 14-day window ended. A further evaluation → backend commercial eligibility
decides whether a new Credit is required.

### G. Free-Credit compatibility
Free signup Credit (3 Credits, **no Credit expiry**) does **not** mean an infinite reevaluation
window. Once a free Credit is used for an initial evaluation, its included same-lineage reevaluation
follows the **same 14-day** window. **No separate Math learning semantics for free vs paid Credit** —
only the commercial source differs.

### H. Account deletion
When account lifecycle is **PENDING/ERASING** per the shared backend contract: no new re-solve
submission creating personal data · no new reevaluation request · no new hint-artifact generation that
creates retained personal state · no provider dispatch · no stale finalize · no resurrection of
learning history after erasure. **Existing account-deletion semantics remain authority; MATH-6 does
not modify ADR-2** (E1 CASCADE / E2 SET NULL honored, §23).

---

## 16. Synthetic acceptance matrix (`SYNTHETIC_MATRIX: RSL1-RSL30 COMPLETE`)

No real AI; each row states expected canonical facts.

| RSL | scenario | expected canonical facts |
| --- | --- | --- |
| RSL1 | initial → successful STEP_RETRY | delta `CORE_CORRECTED`/`ROOT_ERROR_REMOVED`; downstream `NOT_REASSESSED` if not resubmitted |
| RSL2 | initial → successful FULL_RESOLVE | full reeval; `ROOT_ERROR_REMOVED` + `ANSWER_NOW_CORRECT` where true |
| RSL3 | SHORT_ANSWER retry | `SHORT_ANSWER_RESOLVE`; answer re-verified; no full-solution demand |
| RSL4 | correct answer / reasoning still bad | `ANSWER` correct + path INVALID/INSUFFICIENT preserved |
| RSL5 | wrong answer → correct answer | `ANSWER_CHANGED` + `ANSWER_NOW_CORRECT` |
| RSL6 | answer unchanged / reasoning improved | `JUSTIFICATION_IMPROVED` |
| RSL7 | previous root removed / new root introduced | `PREVIOUS_CORE_CORRECTED` + `NEW_INDEPENDENT_ERROR`; next CORE |
| RSL8 | no material change | `NO_MATERIAL_CHANGE`, stated specifically |
| RSL9 | propagated errors disappear after root fix (full resubmit) | root removed + propagated removed |
| RSL10 | STEP_RETRY downstream NOT_REASSESSED | step fixed; downstream `NOT_REASSESSED` |
| RSL11 | L1 viewed before retry | `L1_VIEWED` context; no score effect |
| RSL12 | L2 viewed before retry | `L2_VIEWED` context; no score effect |
| RSL13 | reference solution revealed before retry | `REFERENCE_SOLUTION_REVEALED_BEFORE_RESOLVE`; reeval allowed if eligible; no penalty |
| RSL14 | hint/reveal causes no score penalty | correctness/official score unchanged by exposure |
| RSL15 | first included reevaluation eligible | `INCLUDED_REEVALUATION_AVAILABLE` → consumed on valid finalize |
| RSL16 | included reevaluation already used | `INCLUDED_REEVALUATION_USED` → `PAID_REEVALUATION_REQUIRED` |
| RSL17 | 14-day expiry boundary | at/after `expires_at` → `INCLUDED_REEVALUATION_EXPIRED`; no grace |
| RSL18 | provider failure before valid reevaluation | not consumed; retry/fallback; no delivered eval |
| RSL19 | malformed output retry | `OUTPUT_VALIDATION_FAILURE`; not consumed; no partial publish |
| RSL20 | duplicate request / idempotency | single canonical reeval; single consume |
| RSL21 | HUMAN_REVIEW_REQUIRED | valid-eval-with-HRR (may be delivered) vs failure (no consume) distinguished |
| RSL22 | extraction confirmation ≠ reevaluation | confirmation recorded; no reeval, no consume |
| RSL23 | different problem ≠ same lineage | new lineage; not an included same-lineage reeval |
| RSL24 | account deletion pending | all new work fenced; no finalize/resurrection |
| RSL25 | authority/content version changed after prior eval | historical facts pinned; new eval uses new active authority |
| RSL26 | valid alternative path preserved | `ALTERNATIVE_VALID_PATH` kept; not penalized for differing |
| RSL27 | proof retry | STEP_RETRY fixes a logical link; unsubmitted full proof `NOT_REASSESSED` |
| RSL28 | no official solution | loop works; reference labeled truthfully/none |
| RSL29 | reference conflict | `REFERENCE_CONFLICT` → content review; student not penalized |
| RSL30 | web/app parity | identical canonical lineage/delta/eligibility facts on both clients |

---

## 17. Codex MATH-2C reconciliation (`MATH_2C_RECONCILIATION_READY: YES`)

MATH-6A creates no physical schema and depends on **semantics only**:

| semantic dependency | concept |
| --- | --- |
| immutable attempt lineage | append-only attempts with prior links (§5) |
| prior evaluation binding | `prior_evaluation_id` (§5,§6) |
| resolve kind | `STEP_RETRY`/`FULL_RESOLVE`/`SHORT_ANSWER_RESOLVE` (§5) |
| reevaluation delta | MATH-4A delta facts (§6) |
| hint/reveal exposure | learning-context flags (§11) |
| commercial eligibility | included/used/expired/paid states (§9) |
| Math billing binding | typed Math binding on existing Ledger (MATH-2R) |
| lifecycle / account-deletion fencing | pending/erasing fence (§22-H) |
| HQ Math binding | typed Math HQ targets; E1 CASCADE / E2 SET NULL (§23) |

Physical names reconcile after MATH-2C; a naming/physical change is **not** a product-contract
change, and must not break MATH-6 semantics. A genuine semantic blocker is reported before MATH-7A.

---

## 23. MATH-7A handoff — Human Quality / Quality Console (Math) (`MATH_7_HANDOFF_READY: YES`)

MATH-7A designs the operator review experience for Math **without redefining the mathematical
evaluation**. Reviewer must inspect:

1. **Problem authority:** university/exam/problem/leaf · `response_format` · evaluation profile ·
   official criteria · reference-solution provenance.
2. **Student evidence:** original-evidence access · selected extraction · extraction uncertainty ·
   student extraction confirmation.
3. **Mathematical evaluation:** answer verification · solution steps · logical DAG · root errors ·
   propagated errors · considered alternative paths · official-criterion results · diagnostic rubric.
4. **Learning guidance:** CORE · L1 · L2 · leakage classification · reference-solution reveal state.
5. **Reevaluation:** prior evaluation · new evaluation · resolve kind · submitted scope ·
   reevaluation delta · prior CORE corrected? · new root? · downstream `NOT_REASSESSED` where
   applicable.
6. **Human Quality rubric (`hq-math-rubric-v1`, typed Math — not Humanities sentence semantics):**
   `diagnosis` · `core_priority` · `actionability` · `evidence_adherence` · `valid_path_preservation`
   · `hallucination_absence` · `extraction_fidelity` · `step_reasoning` · `hint_quality` ·
   `progression` · `generated_solution`.

**Preserve:** **E1** bound-evaluation deletion → judgment/findings **CASCADE**; **E2** reviewer
deletion → `reviewer_user_id` **SET NULL** for reviews of surviving evaluations. **Do not reuse
Humanities `SENTENCE` finding semantics for Math solution steps** — use the typed Math targets
approved in MATH-2R (`SOLUTION_STEP`, `ROOT_ERROR`, `EXTRACTION_REGION`, `ALTERNATIVE_PATH`).

**Quality questions MATH-7A reviewers must be able to answer (§24, AI-quality — not a second
university scoring system):** Did AI read the handwriting correctly? · Did it wrongly mark a valid
alternative path wrong? · Did it find the actual root error? · Did it mistake a propagated error for
an independent weakness? · Is CORE the most useful next target? · Does L1 guide without the answer? ·
Does L2 identify the right concept without the full solution? · Did reevaluation correctly recognize
what the student fixed? · Did STEP_RETRY avoid claiming downstream was reassessed? · Did the evaluator
invent an official scoring requirement? · Did it confuse an AI reference with an official one?

---

## 25. Self-review (§19, §25)

- **Product:** 1 Credit = initial + one eligible same-lineage reevaluation preserved · included
  window = 14 days · free Credit has no Credit expiry but reevaluation window stays 14 days · no
  unlimited reevaluation · backend remains eligibility authority.
- **Pedagogy:** STEP_RETRY ≠ FULL_RESOLVE · extraction confirmation ≠ re-solve · solution reveal ≠
  re-solve · reevaluation shows learning change · unsubmitted downstream may stay `NOT_REASSESSED` ·
  hint/reveal usage causes **no** scoring penalty.
- **Evaluation:** MATH-4 sole evaluation authority · MATH-5 CORE/hint/reveal authority · MATH-6 does
  not recompute correctness · root/propagated semantics preserved · alternative valid paths preserved.
- **Privacy/security:** no real student data · no analytics shadow history · no chain-of-thought · no
  DB/Production/provider changes · account-deletion compatibility preserved.
- **Engineering:** no physical MATH-2C naming assumptions · no `ql-read-v1`/`hq-read-v1` breaking
  assumption · cross-doc links resolve · append-only history preserved · no new Owner policy invented.

**`OWNER_DECISIONS_REQUIRED: 0`.** All commercial/pedagogical policy is Owner-confirmed; MATH-6 only
encodes the semantics. Decisions A–H (§22) implement confirmed policy and introduce no new product
choice.

---

## 21. Final report

```
MATH_6A_CONTRACT:            COMPLETE
BRANCH:                      claude/math-essay-architecture-v1
BASE_COMMIT:                 04ac58b72a550812c40d627e9d56efbbaa8650c9
FINAL_COMMIT:                <filled at closeout>

RESOLVE_KINDS:               STEP_RETRY, FULL_RESOLVE, SHORT_ANSWER_RESOLVE
STEP_RETRY:                  localized; downstream NOT_REASSESSED if not resubmitted (§7)
FULL_RESOLVE:                whole-solution re-eval + prior comparison (§6)
SHORT_ANSWER_RESOLVE:        answer re-entry; no forced solution editor (§12)
PARTIAL_RESOLVE:             NOT_ADDED (express via STEP_RETRY/FULL_RESOLVE) (§5)

REEVALUATION_DELTA:          MATH-4A delta axes consumed; not score-only (§6)
LEARNING_HISTORY:            canonical-fact timeline; derived projection; no mastery%/prob (§8)
APPEND_ONLY_HISTORY:         YES (>2 attempts allowed; nothing overwritten) (§5,§8)

ONE_CREDIT_PRODUCT_RULE:     INITIAL + ONE ELIGIBLE SAME-LINEAGE REEVALUATION
INCLUDED_REEVALUATION_COUNT: 1
INCLUDED_REEVALUATION_WINDOW: 14 days
INCLUDED_REEVALUATION_START: initial_evaluation_completed_at (valid canonical eval available; UTC)
INCLUDED_REEVALUATION_EXPIRY: start + 14 days; exact boundary; no client grace (§10,§22-A)
FAILED_EVALUATION_CONSUMES_INCLUDED_REEVALUATION: NO (§9,§22-B)
DUPLICATE_RETRY_CONSUMES_INCLUDED_REEVALUATION: NO (idempotent; single consume) (§22-B)
BACKEND_COMMERCIAL_AUTHORITY: YES (final eligibility authority; MATH-6 sets no price)

HINT_EXPOSURE_CONTEXT:       L0_ONLY/L1_VIEWED/L2_VIEWED recorded as learning context (§11)
SOLUTION_REVEAL_CONTEXT:     REFERENCE_SOLUTION_REVEALED(_BEFORE_RESOLVE) recorded (§11,§22-D)
HINT_USAGE_SCORING_PENALTY:  NO (§11)

RESPONSE_FORMAT_AWARE:       PASS (§12)
UNIVERSITY_NAME_HARDCODING:  NONE (content profile is authority) (§12)
VOICE_1_COMPATIBILITY:       PASS (script derived; audio NONE_BY_DEFAULT) (§14)
HUMAN_QUALITY_HANDOFF:       evidence set + minimal eligibility state; no price exposure (§13,§23)
MATH_7_HANDOFF_READY:        YES (§23)
MATH_2C_RECONCILIATION_READY: YES (§17)

SYNTHETIC_MATRIX:            RSL1-RSL30 COMPLETE
OWNER_DECISIONS_REQUIRED:    0
READY_FOR_MATH_7A:           YES
READY_FOR_PRODUCTION:        NO

DB_CHANGED:                  NO
MIGRATION_CREATED:           NO
PROVIDER_CALLS:              0
PRODUCTION_CHANGED:          NO
PRODUCTION_AI:               OFF

FILES_CHANGED:               docs/architecture/MATH-6_RESOLVE_REEVALUATION_LEARNING_HISTORY_CONTRACT.md
                             (new); MATH-1/2A/3A/4A/5A one-line successor pointers
COMMIT:                      <filled at closeout>
PUSH:                        <filled at closeout>
LOCAL_REMOTE_SYNC:           <filled at closeout>
UNIFIED_WIKI_CHANGED:        NO

NEXT:                        OWNER/CHATGPT REVIEW → MATH-2C RECONCILIATION
                             → MATH-7A HUMAN QUALITY / QUALITY CONSOLE MATH CONTRACT
                             → MATH IMPLEMENTATION / END-TO-END INTEGRATION
```
