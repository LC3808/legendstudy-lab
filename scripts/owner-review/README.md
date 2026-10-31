# Isolated Owner result review

The review entry renders the existing `1390452` result components on the existing
production origin. It uses the existing `legendstudy-lab-auth` session and public
Supabase client configuration. No evaluation, retry, draft, credit or history
mutation control is included. `window.print()` is explicitly a review-page print
control; it does not replace the normal result export implementation.

The only data endpoint is GET `/api/owner-review/essay`. It validates the caller
with Auth, requires the existing `admin_operator()` RPC to return exactly true,
and calls the existing owner-scoped `essay_exam_history(p_run)` with the same
caller token. No service-role key, new SQL or privileged query is used. The list
shows the existing RPC's latest 50 runs; completed exam results and their stored
parent can be inspected. It is not a synthetic fixture viewer or a submission UI.

Build the three static assets with Node 22:

```
node scripts/owner-review/build.mjs PRIVATE_PROJECT_SNAPSHOT OUTPUT_DIRECTORY ESBUILD_MODULE_ROOT
```

The snapshot is the private Cloudflare project GET response. The builder accepts
only the LegendStudy project and expected public Supabase URL/publishable key.
It never embeds other configuration. The esbuild module may come from the pinned
local Wrangler installation. Review the bundle-inputs file and source diff.

**Do not deploy the current branch's entire export to production for this review.**
The safe review deployment preserves every production manifest path/hash, existing
redirects, headers, settings and existing function source at the deployed SHA.
Only these assets and the isolated read endpoint may be added. Preserve the actual
previous deployment ID for rollback. Compare the current canonical deployment and
settings immediately before applying; abort on drift. The normal production result
pages remain on their old assets until separate Owner approval.

Canonical release evidence, artifact paths and rollback instructions live in the
APP repository's Unified Wiki (`web-safe-owner-preview-20261031.md`).
