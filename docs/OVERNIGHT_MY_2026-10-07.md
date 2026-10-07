# Overnight Phase B — MY Dashboard

Base LAB `3a1c69f`; APP backend/copy authority final Store RC `7d1c036`.
Owner IA: usage → goals → applications → Essay → other LABs → account/support.
Public Home/LAB/Pricing visuals and Payment/Toss unchanged.

- `useCreditSummary` remains the only balance authority. Loading/error is not zero;
  free/paid/actual other, all-spendable next expiry, Pricing/history links.
- Owner-RLS reads of canonical credit_accounts/grants/transactions/decisions.
  Reserve/release are not charges; consumes across grants group by decision, including
  a boundary-completion query. Settled zero-credit decisions remain zero. Latest100
  events, not a lifetime aggregate; no new wallet or financial write.
- Shared goals: profiles.intended_major and interested student_target_universities,
  with university-specific intended_division. Owner predicates plus existing RLS,
  active university catalog, APP broad-field taxonomy. Existing planned/considering
  targets not overwritten; interests are not applications. No new tables.
- Application section is an honest empty state; no create control or schema.
- Recent50 owner essay sessions and associated evaluations/dimensions. No answer body,
  score conversion or growth chart; 1–5 levels retained, invalidated results excluded
  from completed count. Record page expands the actual dimension explanations.
- Account settings links to existing recovery/deletion/support; deletion lifecycle intact.
- Owner-keyed render/state plus session checks suppress late requests after switch/logout.
  Goal mutations revalidate session, target row/owner/status and return confirmed rows.

Seven preservation answers: reuse timestamps, do not mutate ledger/history, no new
raw-event collection, canonical Auth identity, interests distinct from applications,
self-RLS/retention/deletion unchanged, no derived score represented as raw fact.
Preference edits match the APP's existing current-value semantics; no claim of a new
historical target timeline. No backfill or general-user mutation in verification.

Validation: 320 tests (7 focused MY), lint/typecheck/boundary/build PASS. Browser
fixture 32 responsive conditions, goal save, Credit display/history, dimensions and
logout clearing PASS. Public Production smoke is separate; no real user credential
was supplied, so hosted own-record reads/writes remain NOT_ASSESSABLE. Missing/denied
backend reads show retryable errors, never invented zero balances/data.
