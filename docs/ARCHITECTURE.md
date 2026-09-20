# LS LAB Phase 2 Architecture

## Decision

**Next.js App Router with TypeScript is the selected Phase 2 foundation.** Public catalog and university detail pages remain Server Components by default. Small Client Components are used only for interactive catalog filters, temporary browser-local drafting, and future client-only interactions. This preserves server-rendered public entry pages while constraining browser-only logic to the places where state, event handlers, or browser APIs are genuinely required.

This is an architecture candidate, not a Production platform migration. It does not modify the original Flutter Mobile application, existing Production Supabase project, authentication, RLS, deployment, or public domain.

## Runtime layers

| Layer | Current Phase 2 responsibility | Explicitly excluded |
| --- | --- | --- |
| Next.js Server Components | Render public page shell, route metadata, reviewed public metadata fixture, source provenance copy, and JSON-LD-ready detail pages. | Private evaluator package, protected user data, service-role access, external source retrieval. |
| Next.js Client Components | Catalog filtering, keyboard-first editor state, browser-local mock draft, confirmation before mock result navigation. | Secrets, private sources, evaluation policy, entitlement determination, actual user history. |
| Server-only evaluation boundary | Defines future package/job/credit interfaces and a no-op synthetic adapter. Build tooling prevents client imports. | AI/provider calls, queue workers, persistence, payment, actual credits. |
| Future public metadata service | Documented successor to the in-repo fixture. Must supply source-versioned public metadata and canonical Quick Links. | Source extraction, protected document caching, private package payload. |
| Future authenticated data service | Documented successor to mock My routes and temporary draft store. | Shared identity conversion without approval, raw student answer access outside the user scope. |

## Data flow

```text
Public visitor
  -> Server-rendered catalog/detail route
  -> reviewed public metadata fixture (Phase 2)
  -> displayed source status + canonical official external link

Student writing interaction
  -> Client editor
  -> temporaryDraftStore (browser localStorage only)
  -> confirmation
  -> synthetic mock result route

Future authenticated evaluation (not implemented)
  -> protected server endpoint
  -> entitlement and release-state check
  -> private evaluation package resolution
  -> provider-neutral evaluator
  -> immutable user-owned result and safe display label
```

The future evaluation flow must not be reversed. A browser must never post a rubric, answer key, source extraction, private package, evaluation prompt, provider configuration, price/credit value, or source URL as an instruction to the evaluator. The server must resolve those server-side after authentication, source/release-state, entitlement, rate-limit, and safe-refusal checks.

## Source-aware navigation model

`src/lib/quick-link.ts` resolves an official Quick Link in a conservative order. It prioritizes a canonical official notice or archive page. It shows a recheck state for `REVIEW_REQUIRED`, avoids unstable session links, and only exposes a direct file if the metadata explicitly marks it as both `DIRECT_OFFICIAL_FILE` and `AVAILABLE`. It never proxies or copies content. The component uses an external browser link with `noopener noreferrer`.

## SEO and page metadata

The catalog and public details use App Router server pages, route-level metadata, descriptive Korean titles, and a structured-data-ready `WebPage` JSON-LD component. `NEXT_PUBLIC_SITE_URL` is optional and intentionally unset: canonical and absolute URLs activate only after a final domain is approved. Root robots metadata is currently `noindex, nofollow` because this is a private candidate.

## Later shared identity plan

The eventual identity path is: current LegendStudy user identity mapping → explicit account/link/unlink decision → authenticated Web session → user-owned draft and attempt access → retention/deletion controls. The current `/login` route is a capability disclosure, not a login mechanism. Phase 2 must not silently replace or couple to existing Supabase Auth.

## Future evaluation engine plan

A future evaluator must use package IDs and package versions, not raw URLs or client-selected evaluation criteria. The `PrivateEvaluationPackageContract` is intentionally server-only. Before adding an endpoint, establish source-use approval, private package lifecycle, reviewer ownership, benchmark cases, human adjudication, prompt-injection controls, safe refusal responses, provider configuration, rate limits, incident kill switch, immutable result versioning, and Product Owner release approval.
