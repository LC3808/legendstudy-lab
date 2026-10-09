# Admin manual Credit grant — 2026-10-09

Owner addendum authorizes 1–100 support Credits and one actual 1-Credit grant to an
approved test account. This implements the existing member-detail placeholder.

## Contract

`admin_manual_credit_grant(p_user uuid, p_email text, p_quantity integer,
p_reason text, p_key uuid) → grant UUID`

- Authenticated session calls an Admin-only SECURITY DEFINER RPC. `admin_operator()`
  is the existing `admin_users` membership boundary; Quality-only users do not qualify.
- Server validates target UID/email, 1–100 integer quantity, nonblank ≤500-character
  reason, request UUID and current account eligibility. No client-supplied actor/type.
- Reuses `essay_private.credit_post_grant`. Type `admin_grant`, existing null expiry;
  non-purchase. Original `essay_admin_grant` remains finance-only and unchanged.
- Canonical transaction stores `manual_support: <reason>`, `operator/<auth.uid()>`,
  quantity, target account, created_at and `grant/admin_manual/<request UUID>`.
- Existing ledger serializes target-account writes, returns the same grant on exact
  replay and rejects changed payload/actor. Failure rolls back the whole RPC.
- No new table, balance, finance credential, Payment/Toss/IAP or Signup policy.

## UI

Member detail and Credit lookup show the same form. The native dialog displays UID,
email, quantity, reason and final confirmation. Esc/close restore focus; an in-flight
request cannot be closed/submitted twice. Successful grants reload canonical Credit.
Pending input/key is stored **before** network submission in sessionStorage under
operator UID + target UID. Lost-response/reload retry reuses the exact payload/key;
inputs stay frozen until the result is confirmed. No secret is stored in this record.
A changed target or conflicting request remains unresolved for operator review;
the UI does not silently issue a fresh grant.

## Backend and verification

APP `bc91805` contains only the new RPC migration `20261009000100`, guarded deployment
helper and local SQL behavior checks. Applied directly through the authorized
Management API after exact dependency hashes and migration collision checks.
Production RPC body MD5 `3361f212c1332d1413ce82eadcf6fc9c`.
Owner postgres / SECURITY DEFINER / empty search_path; authenticated execute only.
Ledger RLS enabled, direct authenticated writes denied; old finance RPC not exposed.
Actual anonymous request returned HTTP401 / SQL42501.

Local canonical Ledger fixture tests: authorized grant, replay, mismatched payload,
wrong target email, quantity bounds, empty/oversized reason, missing key, ordinary
caller and expired claims, persisted audit fields/amount/type/expiry, ACL preservation.
Lifecycle `allowed` is a local harness stub; these tests do not revalidate the whole
account-deletion lifecycle. Production lifecycle/helper bodies were hash-checked.
UI tests include lost-response/reload and double submission. Full suite864 PASS;
lint/typecheck/boundary/build PASS. Actual Chromium render1440/390/360,200% text,
Esc/focus/confirmation/reload PASS with intercepted fixtures, not a real grant.

## Acceptance still open

Actual authenticated Admin grant + real target balance/transaction/persistence:
**NOT VERIFIED**. The existing `MATH_TEST_ACCESS_TOKEN` initially returned
`session_not_found`, then `bad_jwt` / token expired. No Admin session binding exists.
No actor was impersonated through SQL; actual `admin_manual/` grants remain0.

Environment draft adds `ADMIN_TEST_ACCESS_TOKEN` for an existing authorized Admin
session (Supabase project + LAB hosts). Supply through Secrets, never chat. Refresh
`MATH_TEST_ACCESS_TOKEN` from an approved test account's active session. These are
Supabase **user access tokens**, not management/service-role/provider API keys.
Browser Application → Local Storage → `https://lab.legendstudy.com` →
`legendstudy-lab-auth` → `access_token` after signing in. Keep the session active.

Math Go-Live remains blocked by real authentication and unverified Production
Provider/Worker connection. math-test has OpenAI/gpt-5.6-sol + worker/provider secret
bindings; primary LAB has no corresponding bindings. No secret was copied, no paid
Provider call made, no public switch enabled. Provider balance/billing/cost are
unverified, not evidence of insufficient funds. Published Essay questions/criteria0;
Math catalog1/profile1; private storage retained. Migration010 unchanged;005 HOLD.
