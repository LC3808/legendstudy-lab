# MATH-RELEASE-CLOSEOUT-1 — 수리논술 Release Closeout (LAB consumer)

**Status:** LAB consumer closeout — `IMPLEMENTED / LOCAL_VERIFIED`. **No Production mutation, no live
provider, no real student data, no APP/Payment change.**
**Date:** 2026-10-04
**Repository:** `LC3808/legendstudy-lab` · branch `claude/math-vision-input-3b`.
**Authority:** LAB MATH-3B…7B consumer over deployed APP MATH-2C/2D/2E RPC surface (Codex authority).
This closeout does not re-design Math and does not certify APP MATH-2x.

---

## 1. What this closeout did (LAB, in-repo)

- Added a **cross-module end-user journey test** (`src/lib/math-release/journey.test.ts`, 5 cases) — the
  only test that walks input → extraction → student confirmation → **provider evaluation path** →
  learning (hint / solution / re-solve / included reevaluation) → history across all four module
  boundaries, and asserts the release-critical invariants in one flow.
- Verified **release copy**: no internal term (CORE, provenance, lineage, qlm_quality, output hash,
  provider, runtime, HQ, MATH-\*) appears in any student-facing visible text; internal terms live only in
  code identifiers, comments, CSS classes, `data-*`, and operator-only surfaces.
- Verified **boundary separation**: no student component imports the worker-only evaluation client or the
  operator Quality Console; browser carries no privileged key (boundary audit PASS).
- Full gate PASS: **405 tests / 40 files**, typecheck, lint, boundary audit, static-export build.

## 2. Gate status — honest LAB-vs-external classification

| Gate | LAB consumer side | Backend / external (APP + Owner) |
| --- | --- | --- |
| **R21 private Storage runtime** | Consumer contract verified: upload represented as `upload_available:false`, never a fake success/URL; server-owned bucket/object_key never a browser DTO; metadata↔artifact ownership modeled in mock (`math-private`). | **EXTERNAL_GATE** — real private bucket, authenticated ownership, signed-URL lifecycle, byte cleanup, orphan GC deploy. Not in LAB; `NOT_ASSESSABLE` from here. |
| **ADR-2 Math erasure** | Consumer behavior verified: a student in `ERASING` is denied new writes on input / evaluation / learning (J5); evidence refs can be `unavailable:erased`. | **EXTERNAL_GATE** — server CASCADE of attempts/evaluations/artifacts/Storage bytes/learning/quality; ADR-2 lifecycle deploy. In APP MATH-2E + ADR-2D. |
| **gateway / worker runtime** | Worker-only `math_evaluation` surface isolated from the browser; auth/role/lease/idempotency/stale/conflict/lifecycle/malformed-output fail-closed all tested (E30–E35, J1–J2). | **EXTERNAL_GATE** — real worker credential/JWT, gateway deploy, trusted role. |
| **model / provider path** | Verified assembled: `MathEvaluatorAdapter` (provider) → structured output → `validateMathEval` (fail-closed) → finalize → learning state (J1 valid, J2 malformed FAILED). Deterministic adapter stands in for a live provider. | **OWNER/EXTERNAL_GATE** — provider selection + real secret + approved cost; no live call made. |
| **controlled real-model bake-off** | Harness ready (MATH-3C-1: manifest/runner/scoring/report, synthetic cases). | **NOT_RUN** — needs approved provider-call test env + Owner secret + cost approval. |
| **end-user Math flow E2E** | Verified at the consumer-library level (J1–J4) with deterministic mocks. | **GATE** — no student-facing `/math` route wired yet; wiring depends on backend activation + product decision. |
| **Credit / Payment** | Verified consumer invariant: included reevaluation returns `commercial_context:INCLUDED_REEVALUATION`, `additional_credit:0` (J3); no separate Math wallet; Payment code untouched. | Payment authority = Payment team (`PAYMENT_PRODUCTION_IMPLEMENTATION: COMPLETE`). |

## 3. Production activation package (what must happen outside LAB)

1. Apply Math migrations `20261002000100` (persistence) + `20261002000200` (runtime) + `20261002000300`
   (learning) — Owner-reviewed, `READY_NOT_APPLIED`.
2. Deploy private Storage bucket + R21 ownership/byte-cleanup; wire ADR-2 Math erasure CASCADE.
3. Deploy evaluation worker/gateway with trusted role + JWT; provision provider secret (Owner).
4. Select provider via controlled real-model bake-off (approved test env).
5. Wire the student-facing 수리논술 route in LAB (consumes the activated RPC surface) + smoke test.
6. Postflight + rollback / kill-switch; first legitimate E2E; then real-student pilot (separately authorized).

## 4. Safety

Production writes 0; migrations 0; provider/Vision/AI calls 0; real student data 0; APP unchanged;
Payment code unchanged. Humanities `ql-read-v1` / `hq-read-v1` and `src/lib/quality/*` untouched.
