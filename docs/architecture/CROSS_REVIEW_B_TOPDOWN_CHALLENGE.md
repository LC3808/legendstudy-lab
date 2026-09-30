# LegendStudy Platform Architecture Health Review

**Cross Review B — Claude / Top-Down Architecture Challenge**
**Status:** `REVIEW ONLY`. No production code, DB, migration, RLS, auth, RPC, UI, or deploy change. 0 provider calls. This document actively **challenges** the earlier [Phase A Master Architecture](INTELLIGENCE_SCHOOL_PLATFORM_MASTER.md) — it does not assume it is correct.
**Author:** Claude · **Date:** 2026-09-30 · **Branch:** `claude/intelligence-school-architecture`

**Verification basis (LIVE > migration > canonical doc > older doc > idea):** live Supabase `stlhijzpjfgwwdgunlsd` read-only (tables, columns, FKs, CHECK constraints, security advisors), `legendstudy-app` repo (migrations, wiki, decisions), `legendstudy-lab` repo, and the Phase A master doc. Schema facts below are quoted from live CHECK constraints, not assumed.

> **Headline of this review:** My Phase A audit was directionally right about *what exists*, but it **over-scoped the near-term build in three places** and **under-credited how much commercial/quality capability already ships in the live schema**. The corrected verdict is more conservative: build *less* new schema now, put a thin UI on data that already exists, and defer most "foundations" until a real Owner input or contract forces their shape.

---

## 1. Executive Summary

LegendStudy's live architecture is **healthier and more commercially complete than Phase A stated.** Three live facts change the near-term plan:

1. **The credit ledger already anticipates B2B and every entitlement context.** `credit_grants.origin` includes `b2b_program`, `signup_bonus`, `promotion`, `admin_grant`, `compensation`, `purchase`; `essay_billing_decisions.reason` includes `institution`, `subscription`, `included_revision`, `paid_cycle`, `additional_revision`, `promotion`, `admin_grant`, `technical_reevaluation`. → **Institution entitlement and voucher redemption need no new balance system** (Phase A ADR-11 confirmed, and stronger than I claimed). The only missing B2B piece is the *Organization entity a `b2b_program` grant would point at*.
2. **The operator correction loop already exists.** `essay_evaluations.request_kind ∈ {student, operator_reevaluation}` + `supersedes_evaluation_id` + `correction_reason` + `invalidated_at/invalidation_reason`. → An operator can already invalidate a bad evaluation and issue a corrected one. **Phase A's "Human Quality Review persistence as the first build" is partially over-designed** (see §4, §6.13).
3. **Official-vs-LS separation is already enforced in data**, not just intended: `essay_evaluation_criteria.origin ∈ {official, legendstudy_derived}` with a CHECK that `official_weight_percent` may be non-null only when `origin='official'`. This is a strong existing guarantee (Owner §23/§25) I did not credit.

**Corrected near-term recommendation:** the true first step is a **read-mostly operator Quality Console over existing data** (evaluations, dimensions, improvement-progress chains, invalidate/re-eval RPCs) — likely **with no new table at all** — plus deciding the one real architectural blocker: **a server-authorization surface** (the current LAB is a static export with browser-only auth and cannot safely serve cross-user/cross-tenant data). Everything else (quality-review table, org/membership, academic, admission) is `DESIGN_FIRST` or `DEFER`.

**Health verdict: `HEALTHY_WITH_DEBT`.** The foundations (identity, essay, credit, provenance, RPC/RLS) are genuinely well-built and should be preserved; the debt is a small, well-understood set (server-auth surface, `profiles` accretion, single-boolean admin, ops hygiene) — none of it blocks additive expansion.

---

## 2. Product Capability Map

| Capability | State | Evidence |
|---|---|---|
| **Content**: 기출/검색/PDF/저장/최근/recent-updates | IMPLEMENTED | `source_posts→content_items→exams/subjects/exam_subjects/resources` (443/298/23/5112/10556 rows), `bookmarks`, `recent_views`, App |
| **Learning**: Study Timer + 누적 | IMPLEMENTED | `study_sessions` (`include_in_study_total`), 9 rows |
| **Learning**: D-Day | IMPLEMENTED | `day_targets`, 12 rows |
| **Learning**: School/NEIS setting | PARTIAL | `profiles.neis_office_code/neis_school_code`; meals feature PLANNED |
| **Learning**: Badge/Achievement | FUTURE (deferred) | app `product-scope.md` post-v1 |
| **Learning**: Community | FUTURE (deferred) | app `product-scope.md` post-v1 |
| **Learning**: Push notifications | PLANNED (v1 milestone) | app decisions; schema deferred |
| **Essay**: eval/evidence/CORE/sentence/rewrite/repeat/progress/positive | IMPLEMENTED (schema; 0 rows, pre-launch) | full `essay_*` tree; L2-C3 validations PASS per Owner |
| **Essay**: credits/billing | IMPLEMENTED (schema) | `credit_*`, `essay_billing_decisions` |
| **Essay**: Quality Intelligence (human) | DOCUMENTED / PARTIAL | operator invalidate+re-eval EXISTS; verdict/tag capture MISSING |
| **Essay**: Golden Set | PLANNED | none in schema |
| **Academic**: mock self-scoring | IMPLEMENTED (schema) | `mock_exam_attempts/answers`, `answer_key_versions`, `grade_cutoff_versions` |
| **Academic**: transcript/내신/모의 per sem/subject, Excel import | PLANNED / MISSING | none; Excel schema unknown |
| **Admission**: university/target | PARTIAL | `universities`(5), `student_target_universities`(0), `essay_exams`(21) |
| **Admission**: 입결/공식환산/LS분석/고교보정/가중치/합격예측 | PLANNED / FUTURE | none; Owner data absent |
| **Commercial**: 무료권/credit/billing/구매 | IMPLEMENTED (schema) | `credit_grants.origin=signup_bonus/purchase`, billing reasons |
| **Commercial**: Coupon/Voucher | PARTIAL (sink exists) | `credit_grants.origin=promotion/admin_grant` + `external_reference`; no issuance entity |
| **Commercial**: Institution entitlement | PARTIAL (sink exists) | `origin=b2b_program`, `reason=institution`; no Org entity |
| **Commercial**: Ads / ad-removal IAP (₩4,900 one-time) | PLANNED / POSSIBLY_MISSED | app product-scope; **no `ads_removed` entitlement in schema** |
| **School/B2B**: Org/Membership/Staff/Roster/Program/Portal/Report | PLANNED / MISSING | none |
| **Intelligence**: Product Analytics | PARTIAL | telemetry pattern; not unified |
| **Intelligence**: Quality/Learning/Academic/Admission/B2B | PLANNED | derivable from facts; no registry/warehouse (correctly) |

---

## 3. Canonical Source-of-Truth Map

| Fact | Source of truth | Verdict |
|---|---|---|
| User identity | `auth.users` (+`profiles`) | **CLEAR** |
| Student profile / school setting / D-Day / academic_status | `profiles`, `day_targets` | CLEAR (but `profiles` accreting — §5) |
| Essay attempt / evaluation / CORE issue / CORE progress | `essay_attempts`/`essay_evaluations`/`essay_improvement_items`/`essay_improvement_progress` | **CLEAR** |
| AI execution | `essay_ai_processing_runs` | **CLEAR** |
| Credit balance / billing decision | `credit_transactions` (ledger) / `essay_billing_decisions` | **CLEAR** |
| Target university | `student_target_universities` | CLEAR |
| University identity | `universities` | CLEAR (thin) |
| Mock exam score | `mock_exam_attempts` | CLEAR |
| Operator correction of an evaluation | `essay_evaluations` (request_kind/supersede/invalidate) | **CLEAR** (already) |
| Human quality *judgment* (verdict/tags) | — | **MISSING** |
| Organization membership | — | MISSING |
| Institution entitlement | credit ledger (`b2b_program`) + (missing Org entity) | AMBIGUOUS until Org exists |
| Ad-removal entitlement | — | **MISSING** (planned) |
| Academic transcript | — | MISSING |
| Admission result / official formula | — | MISSING |

---

## 4. Previous Master Architecture Challenge

| Phase A proposal | Challenge outcome | Verdict |
|---|---|---|
| `essay_quality_reviews` as **first** build | Operator invalidate+re-eval already exists; the *judgment record* is a Quality-Intelligence need, not a "fix bad eval" need. Do UI-over-existing-data first. | **SIMPLIFY / DEFER table** |
| `data_context` (PERSONAL vs SCHOOL_PROGRAM) as P0 | Commercial context already exists as `billing_decisions.reason`/`grants.origin`. The *access/ownership* context is a School concern, not needed pre-B2B. | **DEFER to P1 (School)** |
| Org/Membership/**Program** foundation in P0 | Minimal B2B = Org + Membership + reuse `b2b_program` grant. Program/Staff/Roster/cohort are contract-shaped; don't build speculatively. | **CHANGE → minimal only, on first real contract** |
| Metric registry v1 (P1) | Metrics derive from domain facts today; registry earns its place only with recurring reproducible reports. | **DEFER** |
| Golden Set lifecycle (P1) | Private benchmark artifact suffices; real-student-answer use has privacy gating. | **DESIGN_ONLY / LATER** (keep) |
| Academic raw-record foundation (P1) | No Excel schema, no self-vs-school policy → building tables now risks rework. | **DESIGN_FIRST** (downgrade) |
| Admission results/formula/LS model (P2) | Owner source data absent. | **DEFER + OWNER_INPUT** (keep) |
| `audit_log` (P0/P1) | Genuinely needed once any operator/B2B surface touches student data. | **KEEP** (P0 for admin surface) |
| Server-authorization surface (ADR-12) | Real, near-term, blocks every admin/portal screen. | **KEEP — the #1 decision** |
| One identity / reuse credit ledger / immutable eval / official-vs-LS separation / provenance / RPC | Confirmed, some stronger than stated. | **KEEP** |

**Net:** Phase A's *analysis* holds; its *sequencing* was too eager. Corrected first move = **read-mostly Quality Console + server-auth decision**, not new foundation schema.

---

## 5. Domain Boundary Review

- **Identity ≠ Profile ≠ Membership ≠ Entitlement** — principle holds and is mostly respected. **Risk:** `profiles` is accreting mixed concerns (`neis_*` school, `target_date/label` D-Day-ish, `academic_status`, `onboarding_completed_at`). Admission preference correctly lives *outside* profiles (`student_target_universities`). **Recommendation:** freeze `profiles` as personal-identity attributes; **never** add org membership, entitlement, or ad-removal state to it (those are separate relations/flags).
- **School setting ≠ School membership** (review §10): `profiles.neis_*` is the student's *self-selected* school for personal features (meals). B2B `org_membership` is a *customer relationship* with roles, cohorts, entitlements, and access grants. They must be separate entities; the only link is that an org may *reference* the same NEIS school code in its `school_profile`. Do not overload `neis_*` to mean B2B membership.
- **Credit ≠ Capability entitlement** (review §11): consumable credits (exist) answer "how many uses"; a capability flag (ad-removal, "school has Academic module") answers "right to use a feature." Today the only capability entitlement is ad-removal — a simple boolean, **not** a reason to build a generic entitlement engine.

---

## 6. Essay Architecture Review

The essay complexity is **necessary complexity**, not accidental. Each table is a distinct domain fact:

- `essay_learning_events` (stage/event stream) vs `essay_improvement_progress` (the durable CORE-progress fact with `previous_progress_id` chain): **not duplicates** — one is an observation stream, the other is the source-of-truth progress record. Keep both (Owner §70 principle already honored).
- `essay_ai_processing_runs` (per-run provider/model/tokens/latency/cost/lease) vs `essay_evaluations` (the logical evaluation): **not duplicates** — runs are attempts/telemetry under one evaluation. Keep both.
- **Operator status vs future Human Quality Review:** the existing `request_kind='operator_reevaluation'` + invalidate lifecycle is the *action*; a human *judgment* record (verdict/tags/note) is a **different** fact. They don't overlap; the judgment record simply doesn't exist yet and isn't required for the corrective loop.
- Criteria/evidence/dimensions are correctly separated and versioned; `essay_improvement_items.normalization_status ∈ {candidate, reviewed}` even gives issue normalization its own review step.

**No essay consolidation recommended.** The one caution: resist merging quality judgment into `essay_evaluations.status` (that enum is the AI job lifecycle: requested/processing/completed/failed/cancelled — polluting it with human verdicts would corrupt its meaning).

---

## 7. Commercial Architecture Review

- **Reuse the ledger; add no parallel balance.** `credit_accounts→credit_grants→credit_transactions` (double-entry, reserve/settle/release, reversal, idempotency) + `essay_billing_decisions` is a complete, auditable commercial core.
- **Voucher/Coupon** = an *issuance/redemption* front-end that, on redeem, creates a `credit_grant` (`origin='promotion'|'admin_grant'`, `external_reference=<voucher id>`). Only new pieces: a voucher definition + redemption record. **No new balance, no new entitlement store.**
- **Institution entitlement** = `credit_grant(origin='b2b_program', external_reference=<org/program>)` + `billing_decision.reason='institution'`. Already expressible; needs only the Org entity to reference.
- **Drift flag:** `billing_decisions.reason='subscription'` exists in schema although the App product-scope says "not a subscription." Not a bug — likely Essay-side future optionality — but worth an Owner confirmation so docs and schema agree.
- **Ad-removal IAP** is a *capability* entitlement (permanent boolean), not credits. It has **no home in the current schema** — a small, real gap (POSSIBLY_MISSED). Recommend a simple per-user capability flag when implemented, not a generic entitlement engine.

---

## 8. School / B2B Architecture Review

**Minimal viable B2B foundation (only when the first real contract exists):**
- `organizations` (generic type; school as one type) + `school_profile` extension (NEIS code, region) — **do not** hard-code school-only.
- `org_memberships` (auth.users ↔ org, role, cohort/year).
- Institution entitlement via **existing** `credit_grant(origin='b2b_program')`.

**Defer until the contract defines them:** `programs`, `cohorts`, `staff_assignments`, `roster_persons`/claim, `org_data_access_grants`. Program ≠ cohort (program is a contracted offering; cohort is a grouping) — but neither should be built speculatively. Roster-person must stay separate from `auth.users` (no shadow accounts) — but that's a design rule to honor *when* built, not a P0 table.

**Hard prerequisite:** the server-authorization surface (§4). A school portal cannot run on browser-only static auth.

---

## 9. Academic Architecture Review

- `mock_exam_attempts` (in-app self-scoring from versioned answer-key/grade-cutoff reference data) is **not** a transcript and must **not** be reused as one (review §20).
- A transcript record (real 내신/모의 per academic-year/semester/subject) is a *different* record type with `SELF_REPORTED` vs `SCHOOL_UPLOADED` provenance, conflict handling, and derived (versioned) analysis. Self-reported and school-uploaded are the **same record type with different `source`**, not two tables.
- **Reuse** `subjects` versioned taxonomy for transcript subject normalization; preserve raw labels.
- **Do not build tables before an Excel sample exists.** Verdict: **DESIGN_FIRST**. Capture only the concept now.

---

## 10. Admission Architecture Review

- `universities` is thin (id/slug/name) — sufficient for `student_target_universities` today. `essay_exams` already carries admission_year/track/campus/field with provenance + verification.
- Department/모집단위 needed only when 입결 results or per-unit formulas arrive.
- **Admission results** require a *verified official source* first (reuse the essay-evidence provenance pattern). **Official formula** and **LS scoring model** require Owner source data (high-school adjustment, subject/major weights) that does not exist — building either now is premature (Owner §24 = extension point only).
- **수시 합격예측 (Selty-based)** is a recorded FUTURE capability (app overview/product-scope). It remains in the long-term roadmap as a *separate prediction layer*, gated behind data + validation. Preserved; not near-term.

---

## 11. Recovered Owner Decisions

| Decision | Original purpose | Current status | Why absent from recent arch | Action |
|---|---|---|---|---|
| Study Timer + 누적 | study habit | IMPLEMENTED (`study_sessions`) | Phase A was intelligence/school-focused | **PRESERVE** |
| D-Day countdown | motivation | IMPLEMENTED (`day_targets`) | same | **PRESERVE** |
| School/NEIS + meals | personalization | setting EXISTS; meals PLANNED | — | PRESERVE; keep distinct from B2B (§5) |
| Badge/Achievement | engagement | FUTURE (post-v1) | intentionally deferred | DEFER |
| Community | engagement | FUTURE (post-v1) | intentionally deferred | DEFER |
| Ad-removal IAP ₩4,900 | monetization | PLANNED; **no schema home** | dropped from arch discussion | **REINTRODUCE_TO_ROADMAP** (capability flag) |
| Naver login | v1 social set | App v1 lists Naver; LAB has google/apple/kakao only | LAB scope | OWNER_REVIEW (Naver on LAB?) |
| Positive Learning | pedagogy | IMPLEMENTED (validated PASS) | present | PRESERVE |
| Repeated essay cycle / progress | pedagogy | IMPLEMENTED (`improvement_progress`) | present | PRESERVE |
| Voucher/Coupon | commercial | PARTIAL (ledger sink) | — | PRESERVE direction |
| Selty 수시 합격예측 | admission value | FUTURE | deferred | PRESERVE as future layer |
| Push notifications | retention | PLANNED (v1 milestone) | schema deferred | PRESERVE |

---

## 12. Cross-Domain Collision Matrix

| Future capability | Existing structure | Relationship | Recommendation |
|---|---|---|---|
| Human Quality Review | `essay_evaluations` (request_kind/invalidate) + `admin_users` | SEPARATE_BUT_LINKED | UI-over-existing first; add table only for verdict/tag aggregation |
| Golden Set | private benchmark artifacts / essay data | SEPARATE_BUT_LINKED | DEFER; sanitized, approval-gated |
| Organization | `profiles.neis_*` / `auth.users` | NEW (separate from profile) | New entity; reference NEIS, don't overload profile |
| Membership | profile school setting | SEPARATE_BUT_LINKED | New relation; not a profile column |
| Institution Entitlement | credit ledger (`b2b_program`) | REUSE | Grant into existing ledger |
| Voucher/Coupon | `credit_grants`/`credit_transactions` | EXTEND (issuance front-end) | Issue→redeem→grant; no new balance |
| Institution Program | essay/entitlement context | DEFER | Only on real contract |
| Academic Transcript | mock scoring / `subjects` | SEPARATE (reuse taxonomy) | New record type; reuse subjects; DESIGN_FIRST |
| School Bulk Import | ingestion/quarantine pattern | REUSE (pattern) | Staging→confirm; design only |
| Admission Result | `universities` | EXTEND + NEW | New results table + provenance |
| Official Formula | university/admission data | NEW | DEFER (Owner data) |
| LS Scoring Model | derived analysis | NEW (separate namespace) | DEFER (Owner data) |
| Metric/Reporting | domain facts/events | DEFER | Derive on demand until reports recur |
| Ad-removal entitlement | — | NEW (capability flag) | Simple boolean, not an engine |

---

## 13. Simplification Opportunities

| Candidate | Why complex | Simplification | Benefit | Risk | When |
|---|---|---|---|---|---|
| P0 Quality Console | Phase A added a new table first | Read-mostly UI over existing data + invalidate/re-eval RPC | Ship quality oversight without migration | Verdict history not captured yet | **DO NOW** |
| `data_context` label everywhere | duplicates billing reason | Use `billing_decisions.reason`/`grants.origin` for commercial context; add access-context only in School layer | Fewer concepts | Slight School-time work | LATER |
| Entitlement abstraction | conflated consumable + capability | Keep credits for consumable; a flag for ad-removal | No premature engine | — | LATER |
| Metric registry | premature | Derive metrics ad hoc | Less to maintain | Report reproducibility later | LATER |
| Program/Staff/Roster in P0 | speculative | Org+Membership only | Matches real B2B need | — | LATER |

(No simplification that sacrifices history/provenance/audit/security is proposed.)

---

## 14. Missing Foundations (strict test: real requirement ∧ not expressible ∧ rework/loss risk ∧ near-term dependency)

1. **Server-authorization surface** — every operator/B2B screen depends on it; browser-only static export cannot serve cross-user data. *(Real, blocking, near-term.)*
2. **`audit_log`** for sensitive operator actions — needed the moment an admin surface reads student data; retrofitting loses history. *(Real, near-term with admin surface.)*
3. **Organization entity** — the one thing blocking B2B that the ledger already assumes (`b2b_program`). *(Real, but only when first contract is imminent.)*

Everything else fails the strictness test *right now* (no requirement yet, or expressible later without loss). Ad-removal entitlement is a real but tiny gap (capability flag), not a "foundation."

---

## 15. What Should NOT Be Built (now)

- A **second identity/user store** (LAB or portal). — one `auth.users`.
- A **duplicate university master** — extend `universities`.
- A **parallel credit/entitlement balance** for vouchers or institutions — reuse the ledger.
- A **generic mega-event table** — `essay_learning_events` is scoped; keep domain events domain-specific.
- **School membership fields on `profiles`** — separate relation.
- **Admission official formula mixed with LS scoring** — separate namespaces (criteria already enforce this pattern).
- **Reusing `mock_exam_*` as school transcript** — different record type.
- A **separate Quality copy of the evaluation** — reference `evaluation_id`; never duplicate the eval.
- **Metric registry / warehouse / OLAP** — not until measured need.
- **Program/Staff/Roster tables** — not until a real contract defines them.

---

## 16. Strong Existing Foundations (preserve & reuse)

| Foundation | Why good | Should reuse it | Must NOT be merged into it |
|---|---|---|---|
| One canonical identity (`auth.users`+`profiles`) | no dup identity | all surfaces | org membership / entitlement |
| Immutable, versioned evaluation (supersede/invalidate + model/prompt/contract/evidence versions + hashes) | reproducibility, audit | quality, learning, B2B metrics | human verdicts into its status |
| CORE progress chain (`improvement_progress.previous_progress_id`, status open/improved/resolved/unchanged/recurred) | longitudinal learning truth | learning intelligence, timeline | analytics events as source |
| Official-vs-LS separation in criteria (`origin` + weight CHECK) | prevents official/LS confusion | admission formula/model design | LS model into official namespace |
| Credit ledger (double-entry, reserve/settle, idempotency; origins incl. b2b_program) | auditable commercial core | voucher, institution entitlement | a parallel balance |
| Server-authoritative `SECURITY DEFINER` RPCs + owner RLS + no-policy ops tables | safe writes, least client trust | all new writes | direct client table writes |
| Provenance + versioned reference data (digests, verified/corrected, is_current) | trustworthy data | admission results, academic import | raw overwritten silently |
| Staging/quarantine philosophy | safe ingestion | academic/admission import | canonical write on upload |
| Raw label preservation + versioned taxonomy | historical fidelity | transcripts, subjects | forcing modern taxonomy |

---

## 17. Top Findings

**TOP 5 — STRONG FOUNDATIONS:** (1) one canonical identity; (2) immutable/versioned essay evaluation; (3) CORE progress chain; (4) credit ledger already B2B-aware; (5) official-vs-LS separation enforced in data.

**TOP 5 — ARCHITECTURE RISKS:** (1) no server-authorization surface for any operator/B2B screen (static+browser-auth); (2) `profiles` accretion of mixed concerns; (3) single-boolean `admin_users` (no least-privilege) — debt for B2B; (4) ops hygiene: `pg_net` in public, leaked-password protection off, several no-policy-RLS ops tables (intentional but undocumented); (5) schema-vs-doc drift (`reason='subscription'` vs "not a subscription").

**TOP 5 — MISSING / UNCLEAR:** (1) server-auth surface; (2) `audit_log`; (3) Organization entity (for B2B grants that the ledger already assumes); (4) human quality *judgment* record (only when systematic QA/Golden-Set needed); (5) ad-removal capability entitlement.

**TOP 5 — POSSIBLE OVER-DESIGN (mine, Phase A):** (1) quality-review table as first build; (2) `data_context` as P0; (3) Program/Staff/Roster foundation early; (4) metric registry v1; (5) academic raw tables before Excel schema.

**TOP 5 — RECOVERED OWNER DECISIONS:** (1) Study Timer/누적 (implemented — keep visible); (2) D-Day (implemented); (3) ad-removal IAP (planned, no schema home); (4) Naver login on LAB? (App-v1 lists it; LAB omits); (5) Selty 수시 합격예측 (future layer — still preserved).

---

## 18. Architecture Health Verdict

**`HEALTHY_WITH_DEBT`.** Source-of-truth is clear for every live fact; domain boundaries are mostly clean; no meaningful duplication in the live schema; version/history/provenance/authorization are strong. The debt is bounded and additive-fixable: server-auth surface (before any admin/portal), `profiles` discipline, least-privilege admin (before B2B), ops hygiene, and one doc/schema drift. The current complexity **accurately reflects real domain complexity** (essay evaluation genuinely has these facts) — it is not a reason to refactor. **Not** `NEEDS_REFACTOR_BEFORE_EXPANSION`; **not** `BLOCKING`.

---

## 19. Before Any New Foundation Schema

| Foundation | Gate |
|---|---|
| A. Human Quality Review | `READY_TO_DESIGN` (but do UI-over-existing first; table = fast-follow) |
| B. Organization / Membership | `OWNER_DECISION_REQUIRED` (first-contract shape) |
| C. Institution Entitlement / Voucher | `READY_TO_DESIGN` (reuse ledger; needs Org for institution) |
| D. Academic Transcript | `MORE_SOURCE_DATA_REQUIRED` (Excel sample) + `LEGAL_POLICY_REVIEW_REQUIRED` (minors) |
| E. Academic Import | `MORE_SOURCE_DATA_REQUIRED` |
| F. Admission Result | `MORE_SOURCE_DATA_REQUIRED` (verified official source) |
| G. Official Formula | `OWNER_DECISION_REQUIRED` + `MORE_SOURCE_DATA_REQUIRED` |
| H. LegendStudy Scoring Model | `OWNER_DECISION_REQUIRED` + `MORE_SOURCE_DATA_REQUIRED` |
| I. Golden Set | `LEGAL_POLICY_REVIEW_REQUIRED` (real student data) → `DESIGN_ONLY` now |
| J. Metric Registry | `DEFER` |

---

## 20. Recommended Next Steps

1. **Owner/ChatGPT decision:** the **server-authorization surface** for `/admin` (and later `/school`) — this unblocks everything operator-facing and is independent of essay model selection.
2. **Build the read-mostly operator Quality Console** over existing data (find evaluation → Workbench view: answer/dimensions/CORE progress/rewrite → invalidate + operator re-eval via existing RPCs). No new table required for v0.
3. **Add `audit_log`** together with the first admin surface.
4. Keep essay model selection (L2-C3 → Round 2 → primary) on its **own** track; this review does not touch it.
5. Hold all foundation schema (quality-review table, Org/Membership, academic, admission, golden set, metric registry) for the cross-comparison of this Top-Down review with Codex's Bottom-Up audit.

---

## Final Status

```
STARTING_HEAD: 980e3b2b7845add127c5c7f1875ae068501b7444
FINAL_HEAD: c782c8725a9aa831ae48263454dc19412c78ff97
BRANCH: claude/intelligence-school-architecture

CROSS_REVIEW: COMPLETE
PRODUCT_CAPABILITY_REVIEW: COMPLETE
OWNER_DECISION_RECOVERY: COMPLETE
SOURCE_OF_TRUTH_REVIEW: COMPLETE
PREVIOUS_MASTER_ARCHITECTURE_CHALLENGE: COMPLETE
ESSAY_DOMAIN_REVIEW: COMPLETE
COMMERCIAL_DOMAIN_REVIEW: COMPLETE
SCHOOL_B2B_REVIEW: COMPLETE
ACADEMIC_REVIEW: COMPLETE
ADMISSION_REVIEW: COMPLETE
DUPLICATION_REVIEW: COMPLETE
SIMPLIFICATION_REVIEW: COMPLETE
MISSING_FOUNDATION_REVIEW: COMPLETE

ARCHITECTURE_HEALTH: HEALTHY_WITH_DEBT

PRODUCTION_CODE_CHANGED: NO
PRODUCTION_DB_CHANGED: NO
MIGRATION_CREATED: NO
MIGRATION_APPLIED: NO
RLS_CHANGED: NO
AUTH_CHANGED: NO
PROVIDER_CALLS: 0
PRODUCTION_DEPLOYED: NO

OWNER_FILES_PRESERVED: YES
SECRET_SCAN: PASS
FILES_CHANGED: docs/architecture/CROSS_REVIEW_B_TOPDOWN_CHALLENGE.md (new)
COMMIT: c782c8725a9aa831ae48263454dc19412c78ff97
PUSH: NOT_RUN (repo policy: Owner reviews commit before push)
```

*End of Cross Review B — Top-Down Architecture Challenge. Awaiting Owner/ChatGPT cross-comparison with Codex Bottom-Up audit. No further work started.*
