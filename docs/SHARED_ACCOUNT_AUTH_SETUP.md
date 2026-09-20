# LegendStudy Account — Browser Auth Setup

## Purpose

LegendStudy LAB is a static Next.js export. It uses **browser-side Supabase Auth only** so that a user can hold the same `auth.users.id` identity in LegendStudy+ and LAB without introducing a second database, server-side session store, service-role key, or new Supabase project. The LAB source accepts only the public project URL declared by the LegendStudy app: `https://stlhijzpjfgwwdgunlsd.supabase.co`.

This document records the required deployment configuration. It is **not** a record that the settings have already been applied.

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

In the existing LegendStudy Supabase project, set the Auth **Site URL** to `https://lab.legendstudy.com` and allow the following production redirect paths before enabling the build configuration:

- `https://lab.legendstudy.com/login/**`
- `https://lab.legendstudy.com/reset-password/**`
- `https://lab.legendstudy.com/account/**`

For local development, register only an intentional local origin such as `http://localhost:3000/**`; do not use broad production wildcards. The production paths are used for email confirmation, password reset, and enabled OAuth providers.

## Email and social authentication

Email/password authentication is the baseline. Hosted Supabase projects commonly require email confirmation; the signup UI therefore reports confirmation as a pending state rather than promising an immediate session. Password-reset requests intentionally return the same user-facing response whether or not an address exists, to avoid account enumeration.

Do not set `NEXT_PUBLIC_SUPABASE_AUTH_PROVIDERS` for a provider until its Supabase provider setting, provider-console redirect configuration, consent text, and production login have each been verified. A configured list item only controls visibility; it does not create provider credentials.

## Current implemented boundaries

- `/login/`, `/signup/`, `/forgot-password/`, and `/reset-password/` are public auth routes and carry `noindex` metadata.
- `/account/` is session-aware: it presents a sign-in entry to an anonymous visitor and a minimal identity connection state to an authenticated visitor.
- Public LAB information and catalog routes remain public. Existing essay, evaluation, and My routes are still clearly marked as mock/foundation content and do not save user data.
- Sessions use the Supabase browser client’s persistent local storage. No LAB application token, email, password, answer, or evaluation is written to a new server or table by this change.
- Account deletion remains a policy foundation only; this change does not create a deletion request endpoint or alter the existing LegendStudy data-retention model.

## Owner verification checklist

1. Confirm the two public Supabase values come from project ref `stlhijzpjfgwwdgunlsd`.
2. Configure Site URL and exact redirect paths in Supabase Auth.
3. Set the Cloudflare Pages variables and trigger the existing `main` deployment.
4. Verify signup confirmation, sign-in, sign-out, reset-password, expired recovery link, and direct `/account/` access against a non-production test account.
5. Confirm Google, Apple, or Kakao in the environment list only after the corresponding provider has been enabled and tested.
6. Approve privacy-policy and account-deletion operational text before representing either as a live service.
