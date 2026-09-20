# LS LAB Future Implementation Handoff

## Starting point

Phase 2 is a local Next.js App Router candidate with public metadata fixtures, source-aware navigation, a synthetic writing/evaluation flow, mock My routes, tests, and a static boundary audit. It is not a deployable student-data or AI-evaluation product.

## Recommended ownership split

| Workstream | First deliverable | Must not happen before approval |
| --- | --- | --- |
| Product Owner | Final domain and indexing decision; source-use policy; student-facing origin labels; open-beta gate. | Domain/public release, user-data collection, source extraction, commercial launch. |
| Backend engineering | Public metadata + Quick Link read service with source version, canonical fallback, stale status, and cache policy. | Service-role use in browser, source file mirroring, evaluator endpoint. |
| Identity/security engineering | LegendStudy account mapping, Web session design, linking/unlinking, RLS/data-access model, privacy/retention/delete policy. | Auth replacement, silent account joining, Production schema/RLS mutation. |
| Research/reviewer operations | Source registry, rights status, extraction scope, reviewer assignment, package lifecycle, change/incidents queue. | Using source-derived content in the product before rights and review. |
| Evaluation engineering | Provider-neutral contract, package resolver, benchmark harness, safe refusal model, observer logs and kill switch. | Live model evaluation, score claim, credit deduction before benchmark/release gate. |
| Frontend engineering | Replace fixture repository with public metadata client; replace local draft adapter with authenticated autosave after contracts land. | Leaking private package data or representing mock results as model output. |

## Minimum implementation order

### Phase 2.5 — Public catalog service

Create read-only public endpoints with university, year, campus, track, taxonomy, source title, source status, checked/retrieved date, canonical official URL, and a stable source-record ID. The endpoint must distinguish `OFFICIAL_CONFIRMED`, `REVIEW_REQUIRED`, `NOT_PUBLISHED`, and `NOT_FOUND_IN_AUDIT`; an empty string is not a status. Add data validation, source-version and stale-link state. Keep the first API anonymous and public-metadata-only.

### Phase 3 — Identity and personal workspaces

Design identity mapping before creating user tables. A user should be able to see only their own drafts, attempts, revisions, results, and consent/deletion state. A draft must have a documented autosave conflict policy. An attempt submission must create an immutable snapshot rather than overwrite a draft. My Essay Pattern should display only evidence-linked signals with contributing-attempt count, confidence, explanation, and a next practice action.

### Phase 4 — Private package and evaluator pilot

Choose one reviewed package type only after rights/source-use approval. Store private artifacts server-side. Complete benchmark cases for strong, weak, partial, off-topic, adversarial, format edge, and counterfactual answers. Require safe refusal for insufficient source or unsupported scoring. Record package, rubric, source, evaluation contract, prompt, provider, and result versions. An evaluator release requires benchmark evidence, human review, source/release status, operational rollback, Product Owner sign-off, and user-visible non-official score language.

## Required gates before any Production change

1. Product Owner approval for the exact scope and user-visible language.
2. Security/privacy review for shared identity and student data lifecycle.
3. Source rights/use record and reviewer process for any non-synthetic source-derived material.
4. Database/RLS migration plan reviewed against the actual existing LegendStudy environment.
5. Benchmark and release gate for an evaluator; no paid or open beta claim before evidence exists.
6. Final domain, deployment, incident, monitoring, and support ownership.

## Codex-oriented next task

Use Codex for a contained **public catalog data adapter** only after an approved read-only API contract exists. The task should replace `src/fixtures/public-metadata.ts` with a validated repository that maps only public fields, preserves Quick Link resolver behavior, adds loading/error states, and extends tests. It must not add Supabase credentials, database writes, official content extraction, Auth, evaluator calls, or source copying.

## Claude-oriented next task

Use Claude for independent product/research review: validate source-status language, compare candidate public taxonomy labels against the review register, refine Korean trust microcopy, design My Essay Pattern evidence explanations, and review the evaluator benchmark/release rubric. It should not implement an unapproved live evaluator or claim model quality.

## Manus-oriented next task

Use Manus for deterministic implementation and validation: scaffold approved route or adapter changes, run type/lint/test/build/boundary checks, render/screenshot public routes, validate direct-vs-canonical Quick Link behavior, assemble implementation evidence, and perform read-only source/status audits. Manus should pause for Product Owner confirmation before Production credentials, public deploy, domain binding, GitHub push/PR, schema migration, or live source/evaluator actions.
