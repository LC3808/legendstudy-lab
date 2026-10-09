# MY / personal Essay report — Oct09

Owner-approved MY order: usage, school, goals, applications, LAB, study, support.
LAB uses3 existing white MY surfaces: Essay → /account/essay/, the other2 native
dialog controls (Esc/trapped focus/close-to-trigger). No public LAB enablement.

Personal report is authenticated and noindex. Existing owner/RLS read contracts:
Essay sessions50 → attempts≤500 + evaluations≤1000; Math history50 + ≤20 evaluations
per attempt from existing RPC. Summary counts unique evaluated answers, not retries;
invalidated/failed evaluations excluded. Explicit recent-window label, not lifetime
counts. Math history omits completed_at/university labels; these stay unavailable,
never inferred from UUIDs or request timestamps. No arbitrary100-point conversion.
Selected Essay session loads immutable answers/completed valid evaluations; Math
uses existing read_input/read_result for current/previous answer/evaluation. No
private artifact URLs, hidden hints or generated solution disclosure. Read errors
remain errors even when the other source is empty. Owner-scoped hooks discard late
responses and remount selected content on account transitions.

Credit uses existing credit_summary/ledger history, no wallet or billing mutation.
Print uses browser A4 output; header/nav/footer/control suppression is scoped to
this report. Share explains local PDF saving/user-controlled file sharing. No public
URL, uploaded report store, token-in-URL or automatic file transmission.

Validation:860 existing+new tests PASS; lint/typecheck/boundary PASS; Production-config
build PASS. Chromium35 fixture assertions across1440/1280/768/390/375/360,200% text,
modal Escape/focus restoration, empty/populated reports,2-page A4 PDF PASS; no page
errors. These are synthetic browser fixtures, not provider E2E. Authenticated REST
reads using connected user token:own profile, Essay sessions, Math history, Credit,
010 projection200; foreign profile scope0. Actual login UI/provider switching and
APP↔Web same-record E2E remain unverified.

Supabase/Cloudflare APIs200.010 ledger1/switchfalse; no reapply. Both web domains200
with a regular browser User-Agent (default Python UA got403/1010). Test token Auth200
but NOT in existing Math allowlist; no list change/provider call/Credit consumption.
Materials blog host not in current environment egress; additive draft saved, not
published. APP candidate is independent, Flutter3.47.6 missing; no RC/UI modifications.
Payment/Toss/IAP/Signup/Target005/Admin/Manus surfaces preserved.
