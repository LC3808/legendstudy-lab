# Hanyang question access — applied 2026-10-14

Only the existing question PDF (SHA in SQL) is eligible. All3 pages visually
checked: cover/instructions, question/passages, continued passage. No evaluation
criteria, explanation or model answer. Matches the existing stored document hash.

The current bucket is private and operator-only. Existing operators can test the
UI now. This optional SELECT policy permits active authenticated accounts to read
only this exact object, retaining account lifecycle checks. No anon/public bucket,
write, other document, Registry, Credit or evaluation authorization change.

Owner approved one-file SELECT. Applied migration20261014002156. Before/after inspect pg_policies and check that
question download succeeds for active user while integrated PDF remains denied.
Anonymous and deletion-pending account access must remain denied. Rollback removes
only this policy; original admin policy and all objects remain. Production policy applied and inspected: authenticated SELECT only.
Read-only transaction under a real active non-operator subject and authenticated
role: operator=false, account_allowed=true, question_visible=1, other_materials=0.
Anon role:0 material objects. No student records or identities changed/output.
These checks validate actual Production RLS, not a non-operator browser session.
Previous PC/mobile browser PDF rendering was verified under the operator account.
No write policies, public bucket flag, Provider, Credit or evaluation gate change.
