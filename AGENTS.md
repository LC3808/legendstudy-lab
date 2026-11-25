# LegendStudy official project state

The canonical project Wiki is **LC3808/legendstudy-app, origin/main:wiki/**, not a WEB task branch. Start with the APP main AGENTS.md, wiki/index.md and wiki/current-status.md (https://github.com/LC3808/legendstudy-app/blob/main/wiki/current-status.md), then inspect this WEB branch and actual deployment. Local WEB Wiki is task evidence only. At closeout publish relevant project status to the APP main Wiki and verify official reflection; a WEB task-branch push alone is not a complete handoff. Preserve unrelated work and do not infer production deployment from Git. If official state cannot be read, report freshness NOT_TESTED. APP main AGENTS defines release-result confirmation and approval boundaries.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
