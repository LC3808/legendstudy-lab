# Math ES256 signer recovery — Oct09 — BLOCKED at key capacity

Scope: retain existing `math_extraction_worker` / `math_evaluation_worker` roles,
PostgREST JWT verification and existing ACLs. Seven-day worker lifetime was explicitly
requested by Owner. No student/service_role/math_executor token issuance.
Exposed Legacy secret was never used or printed by this implementation.

## Concrete preparation

`scripts/production/prepare-math-worker-signer.py` uses official Management API:
- GET/PATCH/POST `/config/auth/signing-keys`, imported ES256 P-256 private JWK.
- Private backup only in Supabase encrypted Edge secrets (never console/Git/files).
- Preserve current Auth signer. Temporarily move original standby to still-trusted
  previous, import worker signer as standby, move new signer to previous, restore
  original standby. Never rotate in_use, revoke or delete an existing key.
- Verify own RPC reaches deliberate invalid DTO22023 while cross-role call is42501;
  null DTO causes no job claim, evaluation, student read or Credit mutation.
- Only after successful gateway verification install both JWTs in main Pages,
  keeping flags false, other bindings and Preview intact.

This is prepared code, **not successfully installed Worker authentication**.

## Actual hosted findings

Original keys: current ES256838d43f1; standby ES25640a721a3;
previous ES256f4cf8844 and HS25680c1318f; revoked ES2561a5cf753.
These identifiers are public metadata, not secret values.

Official API rejects key creation after standby→previous with HTTP422:
“There already are 3 previously used signing keys. To proceed first revoke at least 1.”

Original standby was restored after failure. Final comparison verifies all five
original IDs/statuses unchanged. Current Auth key was never changed; no original
key was revoked/deleted. No new trusted key was installed, no worker JWT was minted
or connected. Supabase's empty successful Secret response handling and same-status
PATCH422 were diagnosed; helper now handles empty bodies and skips same-status PATCH.

Three task-generated encrypted backup Secrets V1/V2/V3 were left by failed attempts.
They were verified never imported (trusted-key set unchanged), then removed using
only those exact task-owned names. No existing Owner credential was removed.
Backup cleanup HTTP200, none remaining. Final helper now checks hosted capacity
**before any mutation/private backup**, so rerunning it stops safely.

## Next reviewable decision

The original standby `40a721a3-c77a-4bcc-b2f2-4d9d6b9dd05f` is a possible temporary
retirement candidate **only if confirmed never used for separately issued tokens**.
Supabase Auth does not mint new login JWTs with a standby key, but that alone does
not prove no external/custom token uses it. The API/key metadata and encrypted
Cloudflare bindings cannot establish that absence. Do not revoke based on guesswork.

If confirmed unused, a separately reviewed reversible standby revoke→import→new
previous→original standby restore can avoid changing the current login signer and
keep the previous Legacy/finance keys untouched. This sequence is NOT implemented
or authorized for execution by this document. Otherwise investigate/retire a proven
unused previous key after its caller dependencies are established.

Removing the exposed Legacy key remains required incident follow-up; merely adding
a new Math signer does not resolve that exposure. Legacy anon/service_role and
frozen Payment/IAP/deletion dependencies must be migrated/verified before revocation.
Do not disable Verify JWT, broaden RPC grants or silently change frozen services.

## Tests / status

5 local tests PASS: ES256 signatures for both roles, tamper rejection, 7-day expiry,
no student/privileged roles, HTTP empty success, standby restoration on import
failure, capacity stops before writes. Tests overlap assertions, count is5.
Actual role probe, Provider, debit, rewrite, re-evaluation and History E2E NOT_RUN.
Existing main Pages gates false, two Worker secrets missing; selected account's
previous test JWT session_not_found remains separate blocker.

References:
- https://supabase.com/docs/guides/auth/signing-keys
- https://github.com/supabase/supabase/tree/master/apps/studio/data/jwt-signing-keys
- https://github.com/supabase/supabase/blob/master/packages/api-types/types/api-v1.d.ts
