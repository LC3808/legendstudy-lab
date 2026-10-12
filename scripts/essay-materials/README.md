# Private essay material ingestion

Offline tooling; no DB writes, Provider calls, uploads or activation. `pypdf==6.10.0`
was used for this run. Run `inventory.py --source <owner-folder> --output <private-folder>`;
then `prepare.py --root <private-folder> --catalog src/data/essay-public-catalog.json
--existing-source <existing SKKU source JSON> --existing-manifest <existing manifest>`.
Run Python unittest discovery in this directory. Output must be outside the source folder.

All ZIPs are scanned. Original member names stay intact; normalized names are separate.
SHA-256 identifies binary duplicates only. Filename/body markers produce review candidates,
NOT verified questions, exam identities, official rubrics, or executable packages.
Question counts remain null until body/visual review. Preserve raw track/campus/session;
regular and mock exams must not merge. Ambiguous identities require review, not new IDs.

Keep output private: inventory includes source paths and per-page text, and manifests
may include source-derived excerpts. Do not commit outputs, PDF/ZIP, screenshots or
private evidence. Only publish reviewed aggregate metadata. Internal analysis permission
is distinct from permission to transmit material to an external Provider.

SQL files are LOCAL REHEARSAL drafts, outside the canonical APP migration directory.
The storage draft always rolls back. It does not implement a billing RPC and is NOT
ready for Owner approval to apply. The rollback refuses to remove nonempty objects.
No existing ledger table/function is altered. Detailed state: Unified Wiki current status
and Essay-first Owner policy, including unresolved atomic persistence/History/QA work.

## Source selection read model — 2026-10-12

`src/data/essay-source-registry.json` contains metadata only: 21 source universities,
77 exam/subject selection records and 237 answer input labels. This is NOT a claim
that all 581 review groups, subquestions, private evidence or rubrics are complete.
The UI uses it when no canonical DB questions are available. Evaluation is always
false; source keys must never be sent as canonical UUIDs to billing or History RPCs.

`assess_source_selection.py --private-root <private-folder>` produces conservative
candidates from existing extraction. `build_source_registry.py --private-root ...`
reproduces the published selection snapshot using only its already reviewed source
hash allowlist plus explicit reviewed reconciliations. New parser hits are not
published automatically. Duplicate exam identities fail rather than silently merge.
Run from repository root. Originals remain read-only; no private text is emitted.

Review corrections: Yonsei 2027 science sample is MOCK despite “수시” in its header;
Hanyang 2024 mock [문제 2번] is a second question; Sookmyung humanities files 1/2
contain question parts, not separate tracks; Kwangwoon natural files 1/2 likewise.
Inha afternoon is a session, Hongik 2025 Sejong retains its campus. Sogang's single
unnumbered prompt is shown without an invented ordinal. Unknown campus/DB IDs stay
null. Registry scope is exam identity/top-level answer labels, not complete content.

Hongik's owner scan has no year header. Its printed pp.93–107 were reconciled with
the official 2025 impact report (article 134109, attachment 79446), including cover
and identical first question. Official reference:
https://www.hongik.ac.kr/kr/admission/notice-admission.do?articleNo=134109&mode=view
The downloaded comparison PDF and renders remain private, outside Git.

Hanyang/Sookmyung existing APP `essay-scaffolding-vnext` evidence and CLI model runs
are reused as provenance; they are not evidence of production API + Credit E2E.
Neither source metadata nor browser-only drafts grant Provider readiness. Exam-unit
atomic settlement, canonical question registration, shared History/QA and Provider
rights remain required before submission can be enabled. Existing Math is untouched.

## Canonical registration review — 2026-10-13

`prepare_registration.py` joins the existing source registry to the read-only
`db-catalog-preflight-20261012.json` snapshot (51 DB university rows,22 exams,
0 general essay questions). These DB counts are not the public42-university scope.
No database connection or write is made by the generator. Existing IDs are preserved;
new candidate UUIDs are deterministic and remain outside the public source registry.
Review output: `sql/registration-review/registration-plan.json`,
`register-review-only.sql`, `rollback-review-only.sql`.

76 exam/subject records (74 new,2 existing),234 question metadata rows are planned.
Yonsei2025 additional natural source1/3 questions is held: its body does not establish
whether it is the existing additional exam. Never resolve this by filename alone.
This is NOT77 fully verified exams or234 approved Evaluation Packages.

Registration is unpublished/inactive and changes no privileges, RLS, ledger or
original evidence. It does not authorize evaluation or by itself enable account
Draft. Publication/verification requires separate reviewed provenance and rights.
The production apply path remains the canonical APP migration process after Owner
approval; these review-only DML files have NOT been promoted or applied.

Validation: `python3 -m unittest discover -s scripts/essay-materials -p test_registration.py`
(3 PASS), then `python3 scripts/essay-materials/test_registration_database.py
--app-root <APP-checkout> --pg-bin /opt/homebrew/opt/postgresql@17/bin`.
Disposable PG17 using actual15 legacy prerequisites: apply replay PASS, no publication
PASS, edited-row rollback denied PASS, exact22-exam baseline restored PASS. Production
applied NO. Rollback refuses changed records or practice sessions and relies on
existing FK restrictions; never force-delete student records.

The shared public Catalog can enrich exact source keys with canonical UUIDs only
from published anonymous-RLS metadata, same university/year/kind and preserved exam
identity. Ambiguous mappings fail closed. No Worker credentials are used and
`evaluationReady` remains false. Both clients consume the same response.


## Oct13 operational read and universal continuation

Canonical APP migrations `20261012212352` (private registration) and
`20261012215054` (worker-only private metadata RPC) are now Owner-approved/APPLIED.
Earlier NOT_APPLIED descriptions above are historical review snapshots.
Read-back confirms76 exams/234 exact IDs, unpublished0→0. No evaluation activation.
WEB POST checks existing Auth/allowlist before the narrow worker read; Native uses
this same endpoint. ESSAY_REGISTRY_WORKER_JWT configuration remains missing, so live
private gateway is not verified. Public GET/source drafting remain available.
WEB/Native ordered multi-image drafts reuse existing local stores; shared image
storage/upload and exam evaluation/Credit/History/QA are not yet operational.
The APP common package adapter reuses exact accepted Hanyang/Sookmyung source inputs,
with all21 universities retained and role candidates mapped from existing inventory.
No original PDF/private evidence is copied here; no actual Provider/Credit E2E claimed.
