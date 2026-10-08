# Essay activation follow-up — 2026-10-09

PARTIAL: no actual provider-backed authenticated evaluation completed. All four types GATED.

APP candidate2657952 adds optional canonical component claim/finalize/read RPCs, outside
migration ledger. Not applied. See APP wiki/essay-runtime-activation-2026-10-09.md and
supabase/candidates/essay_components/README.md for exact topology/hash/content gates.

This LAB change connects a server-only persistence adapter to those RPCs. Student ownership
is checked before worker claim; reviewed capability manifest must match the frozen parent;
a durable private checkpoint precedes the single transactional finalizer. Unknown commit
can replay that checkpoint without regenerating or charging a child evaluator. No new
public endpoint or mounted editor. Caller must provide actual reviewed canonical1.3 output;
scientific verdicts are never automatically converted to levels1–5.

The existing client can read optional component feedback by existing evaluation ID, checks
same session/attempt identity and discards account-switch responses. Legacy null differs
from RPC failure. Math composed feedback excludes unrevealed hints, generated solutions,
source references and provider metadata. Existing Math standalone runtime unchanged.

Verification:854 LAB tests, lint/typecheck/boundary/build PASS. APP canonical PG17 component
checks38; Math SQL/Web16; unchanged010 isolated projection10 (stubbed lifecycle); Python70
PASS/29 private-evidence skips. These do not establish actual provider accuracy or E2E.

Supabase management401; Cloudflare management400/code9106; Actions workflows0. Earlier
migration successes were Owner Mac/SQL Editor operations. Git deploy access remains valid.
No new token/key issued, Production DB mutation, model call, Credit grant or activation.
Three existing-access requirements saved as metadata in environment draft, not applied.

Payment/Toss/IAP/Signup/Credit policy/Target005/MY/Admin/Manus files untouched.
