# MATH-7A — Mathematical Essay (수리논술) Human Quality / Quality Console Contract

**Status:** CONTRACT / ARCHITECTURE ONLY. No UI implementation, no DB migration, no Production
change, no provider call, no real student data, no real AI evaluation.
**Date:** 2026-10-02
**Author role:** LegendStudy LAB Mathematical Essay Human Quality / Quality Console architect (Claude).
**Repository / branch:** `LC3808/legendstudy-lab` · `claude/math-essay-architecture-v1`.
**Base commit:** `18d1318b4867f9bf9ce840ee74e24e7872e587c1` (MATH-6A tip).
**Authority read:** [MATH-1](MATH-1_MATHEMATICAL_ESSAY_ARCHITECTURE.md) ·
[MATH-2A](MATH-2_CANONICAL_DATA_PERSISTENCE_CONTRACT.md) ·
[MATH-3A](MATH-3_VISION_INPUT_ARCHITECTURE.md) ·
[MATH-4A](MATH-4_EVALUATION_ENGINE_CONTRACT.md) ·
[MATH-5A](MATH-5_CORE_HINT_LEARNING_CONTRACT.md) ·
[MATH-6A](MATH-6_RESOLVE_REEVALUATION_LEARNING_HISTORY_CONTRACT.md) — all APPROVED. APP authority:
MATH-2B (DB/security cross-review) + MATH-2R (shared integration). Codex MATH-2C is **concurrent and
incomplete** → **depend on MATH-2R semantics, not physical names** (§76).

> **This document authorizes nothing and changes no system.** No UI, no DB migration/SQL, no
> Production change, **no provider call**, **no real student data**, no real AI evaluation, no App/
> docs-repo change. MATH-1→6 are **not redesigned.** `ql-read-v1` / `hq-read-v1` remain
> **unchanged**; Math is additive (`qlm-read-v1`, `hq-math-write-v1`, `hq-math-read-v1`). Production
> AI **OFF**, `PROVIDER_CALLS: 0`.

---

## 3. Most important invariant — Human Quality reviews the AI, not the student

| layer | authority |
| --- | --- |
| **MATH-4** | mathematical **evaluation** authority |
| **MATH-5** | CORE / hint / reveal **learning** authority |
| **MATH-6** | re-solve / reevaluation / **learning-history** semantics |
| **MATH-7** | human **judgment of whether the AI did those jobs correctly** |

A reviewer may conclude *"the AI incorrectly classified Step 3 as a root error."* That is a **Human
Quality finding about the AI**, not a new student evaluation. **MATH-7 never becomes a second student
scoring system and never rewrites evaluation tables** (§51, §65).

**`HUMAN_QUALITY_PASS ≠ STUDENT_CORRECT` (§65):** a PASS means *the AI evaluation was good*, even when
the student's answer is wrong; a FAIL can occur when the student's answer is **correct** but the AI
invented a criticism. This distinction is made impossible to misread in the contract and UI.

---

## 4. Reviewer evidence — required groups (`REVIEWER_EVIDENCE_GROUPS: 6 / PASS`)

`qlm-read-v1` detail (§27) exposes six groups so a reviewer can judge AI trustworthiness:

**A. Problem authority** — university · admission/exam context · year · problem · subproblem/leaf ·
`response_format` · evaluation profile/version · official scoring criteria · official answer ·
official/reference solution · examiner intent · provenance/verification state · `reference_kind`.
**An AI-generated reference is never implied official.**

**B. Original student evidence** — controlled access to original image/PDF · page ordering · relevant
region · typed evidence · **evidence-availability state** `AVAILABLE | NOT_APPLICABLE | ERASED |
UNAVAILABLE`. **No public permanent URLs** (authorized access only, §45). **Missing evidence is never
read as "no AI error."**

**C. Extraction / Vision** — selected extraction version · regions · `raw_text` · `normalized_math` ·
confidence · uncertainty reason · selected provider candidate · fallback candidate · merge decision ·
student extraction confirmation · original-region linkage · provider/model provenance. Key question:
**did the AI read what the student actually wrote?** (extraction error ≠ student error).

**D. Mathematical evaluation** — coverage · answer verification · solution-path classification ·
finalized solution steps · source-region bindings · logical-dependency DAG · error-propagation edges
· root errors · propagated errors · materiality · official-criteria results · diagnostic rubric ·
considered reference paths · student novel-path handling · uncertainties · overall status · canonical
output hash/version · evaluator/model provenance.

**E. Learning guidance** — CORE · PRIMARY/secondary · why_it_matters · next_action · L0/L1/L2 · hint
grounding · leakage class · availability · hint content version · exposure · reference-reveal state ·
reference provenance.

**F. Reevaluation / learning history** — prior attempt/evaluation · current attempt/evaluation ·
`resolve_kind` · submitted re-solve scope · prior/new CORE · prior/new root errors ·
`reevaluation_delta` · hint/reveal context · downstream `NOT_REASSESSED` · **minimal** commercial-
eligibility state (**no** full payment/card/refund details, §71).

---

## 5–6. `hq-math-rubric-v1` (`HQ_MATH_RUBRIC_V1: PASS`)

**11 keys (exact MATH-2R names, not renamed):** `diagnosis` · `core_priority` · `actionability` ·
`evidence_adherence` · `valid_path_preservation` · `hallucination_absence` · `extraction_fidelity` ·
`step_reasoning` · `hint_quality` · `progression` · `generated_solution`.

**Verdict scale: `OK · CONCERN · FAIL · NA`** — intentionally **distinct** from the student's MATH-4
diagnostic scale (`STRONG/ADEQUATE/NEEDS_IMPROVEMENT/INSUFFICIENT/NOT_APPLICABLE/NOT_ASSESSABLE`).
**The two are never merged** (different subjects: AI output quality vs student work).

Reviewer question per key:

| key | question |
| --- | --- |
| `diagnosis` | Did the AI identify the meaningful mathematical issue(s)? |
| `core_priority` | Did it choose the smallest high-impact actionable CORE from the actual canonical facts? |
| `actionability` | Concrete next action without solving it for the student? |
| `evidence_adherence` | Claims grounded in the student's submitted evidence + canonical authority? |
| `valid_path_preservation` | Preserved a valid alternative student path instead of forcing the official one? |
| `hallucination_absence` | Avoided inventing steps/requirements/scoring rules/theorems/source facts/conclusions? |
| `extraction_fidelity` | When extraction was required, did the evaluated representation reflect the original? |
| `step_reasoning` | Step segmentation / validity / dependencies / root-propagated / justification sound? |
| `hint_quality` | CORE/L1/L2 relevant, valid, actionable, format-aware, leakage-safe? |
| `progression` | Reevaluation correctly states changed/corrected/remaining/new-root/NOT_REASSESSED? |
| `generated_solution` | Generated solution sound, correctly provenanced, not misrepresented as official? |

---

## 7. Conditional NA rules (evidence-based, not a reviewer escape)

`extraction_fidelity` NA for pure typed input where extraction genuinely wasn't required ·
`step_reasoning` NA for `SHORT_ANSWER` with no required reasoning · `hint_quality` NA if no hint
artifact exists · `progression` NA for an initial evaluation (no prior) · `generated_solution` NA if
none exists. **A reviewer may not pick NA to avoid reviewing evidence.** If required evidence *should*
exist but is erased/unavailable, that is **not NA** — represent it as an evidence-availability /
`UNASSESSABLE` review condition (§25 of brief / MATH-2R); **missing evidence is never silently
converted to PASS.**

---

## 8. Overall disposition (`OVERALL_DISPOSITIONS`)

`PASS · PASS_WITH_NOTES · NEEDS_REVIEW · FAIL` (shared HQ vocabulary; **no numeric score**).
Consistency rules (server-enforced, mirrored as UX):

| disposition | rule |
| --- | --- |
| `PASS` | no FAIL dimension · no CONCERN dimension · **no findings** |
| `PASS_WITH_NOTES` | no FAIL dimension · may contain CONCERN · findings **MINOR only** |
| `NEEDS_REVIEW` | material uncertainty / review concern requiring more review or adjudication |
| `FAIL` | material/critical AI-quality defect making the output unsafe/misleading/materially incorrect |

---

## 9–11. Findings — taxonomy, severity, typed Math targets

**Finding categories (`FINDING_CATEGORIES`) — compact launch set preserved (no micro-categories):**
generic `FALSE_CORRECTION` · `INVENTED_ERROR` · `EVIDENCE_MISREAD` · `UNSUPPORTED_CLAIM` ·
`CORE_PRIORITY_ERROR` · `PROGRESSION_ERROR` · `UNDER_SPECIFIED_GUIDANCE` · `MISSING_IMPORTANT_ISSUE` ·
`OTHER`; Math additions (MATH-2R) `EXTRACTION_MISREAD` · `ROOT_PROPAGATION_ERROR` ·
`ALTERNATIVE_PATH_REJECTION`. This set is **sufficient for launch** — no new category is added
(`OTHER` + a bounded note covers the long tail).

**Severity (`FINDING_SEVERITIES`): `MINOR · MATERIAL · CRITICAL`** — describes **AI-output quality**,
not a student score. MINOR = wording/actionability not altering understanding; MATERIAL = can
materially mislead or distort a learning target; CRITICAL = fabricated official criterion, major
evidence misread causing a wrong correction, rejecting a clearly valid path, or systematic corruption.

**Typed Math finding targets (`MATH_FINDING_TARGETS`, MATH-2R — never Humanities `SENTENCE`):**

| target | `target_ref` binding |
| --- | --- |
| `OVERALL` | `null` |
| `SOLUTION_STEP` | a **published step of the same** Math evaluation |
| `ROOT_ERROR` | an error classified **ROOT** in the **same** evaluation |
| `EXTRACTION_REGION` | the evaluation's **selected/pinned** extraction run + region |
| `ALTERNATIVE_PATH` | distinguishes `REFERENCE` path vs `STUDENT` evaluated path |

No arbitrary UUID; no generic untyped target string. Server validates every target resolves on the
**same evaluation** (reuses HQP target-validation discipline).

---

## 12–18. Review dimensions in depth

**CORE (`CORE_REVIEW: PASS`, §12):** was the CORE a material issue · a ROOT (not propagated) · the
defensible primary among multiple roots · not invented when `CORE=[]` was valid · did it overstate an
official scoring consequence · did it preserve valid student reasoning. **MATH-7 never chooses a new
canonical CORE** — it records whether the AI's CORE was good/bad.

**Root/propagated (`ROOT_PROPAGATION_REVIEW: PASS`, §13):** reviewer sees the **logical DAG** and the
**separate** error-propagation edges (never collapsed) and can flag wrong root classification ·
propagated counted independently · a missed independent second root · fabricated propagation ·
propagation with no valid causal ancestor · correct downstream marked wrong only because upstream was
wrong → `ROOT_PROPAGATION_ERROR`.

**Valid alternative path (`ALTERNATIVE_PATH_REVIEW: PASS`, §14, launch-critical):** reviewer sees
student path · official/verified reference path(s) · the evaluation's considered-reference set · AI
classification · student evidence. Flags: valid path rejected for differing · forced migration ·
equivalence actually uncertain (should have escalated) · a novel path wrongly promoted to canonical →
`ALTERNATIVE_PATH_REJECTION` first-class.

**Extraction (`EXTRACTION_REVIEW: PASS`, §15):** side-by-side original crop/region vs selected
extraction (+ primary/fallback candidates + student confirmation). Examples: x²→x³, +→−, ≤→<,
swapped integration bounds, misbound subproblem marker, missed graph annotation. If extraction was
wrong and caused a diagnosis error, record `EXTRACTION_MISREAD` **and** the downstream consequence —
**the student's math is never blamed for a Vision error** (§69).

**Hint (`HINT_REVIEW: PASS`, §16):** per hint — level · CORE/error binding · `response_format` ·
content · leakage class · provenance · exposure. L0 says what to fix (not a full solution); L1 =
`SAFE_DIRECTION` (no answer); L2 = `CONCEPT_REVEAL` (no full derivation); `SHORT_ANSWER` L1/L2 never
reveal the required answer; `PROOF` never gives the proof verbatim; `FULL_SOLUTION` never gives the
full next derivation. A hint contradicting the evaluation is an AI-quality defect — **the canonical
evaluation is never mutated inside review.**

**Reevaluation (`REEVALUATION_REVIEW: PASS`, §17):** prior vs current + submitted scope — previous
CORE actually corrected · previous root actually removed · new independent root identified · answer
change represented · justification improvement represented · `NO_MATERIAL_CHANGE` used honestly ·
`STEP_RETRY` downstream kept `NOT_REASSESSED` · reference-reveal/hint exposure treated as **context,
not penalty/cognition** · progression doesn't overclaim "complete" when a new root exists →
`PROGRESSION_ERROR`.

**Generated solution (`GENERATED_SOLUTION_REVIEW: PASS`, §18):** mathematical correctness · provenance
· consistency with canonical authority · alternative-path handling · doesn't contradict the evaluation
· not misrepresented as official. Labels: **대학 공식 해설 / 레전드스터디 검증 풀이 / AI 참고 풀이.** An AI
solution is never auto-promoted to official/verified.

---

## 19–20. Review submission & output-hash binding

**Submission (`HQ_SUBMIT_CONTRACT: hq-math-write-v1`, §19):** keys —
`dto_version` · `math_evaluation_id` · `expected_output_sha256` · `client_submission_id` ·
`rubric_version = hq-math-rubric-v1` · `overall_disposition` · `rubric_result` · `findings` ·
`reference_context_reviewed = true`; optional `supersedes_judgment_id` · `summary_note` ·
`selection_reason` · `recommended_action`. **Reviewer identity is server-derived (`auth.uid()`),
never client-supplied; unknown fields fail closed; no raw answer copy in the judgment.**

**Output-hash binding (`OUTPUT_HASH_BINDING: PASS`, §20):** the review binds to `math_evaluation_id`
+ canonical output hash + contract/version provenance. If the output changed or the expected hash
differs → **reject the stale submission** (a reviewer can never unknowingly review output A and attach
the judgment to output B). The MATH-2R canonical hash is reused, not redesigned.

---

## 21–25. History, correction, E1/E2, review-state, disagreement

**Correction/supersession (`CORRECTION_APPEND_ONLY: PASS`, §21):** independent review → `supersedes =
null`; correction → a **new immutable** judgment supersedes **one** prior judgment of the **same
domain + evaluation**. Reject self-cycle · cross-evaluation · cross-domain · forbidden second
successor · cycle · dangling parent. **Prior rows are never edited** (reuses HQP append-only +
acyclic discipline).

**E1 / E2 (non-negotiable, §22):**
- **E1 — `CASCADE`:** deletion of a bound Essay **or Math** evaluation CASCADEs its Human Quality
  judgments/findings/hash/notes. For Math, deleting a math evaluation removes its Math HQ graph.
- **E2 — reviewer `SET NULL`:** reviewer-account deletion sets `reviewer_user_id = NULL` for reviews
  of **surviving** evaluations (no reviewer identity snapshot). A dual student+reviewer account: its
  **own** erased evaluation invokes E1 (HQ graph removed); reviews it wrote for **other** surviving
  evaluations invoke E2 (kept, reviewer NULL).
- **Erasure ≠ invalidation:** invalidated/superseded evaluations **retain** their HQ history unless a
  **real erasure** removes the bound evaluation.

**Review-state / active head (§23):** `UNREVIEWED · SINGLE_REVIEW · MULTIPLE_REVIEWS · CORRECTED
(superseded-history) · NOT_COMPARABLE` (rubric/version incompatibility). **No numeric consensus
score.** Active head = the non-superseded judgment(s) currently applicable; independent reviews may
yield multiple active roots; a correction supersedes **its specific parent** and never silently erases
another independent review.

**Multiple reviewers / disagreement (`INDEPENDENT_REVIEWS: PASS`, `MULTIPLE_REVIEW_DISAGREEMENT:
PASS`, §24):** disagreement is shown honestly (`MULTIPLE_REVIEWS` + `DISAGREEMENT` with actual active
dispositions) — **never averaged** into a fake "NEEDS_REVIEW" unless an approved projection defines
it. Incompatible rubric versions → `NOT_COMPARABLE`. The student `math-rubric-v1` is **never**
compared with the human `hq-math-rubric-v1`.

**Review history (§25):** created_at · reviewer state · disposition · rubric result · findings ·
summary note · selection reason · recommended action · supersession · active/superseded. Deleted
reviewer renders as a neutral **"삭제된 검토자"** — identity is never reconstructed from logs; no
unnecessary email/name/account exposure.

---

## 26–28. `qlm-read-v1` list/detail & API surface

**List (`qlm_list_cases`, §26):** bounded discovery of review-eligible Math evaluations. **Excludes**
full student answer, full original image/PDF, full hints, full generated solution, payment details,
direct PII. **Includes** only: `math_evaluation_id` · created_at · university/exam display context ·
problem/leaf display id · `response_format` · evaluation status · model/version · HQ review state ·
material-uncertainty indicator · reevaluation indicator · reference-provenance summary · optional
sampling/reason code. **Stable cursor** `created_at DESC, id DESC`; bounded page (default 20, max 100,
§53); no unbounded scan; batch review-state (no N+1).

**Detail (`qlm_case_detail`, §27):** the six evidence groups (§4), bounded; **no** unrelated student
profile, **no** payment/card details, **no** permanent Storage bearer URLs; explicit availability
states; exact authority/extraction/evaluation versions + hash; exact prior evaluation for
progression; exact frozen hints; exact considered paths; HQ history as a separately bounded section.
"Latest" is never implicit where a frozen version exists.

**API (`HQ_READ_CONTRACT: hq-math-read-v1`, §28):** additive `qlm_submit_human_judgment` ·
`qlm_review_state` · `qlm_list_human_judgments`. **No version switch added to Essay `ql`/`hq` APIs;
`ql-read-v1`/`hq-read-v1` remain semantically unchanged** (`QL_READ_V1_CHANGED: NO`,
`HQ_READ_V1_CHANGED: NO`). Unsupported version → fail closed.

---

## 29–30. Humanities compatibility & domain routing (`LEGACY_HUMANITIES_COMPATIBILITY: PASS`)

Preserved unchanged: Humanities Quality Console behavior · sentence finding semantics · Essay rubric
· Essay review state/history · `ql-read-v1` · `hq-read-v1`. Math does **not** redefine `SENTENCE /
DIMENSION / PROGRESS / ISSUE_KEY / EVIDENCE_LINK` for Humanities — Math has its own typed targets.
Humanities operators never see Math-specific fields on an Essay case.

**One Quality Console, domain-aware workspaces (`QUALITY_CONSOLE_SHARED_SHELL: YES`,
`MATH_WORKSPACE: DOMAIN_SPECIFIC`, §30):** **not** two admin products. Case domain (`HUMANITIES` /
`MATH`) is **derived from canonical typed binding, not a client-writable string.** Essay → Humanities
workspace; Math → Math workspace. Shared shell reuses auth · operator gate · case-list patterns ·
history patterns · submit/correction interaction · review-state badges. **The Math workspace is not
forced into the sentence-centric Humanities UI.**

---

## 31–39. Quality Console IA & UX (no pixels)

**Math case list (§31):** recent cases · review state · unreviewed filter · next-unreviewed ·
`response_format` · initial vs reevaluation · material-uncertainty indicator · model/version ·
university/exam/problem context. Speculative analytics filters (model trend, issue category,
date-range) are POST_LAUNCH.

**Math detail IA (operator-first, §32):** 1 case header/authority → 2 original evidence + extraction
→ 3 AI evaluation → 4 error graph (root vs propagated) → 5 CORE → 6 hint ladder → 7 reevaluation
delta (if any) → 8 reference/solution provenance → 9 HQ review form → 10 review history.

**Evidence/extraction UX (§33):** original page + highlighted region + normalized extraction;
selecting a step/root/extraction finding identifies the source region (**traceability is a contract
requirement**, exact pixel interaction is implementation); multi-page FULL_SOLUTION/PROOF preserves
page/order.

**DAG/error-graph UX (`BLOCKING_VS_POST_HOC` list helper, §34):** a structured step list suffices at
launch (e.g. `Step 3 [ROOT] ↳ Step 4 [PROPAGATED] ↳ Step 5 [PROPAGATED]`), but it must **preserve the
distinction** between `LOGICAL_DEPENDENCY` and `ERROR_PROPAGATION` — never imply every logical edge is
a propagation edge.

**SHORT_ANSWER review (`SHORT_ANSWER_REVIEW: PASS`, §35):** compact — problem authority · answer
evidence · extraction (if any) · answer verification · official/reference authority · HQ form; empty
DAG/hint/proof/step sections are **not** shown; conditional rubric keys show NA by server evidence.

**PROOF review (`PROOF_REVIEW: PASS`, §36):** emphasizes logical completeness · theorem/condition use
· necessary/sufficient direction · step dependencies · unsupported inference · alternative valid proof
path · hint leakage — **not** reduced to final-answer correctness.

**Reevaluation review UX (§37):** compact delta first (Previous CORE / Current result / Resolved / New
issue / Submitted scope / Downstream `NOT_REASSESSED`), then expandable full prior/current — never a
manual two-giant-report comparison.

**Finding creation UX (§38):** create a finding **from evidence context** (select extraction region →
`EXTRACTION_MISREAD`; select root error → `ROOT_PROPAGATION_ERROR`/`INVENTED_ERROR`; select considered
student path → `ALTERNATIVE_PATH_REJECTION`; select CORE → `CORE_PRIORITY_ERROR`; select overall →
`UNSUPPORTED_CLAIM`/`MISSING_IMPORTANT_ISSUE`/`OTHER`). The UI **prefills the typed target** from the
selected canonical fact — the reviewer never types a UUID.

**Review form (§39):** A disposition · B `hq-math-rubric-v1` dimensions · C findings · D summary note
· E recommended action · F correction target (if correction). Conditional dimensions don't clutter;
**no 0–100 score; no auto-submit on field change; explicit operator submit required** (§40).

---

## 40–44. Write safety, correction flow, idempotency, authorization, lifecycle

**Write safety (`AUTOMATED_FAIL_ACTION: NONE`, §40):** explicit submit + review summary +
confirmation; **no write on page load / case selection; no automatic FAIL action; no automatic model
disable; no automatic student-result mutation.** A FAIL is evidence for operations; automated
remediation is a separate authorized policy.

**Correction flow (§41):** open history → choose correction → form initialized from reviewed context →
deliberate submit → new immutable judgment supersedes the **exact parent**. No prior-row edit; no
jump to another evaluation; no cross-Essay/Math correction.

**Idempotency (§42):** `client_submission_id` — exact retry returns the same judgment; same key +
changed payload → conflict; a different reviewer never inherits another's retry; a revoked reviewer's
authorization is checked **before** any retry return. **Idempotency is never an authorization bypass.**

**Authorization (`SERVICE_ROLE_BROWSER: NO`, §43):** reuse the existing Quality-operator authority
(no second Math operator system). Checked on list · detail · evidence access · submit · history ·
correction · retry. Never trust client role label / email domain / caller-supplied reviewer id.
**Account-lifecycle restriction has precedence** — a pending/erasing operator is denied even if still
in the allowlist.

**Student lifecycle gate (`ACCOUNT_DELETION_COMPATIBILITY: PASS`, §44):** no new HQ judgment on an
evaluation being erased; MATH-2R lock-ordering/lifecycle is authority; the console shows
`CASE_UNAVAILABLE` without leaking whether erased/private evidence once existed beyond authorized
history semantics.

---

## 45–46 / 60 / 72–73. Privacy, evidence-access security, notes, cache

**Evidence-access security (§45):** authorized operator only · short-lived · case-bound · no permanent
public URL · no browser `service_role` · no broad bucket listing · no unrelated student's object. **An
HQ finding references canonical region identity, never a signed URL** (§45, §61).

**Privacy (§46):** minimize direct identifiers — default reviewer view needs no student name/email/
phone/OAuth/school (unless school is genuinely part of evaluation authority). Use case/evaluation
identity + problem context + submitted evidence. E1 removes bound Math HQ on student erasure; E2 nulls
reviewer identity on others' reviews; **no detached student hashes for QA retention.**

**Reviewer notes (§60):** bounded, professional, evidence-focused; **no** student PII, full-answer
copies, provider secrets, credentials, or unnecessary personal commentary; notes are QA data erased
under E1 with the bound evaluation.

**Browser cache / client state (§73):** no long-lived client cache of original evidence by default;
clear case state on logout; clear/reload on account-lifecycle denial; signed evidence access expires;
no `localStorage` copy of full answer/image. (A screenshot an operator already took cannot be revoked
by cache-clearing — stated honestly.)

---

## 47–51 / 67–69. Sampling, escalation, blocking vs post-hoc, routing

**Sampling (`QUALITY_SAMPLING`, §47):** minimal operational reasons — `EARLY_CENSUS · RANDOM_SAMPLE ·
UNCERTAINTY · HUMAN_REVIEW_REQUIRED · MODEL_CHANGE · REFERENCE_CONFLICT · OPERATOR_SELECTED ·
INCIDENT_REVIEW`. Selection reason is **operational metadata, not student quality**; no analytics
sampling engine.

**Early census (`EARLY_CENSUS`, §48):** recommend a **controlled high-sampling launch period** (new
Vision pipeline + new evaluator + alternative-path/root-propagation risk + new hints justify it),
later reduced by measured Human Quality. **Exact rate = OWNER/OPERATIONS CALIBRATION** (no invented
percentage). Not every evaluation is reviewed before delivery unless separately decided (§50).

**HUMAN_REVIEW_REQUIRED cases (§49):** MATH-4 escalations (`MATHEMATICAL_EQUIVALENCE_UNCERTAIN`,
ambiguous alternative path, critical unresolved extraction ambiguity, reference conflict needing
operator math review) are distinguishable from ordinary random QA; `CONTENT_CONFIGURATION_ERROR` routes
to **content operations**, not ordinary Human Quality (§68).

**Blocking vs post-hoc (`BLOCKING_VS_POST_HOC: PASS`, §50, §67):** distinguish **POST_HOC_QA** (result
already safely deliverable) from **BLOCKING_REVIEW** (MATH-4 says a conclusion cannot safely
finalize). **MATH-4 decides deliverability; MATH-7 designs the operator workflow for each.** Sampling
is not converted into a student-facing delay. **Blocking is never inferred from a FAIL alone** — a
post-hoc FAIL can exist after delivery.

**Blocking resolution (§51):** semantic options (not implemented) — `AI_EVALUATION_CONFIRMED` ·
`AI_EVALUATION_REQUIRES_CORRECTION` · `CONTENT_REVIEW_REQUIRED` · `EVIDENCE_INSUFFICIENT` ·
`ALTERNATIVE_PATH_VALID` · `ALTERNATIVE_PATH_INVALID`. **Any corrected canonical student evaluation
goes through a separately authorized correction/reevaluation mechanism — the HQ judgment row never
rewrites evaluation tables directly.**

**Content vs extraction routing (§68, §69):** separate *bad canonical content* (official answer
inconsistent, contradictory scoring guide, wrong problem version, missing source, misconfigured
profile) → `CONTENT_REVIEW_REQUIRED`, **not** a forced `hallucination_absence FAIL`; and separate
*Vision/extraction failure* from *math-evaluation failure* — the evaluator may be correct on wrong
extracted input (that's `EXTRACTION_MISREAD`, not evaluator hallucination), though failing to
recognize warranted uncertainty **can** be an evaluator-quality finding.

---

## 52. Humanities HQR reuse

**Reuse:** operator gate · case-list shell · review-state badge · unreviewed filter · next-unreviewed
· history · explicit submit · idempotency · correction pattern · deleted-reviewer rendering.
**Do not reuse:** sentence-feedback UI · Humanities rubric labels · generated-rewrite assumptions ·
Essay-only evidence target selectors. The Math workspace gets Math-specific evidence and targets.

---

## 53–56. Performance, accessibility, device

**List bounds (§53):** default 20, max 100 (or approved MATH-2R bounds); cursor `created_at DESC,
id DESC`; no answer/evidence blobs; batched review-state; no analytics search engine.
**Detail bounds (§54):** bounded counts for steps · edges · errors · findings · history rows ·
reference paths · hint artifacts · pages/regions (reuse canonical limits where defined; mark
not-yet-canonical numbers as implementation calibration).
**Accessibility (§55):** keyboard nav · semantic headings · focus state · screen-reader labels ·
non-color-only status · formula text equivalents · zoom/2× text. **Math notation is never conveyed
only as an image** — normalized math/text accompanies visual evidence.
**Device (§56):** desktop/tablet-optimized (evidence density); mobile safe read/review fallback; no
mobile graph editing required.

---

## 57–58 / 77–78. VOICE, analytics, Science boundaries

**VOICE (`VOICE_1_COMPATIBILITY: PASS`, §57, §77):** no TTS in the Quality Console; HQ can review the
**canonical facts** that later produce CORE/hint/reevaluation voice; voice stays **DERIVED**,
POST_LAUNCH_REQUIRED, `AUDIO_PERSISTENCE: NONE_BY_DEFAULT`; no voice rubric / audio QA storage / TTS
review workflow created.
**Analytics (§58):** no warehouse here; HQ tables remain canonical QA facts; derived metrics (PASS/
FAIL rate, finding frequency, extraction-error frequency, alt-path-rejection frequency, CORE-priority-
error frequency, hint-quality-issue frequency) are **consumers**, never copying student content.
**Incident signals (§59):** conceptual triggers (repeated CRITICAL hallucination, systematic
extraction misread, systematic valid-path rejection, official-scoring fabrication, repeated hint
answer leakage) provide **evidence** — no model is auto-disabled on one judgment.
**Science (§78):** shared concepts (HQ judgment · rubric-version dispatch · typed findings · review
state/history · correction · operator authorization) could later support Science via another typed
domain binding — **no generic global evaluation registry now.**

---

## 61–62 / 71–72 / 74. Security, errors, credit, deletion

**No client authority (§61):** client never decides reviewer identity · Quality membership · domain
binding · evaluation ownership · finding-target membership · output hash · active-head truth · E1/E2.
Server validates all; UI target selectors are convenience only.

**Error states (§62):** `UNAUTHORIZED · CASE_NOT_FOUND · CASE_UNAVAILABLE · EVIDENCE_UNAVAILABLE ·
STALE_OUTPUT_HASH · INVALID_RUBRIC · INVALID_FINDING_TARGET · IDEMPOTENCY_CONFLICT ·
CORRECTION_CONFLICT · REVIEWER_REVOKED · ACCOUNT_LIFECYCLE_BLOCKED · UNSUPPORTED_CONTRACT_VERSION`.
No internal SQL/provider secrets in errors.

**Credit (`CREDIT_AUTHORITY: NOT_HUMAN_QUALITY`, §71):** HQ is **not** Billing authority. Reviewer
sees minimal context (initial vs reevaluation · included-eligibility state where needed · whether
result delivered · whether processing failed) but **never** marks Credit consumed/refunded, changes
price/package, or grants promotional Credit. A finding may later trigger an authorized operational
review; financial mutation is separate.

**Account deletion (§72):** MATH-2R/ADR semantics preserved — E1 removes the HQ graph on evaluation
erasure (no detached student-output hash kept for stats); E2 nulls reviewer identity on surviving
reviews; the console handles evidence disappearing via legitimate erasure and never resurrects it from
cache/analytics.

**Security acceptance requirements for MATH-7B (§74):** normal student cannot list Quality cases /
read another student's Math evaluation · forged operator flag gives no access · revoked/pending-erasing
operator loses access · operator cannot submit `reviewer_user_id` / forge evaluation binding / target a
foreign step/error/region/path · stale output hash cannot be reviewed · direct HQ table CRUD denied ·
internal helpers not browser-executable · no `service_role` in browser · evidence access case-bound +
short-lived · correction cannot cross evaluation/domain · idempotency does not bypass authorization.

---

## 63. Synthetic acceptance matrix (`SYNTHETIC_MATRIX: Q1-Q30 COMPLETE`)

No real AI / no real student data. Each row: expected rubric verdicts (key verdicts shown),
disposition, finding (category/target/severity).

| Q | case | key verdicts | disposition | finding (cat / target / sev) |
| --- | --- | --- | --- | --- |
| Q1 | FULL_SOLUTION, AI correct | all OK/NA | PASS | none |
| Q2 | correct answer, AI wrongly criticizes reasoning | diagnosis FAIL | FAIL | FALSE_CORRECTION / OVERALL / MATERIAL |
| Q3 | wrong answer, mostly-valid reasoning preserved | diagnosis OK, step_reasoning OK | PASS/PASS_WITH_NOTES | none / MINOR |
| Q4 | x²→x³ misread → false math error | extraction_fidelity FAIL, diagnosis FAIL, evidence_adherence FAIL | FAIL | EXTRACTION_MISREAD / EXTRACTION_REGION / MATERIAL\|CRITICAL |
| Q5 | extraction error fixed by student confirmation | extraction_fidelity OK | PASS | none |
| Q6 | ROOT right, propagated grouped | step_reasoning OK | PASS | none |
| Q7 | propagated treated as independent root | step_reasoning FAIL | FAIL | ROOT_PROPAGATION_ERROR / ROOT_ERROR / MATERIAL |
| Q8 | second independent root missed | diagnosis CONCERN/FAIL | NEEDS_REVIEW/FAIL | MISSING_IMPORTANT_ISSUE / OVERALL / MATERIAL |
| Q9 | valid alternative path preserved | valid_path_preservation OK | PASS | none |
| Q10 | valid alternative path rejected | valid_path_preservation FAIL, diagnosis FAIL | FAIL | ALTERNATIVE_PATH_REJECTION / ALTERNATIVE_PATH(STUDENT) / MATERIAL\|CRITICAL |
| Q11 | uncertain novel path correctly escalated | valid_path_preservation OK, diagnosis OK | PASS | none |
| Q12 | CORE picks highest-impact issue | core_priority OK | PASS | none |
| Q13 | AI invents CORE though CORE=[] valid | core_priority FAIL, hallucination_absence CONCERN | FAIL | FALSE_CORRECTION / OVERALL / MATERIAL |
| Q14 | L1 safe direction, no leak | hint_quality OK | PASS | none |
| Q15 | L1 leaks SHORT_ANSWER final answer | hint_quality FAIL | FAIL | UNDER_SPECIFIED_GUIDANCE?→ leakage; OTHER(hint leak) / OVERALL / MATERIAL\|CRITICAL |
| Q16 | L2 concept, no full derivation | hint_quality OK | PASS | none |
| Q17 | PROOF hint gives proof verbatim | hint_quality FAIL | FAIL | OTHER(hint leak) / OVERALL / CRITICAL |
| Q18 | reeval recognizes prior CORE fixed | progression OK | PASS | none |
| Q19 | prior root fixed, new root introduced | progression OK (if stated) | PASS/PASS_WITH_NOTES | none; if misstated → PROGRESSION_ERROR |
| Q20 | STEP_RETRY claims downstream reassessed | progression FAIL | FAIL | PROGRESSION_ERROR / OVERALL / MATERIAL |
| Q21 | NO_MATERIAL_CHANGE correct | progression OK | PASS | none |
| Q22 | AI reference shown as official | generated_solution FAIL | FAIL | UNSUPPORTED_CLAIM / OVERALL / MATERIAL\|CRITICAL |
| Q23 | official criterion fabricated | hallucination_absence FAIL, evidence_adherence FAIL | FAIL | INVENTED_ERROR\|UNSUPPORTED_CLAIM / OVERALL / CRITICAL |
| Q24 | initial eval; progression/hint/generated NA | those = NA | PASS | none |
| Q25 | required evidence missing | — | NEEDS_REVIEW (UNASSESSABLE) | not NA, not PASS |
| Q26 | two reviewers disagree | — | per reviewer | MULTIPLE_REVIEWS + DISAGREEMENT (not averaged) |
| Q27 | correction supersedes exact parent | — | — | append-only; parent superseded only |
| Q28 | deleted reviewer | — | — | "삭제된 검토자"; E2 reviewer NULL |
| Q29 | account deletion E1 | — | — | bound Math HQ graph CASCADE-removed |
| Q30 | revoked/pending operator retry | — | — | denied before retry return; idempotency ≠ bypass |

---

## 64. Reviewer decision examples

- **A — extraction misread:** student `x²`, extraction `x³`, AI "지수 계산이 잘못되었습니다." →
  `extraction_fidelity = FAIL`, `diagnosis = FAIL`, `evidence_adherence = FAIL`; finding
  `EXTRACTION_MISREAD` / target `EXTRACTION_REGION` / MATERIAL|CRITICAL. The student's math is not
  blamed for the Vision error.
- **B — valid path rejected:** student uses a valid substitution absent from the official solution; AI
  marks it wrong for differing → `valid_path_preservation = FAIL`, `diagnosis = FAIL`; finding
  `ALTERNATIVE_PATH_REJECTION` / target `ALTERNATIVE_PATH(STUDENT)` / MATERIAL|CRITICAL.
- **C — propagation as independent errors:** one Step-3 sign error; Steps 4–5 follow consistently; AI
  reports three independent mistakes → `step_reasoning = FAIL`, `diagnosis = FAIL|CONCERN`; finding
  `ROOT_PROPAGATION_ERROR` / target `ROOT_ERROR` (or the bound step) / MATERIAL.
- **D — brevity is not an error:** SHORT_ANSWER requires only "12"; student writes "12"; AI criticizes
  absent derivation → `diagnosis = FAIL`, `evidence_adherence = FAIL`, `step_reasoning = NA`; finding
  `FALSE_CORRECTION` (or most precise) / OVERALL.
- **E — overclaimed progression:** student fixes the prior CORE in STEP_RETRY, no downstream
  resubmitted; AI says "전체 풀이가 완전히 맞았습니다." → `progression = FAIL`; finding
  `PROGRESSION_ERROR`; the correct result preserves downstream `NOT_REASSESSED`.

---

## 66. Reviewer action recommendations (advisory only)

Compact operational vocabulary (reuses HQR `recommended_action` discipline): `NONE ·
REVIEW_EVALUATION · REVIEW_CONTENT · REVIEW_EXTRACTION · REVIEW_HINT · ESCALATE_MODEL_QUALITY`. A
recommended action is **advisory operational metadata** and must **not** auto-mutate a student
evaluation, refund Credit, disable a model, delete content, change official scoring, or publish a
corrected solution — those are separate authorized workflows (§40, §51, §71).

---

## 75–76. MATH-7B handoff & MATH-2C reconciliation

**MATH-7B (`MATH_7B_HANDOFF_READY: YES`, §75)** will implement in LAB: Math case-list adapter ·
`qlm-read-v1` client · Math case detail · evidence viewer · extraction comparison · evaluation step/
error presentation · CORE/hint presentation · reevaluation-delta presentation · `hq-math-rubric-v1`
form · typed finding-target selectors · submit/history/state · correction flow · unreviewed workflow ·
deleted-reviewer rendering · accessibility/responsive behavior. It **waits for MATH-2C physical
reconciliation** and the backend `qlm`/HQ Math RPCs from the canonical migration. **No mock Production
fallback is built.**

**MATH-2C reconciliation (`MATH_2C_RECONCILIATION_READY: YES`, §76):** MATH-7A is independent of
physical table names, migration timestamp, role names beyond semantic authority, and exact SQL. Semantic
dependencies: Math evaluation identity · canonical output hash/version · selected extraction/run/regions
· solution steps · root/propagated errors · considered paths · CORE · hints · reevaluation delta · HQ-A
typed Math binding · `hq-math-rubric-v1` · Math finding-target validation · `qlm` read/write/history/
state surfaces · E1/E2 · lifecycle restriction. After MATH-2C: reconcile physical DTO/function names (a
naming difference is **not** a product-contract change). **A genuine semantic blocker → STOP before
MATH-7B.**

---

## 81. Self-review / validation

MATH-4 remains math-evaluation authority · MATH-5 CORE/hint/reveal authority · MATH-6 re-solve/reeval/
history authority · **MATH-7 reviews AI quality only** · HQ PASS ≠ student correct, HQ FAIL ≠ student
wrong · `hq-math-rubric-v1` distinct from `math-rubric-v1` · extraction error distinct from student
error · logical dependency distinct from error propagation · valid alternative paths preserved · CORE=[]
valid · hint-leakage review supported · STEP_RETRY `NOT_REASSESSED` supported · official/internal/AI
reference provenance preserved · E1 CASCADE · E2 reviewer SET NULL · deleted-reviewer rendering ·
correction append-only · independent reviews supported · disagreement not averaged · **no automated FAIL
action** · no direct financial authority · no student PII by default · no permanent evidence URL · no
`service_role` in browser · no chain-of-thought · `ql-read-v1`/`hq-read-v1` unchanged · no DB/migration/
provider/Production change · Q1–Q30 complete · links resolve · `OWNER_DECISIONS_REQUIRED: 0` (early-
census rate and detail numeric limits are OPERATIONS/IMPLEMENTATION calibration, not product
decisions).

---

## 80. Final report

```
MATH_7A_CONTRACT:            COMPLETE
REPOSITORY:                  LC3808/legendstudy-lab
BRANCH:                      claude/math-essay-architecture-v1
BASE_COMMIT:                 18d1318b4867f9bf9ce840ee74e24e7872e587c1
FINAL_COMMIT:                <filled at closeout>
HUMAN_QUALITY_REVIEWS:       AI_QUALITY_NOT_STUDENT_SCORE
QLM_READ_V1:                 list + detail semantic contract (§26,§27); additive
REVIEWER_EVIDENCE_GROUPS:    6 / PASS
HQ_MATH_RUBRIC_V1:           PASS (11 keys, OK/CONCERN/FAIL/NA; distinct from student scale)
RUBRIC_KEYS:                 diagnosis, core_priority, actionability, evidence_adherence,
                             valid_path_preservation, hallucination_absence, extraction_fidelity,
                             step_reasoning, hint_quality, progression, generated_solution
RUBRIC_VERDICTS:             OK / CONCERN / FAIL / NA
OVERALL_DISPOSITIONS:        PASS / PASS_WITH_NOTES / NEEDS_REVIEW / FAIL
FINDING_CATEGORIES:          FALSE_CORRECTION, INVENTED_ERROR, EVIDENCE_MISREAD, UNSUPPORTED_CLAIM,
                             CORE_PRIORITY_ERROR, PROGRESSION_ERROR, UNDER_SPECIFIED_GUIDANCE,
                             MISSING_IMPORTANT_ISSUE, OTHER, EXTRACTION_MISREAD, ROOT_PROPAGATION_ERROR,
                             ALTERNATIVE_PATH_REJECTION
FINDING_SEVERITIES:          MINOR / MATERIAL / CRITICAL
MATH_FINDING_TARGETS:        OVERALL / SOLUTION_STEP / ROOT_ERROR / EXTRACTION_REGION / ALTERNATIVE_PATH
EXTRACTION_REVIEW:           PASS
ROOT_PROPAGATION_REVIEW:     PASS
ALTERNATIVE_PATH_REVIEW:     PASS
CORE_REVIEW:                 PASS
HINT_REVIEW:                 PASS
REEVALUATION_REVIEW:         PASS
GENERATED_SOLUTION_REVIEW:   PASS
HQ_SUBMIT_CONTRACT:          hq-math-write-v1
HQ_READ_CONTRACT:            hq-math-read-v1
OUTPUT_HASH_BINDING:         PASS
CORRECTION_APPEND_ONLY:      PASS
INDEPENDENT_REVIEWS:         PASS
MULTIPLE_REVIEW_DISAGREEMENT: PASS
E1:                          CASCADE
E2:                          REVIEWER_SET_NULL
LEGACY_HUMANITIES_COMPATIBILITY: PASS
QL_READ_V1_CHANGED:          NO
HQ_READ_V1_CHANGED:          NO
QUALITY_CONSOLE_SHARED_SHELL: YES
MATH_WORKSPACE:              DOMAIN_SPECIFIC
SHORT_ANSWER_REVIEW:         PASS
PROOF_REVIEW:                PASS
BLOCKING_VS_POST_HOC:        PASS
QUALITY_SAMPLING:            compact reason set; operational metadata, not student quality (§47)
EARLY_CENSUS:                controlled high-sampling launch period; rate = OWNER/OPS CALIBRATION (§48)
AUTOMATED_FAIL_ACTION:       NONE
CREDIT_AUTHORITY:            NOT_HUMAN_QUALITY
ACCOUNT_DELETION_COMPATIBILITY: PASS
SERVICE_ROLE_BROWSER:        NO
VOICE_1_COMPATIBILITY:       PASS
SYNTHETIC_MATRIX:            Q1-Q30 COMPLETE
MATH_7B_HANDOFF_READY:       YES
MATH_2C_RECONCILIATION_READY: YES
OWNER_DECISIONS_REQUIRED:    0
READY_FOR_MATH_7B:           YES
READY_FOR_PRODUCTION:        NO
DB_CHANGED:                  NO
MIGRATION_CREATED:           NO
PROVIDER_CALLS:              0
PRODUCTION_CHANGED:          NO
PRODUCTION_AI:               OFF
FILES_CHANGED:               docs/architecture/MATH-7_HUMAN_QUALITY_CONSOLE_CONTRACT.md (new);
                             MATH-1→6 one-line successor pointers
COMMIT:                      <filled at closeout>
PUSH:                        <filled at closeout>
LOCAL_REMOTE_SYNC:           <filled at closeout>
UNIFIED_WIKI_CHANGED:        NO
NEXT:                        OWNER/CHATGPT REVIEW → MATH-2C RECONCILIATION
                             → MATH-7B QUALITY CONSOLE MATH IMPLEMENTATION
                             → CONTROLLED MATH E2E / PILOT GATES
```
