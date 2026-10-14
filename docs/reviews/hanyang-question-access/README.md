# Hanyang question access — approval pending

Only the existing question PDF (SHA in SQL) is eligible. All3 pages visually
checked: cover/instructions, question/passages, continued passage. No evaluation
criteria, explanation or model answer. Matches the existing stored document hash.

The current bucket is private and operator-only. Existing operators can test the
UI now. This optional SELECT policy permits active authenticated accounts to read
only this exact object, retaining account lifecycle checks. No anon/public bucket,
write, other document, Registry, Credit or evaluation authorization change.

Apply only after Owner approval. Before/after inspect pg_policies and check that
question download succeeds for active user while integrated PDF remains denied.
Anonymous and deletion-pending account access must remain denied. Rollback removes
only this policy; original admin policy and all objects remain. Production policy
not applied as of this commit. UI test/build success is not RLS test evidence.
