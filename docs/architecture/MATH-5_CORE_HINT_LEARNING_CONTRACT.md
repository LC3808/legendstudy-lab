# MATH-5A — Mathematical Essay (수리논술) CORE / Hint Ladder / Re-solve Learning Contract

**Status:** ARCHITECTURE / PRODUCT CONTRACT ONLY. No UI, no DB/migration, no shared-backend change,
no AI/Vision calls, no real student evaluation, no payment, no VOICE-1.
**Date:** 2026-10-02
**Author role:** LegendStudy Mathematical Essay learning-loop architect (Claude).
**Repository / branch:** `LC3808/legendstudy-lab` · `claude/math-essay-architecture-v1`.
**Base commit:** `fb0ccfd68068fdf9510991248b2ad1efb52363b0` (MATH-4A tip).
**Authority read:** [MATH-1](MATH-1_MATHEMATICAL_ESSAY_ARCHITECTURE.md) ·
[MATH-2A](MATH-2_CANONICAL_DATA_PERSISTENCE_CONTRACT.md) ·
[MATH-3A](MATH-3_VISION_INPUT_ARCHITECTURE.md) ·
[MATH-4A](MATH-4_EVALUATION_ENGINE_CONTRACT.md) — all APPROVED.
**Successor:** [MATH-6A](MATH-6_RESOLVE_REEVALUATION_LEARNING_HISTORY_CONTRACT.md) (re-solve/reevaluation/history) → [MATH-7A](MATH-7_HUMAN_QUALITY_CONSOLE_CONTRACT.md) (Human Quality / Quality Console).
**Implementation:** [MATH-5B_CORE_HINT_IMPLEMENTATION.md](MATH-5B_CORE_HINT_IMPLEMENTATION.md) — CORE/hint/reveal consumer + leakage validation + `reveal_hint` gating in `src/lib/math-learning/` (H01–H35 green; no live model).

> **This document authorizes nothing and changes no system.** No UI, no DB migration/schema, no
> shared-backend change, **no AI/Vision provider call**, **no real student answer evaluated**, no
> payment logic, no VOICE-1/TTS, no App/docs-repo change. MATH-1/2A/3A/4A are **not redesigned**.
> MATH-4 remains the sole **evaluation authority**; MATH-5 **consumes** `math-eval-v1` and never
> recomputes mathematical correctness. `ql-read-v1`/`hq-read-v1` unchanged; `qlm-read-v1` additive.
> Production AI **OFF**, `PROVIDER_CALLS: 0`.

**MATH-2R semantic integration facts incorporated** (depend on *semantics*, not physical names, §85):
Option C final PASS · **HQ-A shared Human Quality strategy** · existing **Credit Ledger reused**, no
second wallet, **typed Math billing binding** · Vision separate charge **NO** · Hint L0–L2 charge
**NO** · **E1** evaluation deletion CASCADE · **E2** reviewer identity SET NULL ·
`ql-read-v1`/`hq-read-v1` unchanged · `qlm-read-v1` additive.

---

## 1–2. Objective & product principle

The learning loop after evaluation:

```
SUBMIT → EVALUATE → UNDERSTAND CORE → RECEIVE ONLY THE HELP NEEDED
       → RE-SOLVE → REEVALUATE → SEE WHAT CHANGED → REPEAT / COMPLETE
```

LegendStudy Math Essay is **not** an answer-checker or a solution generator; it is **evaluation +
diagnosis + guided correction + re-solve + reevaluation**. The goal is **not** to maximize
explanation volume — it is to help the student **independently repair the most important weakness**.
The student is **normally given a chance to think again before the full reference solution is
exposed** (but never hard-locked out of an available one, §27/§87).

---

## 3. Input from MATH-4 (consumed, never recomputed)

MATH-5 consumes `math-eval-v1` structured facts (MATH-4A §55): `evaluation_id`, `response_format`,
coverage, `answer_verification`, `solution_path_classification`, finalized `solution_steps`,
`logical_dependencies`, `error_propagation`, `root_errors`, `propagated_errors`, materiality,
`official_criteria_results`, `rubric_results`, CORE candidate(s), uncertainties, authority refs,
prior evaluation + `reevaluation_delta` (if reevaluation), and the **solution-reveal boundary**.
**MATH-5 does not recompute mathematical correctness — MATH-4 is evaluation authority.**

---

## 4–6. CORE definition, selection, emptiness

**CORE** = the **smallest high-impact actionable improvement target** giving the student the best
next opportunity to improve. It is **not** automatically the first error, lowest rubric dimension,
biggest point deduction, longest feedback item, final-answer error, or "every weakness." It
identifies what to work on **next**.

**Selection inputs (presentation/priority only, §5):** MATH-5 may order using MATH-4's structured
factors (causal impact · official scoring importance · conceptual importance · number/severity of
propagated consequences · correction usefulness · response-format relevance · re-solve usefulness).
**MATH-5 creates no new mathematical scoring model and never overrides MATH-4's canonical error
classification.**

**`CORE_CAN_BE_EMPTY: YES`** (§6). `CORE=[]` is valid (SHORT_ANSWER correct; FULL_SOLUTION correct +
sufficiently justified; complete valid PROOF) → show **successful-completion feedback + evidence-
supported strengths + appropriate next action**; never invent criticism.

---

## 7–8. Multiple roots & propagated errors (`PRIMARY_CORE` / `SECONDARY_ISSUES`)

Multiple independent root errors → distinguish **PRIMARY CORE** (worked on first) from **SECONDARY
ISSUES** (visible in detailed evaluation, not competing with the immediate re-solve objective). Do
not overwhelm the student with every issue at once.

**Propagated-error presentation (`PROPAGATED_ERROR_PRESENTATION`):** never list propagated
consequences as independent weaknesses. Student-facing summary:
> "핵심 오류는 3단계의 부호 처리입니다. 이후 4~5단계의 결과는 이 오류에서 이어졌습니다."
not "3단계 틀림 / 4단계 틀림 / 5단계 틀림."

---

## 9. CORE taxonomy (`CORE_TAXONOMY`) — reuse, don't duplicate

Compact pedagogical categories, **aligned to and referencing** MATH-4 rubric/error facts (no second
error taxonomy): `PROBLEM_UNDERSTANDING` · `CONCEPT_SELECTION` · `STRATEGY` · `LOGICAL_DEVELOPMENT` ·
`CALCULATION` · `JUSTIFICATION` · `CASE_ANALYSIS` · `GRAPH_INTERPRETATION` · `FINAL_CONCLUSION` ·
`MATHEMATICAL_WRITING`. A CORE category **references** the existing MATH-4 `error_category` /
`rubric` dimension rather than re-deriving it. Minimum stable contract: CORE category is a
presentation label mapped from canonical MATH-4 facts.

---

## 10–11. CORE student presentation (`CORE ≠ full explanation`)

Minimum student-facing CORE structure: `title` · `one_line_diagnosis` · `why_it_matters` ·
`where_it_occurs` · `next_action` · `related_step` · `related_evidence` · `official_criterion`
relevance (where applicable). Example:

> **CORE** "경우를 하나 빠뜨렸어요." · **WHY** "x<0인 경우를 검토하지 않아 결론이 전체 범위에서
> 성립하지 않습니다." · **NEXT** "조건을 두 경우로 나누고 빠진 경우만 다시 풀어보세요."

CORE is **concise** — never a complete reference solution, a long lecture, or a full rewritten
answer. Detailed evaluation lives separately. **The next-action signal matters more than explanation
length.**

---

## 12–18. Hint Ladder (`HINT_LAUNCH_LEVELS: L0 / L1 / L2`)

Launch = **L0, L1, L2**. L3–L5 are POST_LAUNCH (future-compatible only; not designed/expanded here).
The full solution is **never auto-revealed**.

| level | name | answers | leakage class (§55) | availability |
| --- | --- | --- | --- | --- |
| **L0** | CORE | **what** to fix | — | immediate with evaluation (§13) |
| **L1** | DIRECTION | which **direction** to rethink | `SAFE_DIRECTION` | on student request (§14) |
| **L2** | CONCEPT/THEOREM/KEY IDEA | the relevant **concept** | `CONCEPT_REVEAL` (never full solution) | on student request (§15) |

- **L0** tells *what* to fix, not the exact corrected solution ("적분 구간 설정을 다시 확인하세요.").
- **L1** guides strategy without the full next line ("함수의 부호가 바뀌는 지점을 기준으로 구간을
  나눠보세요.").
- **L2** may name the concept/theorem but still avoids complete disclosure ("이 단계에서는 평균값정리의
  적용 조건을 확인해야 합니다.").

**Hint depth by response format (`HINT_RESPONSE_FORMAT_AWARE: PASS`, no university-name conditionals):**

| format | hint behavior | support |
| --- | --- | --- |
| `SHORT_ANSWER` | CORE often enough; help reconsider the answer without forcing an essay; **never expose the final required answer** (§17, §56) | `SHORT_ANSWER_HINT: PASS` |
| `SHORT_REASONING` | target the missing essential formula/reason | `SHORT_REASONING_HINT: PASS` |
| `FULL_SOLUTION` | target strategy/step/root error | `FULL_SOLUTION_HINT: PASS` |
| `PROOF` | target missing logical link/theorem/condition **without writing the proof** (§18) | `PROOF_HINT: PASS` |

SHORT_ANSWER (§17): no artificial five-step tutoring for a recompute; `CORE=[]` + no ladder when
correct. PROOF (§18): never reveal the missing proof line immediately; full proof withheld unless
reveal policy permits.

---

## 19–25. Hint availability, authority, grounding, validation, exposure, cost

**Availability (`HINT_AVAILABILITY`):** `AVAILABLE` · `NOT_APPLICABLE` (e.g. `CORE=[]` → L1/L2 N/A) ·
`UNAVAILABLE_DUE_TO_UNCERTAINTY` (unresolved math uncertainty / reference conflict → no misleading
hints) (§57).

**Authority (§20):** hints are **derived from canonical evaluation facts** and must not silently
change answer judgment / root error / official scoring / CORE / rubric. If a hint-generation model
"thinks" the evaluation is wrong → **do not mutate**; route to **QUALITY / EVALUATION REVIEW** (§58).

**Grounding (`HINT_GROUNDING: PASS`, §21):** every hint binds to evaluation + CORE/error + solution
step (where relevant) + authority/reference context. No generic motivational hints; no fabricated
theorem requirement; no invented university rule.

**Validation (`HINT_VALIDATION`, §22):** before exposure, verify it addresses the selected CORE;
does not contradict the evaluation; does not reveal prohibited solution content (§55/§56); the
theorem/concept is relevant; `response_format` permits the depth; no unsupported official claim; no
student-evidence fabrication. **Invalid hint → not exposed.**

**Exposure (`HINT_EXPOSURE`, §24):** record level + evaluation/CORE + timestamp. **Exposure is an
event, not cognition** — never infer the student understood/read/learned.

**Cost (`HINT_SEPARATE_CHARGE: NO`, §25):** L0–L2 carry **no** separate Credit charge; no
microtransactions; no new billing model.

---

## 23 / 54. Progressive reveal & hint generation strategy (`PROGRESSIVE_REVEAL: PASS`)

**Student controls reveal:** L0 visible by default; L1 on request; L2 on further request — **never
all at once** (preserve productive struggle).

**Generation strategy (§54) — recommendation: hybrid.** `L0` is **canonical from the evaluation**.
`L1/L2` are **pre-generated and leakage-validated at evaluation finalization, then frozen** (bound to
a hint content version), and merely *unlocked* on request. Rationale: best for reproducibility, HQ
review (§59), leakage control (validated before any student can reach them), and **zero extra provider
call at reveal time** (the student's request only unlocks, it does not generate). Acceptable fallback
if cost analysis later demands it: generate-on-first-reveal **then freeze** (never regenerate a
different hint on refresh, §78). No providers called here.

---

## 26–29 / 42 / 80. Full solution & reference provenance

Math differs from Humanities: official/reference solutions often exist. **A full reference solution
is NOT the default first response.** Reveal states: `LOCKED` · `AVAILABLE_AFTER_RESOLVE` ·
`AVAILABLE_AFTER_HINT_SEQUENCE` · `AVAILABLE_ON_EXPLICIT_REQUEST`.

**Reference provenance (`REFERENCE_PROVENANCE: PASS`)** — three kinds, never presented as equally
official (no provenance laundering, §28/§42/§80):

| kind | student label |
| --- | --- |
| `OFFICIAL_SOLUTION` | **"대학 공식 해설"** |
| `VERIFIED_INTERNAL_SOLUTION` | **"레전드스터디 검증 풀이"** |
| `AI_GENERATED_REFERENCE` | **"AI 참고 풀이"** |

A non-official solution is **never** labeled "공식 해설" or visually implied equivalent. An
AI-generated reference never overwrites official/verified; later human verification is a content-
authority action outside MATH-5 (§80).

**Solution reveal ≠ student re-solve (§29):** viewing a solution does **not** create a new attempt
and is **not** `FULL_RESOLVE`/`STEP_RETRY`; reveal/exposure is recorded separately. Work submitted
afterward is the new attempt.

**No reference solution (§43):** the loop still works (evaluation → CORE → hints → re-solve →
reevaluation). A reference solution is **not required** for Math evaluation to be useful; if no safe
reference exists, **do not silently generate one** to fill the section.

---

## 27 / 69 / 87. Launch full-solution reveal policy (`FULL_SOLUTION_REVEAL_POLICY`, `EARLY_EXPLICIT_REVEAL: ALLOW`)

**Recommended launch policy: HYBRID (D).**

```
evaluation → CORE → optional L1 → optional L2 → RE-SOLVE CTA → REEVALUATION
          → reference solution becomes prominently available (where content authority permits)
```

**But** after initial evaluation the student may explicitly choose **"해설 보기"** *before*
re-solving. On early reveal: show a concise learning notice —
> "직접 다시 풀어본 뒤 해설을 확인하면 학습 효과를 높일 수 있습니다."

— then honor the deliberate choice, reveal per provenance/availability (§42), and **record exposure**.
**No hard lock** that permanently prevents access to an available official explanation; **viewing it
never reduces mathematical correctness or official score** (§40). Rationale: LegendStudy serves
time-pressured exam-prep students — guided learning is the **default, not a barrier** (§70).

---

## 30–33. Re-solve call to action (`STEP_RETRY` / `FULL_RESOLVE` / `SHORT_ANSWER_RESOLVE`)

CORE leads to an actionable re-solve; response format + error type pick the CTA (never force
`FULL_RESOLVE` for every issue):

| CTA | when |
| --- | --- |
| **"이 단계만 다시 풀기" (`STEP_RETRY`)** | error localized, remaining approach meaningful, one step productively repairable (§31) — includes which prior step / CORE / leaf / what to correct; **never shows the expected corrected step** |
| **"전체 풀이 다시 작성하기" (`FULL_RESOLVE`)** | strategy fundamentally wrong, problem misunderstood, multiple dependent sections need reconstruction, proof substantially incomplete, or student chooses full retry (§32) |
| **"답 다시 입력하기" (`SHORT_ANSWER_RESOLVE`)** | SHORT_ANSWER — no full attempt editor manufactured (§33) |

Do not force `STEP_RETRY` when local repair would falsely imply the rest is valid (§32).

---

## 34–39. Reevaluation & delta (`REEVALUATION`, `REEVALUATION_DELTA`)

After a new submission MATH-4 reevaluates; **MATH-5 displays the learning delta** (never inferred
from final-answer change alone). Delta concepts consumed from MATH-4A §32: `CORE_CORRECTED` ·
`ROOT_ERROR_REMOVED` · `ROOT_ERROR_REMAINS` · `PROPAGATED_ERROR_REMOVED` · `NEW_INDEPENDENT_ERROR` ·
`ANSWER_CHANGED` · `ANSWER_NOW_CORRECT` · `JUSTIFICATION_IMPROVED` · `NO_MATERIAL_CHANGE`.

**Reevaluation UX (§35)** answers "무엇이 달라졌나?" first: 1 CORE corrected? → 2 prior root removed?
→ 3 answer changed/correct? → 4 new independent error? → 5 remaining next action. Detailed
side-by-side comparison lives below, not as the primary UX.

- **Successful correction (§36):** "부호 오류를 수정했습니다. 이전 오류로 이어졌던 뒤 계산도 함께
  정상화되었습니다." — more useful than "score improved."
- **Root removed / new root (`ROOT_REMOVED_NEW_ROOT: PASS`, §37):** fixing ROOT A while introducing
  ROOT B → represent `PREVIOUS_CORE_CORRECTED` **+** `NEW_INDEPENDENT_ERROR`, then select the next
  CORE; never "완전히 해결했습니다." Progression is not binary.
- **No material change (`NO_MATERIAL_CHANGE: PASS`, §38):** say it specifically ("이전 첨삭에서 확인한
  경우 누락이 이번 풀이에서도 남아 있습니다.") — do **not** fabricate a different CORE to appear novel.
- **STEP_RETRY reevaluation (§39):** confirm only that step/CORE; if downstream wasn't resubmitted,
  "이후 풀이 전체는 이번 재풀이 범위에 포함되지 않아 다시 판정하지 않았습니다." Never claim full-solution
  correctness for unsubmitted downstream work.

---

## 40. Hint usage in reevaluation (`HINT_USAGE_SCORING_PENALTY: NO`)

Reevaluation may know L1/L2 exposed or solution revealed — useful **learning-history context** (e.g.
corrected independently after L0 / after L1 / after L2 / after reference reveal). **Hint usage never
reduces mathematical credit or official score** and is **never** turned into an invented university
scoring deduction. It is context, not evidence that the student's final mathematics is less correct.

---

## 41. Solution reveal after reevaluation

After a legitimate re-solve/reevaluation, make reference-solution access **easier/prominent** (where
content authority permits), with the explicit early "해설 보기" escape route still available before
re-solve (§27). Never trap the student in an endless hint sequence (§68).

---

## 44–45. Multiple valid / student novel paths

Where multiple valid paths exist, the reference solution is **an example, not the only correct path**
(§44). If the student's valid path differs from the revealed reference, **do not tell the student
their path was inferior merely for differing** — MATH-4 `ALTERNATIVE_VALID_PATH` is authoritative;
hints prefer **repairing the student's current valid strategy** over forcing migration to the
official path. If MATH-4 classified a **student novel path** as valid, CORE/hints **preserve it**
(§45); if validity is uncertain, do **not** build hints assuming it is wrong — route per MATH-4
uncertainty/Human-Review semantics (§57).

---

## 46–50. Language, length, criterion/score connection, positive complement

**Language (§46):** short, specific, instructional, evidence-grounded — "이 단계에서는 x<0인 경우가
빠졌습니다." over "경우의 수에 대한 이해가 부족합니다." **Describe the submitted work, not the student's
ability.**

**Length (`IMPLEMENTATION_CALIBRATION`, §47):** conceptual bounds for CORE title / diagnosis /
why_it_matters / next_action / L1 / L2 kept short; **exact display character limits are
`IMPLEMENTATION_CALIBRATION`** (UI testing). Canonical structured facts may be richer than the
compact card copy (§52).

**Official criterion connection (§48):** show the CORE↔criterion link **only when canonical official
criteria support it** ("이 문항의 채점 기준에서는 경우를 나누어 결론을 확인하는 과정이 요구됩니다."); if no
official criterion exists, use diagnostic language — never fabricate one.

**Points/score in CORE (§49):** CORE is about the **learning target**, not "몇 점 잃었습니다."; show
official points only where they genuinely exist; **no unofficial numerical penalty**, no invented
point loss.

**Positive complement (§50):** preserve correct work even when a CORE exists ("접근 방법은 적절했습니다.
다만 3단계의 부호 처리 때문에 이후 계산이 달라졌습니다.") to distinguish *wrong strategy* from *correct
strategy + local error*; never add unsupported praise.

---

## 51–53. Stability & versioning (`CORE_CANONICAL_VS_DERIVED`)

**CORE priority stability (§51):** identical evaluation facts → stable primary CORE. Canonical CORE
identity/target is stable; display wording may vary only within meaning-preserving bounds (no
radically different primary CORE on re-render because an LM rephrased).

| | CANONICAL | DERIVED |
| --- | --- | --- |
| **CORE (§52)** | target identity · bound error/step · category · priority/order · correction target · why-it-matters fact | student-facing title · compact phrasing · voice script (later) |
| **Hint (§53)** | binding (evaluation · CORE/error · level · content version · authority/provenance) | phrasing · voice script (later) |

Display wording is **never the sole persisted authority**. A hint is bound to evaluation + CORE/error
+ level + content version + provenance; **once exposed, its historical meaning does not silently
change** — regeneration creates a new version/artifact, never a silent mutation of an exposed hint
(§53, §78, §79).

---

## 55–56. Leakage checks (`HINT_LEAKAGE`)

Leakage classifier levels: `SAFE_DIRECTION` · `CONCEPT_REVEAL` · `SOLUTION_REVEAL`. A hint must not
reveal the final numeric answer, the complete missing derivation, the entire proof, or the full
official solution — **unless** the specific reveal policy permits (§27). **L1 normally stays
`SAFE_DIRECTION`; L2 may be `CONCEPT_REVEAL` but not a complete solution.**

**Response-format-specific leakage (§56):** for `SHORT_ANSWER`, a hint that reveals the required
number/expression **is** effectively the answer → **never expose the final required answer in
L1/L2**. For `PROOF`, never give the missing proof verbatim. For `FULL_SOLUTION`, never give the
complete next derivation chain.

---

## 57–59. Uncertainty routing & Human Quality

**Uncertainty routing (§57)** — MATH-5 must **not** build a normal CORE/hint ladder over unresolved
facts:

| MATH-4 uncertainty | MATH-5 route |
| --- | --- |
| `EXTRACTION_UNCERTAINTY` | student confirmation (MATH-3) |
| `MATHEMATICAL_EQUIVALENCE_UNCERTAIN` | Human Review / cautious status |
| `REFERENCE_CONFLICT` | content review |
| `CONTENT_CONFIGURATION_ERROR` | service failure/retry path (no student penalty) |

**Human Review (§58):** MATH-5 consumes the **canonical corrected evaluation** when Human Quality
later resolves uncertainty/alt-path/root/hint issues — it never maintains a parallel student-facing
truth disconnected from Human Quality. HQ is review authority over **AI quality**, not a second
student scoring system.

**Hint quality — Human Quality (`HUMAN_QUALITY_HINT_REVIEW: PASS`, §59):** per MATH-2R, `hq-math-
rubric-v1` includes `hint_quality` when hints exist (HQ-A shared strategy). MATH-5 hint artifacts
expose enough **frozen evidence** for a reviewer to assess relevance to CORE · mathematical validity
· leakage · actionability · response-format consistency · consistency with canonical authority — **no
provider chain-of-thought required** (§81).

---

## 60–62. Learning history, progress signals, gamification boundary

**Learning history (`LEARNING_HISTORY`, §60):** a student-visible timeline (Attempt 1 → CORE A → L1
viewed → re-solve → CORE A corrected → CORE B identified → re-solve → complete). Canonical attempt/
evaluation/hint-exposure facts remain authority; **not an analytics warehouse**.

**Progress signals (`PROGRESS_SIGNALS`, §61):** CORE corrected · root error removed · answer now
correct · justification improved · new issue found · completed. **No** percent-mastery, IQ-like
score, or admission-probability without a separately approved model.

**Gamification (§62):** MATH-5 may **expose** learning events (first successful re-solve, CORE
corrected, complete after retry) for future gamification to consume — but implements **no** badges/
reward economics, and gamification is never part of Math evaluation authority (POST_LAUNCH only).

---

## 63–65. Credit & commercial rule (`COMMERCIAL_RULE_COMPATIBILITY: PASS`)

L0–L2 = no charge; Vision = no separate charge; Math initial/reevaluation go through the **existing
Credit authority + typed Math binding** (MATH-2R). MATH-5 **consumes billing eligibility facts only**
— it does **not** redefine prices or decide whether future 2nd/3rd re-solves are free.

**Current product rule (§64, `ONE_CREDIT_PRODUCT_RULE`):**
> "최초 첨삭과 동일 답안 재첨삭(1회)까지 이용할 수 있습니다." · "동일 답안 기준 1 Credit = 총 2회 첨삭"

Interpretation: `INITIAL_EVALUATION` **+ one eligible `REEVALUATION`** of the same answer/problem
lineage is the included first re-evaluation per the canonical commercial policy.
**`UNLIMITED_FREE_REEVALUATION: NO`.** If the backend says the included reevaluation is no longer
eligible, the UI must reflect that **before** a new paid request. No price/payment logic is
hardcoded in MATH-5.

**Same-answer lineage (`SAME_ANSWER_LINEAGE`, §65):** "동일 답안 재첨삭" maps to a revision/re-solve
tied to the **same canonical problem/subproblem + prior evaluation lineage** per the approved policy
— **not** byte-for-byte identical text/image. The Codex/credit contract remains eligibility
authority; MATH-5 never invents eligibility from superficial text similarity.

---

## 66–73. UX contract (information architecture, mobile, parity)

**Initial vs reevaluation (§66):** INITIAL → "첨삭 결과" → CORE → hints → 다시 풀기. REEVALUATION →
"재첨삭 결과" → 무엇이 달라졌는지 → 이전 CORE 해결 여부 → 남은/새 CORE → 다음 행동. Reevaluation is never
shown as an unrelated first attempt.

**End state (§67):** a cycle is complete when, **per `response_format`**, the required answer is
correct / required reasoning sufficient / no MATERIAL CORE remains / no unresolved blocking
uncertainty. **Adequate completion is enough — not all dimensions STRONG.**

**Student stops (§68):** allow evaluation review, hint reveal, reference solution (where policy
permits), and exit; never force an endless loop; record only actual exposure/action; **never label a
stopping student as failed.**

**Result page IA (§71, no pixels):** A header → B answer status → C CORE → D "다시 풀어보기" CTA →
E L1/L2 controls → F solution flow/detailed feedback → G official scoring criteria → H diagnostic
rubric → I reference-solution reveal → J reevaluation/history. SHORT_ANSWER collapses unnecessary
sections; PROOF shows logical completeness prominently.

**Mobile (§72):** mobile-first — CORE near the top without long scrolling; hints progressive; steps
collapsible; original evidence region-focused; reference solution explicit reveal; reevaluation delta
compact-first.

**Web/App parity (§73):** LAB/web and Flutter consume the **same canonical learning contract**.
Clients differ in camera/layout/navigation but **not** in CORE meaning, hint levels, reveal state,
reevaluation delta, or commercial eligibility facts. **No separate web learning truth.**

---

## 74–75. Accessibility & VOICE-1 (`VOICE_1_COMPATIBILITY: PASS`, `VOICE_AUDIO_PERSISTENCE: NONE_BY_DEFAULT`)

CORE/hints support screen reader, formula text equivalent, keyboard navigation (web), and VOICE-1
later; accessibility description is **never** mathematical authority. MATH-5 exposes **stable
structured facts** for VOICE-1: CORE · why_it_matters · next_action · L1 · L2 · reevaluation delta ·
reference-solution provenance. Voice script is **DERIVED/NON-CANONICAL**; audio is **ON_DEMAND/
EPHEMERAL**; **no TTS implemented, no audio persistence.**

---

## 76–81. Observability, failure states, idempotency, content-version, generated solution, no CoT

**Observability (§76):** privacy-safe metrics may include L1/L2 reveal rate, re-solve rate, CORE
correction rate, solution reveal rate. **Never log** full answer, full hint content, raw image, or
student identity. No analytics implementation here.

**Failure states (§77):** `EVALUATION_UNAVAILABLE` · `CORE_UNAVAILABLE` · `HINT_GENERATION_FAILED` ·
`REFERENCE_SOLUTION_UNAVAILABLE` · `REEVALUATION_FAILED` · `COMMERCIAL_ELIGIBILITY_REQUIRED`. A hint
failure must **not** erase a valid evaluation; a reference-solution failure must **not** invalidate
CORE; a payment-eligibility issue must **not** alter mathematical evaluation facts.

**Idempotency (§78):** repeated open-result / open-CORE / request-L1 / request-L2 / open-same-
reference must not create duplicate canonical learning facts; hint exposure recorded once or as
bounded events; **never regenerate a different hint on page refresh.**

**Content-version change (§79):** if official solution/profile changes after an evaluation, historical
CORE/hints stay bound to the original evaluation's authority versions — **never** silently regenerate
old hints with a newer solution; a new evaluation uses the new active authority.

**Generated solution (§80):** label accurately; never overwrite official/verified; human-verified
promotion is a content-authority action outside MATH-5.

**No chain-of-thought (§81):** store only structured canonical facts, approved explanation/hint
artifacts, and provenance — **never** hidden model reasoning traces.

---

## 82. Science future compatibility

The learning-loop concepts (CORE · progressive hint · re-solve · reevaluation delta) are expressed as
generic **shapes over domain facts**, so a future Science domain can reuse them without flattening
Math-specific facts (MATH-1 §23 spine). No Science schema designed.

---

## 83. MATH-5B synthetic acceptance matrix (`MATH_5B_SYNTHETIC_MATRIX: H1-H30 COMPLETE`)

Columns: format (RF), expected CORE, hint availability/L1-L2 behavior, re-solve CTA, reveal state,
reevaluation delta, commercial/uncertainty route. No real AI.

| H | scenario | RF | expected CORE | hints / L1-L2 | re-solve CTA | reveal state | delta / route |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H1 | SHORT_ANSWER correct | SA | **[]** | none (N/A) | none | available on request | completion |
| H2 | SHORT_ANSWER wrong | SA | compact, concept/condition | L1 SAFE_DIRECTION; **no answer leak** | 답 다시 입력 | guided; early 해설 allowed | — |
| H3 | SHORT_REASONING missing essential reason | SR | JUSTIFICATION | L1 target missing reason | 다시 풀기 | guided | — |
| H4 | FULL_SOLUTION local calc root | FS | CALCULATION/SIGN root | L1 direction; L2 concept | **STEP_RETRY** | guided | — |
| H5 | FULL_SOLUTION fundamental strategy error | FS | STRATEGY | L1/L2 strategy-level | **FULL_RESOLVE** | guided | — |
| H6 | root + propagated | FS | **one PRIMARY** (root) | propagation summarized, not listed | STEP_RETRY | guided | — |
| H7 | two independent roots | FS | PRIMARY + SECONDARY | L1/L2 on primary | STEP_RETRY/FULL | guided | — |
| H8 | valid alternative path | FS | preserve strategy | repair student's path, not migrate | STEP_RETRY | guided | ALTERNATIVE_VALID_PATH kept |
| H9 | PROOF missing logical direction | PF | JUSTIFICATION/LOGICAL | L2 concept, **no proof verbatim** | STEP_RETRY/FULL | guided | — |
| H10 | PROOF valid non-official proof | PF | **[]** or writing | minimal | none/optional | available | path accepted |
| H11 | L1 reveal must not leak answer | any | — | L1 = SAFE_DIRECTION only | — | — | leakage check PASS |
| H12 | L2 must not leak full solution | any | — | L2 = CONCEPT_REVEAL only | — | — | leakage check PASS |
| H13 | student fixes CORE | — | prior CORE | — | — | prominent after reeval | CORE_CORRECTED / ANSWER_NOW_CORRECT |
| H14 | fixes old CORE, creates new root | — | next CORE | — | — | — | PREVIOUS_CORE_CORRECTED + NEW_INDEPENDENT_ERROR |
| H15 | no material change | — | same CORE (specific) | — | — | — | NO_MATERIAL_CHANGE |
| H16 | STEP_RETRY fixed, downstream not reassessed | FS | — | — | — | — | step fixed; full NOT_REASSESSED |
| H17 | FULL_RESOLVE success | FS | [] or next | — | — | prominent | ROOT_ERROR_REMOVED + ANSWER_NOW_CORRECT |
| H18 | solution revealed before re-solve (explicit) | any | — | — | — | **early reveal + notice + exposure; no score penalty** | — |
| H19 | no official solution | any | normal | normal | normal | AI/none labeled truthfully; loop still works | — |
| H20 | verified internal solution | any | normal | normal | normal | "레전드스터디 검증 풀이" | — |
| H21 | AI-generated reference | any | normal | normal | normal | **"AI 참고 풀이"** (not 공식) | — |
| H22 | reference conflict | any | **no normal ladder** | unavailable | — | blocked | → content review |
| H23 | extraction uncertainty | any | **no normal ladder** | UNAVAILABLE_DUE_TO_UNCERTAINTY | — | — | → student confirmation (MATH-3) |
| H24 | mathematical uncertainty | any | cautious | no misleading hints | — | — | → Human Review |
| H25 | hint generation failure | any | CORE intact | HINT_GENERATION_FAILED | re-solve still available | — | evaluation NOT erased |
| H26 | duplicate hint request | any | — | idempotent unlock; same hint | — | — | no duplicate facts |
| H27 | content version changes after old eval | any | historical CORE/hints pinned | frozen to old authority | — | — | new eval uses new authority |
| H28 | first included reevaluation | — | — | — | re-solve | — | eligible per 1 Credit = 2 첨삭 |
| H29 | additional reevaluation | — | — | — | — | — | COMMERCIAL_ELIGIBILITY_REQUIRED before paid request |
| H30 | account deletion pending | any | — | no new learning action creating data | — | — | no finalize; no resurrection (E1/E2) |

Each H-case is defined so MATH-5B is testable without subjective "looks good" acceptance.

---

## 84. MATH-5B implementation handoff (`READY_FOR_MATH_5B: YES`)

MATH-5B will implement: CORE presentation adapter · CORE stable-identity/derived-copy boundary · Hint
L0–L2 artifacts · progressive reveal · leakage validation · hint exposure · re-solve CTA resolution ·
FULL_RESOLVE/STEP_RETRY learning state · reevaluation-delta presentation · reference-solution reveal
policy · solution provenance labels · commercial-eligibility consumption · learning-history
projection. It **consumes** `math-eval-v1` + canonical Math persistence (post-MATH-2C) and must **not
recompute** answer correctness, solution validity, root/propagated classification, official scoring,
or rubric verdicts (MATH-4 authority).

## 85. MATH-2C reconciliation boundary (`MATH_2C_RECONCILIATION_READY: YES`)

MATH-5A depends on **semantics, not physical names** — no assumption about hint/exposure/CORE table
names, billing-binding table name, Math worker role, or RPC names. After MATH-2C, reconcile physical
persistence with this contract; a naming difference is **not** a product-contract change. A genuine
semantic blocker is reported before MATH-5B. (CORE canonical/derived split §52, hint binding §53, and
exposure §24 are the concepts MATH-2C must satisfy.)

---

## 86–87 / 90. Owner decisions & validation (`OWNER_DECISIONS_REQUIRED: 0`)

All prior Owner decisions stand and are not reopened (hint/Vision no-charge; official source
reference+hash; student evidence finite+erasable; VOICE audio none-by-default; 1-Credit = 2 첨삭
message; backend commercial authority; no unlimited free reevaluation). The **full-solution reveal
policy** is given a **recommended launch default (HYBRID, §87)** that is tunable later **without
schema redesign**, so **no new Owner decision is required** (Owner may simply ratify). →
`OWNER_DECISIONS_REQUIRED: 0`.

**Validation (§90):** no implementation code · no migration/SQL · no provider call · no Production
change · no real student data · MATH-4 remains evaluation authority · MATH-5 does not recompute
correctness · CORE may be empty · propagated errors not presented as independent weaknesses ·
multiple roots → primary + secondary · SHORT_ANSWER not forced through full-solution learning · PROOF
hints never reveal the proof verbatim · L1 does not reveal the answer · L2 does not reveal the
complete solution · exposure ≠ cognition · hint usage never reduces correctness/score · full
reference solution not auto-dumped into initial feedback · early explicit reveal preserved · official/
internal/AI provenance distinct · valid alternative paths preserved · reevaluation compares learning
change not only final answers · STEP_RETRY doesn't claim unsubmitted downstream correct · no unlimited
free reevaluation implied · commercial eligibility stays backend authority · no chain-of-thought
persistence · VOICE derived · `ql-read-v1`/`hq-read-v1` assumptions unchanged.

---

## 89. Final report

```
MATH_5A_CONTRACT:            COMPLETE
REPOSITORY:                  LC3808/legendstudy-lab
BRANCH:                      claude/math-essay-architecture-v1
BASE_COMMIT:                 fb0ccfd68068fdf9510991248b2ad1efb52363b0
FINAL_COMMIT:                <filled at closeout>
LEARNING_LOOP:               submit→evaluate→CORE→needed help→re-solve→reevaluate→see change→
                             repeat/complete (§1)
CORE_DEFINITION:             smallest high-impact actionable next-improvement target (§4)
CORE_CAN_BE_EMPTY:           YES
PRIMARY_CORE:                single focus for immediate re-solve (§7)
SECONDARY_ISSUES:            visible in detail, not competing with re-solve (§7)
PROPAGATED_ERROR_PRESENTATION: root named; consequences summarized, not listed as weaknesses (§8)
CORE_TAXONOMY:               10 pedagogical categories referencing MATH-4 rubric/error facts (§9)
CORE_CANONICAL_VS_DERIVED:   canonical target/binding/category/priority/correction/why; derived
                             title/phrasing/voice (§52)
HINT_LAUNCH_LEVELS:          L0 / L1 / L2 (L3–L5 POST_LAUNCH)
L0:                          CORE — what to fix (immediate) (§13)
L1:                          direction hint — SAFE_DIRECTION (§14)
L2:                          concept/theorem — CONCEPT_REVEAL, no full solution (§15)
HINT_RESPONSE_FORMAT_AWARE:  PASS
SHORT_ANSWER_HINT:           PASS    SHORT_REASONING_HINT: PASS
FULL_SOLUTION_HINT:          PASS    PROOF_HINT: PASS
HINT_AVAILABILITY:           AVAILABLE / NOT_APPLICABLE / UNAVAILABLE_DUE_TO_UNCERTAINTY (§19)
HINT_GROUNDING:              PASS (§21)
HINT_VALIDATION:             addresses CORE, no contradiction, no prohibited reveal, format-aware (§22)
PROGRESSIVE_REVEAL:          PASS (student-controlled; not all at once) (§23)
HINT_EXPOSURE:               level+eval/CORE+timestamp; event not cognition (§24)
HINT_SEPARATE_CHARGE:        NO
FULL_SOLUTION_REVEAL_POLICY: HYBRID — guided default + explicit early 해설 with notice; no hard lock
                             (§27/§87)
EARLY_EXPLICIT_REVEAL:       ALLOW
REFERENCE_PROVENANCE:        PASS
OFFICIAL_SOLUTION_LABEL:     "대학 공식 해설"
VERIFIED_INTERNAL_LABEL:     "레전드스터디 검증 풀이"
AI_REFERENCE_LABEL:          "AI 참고 풀이"
STEP_RETRY:                  localized repair; shows context, not the corrected step (§31)
FULL_RESOLVE:                strategy/understanding/proof reconstruction (§32)
SHORT_ANSWER_RESOLVE:        "답 다시 입력하기"; no forced attempt editor (§33)
REEVALUATION:                MATH-4 reevaluates; MATH-5 shows learning delta (§34)
REEVALUATION_DELTA:          9 delta facts; not final-answer-only (§34)
ROOT_REMOVED_NEW_ROOT:       PASS (§37)
NO_MATERIAL_CHANGE:          PASS (§38)
SOLUTION_REVEAL_AFTER_REEVALUATION: prominent where authority permits; early escape kept (§41)
HINT_USAGE_SCORING_PENALTY:  NO (§40)
LEARNING_HISTORY:            canonical timeline; not an analytics warehouse (§60)
PROGRESS_SIGNALS:            CORE corrected/root removed/answer correct/justification improved/new
                             issue/completed; no mastery% or admission-prob (§61)
COMMERCIAL_RULE_COMPATIBILITY: PASS
ONE_CREDIT_PRODUCT_RULE:     INITIAL + ONE ELIGIBLE SAME-LINEAGE REEVALUATION
UNLIMITED_FREE_REEVALUATION: NO
SAME_ANSWER_LINEAGE:         same problem/subproblem + prior evaluation lineage, not byte-identical;
                             backend = eligibility authority (§65)
VOICE_1_COMPATIBILITY:       PASS
VOICE_AUDIO_PERSISTENCE:     NONE_BY_DEFAULT
HUMAN_QUALITY_HINT_REVIEW:   PASS (hq-math-rubric-v1 hint_quality; frozen hint evidence) (§59)
MATH_5B_SYNTHETIC_MATRIX:    H1-H30 COMPLETE
MATH_2C_RECONCILIATION_READY: YES
OWNER_DECISIONS_REQUIRED:    0
READY_FOR_MATH_5B:           YES
READY_FOR_PRODUCTION:        NO
DB_CHANGED:                  NO    MIGRATION_CREATED: NO    PROVIDER_CALLS: 0
PRODUCTION_CHANGED:          NO    PRODUCTION_AI: OFF
FILES_CHANGED:               docs/architecture/MATH-5_CORE_HINT_LEARNING_CONTRACT.md (new);
                             MATH-1/2A/3A/4A one-line successor pointers
COMMIT:                      <filled at closeout>
PUSH:                        <filled at closeout>
LOCAL_REMOTE_SYNC:           <filled at closeout>
UNIFIED_WIKI_CHANGED:        NO
NEXT:                        OWNER/CHATGPT REVIEW → MATH-2C RECONCILIATION → MATH-5B IMPLEMENTATION
                             → END-TO-END MATH LEARNING LOOP
```
