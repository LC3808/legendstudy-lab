# LegendStudy Account — Browser Auth Setup

## Purpose

LegendStudy LAB is a static Next.js export. It uses **browser-side Supabase Auth only** so that a user can hold the same `auth.users.id` identity in LegendStudy+ and LAB without introducing a second database, server-side session store, service-role key, or new Supabase project. The LAB source accepts only the public project URL declared by the LegendStudy app: `https://stlhijzpjfgwwdgunlsd.supabase.co`.

This document records both the deployment setup and the Owner-verified Production state. Credentials and private keys themselves are intentionally excluded.

## Production Auth status (2026-09-21)

Owner completed the following E2E flows on `https://lab.legendstudy.com`:

| Scope | Production result |
|---|---|
| Email signup and email confirmation | PASS |
| Email/password login and logout | PASS |
| Login to `/home/` and reactive Public ↔ Authenticated Header transition | PASS |
| Password recovery email, reset-password entry, password update, recovery-session sign-out, return to `/login/`, and login with the new password | PASS |
| Google OAuth: LAB → Google → Supabase callback → LAB; real Production login | PASS |
| Kakao OAuth: LAB → Kakao → Supabase callback → LAB; real Production login | PASS |
| Apple OAuth: LAB → Apple → Supabase callback → LAB; real Production login | PASS |

```text
LAB_EMAIL_AUTH_PRODUCTION_E2E: PASS
LAB_GOOGLE_OAUTH_PRODUCTION_E2E: PASS
LAB_KAKAO_OAUTH_PRODUCTION_E2E: PASS
LAB_APPLE_OAUTH_PRODUCTION_E2E: PASS
LAB_AUTH_LIFECYCLE: PRODUCTION VERIFIED
APP_SOCIAL_AUTH_PRODUCTION_E2E: NOT YET VERIFIED
APP_LAB_ACCOUNT_IDENTITY_E2E: NOT YET VERIFIED
APPLE_SECRET_RENEWAL_GATE: OPEN
APPLE_ACCOUNT_DELETION_REVOKE: OPEN
STORE_RELEASE_READY: NO
```

The verified scope is LAB web only. LAB and LegendStudy+ App use the same Supabase project and intend `auth.users.id` as canonical account identity, but same-ID Production verification between App and LAB has not been completed. This does not verify app-side Google/Kakao/Apple OAuth and does not imply browser/native session sharing. Shared account identity and session sharing are separate: the goal is the same `auth.users.id`, not a shared browser cookie or native session.

### Provider operating notes and open gates

- **Google:** Production OAuth is verified. Rotate the Google client secret as an operations TODO because it was exposed in a setup screen capture. Do not put its value in this repository or Wiki.
- **Kakao:** `account_email` is required for sign-in; `nickname` and `profile_image` are not used. Keep requested personal data to what authentication requires. The current Kakao raster icon may appear lower-resolution than the other provider icons; track SVG or higher-resolution official asset replacement as final UI polish, not an auth release blocker.
- **Apple:** Production OAuth is verified. Configured identifiers are App ID `com.legendstudy.app`, Services ID `com.legendstudy.lab`, and primary app `LegendStudy / com.legendstudy.app`. The Sign in with Apple key and Supabase client secret are configured; do not record private `.p8` key material, OAuth client secret, or JWT values here. Apple client-secret JWT expiration cannot exceed 15777000 seconds (six months); set a renewal reminder, generate a replacement before expiry, and replace it in Supabase. See [Apple: Creating a client secret](https://developer.apple.com/documentation/signinwithapplerestapi/creating-a-client-secret).
- **Apple account deletion:** the production account-deletion flow must revoke the user's Apple authorization/token and handle the related deletion lifecycle. This is OPEN; the Store Release Gate is not closed until revoke is implemented and verified. See [Apple: Handling account deletions and revoking tokens](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple) and [Apple: Token revocation](https://developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens).

### Next official task: App ↔ LAB Shared Account Production Verification

Use the web-verified accounts to verify that the native app resolves to the same `auth.users.id` in Production. Cover:

1. Email account.
2. Google account.
3. Kakao account.
4. Apple account.
5. A → logout → B owner isolation.
6. Session restoration after app relaunch.
7. App/LAB identity equality using the canonical Supabase `auth.users.id`.
8. Existing Materials bookmark and grade owner-scoped data isolation.

Record app OAuth results separately from LAB web results. Shared account does not require shared browser/native session. Until these checks pass, keep `APP_SOCIAL_AUTH_PRODUCTION_E2E` and `APP_LAB_ACCOUNT_IDENTITY_E2E` as `NOT YET VERIFIED`.

## Cloudflare Pages environment variables

Set these in the existing `legendstudy-lab` Cloudflare Pages project for both the production environment and any deliberately enabled preview environment. Store the values in Cloudflare environment configuration; do not commit them to source files.

| Variable | Required | Value / format | Purpose |
|---|---:|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `https://stlhijzpjfgwwdgunlsd.supabase.co` | Public LegendStudy Supabase project URL. The client rejects any other URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Current `sb_publishable_…` key from the same project | Browser-safe Auth client key. Never substitute a `service_role` key. |
| `NEXT_PUBLIC_SUPABASE_AUTH_PROVIDERS` | No | Comma-separated configured providers, for example `google` | Controls which social buttons are shown. Supported values are `google`, `apple`, and `kakao`. Leave unset until the provider is actually enabled and verified. |
| `NEXT_PUBLIC_SITE_URL` | Existing | `https://lab.legendstudy.com` | Canonical metadata and redirect origin. |

> `NEXT_PUBLIC_*` values become part of the browser bundle. They must contain only public configuration. Do **not** create or store `SUPABASE_SERVICE_ROLE`, database passwords, private OAuth client secrets, payment secrets, or app signing secrets in this repository or Pages environment.

## Supabase Auth URL configuration

The existing Production configuration uses the Auth **Site URL** `https://lab.legendstudy.com` and these production redirect paths:

- `https://lab.legendstudy.com/login/**`
- `https://lab.legendstudy.com/reset-password/**`
- `https://lab.legendstudy.com/account/**`

For local development, register only an intentional local origin such as `http://localhost:3000/**`; do not use broad production wildcards. The production paths are used for email confirmation, password reset, and enabled OAuth providers.

## Email and social authentication

Email/password authentication is the baseline. Hosted Supabase projects commonly require email confirmation; the signup UI therefore reports confirmation as a pending state rather than promising an immediate session. Password-reset requests intentionally return the same user-facing response whether or not an address exists, to avoid account enumeration.

The production provider configuration and logins for Google, Kakao, and Apple have been verified for LAB web. For any future provider, verify its Supabase setting, provider-console redirect, consent text, and Production login before adding it to `NEXT_PUBLIC_SUPABASE_AUTH_PROVIDERS`. A configured list item only controls visibility; it does not create provider credentials.

## Current implemented boundaries

- `/login/`, `/signup/`, `/forgot-password/`, and `/reset-password/` are public auth routes and carry `noindex` metadata.
- `/account/` is session-aware: it presents a sign-in entry to an anonymous visitor and a minimal identity connection state to an authenticated visitor.
- Public LAB information and catalog routes remain public. Existing essay, evaluation, and My routes are still clearly marked as mock/foundation content and do not save user data.
- Sessions use the Supabase browser client’s persistent local storage. No LAB application token, email, password, answer, or evaluation is written to a new server or table by this change.
- Account deletion remains a policy foundation only; this change does not create a deletion request endpoint or alter the existing LegendStudy data-retention model.

## Deployment setup reference

These are configuration references for future environment maintenance; the LAB web Production E2E above confirms the current deployment and provider settings have already been exercised. Never paste secret values into this file. A dedicated expired recovery-link check is not included in the reported Owner E2E, so track it separately if required by a future release acceptance plan.

Account deletion remains an unfinished operational feature. Approve privacy-policy and deletion procedures before representing either as a live service; Apple revoke is specifically a Store Release Gate.
