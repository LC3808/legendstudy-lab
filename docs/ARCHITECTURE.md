# LegendStudy LAB Architecture

## Current decision

**Next.js App Router with TypeScript and static export is the public LEGENDSTUDY LAB foundation.** Public service pages and reviewed public metadata are generated at build time for the canonical `https://lab.legendstudy.com` origin. Small client components are limited to browser interactions such as filters, temporary synthetic drafting, and browser-side Auth state.

LegendStudy LAB is the **Web Intelligence / Deep Work Platform** in the LegendStudy product family. Essay is a service module, not the whole product. The Flutter app remains a separate native product; neither a WebView wrapper nor an automatic session handoff is part of this architecture.

## Runtime layers

| Layer | Current responsibility | Explicitly excluded |
| --- | --- | --- |
| Static public pages | Service introduction, public scope, policy drafts, reviewed public university metadata, source-status copy. | Private data, source retrieval, auth secrets, live evaluator calls. |
| Browser Auth boundary | Same-project Supabase email/password session, optional verified social-provider entry, recovery state, account display, sign-out. | Service-role access, schema writes, profile reads, answer sync, personal-history access. |
| Synthetic workspace boundary | Demonstrates writing and result information architecture with durable mock labels. | Official-question delivery, user-owned answer persistence, real evaluation. |
| Server-only evaluation boundary | Defines future package/job/credit interfaces. | AI/provider calls, queues, persistence, entitlements, payment. |
| Future authenticated data service | Future user-owned records after explicit schema/RLS/retention approval. | Silent identity conversion or client-controlled authorization. |

## Auth and data flow

```text
Public visitor
  -> static service pages and public metadata

LegendStudy Account browser flow
  -> client-only Supabase Auth client using public configuration
  -> existing LegendStudy auth.users identity
  -> browser session state
  -> My Account connection display only

Future private workspace
  -> explicit authenticated server/data layer
  -> user-owned data policy + RLS + retention/deletion controls
  -> evaluated or analytical result with provenance and versioning
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are browser-visible configuration values. They must be supplied through Cloudflare Pages environment settings and must never be replaced by a service-role key, database password, payment secret, or provider client secret.

## Public/private data boundary

The catalog uses only reviewed `PUBLIC_METADATA`. Synthetic writing or evaluation screens use `SYNTHETIC_CONTENT` and visibly identify it as a mock. `USER_PRIVATE_DATA`, `PRIVATE_SOURCE_DERIVED_ASSET`, and `PRIVATE_EVALUATION_ASSET` are not available in the public bundle. The current authenticated session does not change the local-only draft policy.

## Future engineering order

1. Complete Auth production configuration and recovery E2E with a non-production test account.
2. Approve the authenticated personal-data and retention model.
3. Build a read-only public metadata service with source versions and canonical Quick Links.
4. Add user-owned personal workspaces only with reviewed schema, RLS, and deletion behavior.
5. Add private evaluation packages, jobs, benchmark evidence, and release gates.

See [Product IA and Auth UX](PRODUCT_IA_AND_AUTH_UX.md), [Shared Account Auth Setup](SHARED_ACCOUNT_AUTH_SETUP.md), and [Data Boundaries](DATA_BOUNDARIES.md).
