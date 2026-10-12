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
