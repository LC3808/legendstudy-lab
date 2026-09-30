# LegendStudy — Intelligence & School Platform Master Architecture

**Phase A — Architecture Discovery & Master Design**
**Status of this document:** `PROPOSED / OWNER_REVIEW_REQUIRED`. This is a design and gap-audit artifact only. No production code, DB, migration, RLS, route, auth, or deployment change was made to produce it. See §"Final Status Report".

**Author:** Claude (architecture track) · **Date:** 2026-09-30 · **Branch:** `claude/intelligence-school-architecture`

**Investigation basis (what this design is grounded in, not guessed):**
- `legendstudy-lab` repository (this repo): source, docs, fixtures, server contracts.
- `legendstudy-app` repository (sibling Flutter app): `wiki/`, `supabase/migrations/`, decisions.
- Live Supabase project `stlhijzpjfgwwdgunlsd` (**LegendStudy**, ap-northeast-2, PostgreSQL 17) — **read-only schema/metadata inspection only**: `list_tables`, `list_migrations`, security advisors. No row data, no student content, no secrets were read; no write of any kind was issued.

> **Terminology note.** Where the live schema already defines an entity, this document treats the Codex Essay track as the **source of truth** and does **not** propose changes to it (§3, §187). Enum/label values owned by that track (e.g. `essay_improvement_progress.status`, criteria origins) are referenced as "defined by the Essay track" and are **not** re-invented here.

---

## 1. Executive Summary

LegendStudy is evolving from a free admissions-material service into a **single, connected education-data platform** spanning five domains: **Writing (Essay) Intelligence, Academic Intelligence, Admission Intelligence, Quality & Learning Intelligence, and School/Institution (B2B) Intelligence.**

The central finding of this phase is that **the foundation is much further along than the LAB repository alone suggests, and it is well-built.** The shared Supabase project already contains a sophisticated, versioned, immutable-by-design Essay evaluation engine and a double-entry credit ledger (the Codex track), on top of a provenance-first content/ingestion platform (the App track), all keyed to a single canonical identity (`auth.users.id` + `public.profiles`). Many of the Owner's stated principles — provenance, versioning, immutability, raw-vs-normalized separation, staging before canonical write, server-authoritative writes — are **already the house style** in this codebase.

The platform does **not** yet have: **B2B Organization/Membership/Program** (multi-tenant school customer model), **Coupon/Voucher** issuance, **academic transcript import** (a student's real 내신/모의고사 records, as distinct from in-app mock self-scoring), **admission official results & official university formula** data, **human quality review / golden set**, and the cross-cutting **metric registry, report snapshot, audit log, and data-access-context** layers.

The recommended path is therefore **not** a rebuild. It is: (1) protect and consume the existing Essay/credit engine as a data source; (2) add the thin, high-leverage **operator Quality Console** on top of data that already exists; and (3) lay the **Organization/Membership/Entitlement-context** foundation so the future School Platform is not blocked — while explicitly deferring Academic-transcript, Admission-results, formula-engine, and prediction work behind Owner input and privacy review.

**Readiness at a glance:**

| Track | Architecture | Implementation |
|---|---|---|
| Quality & Learning Console | `READY_FOR_OWNER_REVIEW` | `NOT_STARTED` |
| Identity / Membership / Entitlement | Identity `READY`; Org/Membership `NEEDS_OWNER_REVIEW` | `NOT_STARTED` |
| School Platform | `READY_FOR_OWNER_REVIEW` (foundation) | `NOT_STARTED` |
| Academic Intelligence | `PARTIAL` (self-score exists; transcript import `DESIGN_REQUIRED`) | `NOT_STARTED` |
| Admission Intelligence | `PARTIAL` (master/preference exist; results & formula `OWNER_INPUT_REQUIRED`) | `NOT_STARTED` |

---

## 2. What Exists Today (Current State)

### 2.1 Systems and surfaces

| Surface | Repo | Runtime | Role today |
|---|---|---|---|
| **LegendStudy+ App** | `legendstudy-app` | Flutter native | Content discovery (exam materials, study collections, columns, university essays), personal bookmarks/recent/study-timer, mock-exam self-scoring, NEIS school setting, feedback. Social-login-only. Monetization = one-time ad-removal IAP (not subscription). |
| **LegendStudy LAB Web** | `legendstudy-lab` | Static Next.js 16 export on Cloudflare Pages | Public landing + `noindex` foundation routes + **browser-only Supabase auth** (email/Google/Apple/Kakao). **No data model of its own.** Essay/My/score-analysis routes are synthetic fixtures. |
| **Shared Supabase** | — | Postgres 17 (`stlhijzpjfgwwdgunlsd`) | Single canonical identity + all persistent data for both surfaces + the Codex Essay/credit engine. |

**Identity is already unified and canonical.** Both App and LAB use `auth.users.id`; `public.profiles (id → auth.users)` is the profile, owner-RLS protected. This is the single most important existing decision — it means "one LegendStudy Identity" (Owner §6, §141, §142) is **already true**, not aspirational. LAB adds no second user store (its own docs forbid it).

### 2.2 Live schema (verified 2026-09-30) — three concentric layers

**A. Content / ingestion platform (App track, populated):**
`source_posts` (private provenance: `content_hash`, `parser_version`, `source_status`, `last_crawled_at`) → `content_items` (public, `is_active`, soft-merge) → `exams` (shared-PK extension via composite-FK discriminator; calendar-year vs academic-year) · `subjects` (versioned taxonomy: `taxonomy_version`, `curriculum_version`, parent tree) · `exam_subjects` (raw label + `mapping_status` unmapped/provisional/verified + `mapping_confidence`) · `resources` (link-kind, provenance, status). `ingestion_quarantine` holds ambiguous/failed rows privately.

**B. Personal / mock-scoring (App track):**
`profiles` (`display_name`, `grade_level` 1–3, `neis_office_code`, `neis_school_code`, `target_date`, `target_label`, `academic_status`, `onboarding_completed_at`) · `bookmarks` · `recent_views` · `study_sessions` · `day_targets` · **mock self-scoring**: `answer_key_versions` + `grade_cutoff_versions` (both versioned reference data with `source_digest`, `certainty`, `is_current`, `verified_at`, `corrected_at`) + `exam_questions` → `mock_exam_attempts` (`raw_score`, `grade`, `grade_status`) → `mock_exam_answers`.

**C. Essay Intelligence + Credit (Codex track — schema present, mostly 0 rows, actively built through migration `20260929000400`):**

- **Question/evidence master:** `universities` (5) → `essay_exams` (21; `admission_year`, `admission_track`, `campus`, `field_or_division`, `provenance`, `verification_status`, `official_source_url`, `evidence_note`) → `essay_exam_resources` (134) → `essay_questions` → `essay_question_evidence` (`source_sha256`, `mapping_version`, `source_locator`) → `essay_evaluation_criteria` (`criterion_key`, `definition_version`, `origin`, `official_weight_percent`, `source_evidence_id`).
- **Student writing loop:** `essay_practice_sessions` (`billing_policy_version`) → `essay_drafts` → `essay_attempts` (`attempt_no`, `body_sha256`, `conditions_snapshot`, idempotent `submission_key`).
- **Evaluation (immutable, versioned):** `essay_evaluations` — carries `idempotency_key`, `request_kind`, **`supersedes_evaluation_id` + `correction_reason` + `invalidated_at`/`invalidation_reason`** (immutable correction chain), `status`, `evaluation_version`, `contract_version`, `model_provider`/`model_name`/`model_version`, `prompt_version`, `regime_key`, `evidence_manifest_sha256`, `evidence_completeness`, `overall_summary`, `strengths[]`, `rewrite_checklist[]`, `uncertainty_note`, `input_sha256`/`output_sha256`.
- **Scored dimensions & learning progress:** `essay_evaluation_dimensions` (per-criterion `level_1_to_5` + explanation + uncertainty) · `essay_improvement_items` (normalized issue identity: `issue_key`, `normalized_issue_key`, `normalization_version`, `category`) · **`essay_improvement_progress`** (`status`, `previous_progress_id` → longitudinal chain, `title`, `explanation`, `next_action`, `priority`, `scaffolding_observation`) · `essay_evaluation_evidence` (evidence ↔ dimension ↔ progress) · `essay_generated_rewrites` · `essay_learning_events` (`learning_stage`, `event_type`).
- **AI telemetry:** `essay_ai_processing_runs` (`provider`/`model`/`prompt_version`, `input_tokens`/`output_tokens`, `latency_ms`, `cost_amount`, `timed_out_at`, `error_code`, lease).
- **Entitlement / credit ledger:** `credit_accounts` → `credit_grants` (`origin`, `external_reference`, `expires_at`) → `credit_transactions` (double-entry: `balance_delta`, `reserved_delta`, `reversal_of`, idempotency) + `essay_billing_decisions` (`policy_key`, `policy_version`, reserve/settle/release/reject, `included_by_decision_id`).
- **Admission preference:** `student_target_universities` (`university_id`, `admission_year`, `admission_type`, `intended_division`, `priority`, `status`, `source`).

### 2.3 Authorization & operational model (verified via advisors)

- **Owner-RLS** on personal tables (`(select auth.uid()) = user_id`).
- **Server-authoritative writes via `SECURITY DEFINER` RPCs**: `essay_open_session`, `essay_save_draft`, `essay_submit_attempt`, `essay_request_evaluation`, `essay_request_rewrite`, `essay_evaluation_status`, `essay_erase`, `essay_claim_signup_credit`, `submit_mock_attempt`, `fetch_own_mock_attempt`. Clients call RPCs; they do not write engine tables directly.
- **No-policy RLS (definer/`service_role` only)** on private/ops tables: `source_posts`, `ingestion_quarantine`, `essay_ai_processing_runs`, `feedback_notifications`, `resource_resolver_quota`, `admin_users`.
- **Single operator gate:** `admin_users` (1 row) + `is_feedback_admin()`. There is **no** least-privilege internal-staff role model yet.
- **`essay_claim_signup_credit`** already implements the free-grant-on-signup funnel entry (Owner §74/§75).
- Advisory hygiene notes (not blockers): `pg_net` in `public`; leaked-password protection off; definer RPCs are intentional but should stay off any unintended API surface.

### 2.4 House conventions already in force (reuse these — §136, §171–177)

Provenance on every ingested fact (source id/url/digest/fetched/verified/status) · versioned reference data with `is_current`/`corrected_at`/`correction_note` · versioned taxonomy + `mapping_status`/`confidence` · **raw label always preserved** alongside normalized value · **shared-PK + composite-FK discriminator** extension pattern · **immutability by supersede/invalidate**, never silent overwrite · idempotency keys on state-changing operations · **staging/quarantine before canonical** · column-level `GRANT` projections (never `SELECT *`) · definer-RPC writes. **These conventions are the platform's biggest asset and every new domain should adopt them verbatim.**

---

## 3. Major Gaps (headline)

1. **No B2B tenancy.** `profiles.neis_*` is the student's *own* school as a personal attribute, **not** an organization/customer. There is no `organizations`, `org_memberships`, staff roles, `programs`, program enrollment, institution entitlement, or tenant scoping. The entire School Platform (`school.legendstudy.com`) is greenfield.
2. **No Coupon/Voucher.** `credit_grants.origin`/`external_reference` is the *sink* where a redeemed voucher would deposit credit, but there is no voucher/coupon **issuance/redemption** entity, and none for institution-granted entitlement.
3. **No academic transcript intelligence.** In-app mock self-scoring exists; a student's **real 내신/모의고사 record** (per semester/subject, with `SELF_REPORTED` vs `SCHOOL_UPLOADED` provenance), the **school bulk import** pipeline (batch/staging/matching/conflict/correction), and transcript **subject normalization** do not.
4. **No admission results / formula data.** `universities` is name-only; there is no department/모집단위 dimension, no published 입결 (50%/70% cut, 경쟁률, 충원) with source provenance, no **official university formula** layer, and no **LS analysis model** layer (kept strictly separate).
5. **No human quality / golden-set layer.** The evaluation record is immutable and owner-status-flaggable, but there is no **human review verdict / issue-tag / reviewer-note** capture, no **quality incident**, and no **golden evaluation set** lifecycle.
6. **No cross-cutting platform layers:** metric registry (versioned metric definitions), aggregate/**report snapshot**, **audit log**, and **data-access-context** labelling (`PERSONAL` vs `SCHOOL_PROGRAM`) on essay/records.

---

## 4. Recommended Target Architecture

### 4.1 Surface & authorization boundaries

```
                         auth.users  (ONE canonical identity)
                              │  public.profiles (owner-RLS)
        ┌─────────────────────┼─────────────────────────────────┐
        ▼                     ▼                                   ▼
 LegendStudy+ App      lab.legendstudy.com               school.legendstudy.com
 (Flutter, students)   ├─ / (student LAB)                (B2B customer portal)
                       │   /essay /academic /admission    /dashboard /students
                       └─ /admin (LS internal ops)        /essay /academic
                           /quality /learning /academic    /admission /reports
                           /admission /reports /orgs        /settings
        │                     │                                   │
        └─────────── shared Supabase (Postgres) + SECURITY DEFINER RPCs ─────────┘
                    authZ = RLS(owner) + tenant-scope + role/grant + definer RPC
```

- **Authentication is shared; authorization is per-surface/context** (§142). Same `auth.users.id` everywhere; what you may *do/see* is decided by (role ∧ org membership ∧ program/cohort ∧ data-context ∧ entitlement ∧ record-source), never by role alone (§59).
- **Three distinct authorization worlds, never merged (§8, §35, §143, §144):** student-personal, LS-internal-admin, school-customer. `admin_users`-style internal grant must never be reachable from the school portal, and vice-versa.

### 4.2 Deployment recommendation (see decision table D2 & D1)

- **Internal admin / Quality Console:** `lab.legendstudy.com/admin/*` inside the existing app — **Recommended over** `/ql` or `ql.` subdomain (security parity, one deploy, shared design system).
- **School portal:** **start as `school.legendstudy.com` served by a host-routed segment of the same Next.js/Cloudflare deployment** (shared auth cookie domain `*.legendstudy.com`, shared design system, one backend), with the option to split into a separate frontend later once tenancy and load justify it. This is Option C→A blend; it keeps one auth/session model while giving the customer a distinct origin.
- **Static-export caveat:** the current LAB is a static export with browser-only auth. The Quality Console and School Portal require **server-side authorization** (cross-user/cross-tenant queries must not run in the browser). This implies introducing an authenticated server surface (Cloudflare Pages Functions / a Next server runtime / definer-RPC-only reads). **This is an architecture decision the Owner must approve before any admin/portal implementation** (it changes LAB's "static + browser-auth" invariant). Flagged as `OWNER_REVIEW_REQUIRED`.

### 4.3 The five domains as one platform

All five domains hang off the one identity and share the RAW→NORMALIZED→DERIVED→AGGREGATED→REPORTING spine (§54) and the provenance/version conventions. They connect but each keeps its own **source of truth** (§171): Essay evaluation = the immutable Essay track records; Academic = canonical academic record + provenance; Admission = verified normalized official-source record; Metric = domain facts + versioned metric definition; Dashboards/Reports = *derived* presentation, never a second source of truth; Analytics events = telemetry, never canonical learning truth (§58, §70).

---

## 5. Internal Admin Architecture (`lab.legendstudy.com/admin`)

**Purpose:** LS operators verify real evaluation quality, curate evidence/admission sources, and read platform-wide operations — on data the engine already produces.

**Least-privilege staff model (replaces the single `admin_users` boolean) — PROPOSED:** an internal-staff grant table keyed to `auth.users.id` with role scopes such as *platform-owner, essay-quality-reviewer, academic-data-operator, admission-data-reviewer, B2B-operator, support* (§101). Actual role enum is `OWNER_INPUT_REQUIRED`; the point is that "quality reviewer" ≠ "can manage org contracts" ≠ "can read raw PII". PII minimization in internal tools (§102): the Quality Console defaults to an **internal learner alias**, not name/email.

**Sections:** `/admin/overview`, `/admin/quality`, `/admin/learning`, `/admin/academic`, `/admin/admission`, `/admin/reports`, `/admin/orgs`. Route names are proposals (§46).

---

## 6. School Platform Architecture (`school.legendstudy.com`)

**Foundation entities (all PROPOSED, none exist):**

```
organizations (type: high_school | academy | institution | …  -- enum OWNER_INPUT_REQUIRED)
   └─ school_profile (school-specific extension: NEIS office/school code, region, grade structure)   ← §139
   └─ org_contracts → org_plans → institution_entitlement_allocations                                ← §95, §96
   └─ programs (e.g. "OO高 2027 논술집중반": period, target grade, entitlement, staff, cohort)         ← §79
   └─ org_memberships (auth.users ↔ organization, role, cohort/grade, academic-year history)          ← §32, §93
   └─ org_staff_assignments (teacher ↔ program/cohort → permitted students)                           ← §81
   └─ institution_roster_persons (roster identity BEFORE a user exists) ── claim ──▶ auth.users        ← §33, §34
   └─ org_data_access_grants (who may see which student data, in which context)                        ← §31, §59
```

**Non-negotiable principles baked into the model:**
- **Identity ≠ Membership ≠ Entitlement (§6).** A student keeps their personal identity and data when a contract ends; only the institution entitlement and org access end (§32, §98).
- **School access ≠ ownership (§31).** A school buying a service does not become owner of the student's personal LegendStudy data.
- **Roster ≠ user (§33).** An uploaded roster person is a distinct object until an explicit claim/link to an `auth.users` identity; never auto-fabricate shadow accounts.
- **Personal vs program data context (§30).** Every essay/record carries a context (`PERSONAL` vs `SCHOOL_PROGRAM` vs `SCHOOL_PROVIDED`) — a school sees program/provided data, **not** a student's personal free/paid activity. Enum values `OWNER_INPUT_REQUIRED`.
- **Multi-tenant isolation (§61):** every org-scoped row carries `organization_id`; cross-tenant reads are impossible by RLS + server authorization; `service_role` never reaches the browser.

**Coupon/Voucher relationship (§7, §97):** model Organization→Membership→Entitlement as the spine; a **voucher/coupon is one *mechanism* that grants/activates an entitlement** (it deposits into the existing `credit_grants`/entitlement, via `origin`/`external_reference`). Do **not** equate a coupon with membership. Reuse the existing credit-grant sink rather than building a parallel entitlement store.

---

## 7. Quality & Learning Intelligence

**Key insight: most of this is a *read* on data that already exists.** The engine already stores strengths, per-criterion levels, normalized issues, longitudinal progress (`previous_progress_id`), rewrites, model/prompt/contract/evidence versions, latency, cost, and failures. Learning and AI-quality metrics are **derivations**, not new capture — except the **human review layer**, which is the one genuinely new store.

**PROPOSED new tables (additive; do not modify Essay track):**
- `essay_quality_reviews` — reviewer, target `evaluation_id`, overall verdict (PASS/PARTIAL/FAIL — enum to align with Essay track), plus structured judgments (official-criterion accuracy, major-issue recall, false-criticism, priority quality, concrete guidance, stance preservation, positive-learning quality, excessive feedback), `reviewer_note`, immutable, versioned. **Never mutates the student's evaluation** (§39, §106); a correction is a *new* evaluation via the engine's existing `supersedes_evaluation_id`.
- `quality_incidents` — severity, affected version(s), affected-evaluation query, discovered/mitigated/resolved (§107, §108 version-impact analysis — feasible because every evaluation records its versions).
- `golden_eval_candidates` → review → approval → `golden_eval_benchmarks` (sanitized) — a **lifecycle**, not auto-copy-on-PASS (§13, §65).

**Quality Console ≠ Product Analytics (§10).** Product telemetry (signups, conversion, retention) stays in a separate analytics path that **never receives raw student content or evaluations** (§58).

**Metric registry (PROPOSED, §72):** versioned metric definitions (`metric_key`, `metric_version`, numerator/denominator/exclusions, aggregation grain, `effective_from`, status) so a report from 2027 remains reproducible when a definition changes. Metrics are recomputable from domain facts (§71); dashboards never store a number without its lineage (§55).

---

## 8. Academic Intelligence

**Distinguish two things the current schema conflates in conversation but not in data:**
- **In-app mock self-scoring (EXISTS):** `mock_exam_attempts` — the student takes a mock in-app; result derived from versioned answer-key/grade-cutoff reference data.
- **Real academic transcript (MISSING):** the student's actual 내신/모의고사 record per **academic-year/semester/subject/exam**, which may be self-entered or school-uploaded.

**PROPOSED academic model (raw-first, §15, §133):**
- `academic_records` (canonical): subject (normalized, reusing the existing `subjects` versioned taxonomy) + raw subject label preserved; academic-year, semester, exam identity; **raw** original grade, raw score, class average, std dev, achievement, percentile, standard score — plus a **provenance/source** (`SELF_REPORTED` | `SCHOOL_UPLOADED` | `VERIFIED_INSTITUTION` | `OTHER_IMPORT` — enum `OWNER_INPUT_REQUIRED`, §18).
- Derived analysis (GPA/trend/strength) is **DERIVED + VERSIONED**, never stored as if raw (§15). `missing ≠ 0 ≠ not_assessable` (§120, §133, §134).
- **Conflict handling (§19):** self-reported vs school-uploaded for the same slot never silently overwrites; keep both with source priority + correction history + conflict state.
- **School bulk import (§16, §17, §83–86) — CAPABILITY DESIGN ONLY, implementation forbidden this phase:** `academic_import_batches` → `academic_import_staging_rows` → validate → student matching → subject/semester normalization → error report → preview → staff confirm → versioned canonical records. Excel schema, matching policy, and rollback are `OWNER_INPUT_REQUIRED` / `DESIGN_REQUIRED`. Never write canonical records directly from an upload.

---

## 9. Admission Intelligence

**PROPOSED (master exists as `universities`+`essay_exams`; results/formula MISSING):**
- Dimensions: `universities` (extend) → `departments`/모집단위 → `admission_types`(전형) × `admission_year` (a **core dimension**, never overwritten year-to-year, §92).
- `admission_results` (published 입결): 모집인원/경쟁률/충원/50%·70% cut/평균 — **with full source provenance** (source institution/document/URL, publication date, admission year, page, extraction version, verification state, collected_at, source hash — Essay-evidence principle reused, §21). **Never store an unpublished cut or a fabricated value; `NULL ≠ 0` for undisclosed cuts** (§20, §120).
- **Two strictly separate calculation layers (§23, §25):** an **official university formula** layer (declarative, versioned, linked to official source, regression-tested) and a **LegendStudy analysis model** layer (versioned, internal provenance, clearly labelled non-official). They must never share a namespace or be shown as the same number (§24 is an *extension point only* — no formula, weight, or high-school adjustment is created this phase; all `OWNER_INPUT_REQUIRED`).
- **Admission Explorer** connects published 입결 + student score + official conversion + subject fit + target university — but **prediction is a separate future layer** (§26): no "합격 가능성 78%" without a validated study design.

---

## 10. Identity / Membership / Entitlement

| Concept | Definition | Status |
|---|---|---|
| **Identity** | Who the user is. `auth.users.id` + `profiles`. | **EXISTS, canonical, shared.** `ADR-01/02` effectively already true. |
| **Membership** | Which org/school the user belongs to (role, cohort, year-history). | **MISSING** — greenfield `org_memberships`. |
| **Entitlement** | What services/credits the user may use. | **PARTIAL** — personal essay credit ledger EXISTS; institution entitlement + non-essay entitlements MISSING. |

Contract end terminates institution entitlement and org access, **not** personal identity or personal data (§32, §98, §99). A voucher/coupon grants/activates entitlement; it is not membership (§7).

---

## 11. Privacy / Security

**Users are likely minors — privacy is first-class (§57).** Legal conclusions are **not** decided here; items needing counsel are marked `LEGAL/POLICY REVIEW REQUIRED`.

- **Data-context boundary (§30, §31):** school reads program/provided data only; personal free/paid activity is not auto-visible to a school. Enforced by a `data_context` label + `org_data_access_grants`, not by role alone.
- **Tenant isolation (§61):** `organization_id` on every org row; RLS + server authorization; `service_role` never in the browser (§60). The static-export/browser-auth model **cannot** safely serve cross-student/cross-tenant data — server authorization is required first (§4.2).
- **Aggregation privacy (§62):** minimum-cohort suppression for school reports (threshold `OWNER/POLICY` decision; do not hard-code a number this phase).
- **Analytics separation (§58):** no raw answers/scores/evaluations into product analytics.
- **Audit (§100):** PROPOSED `audit_log` for sensitive actions (student-record view, import confirm, score correction, membership/permission change, report export, quality review, golden-set approval) — not every page view.
- **Retention classes (§63)** and **purposeful export boundaries (§64)** designed as concepts; periods are `LEGAL/POLICY REVIEW REQUIRED`.
- **Impersonation ("view as student", §103):** NOT built; if ever needed → explicit permission + audit + reason + time-limit + read-only default.
- **Existing hygiene to schedule (from advisors):** move `pg_net` out of `public`; enable leaked-password protection; keep definer RPCs off unintended API surface; confirm no-policy-RLS ops tables stay definer/service-role only.

---

## 12. Data Model Gap Audit

Legend: **E**=Exists · **P**=Partial · **M**=Missing · **C**=Conflicting.

| Domain | State | Current source (table/code) | Gap | Risk | Recommended direction | Phase |
|---|---|---|---|---|---|---|
| Identity | **E** | `auth.users`, `public.profiles` | none material | Low | Keep single canonical identity; no LAB/portal user store | — |
| Profile | **E** | `profiles` (neis_*, grade, targets) | school-code is *personal* attr, not org | Low | Reuse; link to org via membership, not by rewriting profile | P0 |
| Organization | **M** | — | no tenant entity | **High** | New `organizations` + `school_profile` extension (generic type) | P0(found.)/P1 |
| Membership | **M** | — | no user↔org link | **High** | New `org_memberships` + year/cohort history | P0(found.)/P1 |
| Entitlement | **P** | `credit_accounts/grants/transactions`, `essay_billing_decisions` | personal essay only; no institution/non-essay | Med | Extend grant `origin` for institution/voucher; keep ledger | P0/P1 |
| Coupon/Voucher | **M** | `credit_grants.external_reference` (sink only) | no issuance/redemption entity | Med | New voucher issuance→redeem→grant; do **not** duplicate ledger | P1 |
| Institution Program | **M** | — | — | Med | New `programs` + enrollment + program data-context | P1 |
| Essay attempt/eval history | **E** | `essay_attempts`, `essay_evaluations` (+dims/evidence) | none — immutable, versioned | Low | **Consume as-is; do not modify (Codex)** | — |
| Essay progress (learning) | **E** | `essay_improvement_items/progress` (chain) | none | Low | Derive learning metrics from it | P1 |
| Quality review (human) | **M** | evaluation `status`/`supersede` + `admin_users` | no verdict/issue-tag/notes capture | **High** | New `essay_quality_reviews` (additive) | **P0** |
| Learning metrics | **P** | derivable facts exist | no metric registry | Med | New versioned metric registry | P1 |
| Golden Set | **M** | — | — | Med | Candidate→approve→sanitized benchmark lifecycle | P1 |
| Academic raw record | **M** | `mock_exam_attempts` (self-score only) | no transcript per sem/subject | Med | New `academic_records` raw-first + provenance | P1 |
| Academic import batch/staging | **M** | — | — | Med | Batch→staging→validate→match→preview→confirm | P1 (design), later impl |
| Academic correction/history | **M** | (pattern exists in ref-data) | — | Med | Reuse supersede/correction pattern | P1 |
| Subject taxonomy | **E** | `subjects` (versioned) | transcript subjects not yet mapped | Low | Reuse; add transcript mappings | P1 |
| Exam/semester/year | **P** | `exams` (content), mock refs | no student-transcript semester model | Med | Add academic-year/semester dims to `academic_records` | P1 |
| University | **P** | `universities`(5), `essay_exams` | name-only; no dept/모집단위 | Med | Extend with departments/admission_type/year | P1/P2 |
| Department/major | **M** | — | — | Med | New dimension | P1/P2 |
| Admission type/year | **P** | on `essay_exams`/`student_target_universities` | not a shared dimension for results | Med | Promote to shared dimensions | P1/P2 |
| Admission official result | **M** | — | no 입결 cuts/ratios | Med | New `admission_results` + provenance | P2 |
| Admission source provenance | **P** | pattern exists (essay evidence) | not applied to admission results | Med | Reuse evidence/provenance pattern | P2 |
| University official formula | **M** | — | — | **High** | New versioned formula layer (needs Owner data) | P2 · OWNER_INPUT |
| LS scoring model | **M** | — | — | **High** | Separate versioned model layer (extension point only) | P2 · OWNER_INPUT |
| Formula/model version | **M** | version pattern exists in Essay | not for formula/model | Med | Reuse version+effective-dating | P2 |
| Student admission preference | **E** | `student_target_universities` | none | Low | Consume | P1 |
| Human review / verification workflow | **P** | `verification_status` on evidence/exams; `admin_users` | no generalized review queues | Med | Common review-queue pattern (careful, per-domain meaning) | P1 |
| Metric registry | **M** | — | — | Med | New versioned registry | P1 |
| Aggregate/report layer | **M** | — | — | Med | Derived + report snapshot | P1/P2 |
| Audit log | **M** | — | — | **High** | New `audit_log` for sensitive actions | P0/P1 |
| Data access grant/context | **M** | — | context label absent on essay/records | **High** | `data_context` + `org_data_access_grants` | **P0**(concept)/P1 |
| School report | **M** | — | — | Med | Snapshot + threshold suppression | P2 |
| Internal quality report | **M** | facts exist | — | Med | Derived from quality + telemetry | P1 |

---

## 13. IA / Dashboard Proposal (wireframe-level, no implementation §149, §150)

**Required internal screens (§151):** Admin Overview · Essay Quality Dashboard · Essay Review Workbench · Student Learning Timeline · Academic Dashboard · Academic Import Mgmt · Admission Data Admin · Admission Explorer (admin preview) · Reports · Org/School Mgmt.
**Required school screens:** School Dashboard · Student List · Student Detail · Essay Learning · Academic Dashboard · Academic Import · Admission Explorer · School Reports · Staff/Permission Settings.
**Navigation principle (§45):** OVERVIEW → TREND → DISTRIBUTION → DRILL-DOWN → RAW EVIDENCE. Charts always expose period, cohort, metric definition, and **n** (§131, §132). Every KPI is clickable down to the underlying evaluation/student/cohort.

**Essay Quality Dashboard (illustrative — no fabricated numbers, §150):**
```
┌───────────────────────────────────────────────────────────────┐
│ Essay Quality                        [period ▾][model ▾][prompt ▾] │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│ Evals    │ Students │ 1st att. │ Rewrites │ Reviewed │ Timeouts │
│   —      │   —      │   —      │   —      │  —/—/—   │   —      │
├──────────┴──────────┴──────────┴──────────┴──────────┴──────────┤
│ Human quality trend (PASS/PARTIAL/FAIL)   [line, by prompt ver] │
├───────────────────────────────┬──────────────────────────────── │
│ Issue distribution (by criterion)│ Review queue (risk-ranked)    │
│ [bar]                            │ [table: alias · uni · attempt]│
├──────────────────────────────────┴──────────────────────────────┤
│ Recent evaluations → click → Review Workbench                    │
└───────────────────────────────────────────────────────────────┘
```
**Review Workbench (§48):** one screen, top-to-bottom flow — Question/official criterion → Student answer → AI evaluation → Strengths → CORE/NON-CORE → sentence/dimension feedback → Rewrite → previous-CORE progress (from `previous_progress_id`) → Human review form (writes `essay_quality_reviews`, never the evaluation).
**Student Learning Timeline (§49):** attempts as a vertical timeline; each node shows which issues were OPEN/IMPROVED/RESOLVED/RECURRED (statuses per Essay track), so the operator sees *what was learned*, not just "3 evaluations".
**School Dashboard (§28):** student/essay/academic/admission/ops tiles, aggregate-only, with cohort-size suppression; never includes personally-scoped non-program data.

---

## 14. P0 / P1 / P2 Roadmap

**P0 — foundations that prevent expensive rework and enable day-one quality (§155, §156, §157, §179, §180):**
- Protect & document the Essay/credit engine as an upstream data source (no changes).
- `essay_quality_reviews` (additive) + minimal **Quality Console** (list/find evaluation → Review Workbench → record verdict/issue-tags/note) using data that already exists.
- `audit_log` for sensitive operator actions; internal-staff least-privilege grant (replace bare `admin_users`).
- `data_context` concept + decision on Organization/Membership/Entitlement-context direction (so B2B is not blocked, §180).
- **Server-authorization surface decision** (§4.2) — prerequisite for any admin/portal.
- Confirm P0 domain-fact preservation checklist (below).

**P1 — early operating expansion:**
Quality/Learning dashboards + metric registry v1 · Golden-set workflow · Organization/Membership/Program foundation + voucher-grants-entitlement · School roster + claim/link · academic raw-record foundation + import **staging** design · academic dashboard v1 · school dashboard v1 · internal reports.

**P2 — depth:**
Admission departments/results + source verification + Admission Explorer · official formula engine (+ regression fixtures) · LS scoring model (extension point → real model once Owner data arrives) · subject/major weighting · school academic bulk-import implementation · B2B impact reports + benchmark · warehouse/OLAP **only if** measured need (§68, §176).

**P0 domain-fact preservation checklist (§157 — capture from day one even before dashboards):** attempt, evaluation + all versions (model/prompt/contract/evidence), strengths, dimensions, improvement items + progress chain, entitlement/credit context, latency/cost/failure, and — newly — **human review** and **data-context**. Most already persist; the two new ones are the P0 adds.

---

## 15. Implementation Dependency Graph

```
Identity(E) ─▶ Internal-staff grant + audit_log ─▶ Quality Console (uses existing Essay facts)
Essay engine(E) ─▶ essay_quality_reviews ─▶ Quality/Learning metrics ─▶ Golden Set ─▶ B2B learning report
Identity(E) ─▶ Organization ─▶ Membership ─▶ Entitlement-context/Voucher ─▶ Program ─▶ School Portal
Academic raw record ─▶ normalization(subjects reuse) ─▶ school import(staging) ─▶ Academic Intelligence ─▶ Admission comparison
Admission source ─▶ normalized results ─▶ official formula ─┐
                                          LS analysis model ─┴▶ student comparison ─▶ Admission Explorer
Server-authorization surface ─▶ (gates every /admin and /school screen)
```

---

## 16. Architecture Risk Register

| # | Risk | Impact | Likelihood | Mitigation | Owner (role) | Phase |
|---|---|---|---|---|---|---|
| R1 | Personal vs school data boundary failure | High | Med | `data_context` + access grants; default personal-private | Security eng | P0 |
| R2 | Tenant data leak (org A↔B) | High | Med | `organization_id` + RLS + server authZ; no `service_role` in client | Security eng | P0/P1 |
| R3 | Identity duplication (portal/LAB second store) | High | Low | Single `auth.users`; forbid new user store (already policy) | Identity eng | P0 |
| R4 | Roster↔user mismatch | Med | High | roster-person entity + explicit claim; no shadow accounts | B2B eng | P1 |
| R5 | Score source conflict silently overwritten | Med | Med | keep both + provenance + conflict state | Academic eng | P1 |
| R6 | Admission extraction error | Med | Med | provenance + verification workflow; NULL≠0 | Admission eng | P2 |
| R7 | Official vs LS analysis confusion | High | Med | separate layers + labels in data & UI | Product/eng | P2 |
| R8 | AI quality miss undetected | High | Med | Quality Console + risk-based sampling | Quality ops | P0 |
| R9 | Metric drift breaks past reports | Med | Med | metric registry + report snapshots | Data eng | P1 |
| R10 | Minor-data over-exposure | High | Med | PII minimization + retention + audit | Security/legal | P0+ |
| R11 | B2B report over-claims causation | High | Med | evidence tiers A–D; no causal claim w/o design | Product | P1/P2 |
| R12 | P0 over-engineering | Med | Med | P0 = quality + preservation only | Architecture | P0 |
| R13 | Schema conflict with Codex Essay track | High | Med | additive-only; consume, never modify; separate branch | All eng | P0 |
| R14 | Duplicating existing credit/entitlement | Med | Med | reuse credit ledger as entitlement sink | B2B eng | P1 |
| R15 | Admin/portal built on browser-auth static export | High | Med | require server-authorization surface first (§4.2) | Architecture/security | P0 |

---

## 17. Proposed ADRs

Only decisions confirmed by investigation are `ACCEPTED`; the rest are `PROPOSED`/`OWNER_REVIEW_REQUIRED`.

| ADR | Decision | Status |
|---|---|---|
| ADR-01 | One LegendStudy Identity (`auth.users.id`), multiple memberships | **ACCEPTED** (already true) |
| ADR-02 | Identity ≠ Membership ≠ Entitlement | **ACCEPTED** (principle; membership store PROPOSED) |
| ADR-03 | Internal Admin authZ separate from School Portal authZ | PROPOSED |
| ADR-04 | Academic import uses staging→confirm before canonical write | PROPOSED |
| ADR-05 | Official university calculation strictly separate from LS analysis | PROPOSED |
| ADR-06 | Quality/evaluation history immutable; correction = new superseding record | **ACCEPTED** (engine already implements supersede/invalidate) |
| ADR-07 | Public-source (admission) data requires provenance + verification | PROPOSED (pattern proven in Essay evidence) |
| ADR-08 | Operational Postgres first; warehouse/OLAP deferred until measured | PROPOSED |
| ADR-09 | Personal activity is not automatically school-visible | PROPOSED |
| ADR-10 | Additive-only relative to the Codex Essay track; consume, never modify | **ACCEPTED** (branch/process) |
| ADR-11 | Reuse the existing credit ledger as the entitlement sink; voucher grants entitlement | PROPOSED |
| ADR-12 | Internal admin & school portal require a server-authorization surface (not browser-only static) | PROPOSED · OWNER_REVIEW_REQUIRED |

---

## 18. Owner Decisions Required

| # | Decision | Why needed | Options | Recommended timing |
|---|---|---|---|---|
| 1 | Scope of school visibility into personal Essay | privacy boundary core | program-only / opt-in / none | Before School P1 |
| 2 | Student/guardian consent & minor-data policy | legal, minors | — (`LEGAL/POLICY`) | Before any school data |
| 3 | Post-contract data access | offboarding | dashboard-off + export / retain-historical | Before School contract signing |
| 4 | School-provided grade → personal account succession | data ownership | link / keep-separate | P1 |
| 5 | Roster↔user matching method | privacy risk | invite-code / claim / admin-approve | P1 |
| 6 | Academic source priority (self vs school) | conflict resolution | school-wins / verified-wins / show-both | P1 |
| 7 | Golden-set use of real student data | privacy | sanitized-only + approval | P1 |
| 8 | B2B report minimum cohort size | re-identification | threshold N | P2 |
| 9 | High-school adjustment model & formula | no data yet | `OWNER_INPUT_REQUIRED` | P2 |
| 10 | Subject/major weighting | no data yet | `OWNER_INPUT_REQUIRED` | P2 |
| 11 | Admission prediction | evidence bar | defer to validated study | Future |
| 12 | School benchmark / ranking | sensitive | off by default (§116) | P2+ |
| 13 | Data retention periods | legal | `LEGAL/POLICY` | P0+ |
| 14 | **Server-authorization surface for /admin & /school** | changes LAB static invariant | Pages Functions / Next server / definer-RPC-only | **Before any admin/portal build** |
| 15 | Internal-staff role enum & org-type enum | least privilege / generic org | `OWNER_INPUT_REQUIRED` | P0/P1 |

**Owner input package mapping (§183):** university official reflection data → formula layer; subject/major weights → weight model; high-school adjustment data → LS scoring model extension point; past admission-service data → admission results; school Excel samples → import staging design; B2B contract ideas → org contract/plan/entitlement.

---

## 19. Decision Tables (§166)

**D1 — Quality Console URL:** `/admin/quality` (**Recommended**: security parity with internal admin, one deploy, shared design system) vs `/ql` (thin, but weaker separation) vs `ql.` subdomain (extra origin/cookie/deploy complexity, no benefit now).
**D2 — School frontend:** same-app host-routing (**Recommended start**: shared auth cookie `*.legendstudy.com`, one backend, distinct origin) vs separate frontend + shared backend (later, when tenancy/load justify) vs internal-route-then-split.
**D3 — Organization model:** school-specific tables (rejected: blocks academies/institutions) vs **generic `organizations` + `school_profile` extension (Recommended, §138–140)**.
**D4 — Academic import:** direct canonical write (rejected: unsafe) vs **staging + confirmation (Recommended, ADR-04)**.
**D5 — Analytics storage:** operational Postgres first (**Recommended**, ADR-08) vs early warehouse (rejected: no measured need). Each with advantage/disadvantage/security/complexity as above; recommendation column is the bolded option.

---

## 20. First Implementation Unit & Handoff (§196, §197)

**Recommended first unit: `Q1 — Essay Quality Review Persistence + Minimal Quality Console`** (highest value, lowest risk, unblocks the Owner's #1 business priority §179, uses data that already exists, additive-only).

Implementation units (each: purpose · dependency · DB impact · security impact · UI impact · tests · migration · owner decision):
- **Q1 Quality Review Persistence** — capture human verdict/issue-tags/note on existing evaluations. dep: internal-staff grant + audit. DB: +`essay_quality_reviews` (additive). sec: internal-only, alias PII. tests: immutability, review≠evaluation-mutation. migration: 1 additive. owner: verdict enum.
- **Q2 Quality Console P0** — find→Workbench→record. dep: Q1 + server-authZ surface. 
- **Q3 Learning Metrics v1** — derive from progress chain + metric registry.
- **S1 Org/Membership foundation**, **S2 School Portal authZ**, **S3 Roster/claim** — B2B spine.
- **A1 Academic raw-record foundation**, **A2 Academic import staging (design)**, **A3 Academic dashboard v1**.
- **D1 Admission source foundation**, **D2 Admission normalization**, **D3 Admission Explorer v1**.

**Security acceptance criteria (§199):** org A ⊄ org B · teacher ⊄ unauthorized student · school ⊄ personal essay · student ⊄ other student · no `service_role` in client · internal admin requires explicit grant · sensitive exports authorized+audited · raw content ∉ analytics · private quality artifacts protected · school upload validated before canonical.
**Data acceptance criteria (§200):** raw preserved · provenance preserved · normalized links to source · derived records model/formula version · no silent overwrite · missing≠0 · unverified≠verified · metric reproducible · correction traceable · admission_year explicit · academic year/semester explicit.
**Product acceptance criteria (§201):** operator can trace answer→AI→rewrite→progress in one flow · learner improvement visible per attempt · teacher sees only permitted students/programs · academic source & change distinguished · official vs LS analysis distinguished · every reported number traceable to definition + source.

---

## Final Status Report (§205)

```
STARTING_HEAD: bc340aab01747ebea6a807290fe38fe249e11544
FINAL_HEAD: 1643db30ed95da01f5f46f418378df8734223b52
BRANCH: claude/intelligence-school-architecture

ARCHITECTURE_PHASE: COMPLETE
PRODUCTION_CODE_CHANGED: NO
PRODUCTION_DB_CHANGED: NO
MIGRATION_CREATED: NO
MIGRATION_APPLIED: NO
RLS_CHANGED: NO
PRODUCTION_DEPLOYED: NO

CURRENT_SYSTEM_REVIEW: PASS
LEGENDSTUDY_LAB_REVIEW: PASS
RELATED_APP_ARCHITECTURE_REVIEW: PASS (legendstudy-app repo + shared Supabase inspected)
COUPON_VOUCHER_REVIEW: PARTIAL (no voucher/coupon entity exists; credit ledger is the entitlement sink)
ESSAY_ARCHITECTURE_REVIEW: PASS (live schema inspected read-only; treated as source of truth, unchanged)

IDENTITY_ARCHITECTURE: READY
ORGANIZATION_ARCHITECTURE: NEEDS_OWNER_REVIEW
MEMBERSHIP_ARCHITECTURE: NEEDS_OWNER_REVIEW
ENTITLEMENT_ARCHITECTURE: READY (personal) / NEEDS_OWNER_REVIEW (institution)
QUALITY_INTELLIGENCE_ARCHITECTURE: READY
LEARNING_INTELLIGENCE_ARCHITECTURE: READY
ACADEMIC_INTELLIGENCE_ARCHITECTURE: PARTIAL
ADMISSION_INTELLIGENCE_ARCHITECTURE: PARTIAL
SCHOOL_PLATFORM_ARCHITECTURE: READY (foundation) / NEEDS_OWNER_REVIEW (policy)

QUALITY_CONSOLE_IA: READY
SCHOOL_PORTAL_IA: READY
ACADEMIC_IMPORT_ARCHITECTURE: DESIGN_REQUIRED
ADMISSION_SOURCE_ARCHITECTURE: PARTIAL
B2B_REPORT_ARCHITECTURE: PARTIAL

DATA_MODEL_GAP_AUDIT: COMPLETE
SECURITY_GAP_AUDIT: COMPLETE
PRIVACY_DECISIONS_PENDING: minor-consent, retention, personal↔school visibility, post-contract access, golden-set data use, cohort threshold
OWNER_DECISIONS_REQUIRED: see §18 (15 items)

P0_RECOMMENDATION: protect Essay engine as source; add essay_quality_reviews + minimal Quality Console + audit_log + staff grant; decide Org/Membership/data-context direction; decide server-authZ surface
P1_RECOMMENDATION: quality/learning dashboards + metric registry; org/membership/program + voucher; roster/claim; academic raw+import staging; academic/school dashboards
P2_RECOMMENDATION: admission results/formula/explorer; LS scoring model; weighting; bulk-import impl; B2B impact + benchmark; warehouse only if needed
FIRST_IMPLEMENTATION_UNIT: Q1 — Essay Quality Review Persistence + Minimal Quality Console

NEW_DOCUMENTS: docs/architecture/INTELLIGENCE_SCHOOL_PLATFORM_MASTER.md
UPDATED_DOCUMENTS: none
CODE_FILES_CHANGED: NONE
OWNER_FILES_PRESERVED: YES
SECRET_SCAN: PASS (no credentials/keys/UUIDs/student data recorded)
COMMIT: 1643db30ed95da01f5f46f418378df8734223b52
PUSH: NOT_RUN (awaiting Owner review, per App decisions.md commit-review policy)
LOCAL_REMOTE_SYNC: NOT_RUN
```

## Decision Gate (§206)

```
MASTER_ARCHITECTURE: READY_FOR_OWNER_REVIEW
QUALITY_AND_LEARNING_INTELLIGENCE: READY_FOR_OWNER_REVIEW
SCHOOL_PLATFORM: READY_FOR_OWNER_REVIEW
ACADEMIC_INTELLIGENCE: READY_FOR_OWNER_REVIEW
ADMISSION_INTELLIGENCE: READY_FOR_OWNER_REVIEW
IDENTITY_MEMBERSHIP_ENTITLEMENT: READY_FOR_OWNER_REVIEW
DATA_PRIVACY_SECURITY: NEEDS_EXTERNAL_REVIEW (minor-data / retention / consent → legal)

P0_IMPLEMENTATION_PLAN: READY_FOR_OWNER_REVIEW

READY_FOR_PRODUCTION_IMPLEMENTATION: NO
READY_FOR_DB_MIGRATION: NO
READY_FOR_SCHOOL_PORTAL_DEPLOYMENT: NO
READY_FOR_ACADEMIC_IMPORT: NO
READY_FOR_ADMISSION_SCORING_MODEL: NO
```

## Conflict Review (§187)

No hard conflict with an existing *accepted* decision was found. Two items need Owner awareness: (a) **LAB's "static export + browser-only auth" invariant** is incompatible with serving cross-user/cross-tenant admin/school data → a server-authorization surface must be approved first (ADR-12); (b) the Codex Essay track is the **source of truth** for all essay/credit/evaluation structures — this document is strictly additive and proposes **no** change to it. Any future need to alter an Essay-track table must be raised with that track's owner, not made here.

*End of Phase A master architecture.*
