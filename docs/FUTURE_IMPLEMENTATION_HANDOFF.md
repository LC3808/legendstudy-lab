# LegendStudy LAB Future Implementation Handoff

## Starting point

LegendStudy LAB is a deployed static Next.js public foundation with shared-account browser-auth UI, reviewed public metadata fixtures, source-aware navigation, synthetic writing/evaluation UI, and explicit public/private boundaries. It is **not** a live student-data, AI-evaluation, payment, or school-management product.

## Current non-negotiable boundaries

- `auth.users.id` in the existing LegendStudy Supabase project is the intended canonical identity. There is no automatic App↔Web session transfer or email-based account merge.
- Browser Auth configuration is public and fail-closed. It cannot use a service-role key or create a new identity store.
- A signed-in LAB session does not authorize personal-data reads or writes until an approved user-owned data model, RLS, retention, and deletion contract exists.
- Public catalog metadata may direct the user to an official source; it must not copy or re-distribute official originals by default.
- Synthetic workspace content is not an official question, student record, or model-quality claim.

## Recommended workstream ownership

| Workstream | First deliverable | Must not happen before approval |
| --- | --- | --- |
| Product Owner | First LAB module, release language, owner acceptance criteria. | Claiming availability of analytics, Essay feedback, payments, or school tools. |
| Identity/security engineering | Shared-account production configuration, recovery E2E, linking/unlinking policy, user-data/RLS design. | Silent account joining, service-role browser access, personal-data collection. |
| Backend engineering | Public metadata service with source version and canonical Quick Link state. | Source mirroring, private package exposure, evaluator endpoint. |
| Research/reviewer operations | Rights/status register, reviewer ownership, private package lifecycle. | Source-derived content use before rights and review. |
| Evaluation engineering | Package resolver, benchmark harness, safe-refusal design, job/credit lifecycle. | Live scoring, credit deduction, or quality claims before release gates. |
| Frontend engineering | Replace fixtures with approved public service; later replace local drafts with user-owned autosave. | Mock-to-live language drift or private data in the browser bundle. |

## Implementation order

1. **App ↔ LAB shared-account Production verification (next official task):** use the web-verified email, Google, Kakao, and Apple accounts; verify same `auth.users.id`, app OAuth E2E, A→logout→B owner isolation, app session restore, and owner-scoped Materials bookmark/grade isolation. Shared account identity does not mean shared native/browser session.
2. **Apple operational gates:** renew the client secret before the six-month maximum lifetime and implement/test Apple token revoke in the account-deletion flow before Store release.
3. **Google credential rotation:** rotate the OAuth client secret because it was exposed in a setup screen capture.
4. **Personal-data approval:** define profile/record ownership, access control, RLS, retention, export, deletion, and App↔Web linking behavior.
5. **Public catalog service:** replace fixtures with a validated anonymous read-only adapter that exposes only `PUBLIC_METADATA` with provenance and stale-link state.
6. **Authenticated personal workspaces:** add user-owned drafts, attempts, revisions, and history only after the data gate.
7. **Private evaluation pilot:** add package/job/credit contracts only after rights, benchmark, and release approval.
8. **Academic Analytics and Portfolio:** treat as independent modules with their own data-quality, interpretation, and privacy gates.

LAB web email/password, recovery, Google, Kakao, and Apple Production E2E passed on 2026-09-21. App provider E2E and App↔LAB identity remain unverified; see [Shared Account Auth Setup](SHARED_ACCOUNT_AUTH_SETUP.md#production-auth-status-2026-09-21) for the exact scope and evidence status.

## Verification expectations

Every implementation change should keep `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm verify:boundaries`, `pnpm build`, a credential scan, and `git diff --check` green. Public route changes require desktop and mobile render inspection. Auth changes require a fail-closed unconfigured build plus non-production E2E only after the Owner completes the deployment settings.
