# TASK20 priority natural release

Owner approved production SQL, release connection and WEB reflection on 2026-11-06. Source baseline is the actual deployed `23a03b0`, not the concurrent TASK20-C worktree. That task has different TEST-only package IDs; none were bound in Production at preflight. Use only the approved APP repository candidate `supabase/candidates/task20_priority_20261106` (source `1abcf93`). Do not apply both packages.

Production registration of 96 rows and six-leaf activation completed. Catalog 72 → 78, all previous 72 mappings, function owners/ACL and 11 protected table hashes unchanged immediately after application. Existing Q1, financial policy, Registry publication flags and APP65 are preserved.

This WEB change appends exact exam/question bindings for Konkuk 2026 natural Q1–Q4 and Kyunghee 2026 natural Q1–Q3. Existing static files are all retained; the shared API bundle and three bounded scope values are updated. Public exams 212 → 214, expansion 42 → 44, Math leaves 72 → 78. Secrets and unrelated settings are not rewritten.

Validation: 51 focused tests PASS; Pages Functions build PASS; exact routing configuration equals deployed baseline. Production authenticated entry acceptance is pending deployment; no actual evaluation or financial transaction is part of verification.

Deployment script: `scripts/deployment/task20-priority-api.mjs BACKUP WORKER ROUTES plan|apply`. It guards baseline deployment/configuration, source change allowlist and required leaf IDs; preserves all 1,972 static asset hashes. Private receipt lives in the APP worktree `.local/task20-priority-20261106/deploy`.

Rollback: restore the previous deployment and exact three previous environment values, after checking concurrent deployment changes. SQL rollback restores the guarded two prior function definitions, retaining content and any in-flight history; never delete evaluations or ledgers.
