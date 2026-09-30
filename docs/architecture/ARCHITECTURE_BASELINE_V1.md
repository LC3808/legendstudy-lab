# LegendStudy Architecture Baseline v1

**Owner synthesis after Cross Review A (Codex, bottom-up live audit) + Cross Review B (Claude, top-down challenge).**

**Document class:** `CURRENT ARCHITECTURE DECISION BASELINE`. This is **not** a feature specification and **not** schema-implementation authorization. It freezes what we now know so future foundation work builds on a shared, versioned decision record.
**Status:** `FROZEN_V1` · **Date:** 2026-09-30 · **Branch:** `claude/intelligence-school-architecture`
**Supersedes nothing by deletion.** It *clarifies/supersedes specific judgments* in [INTELLIGENCE_SCHOOL_PLATFORM_MASTER.md](INTELLIGENCE_SCHOOL_PLATFORM_MASTER.md) and [CROSS_REVIEW_B_TOPDOWN_CHALLENGE.md](CROSS_REVIEW_B_TOPDOWN_CHALLENGE.md); both are preserved as historical artifacts (see §"Prior-artifact reconciliation").

**Change rule (§22):** a future design that conflicts with this Baseline must (1) name the conflict, (2) explain the change, (3) get Owner approval, (4) version-up the Baseline. No silent overwrite.

---

## 0. How this Baseline was formed

Two independent reviews converged on `HEALTHY_WITH_DEBT` with largely matching conclusions. This Baseline integrates:
- **Cross Review A (Codex, bottom-up):** live DB/implementation audit — `day_targets` ACL over-grant, live object inventory, migration correspondence, absence of human-quality persistence, school-preference-vs-membership boundary, analytics wiring gap, LAB mock-adapter boundary. **Where a Claude inference conflicts with a Codex live finding, the LIVE IMPLEMENTATION FACT wins.**
- **Cross Review B (Claude, top-down):** product-first challenge — over-scope corrections, credit-ledger-already-B2B-aware, operator re-eval already exists, official-vs-LS separation already enforced, recovered Owner decisions.
- **Owner clarifications A–F (this synthesis):** One Profile Experience, three commercial types, phased Academic/Admission, deep analytics as a core goal, analytical student context, special-admission eligibility.

**Live facts re-verified for this Baseline (read-only, 2026-09-30):** `43 base tables + 1 view`, `61 RLS policies`, `40` public `FUNCTION` routines via `information_schema.routines`. *Drift note:* Codex reported "67 functions" — a counting-method difference (e.g. `pg_proc` including trigger/aggregate/internal functions). Not a discrepancy in the schema itself; flagged for doc reconciliation.

---

## 1. Architecture Health

**`ARCHITECTURE_HEALTH = HEALTHY_WITH_DEBT`.** No large-scale DB refactor is required. Much of the current DB complexity is *necessary* complexity — it exists to preserve history, provenance, domain separation, billing integrity, and AI-execution traceability. The goal is **not** fewer tables; the goal is **ONE FACT → ONE CANONICAL SOURCE OF TRUTH.**

**Debt to carry (bounded, additively fixable):** (1) LAB has no server-authorization surface (static export + browser-only auth); (2) `day_targets` ACL over-grant (Codex live finding); (3) `admin_users`/`is_feedback_admin()` is a feedback/moderation gate, not a general role system; (4) `profiles` accretion risk; (5) minor ops hygiene (`pg_net` in public, leaked-password protection off); (6) doc/schema drift (`billing reason='subscription'`; learning-event semantics vs older analytics docs; function-count method).

---

## 2. Product Capability Baseline

| Capability | State |
|---|---|
| Content (기출/검색/PDF/저장/최근/recent-updates) | IMPLEMENTED |
| Study Timer + 공부시간 누적 | IMPLEMENTED (`study_sessions`) |
| D-Day | IMPLEMENTED (`day_targets`) |
| School/NEIS setting; meals | setting IMPLEMENTED; meals PLANNED |
| Badge/Achievement; Community; Push | FUTURE / PLANNED (deferred) |
| Essay: eval/evidence/CORE/sentence/rewrite/repeat/progress/positive | IMPLEMENTED (schema; pre-launch) |
| Essay: credits/billing | IMPLEMENTED (schema) |
| Essay: Quality Intelligence (human judgment) | PARTIAL — operator invalidate+re-eval EXISTS; human-verdict capture MISSING |
| Essay: Golden Set | PLANNED (deferred) |
| Academic: mock self-scoring | IMPLEMENTED (schema) |
| Academic: transcript / Excel import | SOURCE-GATED (phased) |
| Admission: university/target | PARTIAL |
| Admission: 입결/공식환산/LS분석/보정/가중치/예측 | SOURCE-GATED / FUTURE |
| Commercial: Essay credit (free/purchase/coupon/voucher/institution) | Ledger IMPLEMENTED; distribution layers DESIGN_LATER |
| Commercial: Ad removal (one-time IAP) | PRESERVED (IAP design later; not a bare boolean) |
| Commercial: Premium Intelligence membership (time-based) | PRESERVED (future) |
| School/B2B (Org/Membership/Program/Portal/Report) | FUTURE_DESIGN |
| Deep Analytics (Essay/Learning/Academic/Admission/B2B) | CORE GOAL — analytics-ready data now, infra later |

---

## 3. Canonical Domain Principles

1. **One fact → one canonical source of truth.** No fact owned independently by two systems.
2. **Reuse existing canonical facts before adding new foundation.**
3. **Immutability + provenance + versioning** are house law (already implemented in Essay/evidence/reference data). Never silent-overwrite history.
4. **Server-authoritative writes** via `SECURITY DEFINER` RPCs + owner RLS; clients never write engine tables directly.
5. **Official source vs LegendStudy-derived analysis are never the same stored fact** (already enforced in `essay_evaluation_criteria.origin`).
6. **Analytics event ≠ canonical domain fact.**
7. **UI aggregation ≠ DB domain ownership** (see §4).

---

## 4. Profile Experience vs DB Ownership (Owner clarification A)

**One integrated Student Profile Experience** (onboarding progressively collects school, grade, target university, target department/모집단위, and study/admission context; My Page shows/edits it as one) — used to personalize admission news, university schedules, 모집요강, 입결, essay materials, score analysis, comparison, and future prediction.

**But `ONE PROFILE EXPERIENCE ≠ ONE PROFILES TABLE`.** Each fact is owned by its canonical domain:
- identity/personal profile & stable settings → `profiles`
- target university/department → `student_target_universities` (already separate — correct)
- academic records, admission application history, commercial history, org membership/role/entitlement, human-quality reviews → **their own domains, not `profiles` columns.**

**`profiles` boundary (§ Owner-4):** keep to *current personal profile + comparatively stable personal settings*. **Do NOT** accrete onto `profiles`: organization membership, institution role, institution entitlement, academic transcript history, admission application history, commercial purchase history, human quality review.

---

## 5. Commercial Model — three distinct types (Owner clarification B)

| Type | Nature | Canonical source | Rule |
|---|---|---|---|
| **Essay credit / 첨삭권** | usage/quantity | **existing Credit Ledger** (`credit_accounts/grants/transactions`, `essay_billing_decisions`) | free/purchase/coupon/voucher/institution all deposit into the **same ledger** (`grants.origin` already includes `signup_bonus`, `purchase`, `promotion`, `admin_grant`, `b2b_program`; `billing.reason` already includes `institution`). **No new wallet/balance.** |
| **Ad removal** | one-time capability purchase | (IAP persistence TBD) | separate from Essay credit **and** from Premium. Do **not** fix as a bare boolean now — decided in future IAP design (purchase/restore/refund/revoke). |
| **Premium Intelligence membership** | time-based access right (subscription / semester / annual) | (future) | separate from Essay credit; grants access to deep score/admission analysis, comparison, official-conversion analysis, weighting, prediction, etc. **No generic entitlement engine now.** |

**USAGE CREDIT and TIME-BASED SERVICE ENTITLEMENT are preserved as distinct concepts.** Coupon/Voucher = a distribution/redemption layer that, on redeem, creates a **Credit Grant** — not a new balance.

---

## 6. Quality Architecture Baseline

Existing Essay system already has: immutable evaluations, supersession/invalidation, **operator re-evaluation** (`request_kind='operator_reevaluation'`), and processing provenance/telemetry.

- **Quality Console v0 = READ-MOSTLY** over existing canonical Essay facts (submission, evaluation, dimensions, strengths, CORE/NON-CORE, sentence feedback, rewrite, progress, processing telemetry). Problems use the **existing** invalidate + operator-reevaluate paths. **Do not duplicate the evaluation system.**
- **Human Quality Judgment** (PASS/PARTIAL/FAIL, false-criticism, CORE quality, concrete guidance, logical connectivity, …) has **no canonical persistence today.** To accumulate systematic human QA during a real-student Pilot, **design a separate Human Quality persistence — designed/approved *before* the Pilot**, not built now.
- **Golden Set DB: not now.**

**Cross-review reconciliation (§21):** Claude ("no new QA table strictly required for v0") and Codex ("human-quality canonical persistence is absent") **do not conflict** — v0 starts on existing data; systematic Pilot QA needs a dedicated persistence designed next.

---

## 7. School / B2B Boundary Baseline

- `profiles.neis_*` = **PERSONAL SCHOOL SETTING** (student self-selected, for personal features).
- Future `organizations`/`org_memberships` = **VERIFIED INSTITUTIONAL RELATIONSHIP** (roles, scope, entitlement).
- **Never equate them.** A school must **not** gain access to a student's data merely because `profiles.neis_school_code` matches. `school.legendstudy.com` access must derive from verified membership/roster/scope.
- **Now:** implement **no** Organization/Membership schema. Design a minimal foundation only when the **first real B2B requirement + authorization policy** is concrete. **Program / Staff assignment / Cohort / Roster / generic entitlement engine: not built prematurely.**
- Institution Essay allocation reuses the **existing Credit Ledger** (`origin='b2b_program'`).

---

## 8. Academic / Admission Phasing (Owner clarification C — PHASED + SOURCE-GATED, not mere DEFER)

- `Mock Exam Scoring ≠ Official Academic Transcript.` `Universities` master is reused. `Student Target University` = current preference; distinct from future target department/unit, application, and admission result.
- **Academic schema** designed only after a **representative school Excel/source sample** is obtained. **Admission schema** designed only after **official results / official formula / weighting source** are obtained.
- **Official computation and LegendStudy analysis/prediction are never stored as the same fact.**
- Selty-based 수시 합격예측 is **preserved** as a future capability; scope recovered when Owner source data arrives.

---

## 9. Deep Analytics Principle (Owner clarification D)

Deep Analytics is a **core product goal** (Essay/Learning/Academic/Admission/B2B), long-term feeding product improvement, personalization, Quality Intelligence, B2B evidence, and BI.

**`ANALYTICS-READY DATA NOW ≠ BUILD ANALYTICS WAREHOUSE NOW`.** Preserve canonical facts/history/context/provenance from the start; do **not** prematurely build a warehouse, generic metric registry, or giant analytics-event system. Metrics are derived from canonical facts; analytics events cover only non-domain interactions (screen view, button click, rewrite start, example view). Reconcile `essay_learning_events` semantics vs older analytics docs **before** any analytics work.

---

## 10. Analytical Student Context / Privacy Boundary (Owner clarifications E, F)

Three layers, kept distinct:
- **A. Operational Identity** — auth user id, name, email, account info.
- **B. Analytical Student Context** — school, school type, grade, performance, subject, target university/department, admission-eligibility context, special-admission context (e.g. 농어촌).
- **C. Presentation / Reporting** — operator/school dashboards, aggregate B2B report, external sales evidence.

Internal canonical analysis must connect the **same student's longitudinal facts**; UI/reports apply purpose- and permission-appropriate minimization/aggregation/de-identification. **Neither extreme:** don't show direct identifiers everywhere just because linkage exists; don't delete academic/admission context in the name of privacy (Academic/Admission Intelligence would collapse). **"No name ≠ anonymous"** — school+grade+performance+special-admission combos can re-identify small groups. Access rights, purpose, retention, consent, and reporting policy get separate review before real student/school data operations.

**Special admission eligibility (F):** preserved as `ADMISSION ELIGIBILITY CONTEXT` future domain requirement — **not** a `profiles.is_rural` boolean; it relates to admission year, university, 전형, conditions, and evidence state.

---

## 11. Security / Operations Baseline

- **`day_targets` excessive privilege** (Codex live finding): anon/authenticated hold `TRUNCATE/TRIGGER/REFERENCES/MAINTAIN`-class grants. Verdict: **HIGH EXCESSIVE PRIVILEGE / LATENT RISK** (exploitability not yet verified). Handle as a **separate Security Fix**, outside architecture review. → **NEXT 1.**
- `admin_users`/`is_feedback_admin()` stays a feedback/moderation gate; **do not** expand it into the global admin/B2B/Quality role system.
- **A server-authorization surface is a prerequisite for the LAB Quality Console** and any operator/B2B screen.
- Ops hygiene (schedule, non-blocking): move `pg_net` out of `public`; enable leaked-password protection; confirm no-policy-RLS ops tables remain definer/service-role only.

---

## 12. Deferred / Source-Gated Roadmap

**Not implemented now, NOT cancelled** — `DEFERRED`, `PHASED`, or `SOURCE-GATED`: Golden Set DB · Metric Registry · Analytics Warehouse · generic Entitlement Engine · Program/Cohort/Staff/Roster · Academic Transcript schema · School Excel Import schema · Admission Result schema · Official Formula engine · LS Scoring Model · Special Admission Eligibility schema.

---

## 13. Cross-Repo Contract Boundary

App and LAB share the **same canonical Auth identity**. But the **LAB Essay adapter/type is currently mock**. `SHARED AUTH ≠ LIVE ESSAY CONTRACT INTEGRATION`. Before any LAB live integration: verify **App Essay canonical contract → explicit DTO/adapter mapping → LAB**. **Do not build production schema from LAB mock types.** → **NEXT 3.**

---

## 14. Do-Not-Duplicate Rules

**DO NOT CREATE:** separate LAB / School / Essay user identity · duplicate university master · duplicate Essay wallet · duplicate institution wallet · duplicate coupon balance · duplicate Essay evaluation store · Human-Quality result that **overwrites** the model evaluation · school membership inferred from `profiles` NEIS school · official transcript stored as mock scoring · official admission formula mixed with LS prediction · generic mega-taxonomy for unrelated concepts · analytics event used as a canonical learning/billing fact.

**Principle: REUSE EXISTING CANONICAL FACTS BEFORE ADDING NEW FOUNDATION.**

---

## 15. Immediate Architecture Debt / Next Gates (record only — not executed here)

**NEXT 1** `day_targets` excessive privilege → separate Security Fix / verification.
**NEXT 2** LAB server-authorization surface → decision.
**NEXT 3** App Essay canonical contract → LAB DTO/adapter mapping.
**NEXT 4** Quality Console v0 detailed design (read-mostly over existing Essay facts).
**NEXT 5** Human Quality persistence design (complete **before** the real-student free Pilot).
**NEXT 6** Real-student Pilot / Quality Intelligence accumulation.
Academic/Admission foundation proceeds per §8 phasing + source availability.

---

## Canonical Decision Matrix

| Area | Baseline Decision | State |
|---|---|---|
| Overall Architecture | HEALTHY_WITH_DEBT | FROZEN_V1 |
| Identity | One canonical auth identity | KEEP |
| Profile UX | One integrated Student Profile Experience | KEEP |
| profiles DB | personal profile/settings only | KEEP_BUT_BOUND |
| School preference | personal setting | KEEP |
| Organization Membership | verified institutional relation | FUTURE_DESIGN |
| Essay Evaluation | canonical model result | KEEP |
| AI Processing Run | physical execution/telemetry | KEEP |
| Improvement Progress | canonical learning progress | KEEP |
| Learning Event | interaction event only | CLARIFY |
| Credit Ledger | all Essay quantity accounting | KEEP |
| Coupon/Voucher | distribution/redemption → existing credit grant | DESIGN_LATER |
| Institution Essay Allocation | existing credit ledger | DESIGN_LATER |
| Ad Removal | one-time capability purchase | PRESERVE |
| Premium Intelligence | subscription/semester/annual access | PRESERVE |
| Quality Console v0 | existing Essay facts, read-mostly | NEXT_DESIGN |
| Human Quality Persistence | design before real-student Pilot | DESIGN_NEXT |
| Golden Set DB | not needed now | DEFER |
| Academic Transcript | after representative source | SOURCE_GATED |
| School Bulk Import | after Excel/source sample | SOURCE_GATED |
| Admission Result | after official source | SOURCE_GATED |
| Official Formula | after verified formula | SOURCE_GATED |
| LS Analysis Model | separate from official computation | FUTURE |
| Admission Eligibility Context | requirement preserved, schema TBD | FUTURE_DESIGN |
| Deep Analytics | core product goal | PRESERVE |
| Analytics Warehouse | not needed now | DEFER |
| Metric Registry | not needed now | DEFER |
| day_targets ACL | excessive privilege found | SECURITY_FIX_REQUIRED |
| LAB Server Authorization | precondition for Quality Console | DESIGN_NEXT |
| LAB Essay Contract | mock→canonical explicit mapping | DESIGN_NEXT |

---

## Analytics-Ready Data Principle (apply to every future schema)

For any new fact, before designing: (1) can its historical state be reproduced? (2) can it link to the student's longitudinal change? (3) is the school/grade/context-at-time-of-event preserved? (4) are raw fact and derived metric distinguished? (5) are official source and LS-derived analysis distinguished? (6) can a metric's denominator/exclusion/version be defined later? (7) does updating the current value avoid losing past analytical context? (8) is required analytical context preserved while unnecessary direct-identifier exposure is reduced? — This means *don't build a model now that destroys future analysis*, **not** "build the analytics DB now."

---

## Prior-artifact reconciliation (§23)

Historical artifacts are preserved unchanged. This Baseline **clarifies/supersedes** these specific earlier judgments:
- "Human Quality Review table as the first build" → **superseded/clarified**: Quality Console v0 is read-mostly over existing data; Human Quality persistence is designed before the Pilot.
- "`data_context` (PERSONAL vs SCHOOL_PROGRAM) as P0" → **downgraded** to a School-layer concern.
- "Org/Membership/Program foundation early" → **deferred** to first real B2B requirement (minimal Org/Membership only).
- "Metric registry early" → **deferred.**
- "Academic raw-record schema before an Excel sample" → **deferred / source-gated.**
Confirmed-strong Phase A/CRB conclusions (one identity, reuse credit ledger, immutable eval, provenance, official-vs-LS separation, server-auth surface as the near-term blocker) are **carried forward.**

---

## Document status

`CURRENT ARCHITECTURE DECISION BASELINE` — not a feature spec, not schema authorization. Version-up on any approved conflicting change (§22). Next sequence: **Security Fix → Server Authorization → LAB Essay Contract → Quality Console v0 → Human Quality Persistence → Real Student Pilot.**

*End of LegendStudy Architecture Baseline v1.*
