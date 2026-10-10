# Essay research preview — Owner V2, 2026-10-10

Local development only; no deployment/DB writes. Prior QA APP4de2125/LABc977493 is
inherited unchanged, not reimplemented. Production migration and Wiki PR#1 stay held.

## Run locally

1. Use Owner V2 ZIP, extract it locally. All12 research originals must pass manifest
   checks; the stale V1 instructions manifest entry is a documented warning. V2 ZIP
   instructions are authority. Do not fetch unprovided Manus paths or source PDFs.
2. In APP overnight worktree, using its standard-library Python converter:

```sh
python3 tool/essay_lab/manus_handoff.py --package /private/tmp/legendstudy-manus-v2 --output /private/tmp/legendstudy-overnight-lab/.local/essay-research
```

3. In this LAB worktree, reuse installed dependencies, then:

```sh
LEGENDSTUDY_ESSAY_PREVIEW=1 npm run dev -- --webpack --hostname 127.0.0.1 --port 3117
```

4. Open `/essay-lab/` or `/essay-lab/universities/`. Search/filter42 universities,
   choose2027, inspect separate campus/offerings/tracks/raw-source facts and links.
   Original53 rows remain distinct within50 offerings;101 tracks cannot evaluate.
   Preview server is bound to loopback; no remote public preview is authorized.

The server adapter loads only `.local/essay-research/catalog.json`, only with BOTH
NODE_ENV=development and explicit preview flag. Production build ignores it even if
the flag remains set. No public import of raw research files; .local is gitignored.
Normal five reviewed public fixtures remain. University/year routes are reused;
new universities index fills an existing route directory, no duplicate site/API.
There is no fetch to production DB, Provider or evaluation API from preview UI.

## Data/evidence boundaries

Do not coerce UNKNOWN/NOT PUBLISHED/REVIEW_REQUIRED, count format validation as fresh
verification, translate source URLs, sum different offerings, or infer historical
questions from2027 admissions. LSL27-052 stays quarantined (2027-08-27 future notice).
HTTP official citations are preserved (3 source rows); JS/data/credential URLs reject.
Provisional problem/answer/input axes retain their respective evidence states.
Owner CORE remains UNDECIDED. No scoring/probability/recommendation or new permissions.

APP audit and existing SKKU2025/Hanyang2024/Sookmyung2025 package references:
`tool/essay_lab/evidence/overnight-20261010/`. Their sources/versions/pages/hash bindings
remain independent of this catalog.10 research evidence candidates have missing
question/PDF/locator/rights gates; the134-row CSV/PDF bodies are not in Owner ZIP.
Only metadata references and synthetic fixtures enter Git; raw research stays local.

## Verified and remaining

New Python10 and WEB13 tests, plus3 existing public-catalog regressions PASS; changed-scope lint/typecheck/static build PASS.
Includes actual local V2 bundle validation, synthetic filters/disabled CTA, duplicate/
foreign IDs, invalid links, explicit production exclusion. Prior unrelated963-suite
was not rerun. Local browser1280px confirms42→search1/2 separate Korea campuses and
existing2027 detail route; no horizontal overflow. No device/Provider/Credit E2E.
Static export with flag set has0 private candidate markers.

Turbopack rejected the shared node_modules symlink in this independent worktree;
existing Webpack mode passed. No SDK/package reinstallation or configuration rewrite.
Rights review, missing originals, explicit DB mappings and future evaluator binding
are unfinished approval/data gates. Production public state remains HOLD.
