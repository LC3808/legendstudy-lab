# LEC-1 — Canonical Essay / Quality Read Contract Mapping (LAB consumer)

**Status:** LAB-specific implementation mapping. Not a Shared Backend schema document.
**Date:** 2026-10-01
**Scope:** How the LAB Web (Next.js static export) consumes the deployed canonical
Quality read contract `ql-read-v1`. LAB is a **consumer only**; it owns no Essay
schema, no Quality data store, and no canonical DTO.

> This document maps *existing LAB prototype/mock structures* to the canonical
> `ql-read-v1` surface and records the KEEP / ADAPT / REMOVE / TEST_ONLY / DEFER
> decision per source. It does **not** reproduce the Shared Backend schema. The
> authoritative schema/RPC/code lives with the App track + live DB
> (`LC3808/legendstudy-app`). Project-level navigation authority is the Unified
> Wiki (`LC3808/legendstudy-docs`).

---

## 0. Canonical consumer boundary

LAB consumes **only** the deployed canonical RPC surface, through the existing
browser Supabase authenticated session:

| RPC | Shape | Authorization |
| --- | --- | --- |
| `is_quality_operator()` | `boolean` | SECURITY DEFINER; derived only from verified JWT `auth.uid()` |
| `ql_list_cases(p_limit int=50, p_before timestamptz=null, p_before_id uuid=null)` | `jsonb` envelope | operator-gated in DB |
| `ql_case_detail(p_evaluation_id uuid)` | `jsonb` | operator-gated in DB |

DTO: **`ql-read-v1`**.

LAB does **not**: query Essay tables directly, duplicate Essay/Quality schema,
use a privileged service key in the browser/runtime, infer undocumented JSON
properties, create a second canonical DTO, or use `profile`/`school`/`admin_users`
/ email / caller-supplied id as Quality authorization. Pseudonym is presentation
only, never authority.

---

## 1. Critical discovery — deployed contract vs. in-repo draft SQL

There are **two different shapes** in play. They must not be confused:

1. **Deployed canonical `ql-read-v1`** — authority for this task is the canonical
   contract (task brief §3–§5). Deployed migration
   `20261001000100_quality_read_authorization`, `APPLIED_TRACKED`,
   `PRODUCTION_VERIFIED`. Characteristics:
   - `ql_list_cases` returns a **jsonb envelope** `{ dto_version, cases[], next_cursor }`.
   - **Paired keyset cursor** `{ requested_at, evaluation_id }` and a
     `p_before_id uuid` parameter.
   - Richer detail groups incl. `sentence_feedback`, `scaffolding_availability`,
     `core_improvement_keys`, CORE membership via a `core_focus` signal, and
     `core_count` in the list.

2. **In-repo LSA-2 draft SQL** — `docs/architecture/lsa2/01_quality_operator_foundation.sql`
   on branch `claude/intelligence-school-architecture` (commit `7bd9f2d`,
   *"migration ready, not applied"*). This is an **earlier, thinner** shape:
   - `ql_list_cases` returns a flat `TABLE(...)`, **single** `p_before timestamptz`
     cursor, **no `dto_version`**.
   - `ql_case_detail` returns jsonb but **omits** `sentence_feedback`,
     `scaffolding_availability`, and `core_focus` (an in-file NOTE states the
     canonical sentence-feedback source and CORE rule were unresolved at draft time).

**Decision:** LAB consumes the **deployed canonical `ql-read-v1`** (shape #1).
The draft SQL (#2) is treated as historical architecture evidence only and is
**not** the consumer contract. This divergence does **not** require any Shared
Backend change for LAB — LAB consumes the deployed, richer contract as-is.

**Consumer consequence (fail-closed):** if the live surface were ever to return
the thinner draft shape (no `dto_version`, flat table), the LAB adapter rejects it
as `UNSUPPORTED_DTO` / `MALFORMED_RESPONSE` rather than silently mis-rendering.
That is the correct safe outcome, not a bug to paper over.

---

## 2. `ql-read-v1` consumer representation ≠ DB authority

Per task §34, LAB TypeScript types are a **consumer representation** of the
deployed JSON contract, never the DB fact itself:

- TypeScript DTO ≠ DB schema authority.
- UI ViewModel ≠ Essay canonical fact.
- Formatted display status ≠ canonical lifecycle value.

Validation policy (task §9, §33):
- **Envelope / version:** strict. `dto_version` must equal `ql-read-v1`
  (fail closed on anything else). List envelope must be
  `{ dto_version, cases[], next_cursor }`; `next_cursor` is `null` or a paired
  `{ requested_at, evaluation_id }`.
- **Fields within cases/detail:** defensive. Optional/nullable; never required to
  be non-null (task §4). Missing optional fields do not throw; unknown extra
  fields are ignored (not inferred). `[]` vs `null` vs *absent* is preserved — the
  UI distinguishes **empty** from **unavailable**.

---

## 3. List envelope (`ql_list_cases` → `ql-read-v1`)

Envelope:

```
{ dto_version: "ql-read-v1", cases: QualityCaseSummary[], next_cursor: null | { requested_at, evaluation_id } }
```

Rules honored by the adapter: default limit 50, max 100; order
`requested_at DESC, evaluation_id DESC`; equal-timestamp cases disambiguated by the
paired cursor (never skipped); **no student answer body in the list**.

List fields consumed (all optional/nullable except `evaluation_id`):
`evaluation_id`, `attempt_id`, `question_id`, `university_name`, `exam_name`,
`admission_year`, `question_label`, `requested_at`, `completed_at`,
`submitted_at`, `status`, `request_kind`, `invalidated_at`, `model_provider`,
`model_name`, `prompt_version`, `contract_version`, `evaluation_version`,
`regime_key`, `evidence_manifest_sha256`, `core_count`, `has_generated_rewrite`,
`has_subsequent_student_attempt`, `processing_outcome`, `student_pseudonym`.

## 4. Detail (`ql_case_detail` → `ql-read-v1`)

Top-level `evaluation_id` plus canonical groups (preserving `[]` vs `null`):
`question_context`, `student_submission` (incl. **`answer_full_text`** — full
student answer, detail-only), `evaluation`, `dimensions[]`, `improvements[]`,
`scaffolding_availability`, `core_improvement_keys`, `sentence_feedback`,
`history_context`, `previous_review_representation`, `official_evidence[]`,
`evaluation_evidence_links[]`, `frozen_evidence_bindings`,
`frozen_criterion_bindings`, `reference_metadata_scope`, `student_attempts[]`,
`attempt_window`, `generated_rewrite`, `provenance`, `processing`,
`latest_processing`, `session_evaluations[]`, `session_evaluations_truncated`.

**CORE classification (task §6):** CORE = active improvement progress with
`core_focus = true`. Priority is **ordering, not membership**. LAB must NOT infer
CORE from `priority <= 2`, from `category`, or from item count. `core_improvement_keys`
and `core_count` corroborate membership; LAB never invents an AI severity score.

**Student rewrite vs generated rewrite (task §6):** a student rewrite is a
*subsequent immutable student attempt* (`student_attempts[]` /
`has_subsequent_student_attempt`); a generated rewrite is a *separate AI artifact*
(`generated_rewrite`, origin `ai_generated`). LAB renders them as visually distinct
concepts and never merges them.

---

## 5. Source mapping — current LAB → `ql-read-v1`

| Current LAB source | Relationship to `ql-read-v1` | Action |
| --- | --- | --- |
| `src/lib/browser-auth-client.ts` (Supabase browser client, publishable key only) | Transport for all three RPCs via authenticated session | **KEEP** |
| `src/components/auth-context.tsx` (`useAuth`: client/status/user) | Session source for operator gate + RPC auth | **KEEP** |
| `src/lib/auth-config.ts` (pins LegendStudy Supabase public URL + publishable key) | Guards the Supabase project the RPCs run against | **KEEP** |
| `src/types/domain.ts` — `EssayEvaluation`, `EvaluationCriterion`, `EssayAttempt`, `EssayPatternSignal` (all `SYNTHETIC_CONTENT`) | Public prototype/landing UX types; **not** the Quality contract | **KEEP (prototype)** — not reused for Quality; a new `ql-read-v1` consumer type is introduced instead |
| `src/fixtures/public-metadata.ts` — `mockEvaluation`, `mockAttempts`, `mockPatternSignals` | Public prototype fixtures for landing/essay-lab demo | **KEEP (prototype)** — never used as Quality data, never a Production fallback |
| `src/server/evaluation/*` (`mock-adapter`, `types`) server-only placeholders | Architecture placeholder for a *future* evaluation submit path; unrelated to Quality read | **KEEP (defer)** — out of LEC scope |
| `src/app/essay-lab/evaluation/[attemptId]/page.tsx` (renders `mockEvaluation`) | Prototype evaluation UI; synthetic, build-time static | **KEEP (prototype)** — labeled MOCK; not Quality console |
| *(none — no Quality adapter existed)* | `is_quality_operator` / `ql_list_cases` / `ql_case_detail` consumer | **ADD** → `src/lib/quality/*` |
| *(none — no operator route existed)* | `/ql` operator console (list + detail) | **ADD** → `src/app/ql/` + `src/components/quality/*` |
| Quality-specific test fixtures | Explicit `ql-read-v1` test doubles | **TEST_ONLY** → `src/lib/quality/fixtures.ts` (never imported by Production pages) |
| `docs/architecture/lsa2/*.sql` (draft, not applied) | Historical draft of the authorization foundation | **DEFER** — reference only; not the consumer contract |

No existing LAB prototype type is promoted to canonical. No prototype structure
becomes a Production fallback. Narrow addition is preferred over broad cleanup
(task §10).

---

## 6. Architecture decision — static export preserved

`/ql` is a **client component** route under the existing
`output: "export"` + `trailingSlash: true` static export. It fetches at runtime in
the browser via the authenticated Supabase client → RPC → DB-enforced
SECURITY DEFINER authorization. Consequences:

- **No** new server runtime, **no** Cloudflare Pages Function, **no** gateway.
- **No** privileged service key anywhere in the browser/runtime.
- Case selection uses in-component state (no dynamic route segment), so no
  `generateStaticParams` and no build-time knowledge of evaluation ids is needed —
  fully static-export compatible.
- `_routes.json` scope is unchanged (still only `/api/auth/kakao/*`).
- `/ql` is not added to any public/product nav list and inherits
  `robots: { index: false }`, so it is not advertised or indexed. Route hiding is
  defense-in-depth only; **DB authorization remains authoritative**.

A server gateway would only be justified by a concrete runtime/security reason;
none exists, because authorization is already enforced in the DB. (Task §8.)

---

## 7. Error taxonomy (adapter)

`UNAUTHENTICATED` · `UNAUTHORIZED` · `NOT_FOUND` · `UNSUPPORTED_DTO` · `NETWORK` ·
`MALFORMED_RESPONSE` · `UNKNOWN`. Mapping highlights:

- No session → `UNAUTHENTICATED` (RPC not even attempted).
- DB `42501` / PostgREST 401/403 → `UNAUTHORIZED` (never shown as "empty").
- `ql_case_detail` `P0002` / not-found → `NOT_FOUND`.
- `dto_version` present and ≠ `ql-read-v1` → `UNSUPPORTED_DTO` (fail closed).
- Envelope/structure wrong → `MALFORMED_RESPONSE` (never shown as "empty").
- Transport failure → `NETWORK`.

`EMPTY ≠ UNAUTHORIZED ≠ NETWORK ≠ MALFORMED` (task §32). Errors never carry raw
sensitive response bodies, JWTs, or answer text.

---

## 8. Backend change assessment

**BACKEND_CHANGE_REQUIRED: NO.** The deployed `ql-read-v1` surface is sufficient
for LAB Quality Console v0 as a pure consumer. No new RPC, table, RLS policy,
migration, grant, privileged key, or Cloudflare secret is introduced by LAB.

The performance finding (global recent order may use `Limit → Sort → Seq Scan`;
candidate index `essay_evaluations(requested_at DESC, id DESC)`) is **not** acted
on here — the list stays bounded and cursor-paginated; the index remains a separate
launch decision (task §15, §35).
