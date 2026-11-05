# TASK20 WEB availability recovery — 2026-11-05

Canonical report: APP repository `wiki/task20-production-availability-20261105.md`.

Baseline: production 51f15f6c-4403-4c19-bab9-6efca3627727, source 1037c1e.

Changes: query existing server admission for all tracks, preserve mixed-exam holds, recover separately released Math questions (Konkuk 2026 Q1 only), distinguish API errors from policy restrictions, clarify partial releases, update beta tracks/end time. No DB/settings changes, no evaluation requests, no credit/history writes.

Validation: targeted 92/92, TypeScript, changed-file ESLint, production-configured webpack static build (163 pages), Wrangler 4.136.1 functions build PASS. Broader suite: 1774 PASS / 7 FAIL / 5 SKIP plus one unhandled exception; all seven failures and the exception reproduce on untouched production baseline in admin analytics tests. This is not a whole-suite PASS.

Deployment: `scripts/deployment/task20-preserved.mjs PRIVATE_BACKUP plan|preview|production` overlays only Essay LAB route files and new hashed static assets, preserves all unrelated route hashes and production settings, verifies identical function routing and permits only exam endpoint source change. Private backup must contain current project.json, files/functions API snapshots, routes.json, compiled/index.js. Never write masked secrets back to settings.

Rollback: Cloudflare Pages rollback to baseline deployment 51f15f6c-4403-4c19-bab9-6efca3627727; no DB rollback needed. Deployment and authenticated live postflight must be recorded separately; local build does not imply production recovery.
