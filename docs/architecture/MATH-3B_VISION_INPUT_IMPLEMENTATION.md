# MATH-3B — Vision / Input Pipeline Implementation (status)

**Status:** IMPLEMENTATION (local/test). No live provider call, no Production Storage, no DB
migration, no Production AI, no real student data.
**Date:** 2026-10-02
**Repository:** `LC3808/legendstudy-lab`.
**Authorities:** [MATH-3A](MATH-3_VISION_INPUT_ARCHITECTURE.md),
[MATH-2C-R](MATH-2C_PHYSICAL_RECONCILIATION.md),
[MATH-2A](MATH-2_CANONICAL_DATA_PERSISTENCE_CONTRACT.md),
[MATH-4A](MATH-4_EVALUATION_ENGINE_CONTRACT.md) + MATH-2R/MATH-2C semantics.
MATH-2C migration `20261002000100_math_essay_persistence.sql`
(`73fae66a4a9198885c6bf505ac87d9a3abcc453dd1017e666a217bac486c7d51`).

## What was implemented (`src/lib/math-input/`, client-safe; no `server-only`)

| module | role |
| --- | --- |
| `types.ts` | provider-independent canonical input/extraction/readiness types; `ReadyForEvaluationInput` (`math-input-ready-v1`, MATH-3A §57); `VISION_CREDIT_IMPACT = "NONE"` |
| `admission.ts` | bounded admission (type/size/page-count/typed); limits = IMPLEMENTATION_CALIBRATION |
| `confidence.ts` | bands + criticality = region role × response_format (not confidence alone) |
| `provider-validation.ts` | fail-closed validation of untrusted provider output → `INVALID_OUTPUT` |
| `provider` (in `types.ts`) + `mock-adapter.ts` | `VisionProviderAdapter` interface + deterministic mock/fallback adapters (no network, no secrets) |
| `orchestration.ts` | pipeline: admission → typed + primary extraction → targeted fallback (uncertain+critical only) → merge → input-gate readiness |
| `confirmation.ts` | student confirmation → new confirmed extraction version (append-only; not a re-solve) |
| `fixtures.ts` | synthetic builders (no real data) |
| `src/components/math-input/math-input-flow.tsx` | minimal mobile-first, accessible confirmation UI (client component) |

## Contract fidelity (verified by tests)

- **Provider-independent:** nothing outside the adapter depends on a provider-specific payload; a
  provider switch requires no change to the canonical types (MATH-3A §39). **No live provider call**
  (`PROVIDER_CALLS: 0`); only deterministic mock adapters.
- **Original evidence authoritative / extraction derived**; no raw binary in any type — only
  authorized evidence references (never public URLs).
- **response_format aware** (SHORT_ANSWER/SHORT_REASONING/FULL_SOLUTION/PROOF); **SHORT_ANSWER fast
  path** does not synthesize steps (brevity ≠ error).
- **Uncertainty ≠ student error:** low-confidence critical regions route to confirmation/ re-upload,
  never silent error; criticality = role × response_format.
- **Targeted fallback** runs only on uncertain+critical regions; **merge never picks higher
  confidence** on a critical disagreement — it requires confirmation (or human review if unreadable).
- **Extraction confirmation ≠ re-solve:** produces a new confirmed version, retains the provider
  candidate as provenance, never rewrites the original image, consumes no Credit.
- **READY_FOR_EVALUATION** only when required evidence exists and all critical ambiguity is resolved;
  **Vision has no separate Credit charge** and an input failure yields no READY input (no evaluation
  consumption).
- Multi-page order preserved (not flattened); PDF page ordering normalized; deterministic/idempotent.

## Synthetic acceptance (V01–V30)

All V01–V30 cases pass as `src/lib/math-input/pipeline.test.ts` (plus `admission.test.ts`,
`confidence.test.ts`, and `src/components/math-input/math-input-flow.test.tsx`).

## Physical binding (MATH-2C) — `FOLLOW_UP`

LAB remains a **consumer**: exact APP identifiers (tables/RPCs/types) are bound at the evaluation/
persistence integration from the deployed canonical surface + generated types (MATH-2C-R), not
duplicated here. The in-repo pipeline is pure/deterministic and persistence-agnostic; wiring it to the
MATH-2C surface (attempt/artifact/extraction-run/region persistence, qlm/HQ, billing binding) is the
integration step at MATH-4B/activation. If a generated-type identifier cannot represent a required
semantic fact, stop and report a blocker (none anticipated).

## R21 / Storage — `PRODUCTION_ACTIVATION_GATE`

Evidence is a local/test abstraction (`evidenceRef`, `evidenceAvailable()` resolver). No Production
bucket, no destructive Production deletion, no public permanent URL. A future Storage adapter can
provide register/read/list/delete/verify-absence without changing the Vision contract.

## Out of scope (not implemented, per MATH-3B boundary)

MATH-4 evaluator · CORE · hints · re-solve · Human Quality Console · TTS · real provider calls ·
Production Storage · Production DB migration · Production AI.

## Next

OWNER/CHATGPT REVIEW → **MATH-3C** provider bake-off (controlled synthetic dataset; MATH-3A §38) →
**MATH-4B** evaluation engine implementation (consumes `ReadyForEvaluationInput`).
