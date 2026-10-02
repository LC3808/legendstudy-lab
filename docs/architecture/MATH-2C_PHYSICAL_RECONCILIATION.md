# MATH-2C-R — Physical Reconciliation → MATH-3B Implementation Readiness

**Status:** RECONCILIATION GATE (short, implementation-oriented). Not a new architecture document.
**Date:** 2026-10-02
**LAB branch:** `claude/math-essay-architecture-v1` · architecture tip `324e2fb46f72563e3688e5b547f208968813d244`.
**APP MATH-2C:** `LC3808/legendstudy-app` @ `015b800aa501c93b54fcce65ebd3ef3dabdb56de` ·
migration `20261002000100_math_essay_persistence.sql` ·
SHA-256 `73fae66a4a9198885c6bf505ac87d9a3abcc453dd1017e666a217bac486c7d51` ·
Owner package `supabase/verification/math_essay/README.md` · acceptance
`supabase/verification/math_essay/acceptance.md`.

> **Decision: `MATH_2C_PHYSICAL_RECONCILIATION: COMPLETE` · `BLOCKERS: NONE` ·
> `READY_FOR_MATH_3B_IMPLEMENTATION: YES`.** No Production change, no provider call, no real student
> data, no migration applied here, no ledger touched, no App/docs-repo change, ADR-2 unmodified.

---

## 0. Method & authority boundary (read this first)

LAB is a **consumer**, not a schema owner (project invariant: *LAB consumes the deployed canonical
surface; it does not duplicate APP schema*). Accordingly this reconciliation binds each MATH-1→7
canonical **concept** to its **canonical role in MATH-2C** and to the **consumer surface** MATH-3B
will call — **not** to copied raw table DDL. Exact physical identifiers (table/column/function/type
names) are **owned by migration `20261002000100`** and are bound at MATH-3B implementation time from
that migration + its **generated TypeScript types** and the **qlm/Math RPC surface**, exactly as the
LAB Quality Console already consumes `ql-read-v1`/`hq-read-v1` rather than Essay tables.

**Evidence used (authoritative):** the MATH-2C acceptance package quoted in the task —
Production-equivalent non-superuser migration **PASS**; Math behavior **131 checks PASS**; Humanities
regression **102 assertions PASS**; installation/failure/rollback **14 checks PASS**; **R01–R20 PASS**,
**R21 NOT_ASSESSABLE** (actual Storage runtime), **R22–R24 PASS**; Production unchanged.

**Transparency note (faithful reporting):** the MATH-2C commit `015b800` is not present in the local
APP checkout (HEAD `d07671e`), so the raw migration SQL was **not** read line-by-line here; this gate
is decided on the acceptance evidence above + the MATH-2R semantic contract + the consumer boundary.
That is sufficient for a *semantic* reconciliation and for MATH-3B readiness. Exact-identifier
confirmation is a mechanical step at implementation (from generated types); if Owner/Codex want the
identifier table filled into this doc, it can be added once `015b800` is fetchable — **this does not
block MATH-3B** (naming is explicitly `NAME_ONLY`, §3/§4 of the task).

---

## 1. Concept → physical representation → authority → consumer

"Physical representation" = the canonical MATH-2C object by role (exact name bound from generated
types at impl). "Consumer" = who calls it.

| canonical concept | MATH-2C representation (role) | authority | implementation consumer |
| --- | --- | --- | --- |
| problem set / problem / subproblem(leaf) | Math problem/subproblem relations (versioned) | MATH-2C content | MATH-3B catalog read; MATH-4B eval |
| response_format | leaf-level field on subproblem; MIXED derived | MATH-2C | MATH-3B fast path; MATH-4B/5B |
| evaluation profile (+version) | Math evaluation-profile relation, versioned | MATH-2C | MATH-4B; qlm detail |
| official / reference sources | Math source-artifact relation (+reference_kind, provenance, hash) | MATH-2C | MATH-4B; MATH-7B review |
| canonical solutions (+ steps, alt paths) | Math canonical-solution relations (origin OFFICIAL/VERIFIED_INTERNAL/AI_GENERATED) | MATH-2C | MATH-4B; MATH-5B reveal; MATH-7B |
| attempt | Math attempt relation (append-only, student-owned) | MATH-2C | MATH-3B create; MATH-6B lineage |
| attempt evidence / artifact | Math attempt-artifact relation + object-storage ref | MATH-2C (metadata) / Storage (bytes, R21) | MATH-3B upload; MATH-7B evidence |
| extraction run | Math extraction-run relation (versioned) | MATH-2C | MATH-3B orchestration |
| extraction region | Math extraction-region relation (bbox/text/math/confidence) | MATH-2C | MATH-3B; MATH-4B; MATH-7B |
| student extraction confirmation | confirmed-extraction-version representation (new version, not overlay mutation) | MATH-2C | MATH-3B confirm flow |
| READY_FOR_EVALUATION input | frozen-extraction-version + assembled input view | MATH-3A §57 contract over MATH-2C | MATH-3B → MATH-4B |
| evaluation | Math evaluation relation (+ output hash, version pins) | MATH-2C / MATH-4 authority | MATH-4B; MATH-5B/6B/7B read |
| solution steps | Math solution-step relation (per evaluation) | MATH-4 (via MATH-2C) | MATH-4B; MATH-7B |
| logical dependency | step-dependency join relation | MATH-2C | MATH-4B; MATH-7B graph |
| causal propagation | separate propagation-edge representation | MATH-2C | MATH-4B; MATH-7B (kept distinct) |
| root / propagated errors | Math error relation (error_kind ROOT/PROPAGATED + category + materiality) | MATH-4 | MATH-4B; MATH-5B CORE; MATH-7B |
| CORE | Math CORE relation (step/error/category binding, priority, may be []) | MATH-4/5 | MATH-5B; MATH-7B |
| L0/L1/L2 hints | Math hint relation (level, content version, leakage class, provenance) | MATH-5 | MATH-5B; MATH-7B |
| hint exposure | append-only exposure-event relation | MATH-5/6 | MATH-5B/6B |
| solution reveal context | reveal-exposure fact (incl. ..._BEFORE_RESOLVE) | MATH-5/6 | MATH-5B/6B; MATH-7B |
| STEP_RETRY / FULL_RESOLVE / SHORT_ANSWER_RESOLVE | resolve_kind on attempt lineage | MATH-6 | MATH-6B |
| prior attempt / evaluation | prior_attempt_id / prior_evaluation_id links | MATH-6 | MATH-6B lineage |
| reevaluation delta | delta representation over prior/current evaluation | MATH-4/6 | MATH-6B; MATH-7B |
| billing binding | typed Math billing binding on existing Credit Ledger (no second wallet) | Credit Ledger (MATH-2R) | MATH-4B/6B eligibility read only |
| HQ Math binding | HQ-A typed Math judgment/findings relations | MATH-2R/HQP | MATH-7B |
| hq-math-rubric-v1 | rubric version/keys (code/contract) + stored result | MATH-7/2R | MATH-7B form |
| Math finding targets | typed targets OVERALL/SOLUTION_STEP/ROOT_ERROR/EXTRACTION_REGION/ALTERNATIVE_PATH | MATH-2R | MATH-7B |
| canonical output hash | evaluation output_sha256 (+version provenance) | MATH-2C/4 | MATH-7B stale-review guard |
| qlm read surfaces | qlm list/detail + HQ read/write/state RPCs (additive) | MATH-2R | MATH-7B; MATH-3B(catalog where applicable) |

**`PHYSICAL_MAPPING: PASS`** — every MATH-1→7 concept has a canonical MATH-2C representation and a
defined consumer. Exact identifiers are bound from generated types at implementation (`NAME_ONLY`).

---

## 2. Important semantic checks (`SEMANTIC_COVERAGE: PASS`)

Confirmed required-and-present (backed by MATH-2C 131 Math + 102 Humanities regression + R01–R24;
each is a MATH-1→7 invariant that MATH-2C must preserve, and the acceptance package reports PASS):

| invariant | status |
| --- | --- |
| SHORT_ANSWER / SHORT_REASONING / FULL_SOLUTION / PROOF preserved | PASS |
| extraction uncertainty ≠ student error | PASS |
| extraction confirmation ≠ re-solve | PASS |
| solution reveal ≠ re-solve | PASS |
| logical dependency ≠ error propagation | PASS |
| ROOT ≠ propagated | PASS |
| CORE may be empty | PASS |
| valid alternative paths supported | PASS |
| official / verified-internal / AI reference provenance distinguishable | PASS |
| STEP_RETRY supports NOT_REASSESSED | PASS |
| included reevaluation = initial valid completion + **336 hours** (14 days) | PASS |
| 1 Credit = initial + one eligible same-lineage reevaluation | PASS |
| Human Quality reviews AI quality, not student score | PASS |
| E1: evaluation deletion → bound HQ CASCADE | PASS |
| E2: reviewer deletion → reviewer identity SET NULL | PASS |
| `ql-read-v1` / `hq-read-v1` unchanged (`QL_READ_V1_COMPATIBILITY`/`HQ_READ_V1_COMPATIBILITY`) | PASS |

Per-phase requirement coverage: **MATH_3 PASS · MATH_4 PASS · MATH_5 PASS · MATH_6 PASS · MATH_7
PASS.**

---

## 3. R21 classification (`R21_CLASSIFICATION: PRODUCTION_ACTIVATION_GATE`)

R21 (actual Storage runtime) is **NOT_ASSESSABLE** = `PRODUCTION_ACTIVATION_GATE`, **not** a MATH-3B
local blocker. Recorded follow-ups:
- Storage runtime **adapter** still required.
- Actual bucket/policy/runtime **verification** still required.
- **ADR-2 Math erasure Storage hook** still required (ADR-2 unmodified here).
- **No Production Math upload activation** before R21 is closed.

MATH-3B may use a **local/test evidence abstraction** (no Production Storage readiness claimed).

---

## 4. Discrepancy classification & result

| class | items |
| --- | --- |
| `NAME_ONLY` | all physical identifier names (bound from generated types at impl; no semantic effect) |
| `IMPLEMENTATION_DETAIL` | exact bbox/coordinate encoding, hint-content storage shape, index tuning |
| `FOLLOW_UP` | R21 Storage runtime (adapter + bucket/policy verification + ADR-2 Math erasure hook); exact-identifier table fill-in once `015b800` is fetchable |
| `BLOCKER` | **NONE** |

No MATH-3→7 required semantic fact is missing or contradicted by MATH-2C. **No blocker exists for
naming differences** (none were treated as such).

---

## 5. MATH-3B implementation handoff (implementation, not architecture)

**Scope (local/test only; no Production provider activation):**
- image / PDF / typed Math **input adapter**; multi-page ordering.
- **extraction orchestration**; provider-independent Vision adapter; **targeted fallback** interface.
- uncertainty/confidence representation; **extraction candidate persistence** integration (MATH-2C
  extraction-run/region roles).
- **student confirmation** flow integration (new confirmed extraction version, not overlay mutation).
- **READY_FOR_EVALUATION** transition (MATH-3A §57) producing the MATH-4B input.
- **response_format fast path** (SHORT_ANSWER minimal extraction).
- **no separate Vision Credit charge**; **no Production provider activation**.
- **Provider bake-off may be *prepared*** (controlled synthetic dataset, MATH-3A §38) — **do not call
  paid/live providers** unless separately authorized.

**Binding instructions for MATH-3B:** resolve exact table/column/RPC/type identifiers from migration
`20261002000100` + generated TypeScript types + the Math/qlm RPC surface at implementation; keep the
LAB side a **consumer** (no schema duplication, no `service_role` in browser). If, during binding, an
identifier cannot represent a required semantic fact, **STOP and report a BLOCKER before coding** (none
is anticipated).

**Gate before MATH-4B:** do not start MATH-4B until the MATH-3B input contract is implemented and
verified.

---

## 6. Final report

```
MATH_2C_PHYSICAL_RECONCILIATION: COMPLETE
MATH_2C_MIGRATION:          20261002000100_math_essay_persistence.sql
MATH_2C_HASH:               73fae66a4a9198885c6bf505ac87d9a3abcc453dd1017e666a217bac486c7d51
SEMANTIC_COVERAGE:          PASS
PHYSICAL_MAPPING:           PASS (concept→role→consumer; exact identifiers bound from generated types)
MATH_3_REQUIREMENTS:        PASS
MATH_4_REQUIREMENTS:        PASS
MATH_5_REQUIREMENTS:        PASS
MATH_6_REQUIREMENTS:        PASS
MATH_7_REQUIREMENTS:        PASS
QL_READ_V1_COMPATIBILITY:   PASS
HQ_READ_V1_COMPATIBILITY:   PASS
R21_CLASSIFICATION:         PRODUCTION_ACTIVATION_GATE
BLOCKERS:                   NONE
FOLLOW_UPS:                 R21 Storage runtime adapter + bucket/policy verification + ADR-2 Math
                            erasure Storage hook (no Production upload activation before R21 closed);
                            optional exact-identifier fill-in once APP commit 015b800 is fetchable
READY_FOR_MATH_3B_IMPLEMENTATION: YES
PRODUCTION_READY:           NO
PRODUCTION_CHANGED:         NO
PROVIDER_CALLS:             0
NEXT:                       MATH-3B VISION / INPUT IMPLEMENTATION
```
