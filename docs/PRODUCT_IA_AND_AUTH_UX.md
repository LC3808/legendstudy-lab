# LegendStudy LAB Product IA and Auth UX

## Canonical role

**LegendStudy LAB is LegendStudy's Web Intelligence / Deep Work Platform.** It supports work that benefits from a wider screen, longer attention, and deeper review. It is not an essay-only product, and it does not duplicate every quick mobile action.

| Surface | Product role | Current public state |
| --- | --- | --- |
| LegendStudy+ App | Quick execution, habits, notifications, and daily learning actions | Separate native application; no browser session handoff is implied. |
| LegendStudy LAB Web | Deep analysis, creation, personal review, and future management modules | Public service guidance and shared-account browser-auth foundation. |
| Essay Lab | One LAB module for university-specific essay preparation | Public information and synthetic UX foundation only; no live evaluation or personal history. |
| Academic Analytics | One LAB module for deep academic review | Planned; no score collection, analysis, or admissions claim. |
| Activity Portfolio | One LAB module for evidence-based activity review | Planned; no activity collection or analysis. |

This allocation follows the canonical LegendStudy product-family architecture: **App = Quick / Action / Habit / Notification; Web = Deep / Analysis / Creation / Management.**

## Public navigation

The public header intentionally remains short:

1. **서비스** — platform role, service modules, and the learning loop.
2. **이용 안내** — public usage and scope guidance.
3. **공개 범위** — what is and is not available.
4. **지원** — support and policy routes.
5. **로그인 / My Account** — only the identity and future personal-space entry; no personal records are claimed.

Internal foundation routes, synthetic writing fixtures, and placeholder personal pages are `noindex`. They are not marketed as live services.

## Shared account UX

The LAB uses the existing LegendStudy Supabase project's `auth.users.id` as its intended identity source. It does not create a second authoritative user database and does not receive a mobile session token, shared browser cookie, or automatic SSO assertion.

| State | User-visible behavior | Data boundary |
| --- | --- | --- |
| Browser configuration absent | Fail-closed setup notice; public pages stay available. | No Auth call and no user data access. |
| Anonymous | Login link includes a validated internal `next` destination. | No personal record query or write. |
| Authenticated | `My Account` shows the email and an identity-connection status. | Only session identity is observed. |
| Sign-out | Client signs out through Supabase and returns to anonymous UI. | No local LAB personal-data cleanup claim because LAB personal data does not yet exist. |
| Recovery | Reset screen opens only after the Auth recovery event. | Token is never shown in UI, route state, or logs. |

## Auth flows

- **Email/password:** sign in directs the user to `/account/` or a validated same-origin `next` path after success.
- **Signup:** may require email confirmation. The completion link returns to `/login/` with the intended internal destination; an immediate Supabase session takes the user directly there.
- **Forgot password:** always gives neutral delivery copy and returns only to `/reset-password/`.
- **Reset password:** requires a current recovery session before `updateUser`; success leaves the authenticated session intact and makes the account route available.
- **Social login:** a button is rendered only when a provider is named in `NEXT_PUBLIC_SUPABASE_AUTH_PROVIDERS`. The configuration must be verified in Supabase, its provider console, and production before the variable is set.

## Mandatory pre-activation checks

Before enabling public login in Cloudflare Pages, the Product Owner must confirm the same Supabase project ref, set the public browser variables, allow-list the exact `https://lab.legendstudy.com/login/**`, `https://lab.legendstudy.com/reset-password/**`, and `https://lab.legendstudy.com/account/**` redirects, and complete a non-production mailbox test. See [Shared Account Auth Setup](SHARED_ACCOUNT_AUTH_SETUP.md) for the full checklist.

## Explicitly excluded work

This IA and UX change does not create or migrate any profile, academic-record, draft, attempt, evaluation, entitlement, payment, portfolio, teacher, or school table. It does not enable AI evaluation, credits, payments, official source copying, automatic SSO, or WebView behavior.

## Visual foundation

The shared web UI uses a Korean-first system font stack beginning with Nanum Gothic, followed by Apple SD Gothic Neo and Noto Sans KR when available. It does not fetch fonts from a third-party CDN or bundle unverified font files. Shared heading and body line heights, card spacing, controls, and focus styles are defined in `src/app/globals.css`. On authenticated pages, **마이페이지** remains the product personal-space destination and **계정 설정** is the account/session control.
