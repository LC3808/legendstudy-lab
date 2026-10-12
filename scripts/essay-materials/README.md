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
