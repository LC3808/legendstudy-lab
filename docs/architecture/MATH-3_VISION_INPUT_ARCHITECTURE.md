# MATH-3A — Mathematical Essay (수리논술) Vision / Handwritten-Solution Input Architecture

**Status:** ARCHITECTURE / CONTRACT / UX / PROVIDER-STRATEGY ONLY. No migration, no code, no
provider calls, no Production change.
**Date:** 2026-10-02
**Author role:** LegendStudy LAB Math Vision/Input architecture designer (Claude).
**Repository / branch:** `LC3808/legendstudy-lab` · `claude/math-essay-architecture-v1`.
**Base commit:** `1bd275b059e6f42a1ccc8181e2c211d4dd4a5517` (MATH-2A tip).
**Authority read:** [MATH-1](MATH-1_MATHEMATICAL_ESSAY_ARCHITECTURE.md) (APPROVED) ·
[MATH-2A](MATH-2_CANONICAL_DATA_PERSISTENCE_CONTRACT.md) (COMPLETE; Codex MATH-2B DB/security
cross-review concurrent).
**Successor:** [MATH-4A](MATH-4_EVALUATION_ENGINE_CONTRACT.md) (evaluation engine) → [MATH-5A](MATH-5_CORE_HINT_LEARNING_CONTRACT.md) (CORE/hint/re-solve learning contract).

> **This document authorizes nothing and changes no system.** No DB migration, no shared-backend
> schema change, no Production change, **no paid Vision/OCR/AI provider call**, **no real student
> data sent anywhere**, no evaluation engine, no `legendstudy-app` / `legendstudy-docs` change.
> MATH-1 / MATH-2A are **not redesigned**. Because Codex MATH-2B may still correct *physical*
> persistence details, MATH-3A is designed against the **approved conceptual boundary** (entity
> *semantics*), not assumed SQL — §58 is the reconciliation checklist. Production AI stays **OFF**,
> `PROVIDER_CALLS: 0`.

Schema/RPC/code authority lives with the App track + live DB; every existing-object name is a
consumer reference for Codex to confirm. Per §63 this task does not touch the Unified Wiki.

---

## 0. Scope & relation to MATH-1/2A

MATH-3A designs the **launch input pipeline**: how a student's Math solution becomes **frozen,
confirmed, structured evaluation input** while the **original evidence stays authoritative**. It
stops at the MATH-4 interface (§57) and ends with a provider bake-off plan for MATH-3B (§38). It
implements nothing.

---

## 1. Objective (pipeline at a glance)

```
select problem/subproblem (canonical context, §17,§47)
 → capture/upload solution (camera/image/pdf/tablet/typed, §3,§4)
 → client normalize (orientation/EXIF/resize, §6,§7)
 → server ingest → page/region detect → MULTIMODAL extraction (§10,§12)
 → targeted fallback only for uncertain/critical regions (§40,§41)
 → structured candidates + confidence/uncertainty (§13,§15,§16,§18)
 → INPUT ACCEPTANCE GATE (§46)  → selective confirmation if critical (§19,§20)
 → FREEZE extraction version (§22) → READY_FOR_MATH_EVALUATION_INPUT_V1 (§57)
original evidence remains authoritative throughout (I1)
```

---

## 2. Hard invariants (carried from MATH-1/2A)

| # | Invariant | Enforced by |
| --- | --- | --- |
| I1 | Original evidence is authoritative | evidence preserved; eval can request original (§31,§57) |
| I2 | Structured extraction is derived | extraction = DERIVED, never canonical answer (§13) |
| I3 | Extraction error ≠ student error | failure taxonomy separate from math error (§23) |
| I4 | Low confidence ≠ silent INCORRECT | confidence bands + confirmation/escalation (§18,§19,§20) |
| I5 | Re-extraction = new version | versioned extraction (§22) |
| I6 | No cross-student cache/reuse of personal answers | NO_CACHE for student evidence (§25) |
| I7 | Official problem/solution extraction may be reused across students | SAFE_CACHE official only (§25,§47) |
| I8 | No raw image binary inside `math-eval-v1` | references only (§13,§57) |
| I9 | Vision extraction ≠ evaluation authority | eval layer owns correctness (§9,§15,§57) |
| I10 | Provider/model failure ≠ student failure | failure taxonomy + recovery (§23,§41) |

---

## 3. Input types (support matrix) (`INPUT_TYPES`)

| input | APP | WEB | launch class | preprocessing note |
| --- | --- | --- | --- | --- |
| `CAMERA_PHOTO` | native camera | file/camera input | **LAUNCH_REQUIRED** | heaviest normalization (§6) |
| `IMAGE_UPLOAD` (JPG/PNG/HEIC→JPG) | ✓ | ✓ | **LAUNCH_REQUIRED** | orientation/EXIF/resize |
| `PDF_UPLOAD` (native-text / scanned / mixed) | ✓ | ✓ | **LAUNCH_REQUIRED** | detect embedded text + render page image (§34) |
| `TABLET_EXPORT` (as image/PDF) | ✓ | ✓ | **LAUNCH_REQUIRED** (via image/PDF path) | native ink/stroke import = POST_LAUNCH |
| `TYPED_TEXT` (text + simple math) | ✓ | ✓ | **LAUNCH_REQUIRED** | bypasses Vision; converges at normalized boundary (§33) |

Native tablet **ink/stroke** ingestion and in-app LaTeX editor are `NOT_REQUIRED` at launch. Input
methods do **not** share identical preprocessing — camera needs the most, typed needs none.

---

## 4. Camera / upload UX (minimum launch) (`CAMERA_UPLOAD_UX`)

**Minimum launch (not a scanner app):** single or multi-page capture; per-page **preview, retake,
rotate, crop, reorder, delete** (pre-submit only, §45); a lightweight **paper-boundary/legibility
hint** (non-blocking nudge, not auto-correction); **EXIF stripped on client** (§7); oversize images
client-resized before upload (§6,§53).

Handled as *nudges/flags*, not silent fixes: blur · glare · low light · shadow · perspective ·
missing page · duplicate page (§52) · wrong problem selected (§17 context mismatch flag). The
student always keeps control; destructive auto-correction that could remove math evidence is
avoided (§6). Full scanner features (auto-shutter, batch deskew pipelines) are post-launch.

---

## 5. Multi-page solution (first-class) (`MULTI_PAGE`)

Hierarchy: `attempt → page[] → region[] → solution_step_candidate[]`. Needs: page identity (§43),
page order, pre-submit **replace/delete/reorder**, cross-page step continuation (§49), subproblem
coverage (§16).

**Pre-submit vs post-submit (§45):** pre-submit editing is free-form; **on submit the evidence
version is frozen and immutable** — a later page/photo is a *new* evidence version or explicit
replacement workflow, never a silent mutation.

---

## 6. Image preprocessing (where) (`PREPROCESSING`)

| operation | CLIENT | SERVER | PROVIDER | notes |
| --- | --- | --- | --- | --- |
| orientation normalization | ✓ | verify | — | from EXIF before strip |
| EXIF removal | ✓ (authoritative) | re-verify | — | privacy (§7) |
| resize / compression (bounded) | ✓ | enforce cap | — | **not aggressive on math** (§25) |
| crop / rotate (pre-submit) | ✓ | — | — | student-driven preview only |
| perspective correction / deskew | optional nudge | optional | — | **non-destructive**; keep original |
| contrast normalization | — | optional, reversible | — | never discard original pixels |
| page detection | optional | optional | provider may assist | advisory |

**Principle:** preprocessing is **additive/reversible**; the **original uploaded evidence is always
retained** so extraction disputes can be resolved against it (I1). No destructive step removes
mathematical evidence.

---

## 7. Privacy at ingestion (`PRIVACY_INGESTION`)

- **EXIF (incl. GPS/device) stripped on client before upload**, re-verified server-side.
- **Pre-upload UI warning** + crop guidance to exclude name/school/student-number/faces/background.
- **Private storage only** (§28,§30); no public bucket; provider sees data only through a
  server-controlled path (§28,§39).
- **Retention status** tracked per artifact; **account-deletion compatible** (§29).
- Owner decision unchanged: student raw evidence is **FINITE + ERASABLE**, exact duration **TBD
  before Production Math activation** (`PRIVACY_FOLLOW_UP_REQUIRED: YES`). Not reopened here.

---

## 8. Mathematical notation coverage (launch) (`MATH_NOTATION_COVERAGE`)

| class | MUST_SUPPORT_AT_LAUNCH | BEST_EFFORT | POST_LAUNCH |
| --- | --- | --- | --- |
| arithmetic operators, fractions, powers/subscripts, roots, abs, inequalities | ✓ | | |
| functions, limits, derivatives, integrals, summation, log/exp, trig | ✓ | | |
| coordinates, vectors, sets, probability/combinatorics, piecewise | ✓ | | |
| matrices | | ✓ | |
| dense multi-line derivations, nested cases | | ✓ | |
| advanced/rare notation, ad-hoc student shorthand | | | ✓ |
| Korean handwritten explanatory text | ✓ | | |

**No promise of perfect recognition** — uncertain symbols route to confidence/confirmation (§18–20),
never silent error (I4). Calibration happens in MATH-3B (§38); no accuracy numbers invented.

---

## 9. Graph / diagram / table (`GRAPH_DIAGRAM_TABLE`)

Not every visual reduces to text. Region types: `VISUAL_REGION` · `GRAPH_REGION` · `DIAGRAM_REGION`
· `TABLE_REGION`, each carrying: bounding box (normalized, §42) · caption/description · linked
solution-step candidate · confidence · **original-evidence reference**. The evaluator (MATH-4) may
**inspect the original visual directly** via an authorized reference (§57) rather than trusting a
lossy text description — tables may additionally carry a structured cell grid (best-effort).

---

## 10. OCR vs multimodal vision (`VISION_ARCHITECTURE`)

| option | Korean HW | math | layout | graphs | latency | cost | lock-in | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A OCR-first | weak on HW math | weak | weak | no | low | low | med | rejected |
| B multimodal direct | strong | strong | strong | strong | med | med-high | **adapter-isolated** | strong base |
| C OCR + multimodal verify | ok | ok | ok | partial | high | high | med | too heavy |
| **D multimodal + targeted OCR/math-recognition fallback** | **strong** | **strong** | **strong** | **strong** | **med, bounded** | **controlled** | **isolated** | **RECOMMENDED** |

**Recommendation: Option D.** A multimodal model does the primary pass (handles Korean handwriting +
math + layout + graphs together, with native structured output and error localization); a
**targeted** specialized OCR / math-recognition second pass runs **only on uncertain or critical
regions** (§40). This gives quality where it matters while controlling cost/latency, and the
provider-independent adapter (§39) prevents lock-in. No providers are called here.

---

## 11. Provider strategy (categories for MATH-3B) (`PROVIDER_STRATEGY`)

The architecture permits **PRIMARY + FALLBACK/SECOND-PASS** without a provider-specific canonical
contract (§39). Capability categories MATH-3B must evaluate (not products, not selected now):

| category | role candidate | evaluate for |
| --- | --- | --- |
| general multimodal LLM | PRIMARY extraction + structure | Korean HW, math, layout, graphs, structured output |
| math OCR / formula recognition | targeted FALLBACK | fraction/root/integral/limit/sub-sup accuracy |
| document OCR | PDF text / dense print | native-text PDF, printed problem text |
| handwriting recognition | targeted FALLBACK | messy Korean handwriting |

No provider is chosen because it is used elsewhere; selection is MATH-3B's bake-off outcome (§38).

---

## 12. Extraction pipeline (stages) (`EXTRACTION_PIPELINE`)

| stage | input | output | failure | retry | mutate pre-submit? | versioned post-submit? |
| --- | --- | --- | --- | --- | --- | --- |
| INGEST | uploaded artifact | stored private evidence ref | UPLOAD_FAILED/UNSUPPORTED/TOO_LARGE | yes (re-upload) | yes | evidence version |
| NORMALIZE | evidence | normalized render + metadata | — | yes | yes (crop/rotate) | with evidence |
| PAGE/REGION DETECT | normalized render | pages + regions + reading order | LAYOUT_UNCERTAIN (flag) | yes | yes | yes |
| MULTIMODAL EXTRACTION | regions + recognition context (§17) | provider raw result | PROVIDER_TIMEOUT/UNAVAILABLE/INVALID_OUTPUT | yes/fallback | n/a | extraction version |
| TARGETED FALLBACK | uncertain/critical regions | second-pass candidate | same | bounded | n/a | extraction version |
| MERGE | primary + fallback candidates | merged candidate + provenance (§41) | UNRESOLVED | — | n/a | extraction version |
| STRUCTURE | merged candidate | solution_step/subproblem candidates | — | — | n/a | extraction version |
| CONFIDENCE/UNCERTAINTY | structured candidate | bands + reasons (§18) | — | — | n/a | extraction version |
| INPUT ACCEPTANCE GATE (§46) | all above | READY/NEEDS_CONFIRMATION/NEEDS_REUPLOAD/INPUT_FAILED | gate fail | — | n/a | — |
| SELECTIVE CONFIRMATION (§19) | critical ambiguities | student-confirmed corrections | CONFIRMATION_REQUIRED | — | pre-eval loop | new confirmed extraction version |
| FREEZE | confirmed extraction | frozen `extraction_version` | — | — | no | **immutable** |
| → EVALUATION (MATH-4) | frozen input (§57) | (out of MATH-3 scope) | — | — | — | — |

Extraction processing is **distinct** from mathematical evaluation (§26,§54): `PROCESSING_INPUT ≠
EVALUATING`.

---

## 13. Structured extraction contract (refines MATH-2A boundary) (`STRUCTURED_EXTRACTION_CONTRACT`)

Conceptual fields (semantics, not SQL; MATH-2A `math_extraction_runs`/`math_extraction_regions`
authority unchanged): `extraction_run_id` · `extraction_version` · `attempt_id` · `page_id` ·
`region_id` · `region_type` · `bounding_box` (normalized, §42) · `raw_text` · `normalized_math`
(§14) · `formula_representation` · `visual_reference` · `confidence` · `uncertainty_reason` ·
`source_coordinates` · `reading_order` · `subproblem_candidate` · `solution_step_candidate`.

**Three layers kept distinct (never collapsed):**
1. **provider raw response** — INTERNAL, provenance/debug only, **never canonical truth** (§24,§39).
2. **normalized internal extraction** — DERIVED canonical candidate (provider-neutral field names).
3. **student-confirmed correction** — provenance-bearing overlay producing a new confirmed version
   (§21,§44).

---

## 14. Formula representation (`FORMULA_REPRESENTATION`)

| option | display | eval | VOICE-1 | human review | verdict |
| --- | --- | --- | --- | --- | --- |
| LaTeX only | good | ok | needs parse | ok | rejected (sole truth) |
| MathML only | ok | ok | ok | verbose | derived accessibility output later |
| plain normalized text | weak | weak | weak | weak | insufficient |
| full AST / symbolic tree | — | strong | strong | heavy | **no CAS** (Owner) → rejected as primary |
| **hybrid: normalized LaTeX-class string + lightweight structural hints + raw_text + visual_reference** | **good** | **sufficient** | **verbalizable** | **good** | **RECOMMENDED** |

**Launch minimum:** a normalized LaTeX-class string (primary display/eval) **plus** `raw_text` and a
`visual_reference`, with lightweight structural hints (e.g. is-fraction, has-exponent, integral
bounds present) — **not** a full AST and **not** a CAS/theorem prover (Owner). **Original image
remains authority.** MathML is a derivable accessibility output later (§36). LaTeX is **not** the
only truth (I1). `normalized_math` is written to be VOICE-1-verbalizable into natural Korean (§32).

---

## 15. Solution-step segmentation & identity ownership (`SOLUTION_STEP_SEGMENTATION`)

Vision proposes `solution_step_candidate` using layout, reading order, formula continuity,
connective Korean text, arrows, equals-chains, subproblem markers, and spatial grouping. **A
handwritten line ≠ one logical step.**

**Final `solution_step` identity owner — recommendation: HYBRID (Vision proposes, MATH-4
evaluator finalizes).** Vision segmentation is **provisional**; the canonical per-evaluation
`math_solution_steps` (MATH-2A §20) are created/finalized by the evaluation layer, which can merge/
split candidates using mathematical structure Vision cannot see. This keeps extraction free of
evaluation authority (I9) and matches MATH-2A (steps are per-evaluation output).

---

## 16. Subproblem detection & binding (`SUBPROBLEM_BINDING`)

Markers vary: `(1)`, `①`, `가.`, `1)`, or none. The pipeline associates regions/steps with
**canonical** subproblems (from the selected problem, §17), mapping messy markers to canonical
`subproblem_id`. **Vision must not invent a new subproblem identity.** When binding is uncertain →
`SUBPROBLEM_BINDING_AMBIGUITY` (§18), **flag rather than silently bind** (§20 may make it critical).

---

## 17. Problem context & recognition/evaluation separation (`RECOGNITION_CONTEXT`)

Extraction **may receive** (recognition context): problem text · subproblem labels · known/expected
formula symbols · expected `response_format` · official diagram (for visual grounding).

Extraction **must NOT receive**: the **official final answer** or the **full official solution** —
to prevent **extraction bias** (the model "reading" what the solution expects rather than what the
student wrote). Clean separation:

```
RECOGNITION CONTEXT  (what symbols/subproblems to expect)   ≠   EVALUATION / ANSWER AUTHORITY
```

Answer authority (official solution/criteria) belongs to MATH-4, never to the recognition stage.

---

## 18. Extraction confidence (`CONFIDENCE_MODEL`)

Confidence is reported at **page / region / formula / symbol / solution-step candidate**. Bands
(calibrated in MATH-3B, **no arbitrary numeric thresholds invented**): `HIGH · MEDIUM · LOW ·
AMBIGUOUS · UNREADABLE`, each with an explicit `uncertainty_reason`:

`MODEL_LOW_CONFIDENCE` · `IMAGE_QUALITY` · `SYMBOL_AMBIGUITY` · `LAYOUT_AMBIGUITY` ·
`SUBPROBLEM_BINDING_AMBIGUITY`.

Band + reason drive selective confirmation (§19) and criticality (§20). Reasons matter because the
remedy differs (re-upload for `IMAGE_QUALITY`; confirm for `SYMBOL_AMBIGUITY`).

---

## 19. Selective confirmation UX (`SELECTIVE_CONFIRMATION`)

Confirm **only low-confidence/ambiguous regions** (MATH-1 Option C). Pattern:

```
"이 부분을 이렇게 읽었습니다."   [original crop]   AI: ∫₀¹ x² dx    [확인] [수정]
```

Requirements: never ask the student to verify every line; show **original crop** + extracted
representation; allow **correction**; **preserve correction provenance** (§44); **never alter the
original image**; **no new credit charge** for confirmation (§27). Evaluation **waits only on
required (critical) ambiguities** (§20); non-critical ones do not block.

---

## 20. Critical vs non-critical ambiguity (`CRITICAL_AMBIGUITY`)

| | blocks evaluation? | examples |
| --- | --- | --- |
| **CRITICAL_AMBIGUITY** | **YES** (must resolve or route to human) | final answer, operator sign, exponent, integration bound, inequality direction, problem/subproblem marker, variable identity |
| **NONCRITICAL_AMBIGUITY** | no | minor handwriting in explanatory phrase not affecting reasoning |

**Criticality = region role × `response_format`** (canonical, §48): e.g. the answer region is
critical for `SHORT_ANSWER`; a mid-derivation sign is critical for `FULL_SOLUTION`/`PROOF`. The
pipeline decides blocking from this rule, not from raw confidence alone. Unresolved critical
ambiguity → `CONFIRMATION_REQUIRED`, then if still unresolved → `HUMAN_REVIEW_REQUIRED` (§41) —
**never** silent `INCORRECT` (I4).

---

## 21 / 44. Student correction as provenance (`STUDENT_CORRECTION_PROVENANCE`)

A student correcting extraction is **`EXTRACTION_CONFIRMATION`, not `RE_SOLVE`** — these histories
stay separate (§45). Example: image shows `x²`; provider extracts `x³`; student corrects to `x²` →
the **submitted mathematics did not change**; the evaluator evaluates the confirmed `x²` while
preserving provider candidate `x³`, the student confirmation, and original-image authority.

Stored conceptually: original extraction · student correction · confirmation timestamp · affected
region · new normalized representation. **Recommendation: a correction produces a new confirmed
`extraction_version`** (not a silent overlay rewrite) — cleanest reproducible model: each version is
immutable, the confirmed version supersedes the raw one, and the provider raw candidate is retained
for provenance. The original image is **never** rewritten (I1).

---

## 22. Re-extraction & versioning (`RE_EXTRACTION_VERSIONING`)

Supported: provider retry · different provider/model · manual correction · **new image upload before
submission**. **Post-submit, re-extraction creates a new `extraction_version`** (I5). A historical
evaluation stays **pinned** to its extraction version; a new extraction **never silently rebinds** an
old evaluation — re-evaluation on a new extraction is an **explicit** request (MATH-2A §24 resolve/
reeval linkage).

---

## 23. Failure model (`FAILURE_MODEL`) — none is a student math error (I3,I10)

`UPLOAD_FAILED` · `UNSUPPORTED_FILE` · `FILE_TOO_LARGE` · `IMAGE_TOO_LOW_QUALITY` · `PAGE_MISSING` ·
`INPUT_UNREADABLE` · `EXTRACTION_FAILED` · `EXTRACTION_AMBIGUOUS` · `FORMULA_UNCERTAIN` ·
`LAYOUT_UNCERTAIN` · `SUBPROBLEM_UNCERTAIN` · `PROVIDER_TIMEOUT` · `PROVIDER_UNAVAILABLE` ·
`INVALID_PROVIDER_OUTPUT` · `CONFIRMATION_REQUIRED`.

Recovery: transient provider errors → retry then targeted fallback (§40); `INVALID_PROVIDER_OUTPUT`
→ reject + fallback (§24); quality/missing-page → `NEEDS_REUPLOAD`; ambiguity → `NEEDS_CONFIRMATION`.
All map to input states (§54), never to `answer_status`.

---

## 24. Provider output validation (`PROVIDER_OUTPUT_VALIDATION`) — fail closed

Never trust provider JSON. Validate: schema/shape · bounded arrays & string lengths · region-
coordinate bounds · **page ownership** (region belongs to this attempt's page) · enum values ·
**unknown fields ignored, not inferred** · formula-text length caps · timeout handling · malformed
output → `INVALID_PROVIDER_OUTPUT`. **Fail closed before evaluation** (reuse LEC-1/`ql-read-v1`
defensive-read + fail-closed discipline). No implementation code here.

---

## 25. Cost control (`COST_CONTROL`)

Controls: client compression (bounded, **not aggressive on math**, §6) · page/resolution limits
(§53) · **single extraction reused by the evaluation** (no re-Vision per hint/reeval unless
evidence changes) · **targeted second pass only for uncertain regions** (§40) · **official problem
extraction reused globally** (I7).

| cache class | applies to |
| --- | --- |
| `SAFE_CACHE` | official problem/source structured extraction (non-personal, I7, §47) |
| `SHORT_LIVED_CACHE` | in-flight derived artifacts for one attempt's processing session |
| `NO_CACHE` | **student answers/evidence — never shared across users** (I6) |

Do **not** double-process every answer by default (§40).

---

## 26. Latency UX (`LATENCY_UX`)

Vision takes time; surface it honestly and **distinct from evaluation**: `UPLOADING` →
`PROCESSING_INPUT` → `NEEDS_CONFIRMATION` → `READY_FOR_EVALUATION` → (`EVALUATING` is MATH-4) ·
`FAILED`. **`PROCESSING_INPUT ≠ EVALUATING`** (§54).

---

## 27. Credit / billing boundary (`CREDIT_BOUNDARY`)

Owner/MATH-2A direction preserved: **Vision extraction is a required internal stage of Math
evaluation — no separate student-visible Vision charge**; **hint confirmation — no charge**; **if
extraction fails before a legitimate evaluation begins, no evaluation credit is consumed** (credit
is reserved/committed at evaluation start, not at upload). The **input acceptance gate (§46) runs
before any credit commitment**. No change to the Credit implementation; boundary handed to Codex/
MATH-4 (§57).

---

## 28. Security (`SECURITY`)

Private student evidence · owner-only access · **no public bucket** · no cross-student access ·
provider reaches data **only through a server-controlled path** · **no `service_role` in the
browser** · **no provider secret in the client** · short-lived authorized object access where needed
· Quality-operator access only through an approved path (reuse HQP/ql gating). No implementation.

---

## 29. Account deletion — Vision-specific cleanup (`ACCOUNT_DELETION`)

Adds to the MATH-2A deletion graph (§41 there) the Vision-specific personal targets: **raw uploaded
evidence** · normalized derivative image (if retained) · **temporary provider upload/reference**
(if any) · extraction data · **confirmation crops (if persisted)** · **provider job ids** (if
personal/linkable) · temporary cache. **Official problem/source extraction is non-personal and
retained.** No ADR-2 change now; this is a checklist for Codex/ADR integration.

---

## 30. Storage / temp-file lifecycle (`STORAGE_LIFECYCLE`)

`LOCAL_PREVIEW` (client, never uploaded) → `TEMP_UPLOAD` (short-lived) → `CANONICAL_PRIVATE_EVIDENCE`
(durable, private) → `DERIVED_TEMP` (reconstructable) → `DELETED`.

**Durable storage only for what reproducibility needs:** original submitted evidence (durable);
frozen extraction data (durable). **Avoid storing** every crop / every intermediate resized image /
every provider raw response — **prefer reconstructing region crops from original evidence +
normalized coordinates** (§42). Provider raw responses: short-lived/debug only, not canonical (§13,
§24).

---

## 31. Quality / human-review evidence (`QUALITY_EVIDENCE`)

Preserve references a future `qlm-read-v1` (MATH-2A §32) reviewer needs: original page · specific
region crop (reconstructable from coordinates) · extracted text/math · student-confirmed correction
· confidence/uncertainty · provider/model provenance · evaluation step bound to region. No Quality
UI here.

---

## 32. VOICE-1 (`VOICE_1_COMPATIBILITY: PASS`)

`normalized_math` is written to be verbalizable into natural Korean later (MATH-1 §27). Vision does
**not** generate voice scripts and **adds no audio persistence** (AUDIO_PERSISTENCE: NONE_BY_DEFAULT,
unchanged).

---

## 33. Typed input (`TYPED_INPUT`)

Typed solutions are **not forced through Vision**. A typed path (text + simple math input; **no
LaTeX editor required**) converges at the same normalized boundary: `typed → normalized extraction
representation → solution_step_candidate → evaluation`. It produces the same
`READY_FOR_MATH_EVALUATION_INPUT_V1` shape (§57) with `extraction_run` provenance = `typed`
(confidence HIGH, no confirmation needed).

---

## 34. PDF (`PDF_SUPPORT`)

Strategy: **detect embedded text + render page image + Vision where necessary.** **Do not trust PDF
text extraction alone for mathematical layout.**

| PDF kind | launch | handling |
| --- | --- | --- |
| native-text | LAUNCH | use embedded text as a hint; **still render + Vision for math/layout** |
| scanned | LAUNCH | render page image → Vision (same as image path) |
| mixed | LAUNCH | per-page detection; text hint + Vision |

Each PDF page converges into the one page abstraction (§43).

---

## 35. Mobile / web parity (`MOBILE_WEB_PARITY`)

**One shared canonical server-side extraction contract**; clients differ only in capture/upload:

| responsibility | APP (Flutter) | WEB (LAB) |
| --- | --- | --- |
| capture/upload, client normalize (orientation/EXIF/resize), pre-submit edit | native | browser |
| preview/order/confirm UI | native | web |
| ingestion, detection, extraction, merge, confidence, gate, versioning, storage, security | **shared server** | **shared server** |

No two incompatible pipelines; client-specific work is only capture/preprocess/preview.

---

## 36. Accessibility (`ACCESSIBILITY`)

Vision output later enables formula text equivalents, screen-reader support, image alternative
descriptions, and VOICE-1 — derivable from `normalized_math` + `visual_reference`. **Accessibility
metadata is never mathematical authority** (I1/I9).

---

## 37. Observability (`OBSERVABILITY`) — privacy-safe

Metrics: extraction success/failure rate · confirmation-required rate · processing latency ·
provider fallback rate · invalid-output rate · failure-category counts. **Never log:** raw student
solution · full extracted answer · student identifiers · image URLs. Only **sanitized error
categories** (§23) and aggregate counts.

---

## 38. Provider evaluation plan (MATH-3B bake-off) (`PROVIDER_BAKEOFF_PLAN`)

All candidates evaluated on the **same controlled synthetic / non-personal dataset** (no real
student data). Dataset must include: Korean handwriting · fractions · integrals · limits ·
derivatives · vectors · matrices · graphs · geometry · multi-page · messy handwriting · low-light/
camera distortion · short-answer format · full-solution format.

**Comparison metrics (measured in MATH-3B, no numbers invented now):** Korean handwriting
recognition · math symbol accuracy · formula structural accuracy · superscript/subscript accuracy ·
fraction/root/integral/limit accuracy · graph/diagram understanding · layout/reading-order accuracy
· subproblem association · multi-page continuity · uncertainty calibration · structured-output
reliability · malformed-output rate · latency · cost · privacy/data-handling suitability · retry/
fallback behavior.

**Per test case define:** `TEST_CASE` (id + input class) · `EXPECTED_EXTRACTION` · `CRITICAL_SYMBOLS`
(must be preserved or flagged) · `EXPECTED_REGION_STRUCTURE` (pages/regions/reading order/subproblem
binding) · `PASS/FAIL CRITERIA` · `MANUAL_REVIEW_FIELDS` (uncertainty calibration, graph
understanding — human-scored). MATH-3B runs the actual controlled evaluation.

---

## 39. Provider-independent adapter (`PROVIDER_INDEPENDENT_ADAPTER: PASS`)

```
VisionProvider.extract(input, recognition_context) → ProviderExtractionResult
ProviderExtractionResult → validation(§24) → normalization → CanonicalExtractionCandidate
```

The **canonical contract exposes no provider-specific field names**. Switching providers must **not**
require rewriting `math_attempts`, `math_extraction_runs`, `math_extraction_regions`, `math-eval-v1`,
or `qlm-read-v1`. Provider/model/version are **provenance metadata only**. Provider raw payload is
INTERNAL (§13,§30).

---

## 40. Primary + targeted fallback (`PRIMARY_TARGETED_FALLBACK`)

```
PRIMARY MULTIMODAL → confidence/validation → (only uncertain/critical regions) TARGETED SECOND PASS
  → MERGE as a NEW extraction candidate/version (§41) → student confirmation when still critical
```

Preferred over blindly sending every page to multiple providers (**do not double-process by
default** — cost + latency). Fallback triggers: critical formula uncertain · primary output
malformed · layout ambiguous · graph/diagram needs a second pass · confidence/validation fails.

---

## 41. Extraction merge authority (`PRIMARY_TARGETED_FALLBACK` / merge)

When primary and fallback disagree, **do not silently pick higher nominal confidence.** Merge
outcomes: `PRIMARY_ACCEPTED` · `FALLBACK_ACCEPTED` · `STUDENT_CONFIRMATION_REQUIRED` ·
`HUMAN_REVIEW_REQUIRED` · `UNRESOLVED`. Disagreement on a **critical** region (§20) →
`STUDENT_CONFIRMATION_REQUIRED`; if the student cannot resolve or it stays contradictory →
`HUMAN_REVIEW_REQUIRED`. The merged representation stays **DERIVED**. Record provenance: which
provider/model produced each candidate · which representation was selected · **why** · whether the
student confirmed it. **Provider confidence is never mathematical correctness** (I9).

---

## 42. Region identity / coordinates (`REGION_IDENTITY`)

A region is traceable to: attempt · artifact/page · bounding coordinates · extraction version.
**Pixel coordinates alone are not permanent identity** (resize/normalize changes pixels).
**Recommendation: normalized coordinates** (fractional 0–1 relative to a recorded page
width/height/orientation), stored with the page's reference dimensions, so the future Quality
Console can highlight the correct **original** region regardless of render scaling.

---

## 43. Page identity (`PAGE_IDENTITY`)

Provider-independent page identity: `artifact_id` · `page_index` · page/evidence-version binding ·
width/height/orientation metadata. **PDF page and image-upload page converge into one page
abstraction.** The same page is **not duplicated** merely because two providers processed it —
providers produce candidates *against* one page identity (§41).

---

## 45. Pre-submit vs post-submit (`lifecycle`)

**PRE-SUBMIT:** add/remove/reorder/retake/replace page; crop/rotate preview. **POST-SUBMIT:** the
submitted evidence version is **immutable**; a new page/photo = new attempt/evidence version or
explicit replacement, never silent mutation. **Extraction correction** = confirmation overlay / new
extraction version (§21). **Re-solve** = new Math attempt (MATH-2A §24). These three are never
conflated.

---

## 46. Input acceptance gate (`gate`) — before any credit/model spend

Before committing a full evaluation credit/model call, check: file supported · page count
acceptable · image readable enough · problem selected · subproblem scope resolvable · no required
page obviously missing · extraction output structurally valid · critical ambiguity resolved or
explicitly routed. Returns: `READY_FOR_EVALUATION` · `NEEDS_CONFIRMATION` · `NEEDS_REUPLOAD` ·
`INPUT_FAILED`. **The gate never judges whether the mathematics is correct** (I9) — that is MATH-4.

---

## 47. Problem-source input (`problem reuse`)

MATH-3 ingests the **student solution**; the evaluator consumes the **canonical problem** (MATH-2A).
Students **do not re-upload the problem** when LegendStudy already holds it: `canonical problem +
student private solution evidence`. A user uploading an unsupported/new problem is a **separate
ingestion workflow**, out of launch scope unless Owner-approved.

---

## 48. SHORT_ANSWER specialization (`SHORT_ANSWER_FAST_PATH: PASS`)

Driven by canonical `response_format` (MATH-2A §2), **not** university-name logic. `SHORT_ANSWER`
fast path: `answer-region extraction → confidence/confirmation → answer-verification input` —
**no full solution-step extraction when no reasoning is required** (brevity-not-an-error, MATH-1 §3)
— while still preserving original evidence. Inputs may be a typed number/expression, a one-line
handwritten answer, or an image with several short subproblem answers (bind each to its subproblem,
§16). `SHORT_REASONING → FULL_SOLUTION → PROOF` use progressively richer extraction.

---

## 49. FULL_SOLUTION / PROOF specialization (`FULL_SOLUTION_MULTI_PAGE: PASS`)

For `FULL_SOLUTION`/`PROOF`, extraction preserves: reading order · reasoning text · formula sequence
· logical grouping · **cross-page continuation** · case split · conclusion — **not reduced to a bag
of formulas**. For `PROOF` especially, **Korean connective text carries mathematical logic and must
not be discarded** (it feeds `justification_completeness`, a blocking dimension, MATH-2A §15).

---

## 50. Mixed problem set (`MIXED`)

`MIXED` is **derived, not persisted** (MATH-2A §2). One page may hold `(1) SHORT_ANSWER / (2)
SHORT_REASONING / (3) FULL_SOLUTION`; regions bind to **different subproblems** and therefore
different extraction/evaluation depth. Do **not** process the whole page at the most demanding child
format if targeted extraction avoids it — but **correctness/reliability outranks micro-optimization**.

---

## 51. Typed + image hybrid (`one attempt, ordered artifacts`)

A student may upload handwritten pages **and** type a clarification/final answer. These become
**multiple ordered evidence artifacts under one attempt** (not two unrelated attempts). Modality +
source provenance preserved per artifact; the evaluator sees **one attempt composed of ordered
evidence** (§57).

---

## 52. Duplicate / accidental upload (`duplicates`)

Signals: file hash · perceptual similarity · same page index · student confirmation. **Do not
auto-delete evidence on fuzzy similarity.** Pre-submit: **warn/allow removal**. Post-submit:
preserve immutable evidence. **Hash assists exact-duplicate detection but is not identity authority**
(§42).

---

## 53. File limits (`CONFIG_REQUIRED_BEFORE_IMPLEMENTATION`)

Max pages · max file size · supported image formats · supported PDF size are **not final numbers
here** — classified `CONFIG_REQUIRED_BEFORE_IMPLEMENTATION`, grounded in real platform/provider
limits during MATH-3B. Where limits live: client validation (fast feedback) + **server validation
(authoritative)** + provider adapter (provider-specific caps). Server is authority.

---

## 54. APP / web UX state machine (`shared`)

`DRAFT → UPLOADING → PROCESSING_INPUT → NEEDS_CONFIRMATION → READY_FOR_EVALUATION → EVALUATING →
EVALUATED`, with `INPUT_FAILED` and `EVALUATION_FAILED` as distinct terminal/recoverable states.
Invariants: **`PROCESSING_INPUT ≠ EVALUATING`**; **`INPUT_FAILED ≠ EVALUATION_FAILED`**;
**`NEEDS_CONFIRMATION` is recoverable without creating a new paid evaluation** (§27). Shared by
Flutter + web (§35).

---

## 55. What the student sees (minimum launch states) (`UX`)

A. select problem/subproblem · B. upload/capture solution · C. page preview/order · D. processing ·
E. **selective** extraction confirmation (critical only) · F. evaluation ready / start · G.
evaluation result. `SHORT_ANSWER` minimizes friction (§48); `FULL_SOLUTION` supports multi-page
evidence (§49). No UI implemented here.

---

## 56. Quality gate for MATH-3B (`acceptance`)

MATH-3B is **not** "ready" just because text was extracted. Qualitative gates: critical math symbols
preserved or flagged · low-confidence critical regions surfaced · Korean explanatory text usable ·
page/reading order preserved · region coordinates map back to original evidence · subproblem binding
correct or flagged · malformed provider output rejected · student-confirmation correction
reproducible · original evidence authoritative · no cross-student leakage/cache · provider failure
recoverable · SHORT_ANSWER fast path works · FULL_SOLUTION multi-page path works. No accuracy
percentages invented.

---

## 57. MATH-4 interface handoff — `READY_FOR_MATH_EVALUATION_INPUT_V1` (`READY_FOR_MATH_EVALUATION_INPUT_V1: PASS`)

MATH-4 must **not** know: provider SDK · provider JSON · upload implementation · preprocessing
implementation. MATH-4 **receives** (conceptual interface, references not binaries, I8):

```
READY_FOR_MATH_EVALUATION_INPUT_V1
  attempt_id
  problem_ref { problem_id, problem_version, subproblem_ref[] }
  response_format (per subproblem; MIXED derived)
  extraction_version (FROZEN)
  pages[]            { page_id, page_index, dims/orientation }     # ordered
  regions[]          { region_id, region_type, normalized_bbox, reading_order,
                       raw_text, normalized_math, formula_representation,
                       visual_reference, confidence, uncertainty_reason,
                       subproblem_binding (confirmed|flagged) }
  solution_step_candidates[]   { ids, region refs, order }         # provisional (§15)
  confirmation_provenance[]    { region_id, provider_candidate, student_confirmed, timestamp }
  original_evidence_refs[]      # authorized internal refs, NOT public URLs
  extraction_provenance        { provider/model/version per candidate, merge decision §41 }
  input_gate_result = READY_FOR_EVALUATION
```

MATH-4 can request the **original evidence** for uncertain visual reasoning through an **authorized
internal reference**, never a public URL (§28,§31). This interface is provider-independent (§39) and
stable across provider switches.

---

## 58. MATH-2B reconciliation checklist (`MATH_2B_RECONCILIATION_READY: YES`)

If Codex MATH-2B renames/merges physical tables, MATH-3 depends on the following **semantics**, not
physical names:

| MATH-3 dependency | depends on *semantics* of | resilient to rename? |
| --- | --- | --- |
| evidence artifact (page, storage ref, hash, retention) | `math_attempt_artifacts` | **yes** (concept: private per-attempt evidence) |
| extraction run + version | `math_extraction_runs` | **yes** (concept: versioned extraction identity) |
| region (bbox, text, math, confidence, coordinates) | `math_extraction_regions` | **yes** (concept: per-region derived extraction) |
| attempt identity + subproblem coverage | `math_attempts` | yes |
| frozen version pinning | version columns | yes |
| original-evidence authorized reference | object-storage ref semantics | yes |

**Do not block architecture on table naming.** After MATH-2B, Owner/ChatGPT reconcile physical
corrections before MATH-3B. No MATH-3 concept depends on a specific physical table name — only on the
approved entity semantics.

---

## 59. Owner decisions (`OWNER_DECISIONS_REQUIRED: 0`)

Already decided and **not reopened**: student raw evidence `FINITE + ERASABLE` (duration TBD before
Production) · official raw artifacts `reference + hash by default` · Vision extraction = no separate
student-visible charge · VOICE audio `NONE_BY_DEFAULT`. **No genuinely new product/privacy decision
is required by MATH-3A** → `OWNER_DECISIONS_REQUIRED: 0`. (File limits §53 and confidence-band
thresholds §18 are MATH-3B **config/calibration**, not Owner product decisions.)

---

## 60–62. Validation (self-check)

- Only this architecture doc added (+ a one-line MATH-1/2A successor pointer); no other files.
- No DB/migration/function/policy SQL, no provider code, **no provider call**, no API key/secret/
  local path, **no real student image/data**.
- MATH-1 invariants preserved (§2); MATH-2A persistence **semantics** preserved (designed to
  concept, not SQL, §58).
- Original evidence authoritative (I1); extraction uncertainty never becomes student error (I3/I4);
  `SHORT_ANSWER` does not require full-solution extraction (§48); student correction does not mutate
  original evidence (§21/§44); post-submit evidence immutable/versioned (§22/§45); **no separate
  Vision credit charge** (§27); no public student artifact (§28); **no permanent VOICE audio** (§32).
- `ql-read-v1` / `hq-read-v1` untouched; Math Quality remains additive `qlm-read-v1` (MATH-2A §32).

---

## 63 / 61. Final report

```
MATH_3A_ARCHITECTURE:        COMPLETE
REPOSITORY:                  LC3808/legendstudy-lab
BRANCH:                      claude/math-essay-architecture-v1
BASE_COMMIT:                 1bd275b059e6f42a1ccc8181e2c211d4dd4a5517
FINAL_COMMIT:                <filled at closeout>
INPUT_TYPES:                 camera/image/pdf/tablet(as image|pdf)/typed all LAUNCH; native ink +
                             LaTeX editor NOT_REQUIRED (§3)
CAMERA_UPLOAD_UX:            minimal multi-page capture + preview/retake/rotate/crop/reorder/delete
                             (pre-submit); nudges not auto-fixes; not a scanner app (§4)
MULTI_PAGE:                  attempt→page→region→step-candidate; pre-submit edit, post-submit frozen
                             (§5,§45)
PREPROCESSING:               client orientation/EXIF/resize; non-destructive; original retained (§6)
PRIVACY_INGESTION:           client EXIF strip + warning + crop guidance; private storage; finite/
                             erasable (§7)
MATH_NOTATION_COVERAGE:      core arithmetic→integrals/vectors/sets MUST; matrices/dense BEST_EFFORT;
                             rare POST_LAUNCH (§8)
GRAPH_DIAGRAM_TABLE:         VISUAL/GRAPH/DIAGRAM/TABLE regions w/ bbox+desc+step link+evidence ref;
                             eval may inspect original (§9)
VISION_ARCHITECTURE:         Option D — multimodal primary + targeted OCR/math fallback (§10)
PROVIDER_STRATEGY:           category matrix (multimodal/math-OCR/doc-OCR/HWR); PRIMARY+FALLBACK; no
                             selection now (§11)
PROVIDER_INDEPENDENT_ADAPTER: PASS (§39)
PRIMARY_TARGETED_FALLBACK:   fallback only on uncertain/critical; merge as new version; no blind
                             double-processing (§40,§41)
EXTRACTION_PIPELINE:         11 staged steps w/ input/output/failure/retry/mutability/versioning
                             (§12)
STRUCTURED_EXTRACTION_CONTRACT: refined fields; 3 layers (provider raw / normalized / confirmed)
                             distinct (§13)
FORMULA_REPRESENTATION:      hybrid normalized-LaTeX + structural hints + raw_text + visual_ref; no
                             CAS; image authoritative (§14)
SOLUTION_STEP_SEGMENTATION:  Vision proposes candidates; MATH-4 finalizes identity (hybrid) (§15)
SUBPROBLEM_BINDING:          map messy markers → canonical subproblem; never invent; flag if
                             uncertain (§16)
RECOGNITION_CONTEXT:         problem text/labels/symbols/format allowed; official answer/full
                             solution WITHHELD (anti-bias) (§17)
CONFIDENCE_MODEL:            page/region/formula/symbol/step bands HIGH..UNREADABLE + 5 uncertainty
                             reasons; calibrate in 3B (§18)
SELECTIVE_CONFIRMATION:      low-confidence only; original crop; no new charge; waits only on
                             critical (§19)
CRITICAL_AMBIGUITY:          criticality = region role × response_format; critical blocks, else
                             non-blocking (§20)
STUDENT_CORRECTION_PROVENANCE: EXTRACTION_CONFIRMATION ≠ RE_SOLVE; new confirmed extraction version;
                             original image untouched (§21,§44)
RE_EXTRACTION_VERSIONING:    post-submit re-extraction = new version; no silent rebind of old eval
                             (§22)
FAILURE_MODEL:               15 input/provider failure categories; none a student math error; retry/
                             fallback (§23)
PROVIDER_OUTPUT_VALIDATION:  schema/bounds/ownership/enum/unknown-field/caps; fail closed pre-eval
                             (§24)
COST_CONTROL:                reuse single extraction; targeted fallback; SAFE/SHORT_LIVED/NO_CACHE;
                             official reusable, student never (§25)
LATENCY_UX:                  UPLOADING/PROCESSING_INPUT/NEEDS_CONFIRMATION/READY/FAILED; input ≠
                             evaluation (§26)
CREDIT_BOUNDARY:             no separate Vision charge; gate before credit commit; failed extraction
                             consumes no eval credit (§27)
SECURITY:                    private/owner-only; no public bucket; server-controlled provider path;
                             no service_role/secret in client (§28)
ACCOUNT_DELETION:            Vision-specific cleanup list (raw evidence, provider refs/job ids,
                             crops, cache); official non-personal (§29)
STORAGE_LIFECYCLE:           LOCAL_PREVIEW→TEMP_UPLOAD→CANONICAL_PRIVATE_EVIDENCE→DERIVED_TEMP→
                             DELETED; reconstruct crops (§30)
QUALITY_EVIDENCE:            references preserved for future qlm-read-v1 reviewer (§31)
VOICE_1_COMPATIBILITY:       PASS (normalized_math verbalizable; no audio persistence) (§32)
TYPED_INPUT:                 typed path converges at normalized boundary; no LaTeX editor (§33)
PDF_SUPPORT:                 native-text/scanned/mixed all LAUNCH; text hint + render + Vision; no
                             text-only trust (§34)
MOBILE_WEB_PARITY:           one shared server contract; clients differ only in capture/preview
                             (§35)
OBSERVABILITY:               sanitized metrics only; never log raw answer/ids/urls (§37)
PROVIDER_BAKEOFF_PLAN:       controlled synthetic dataset + metric list + per-case TEST_CASE/
                             EXPECTED/CRITICAL_SYMBOLS/PASS-FAIL/MANUAL_REVIEW (§38)
SHORT_ANSWER_FAST_PATH:      PASS (§48)
FULL_SOLUTION_MULTI_PAGE:    PASS (§49)
READY_FOR_MATH_EVALUATION_INPUT_V1: PASS (§57)
MATH_2B_RECONCILIATION_READY: YES (§58)
OWNER_DECISIONS_REQUIRED:    0 (§59)
READY_FOR_MATH_3B:           YES
READY_FOR_MATH_4_CONTRACT:   YES
READY_FOR_PRODUCTION:        NO
DB_CHANGED:                  NO    MIGRATION_CREATED: NO    PROVIDER_CALLS: 0
PRODUCTION_CHANGED:          NO    PRODUCTION_AI: OFF
FILES_CHANGED:               docs/architecture/MATH-3_VISION_INPUT_ARCHITECTURE.md (new);
                             MATH-1 + MATH-2A one-line successor pointers
COMMIT:                      <filled at closeout>
PUSH:                        <filled at closeout>
LOCAL_REMOTE_SYNC:           <filled at closeout>
UNIFIED_WIKI_CHANGED:        NO
NEXT:                        OWNER/CHATGPT REVIEW → MATH-2B RECONCILIATION → MATH-3B PROVIDER
                             BAKE-OFF / INPUT IMPLEMENTATION → MATH-4 EVALUATION ENGINE
```
