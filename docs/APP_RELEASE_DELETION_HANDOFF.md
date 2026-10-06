# APP release deletion web handoff — 2026-10-04

Independent branch codex/app-release-deletion-web from LAB main3370dad.
No Payment/Pricing changes; no deployment. APP authority: ADR-2D and
[release closeout](https://github.com/LC3808/legendstudy-app/blob/codex/app-release-closeout-1/wiki/app-release-closeout.md).

/account-deletion/ now has a real authenticated request/status component for
existing `delete-account` Edge lifecycle API. It sends only `{operation}`;
server derives subject from validated JWT. No service role/finance key is used.
Acknowledgement, busy guard, timeout, server DTO/deadline checks, late-owner
suppression, sanitized errors and logout are covered by4 tests. Full141 tests,
typecheck, changed-file lint and webpack static export PASS.

Default disabled: NEXT_PUBLIC_ACCOUNT_DELETION_ENABLED is a PUBLIC build flag.
Set true only after Owner-approved ADR migration/Edge/scheduler/restore/admission
activation, retention policy review, actual native/web lifecycle E2E and deployment
approval. This branch authorizes none of those operations. Existing browser Auth
uses only canonical public Supabase config. No new identity database or wallet.

Public policy still says school/grade/scores/essays are not stored; native App
stores them. Reconcile `src/lib/legal-documents.ts` with APP privacy map before
using it as App policy. Existing support3years/payment5years must agree with
backend execution. Do not claim this candidate meets Play deletion requirements
while disabled/unpublished. Social cancellation/revoke remain APP dependencies.

Owner sequence: review branch → resolve APP lifecycle/provider/policy blockers →
separately authorize deployment + enable flag → synthetic request/failure/status/
owner-isolation/erasure test → publish deletion URL in Console. No real student data.
