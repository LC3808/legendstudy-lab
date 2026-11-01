# LegendStudy+ official homepage

`home.legendstudy.com` is a standalone **static Cloudflare Pages** project (`legendstudy-home`), separate from LAB. No API, authentication, Supabase binding or Pages Function is included. Source recovered from the existing `codex/official-home-20261019` directory only; no historic branch merge.

## Build and inspect

From the WEB repository root, with Node 22 and existing dependencies installed:

```sh
node official-home/build.mjs
node official-home/verify.mjs
python3 -m http.server 4312 --bind 127.0.0.1 --directory official-home/dist
```

Open `http://127.0.0.1:4312/`. `official-home/dist/` is the only deployment artifact. Existing Next.js `out/` is **not** the homepage artifact. Real app screenshots, app icon, Pretendard and the original navy/orange design are retained. Business identity still comes from `src/lib/business-info.ts`.

## Launch content

- App Store: https://apps.apple.com/us/app/레전드스터디/id6820826957
- Google Play: https://play.google.com/store/apps/details?id=com.legendstudy.app
- LAB: https://lab.legendstudy.com/
- Original materials site: https://legendstudy.com/
- Existing support, privacy, terms, account deletion links retained; explicit `/refund/` link added.
- Materials search/PDF/save/timer/D-Day described as available. Humanities LAB links to its actual availability/policy. No daily free entitlement advertised as active. Mathematics remains preparing.

## Analytics — collection not yet enabled

The homepage reuses `src/lib/analytics/ga4.ts` (compiled at build time) and its privacy/origin gates. Optional `pageTitle` preserves the LAB default while accurately labeling this homepage. No LAB environment values are copied.

`banner_click` reuses the Owner's TASK 11 marketing event name. The old static homepage had no tracking implementation; this is its outbound adapter, not an expansion of LAB's 31-event allowlist. Only existing allowed properties `platform`, `screen`, `source` are sent, plus the shared runtime's sanitized page context.

- `platform=web`, `screen=official_home`
- `source=hero:app_store`, `hero:google_play`, `download:app_store`, `download:google_play`, `essay:essay_lab`, `download:legendstudy`
- Click means **navigation intent**, never installation, evaluation completion or purchase.
- No email, answer, arbitrary link text/URL/query/hash, user ID or payment information is included.
- No persistent click log or second event ledger. Normal later clicks remain distinct; repeated dispatch of one event is ignored.

Only after an actual homepage web stream is identified and its privacy settings reviewed:

```sh
HOME_ANALYTICS_ENABLED=true HOME_GA4_MEASUREMENT_ID='<verified G-... ID>' HOME_GA4_PRIVACY_REVIEWED=true node official-home/build.mjs
```

Defaults are off. Missing/invalid reviewed settings fail the enabled build before replacing the artifact. Allowed origin is only `https://home.legendstudy.com`; localhost and Pages preview do not transmit. Shared runtime requires enhanced measurement disabled, consent/retention review and denies ad storage/signals. GA4 reporting permission is separate. No property or measurement ID was invented. Actual GA4 reception remains **NOT_TESTED**. Tests use a local fake ID/window only, with no Google requests.

## Approved production deployment and rollback

Owner TASK12-B explicitly approved deployment on 2026-11-01. Production `home.legendstudy.com` now serves deployment `1b3063af-ea6f-4189-9ac5-7ad478004974`, exact source `442baf9d5f0d710f7f9ac50e7b8096d96d6b6af3`, existing production branch `codex/official-home-20261019`. Previous successful deployment `4104f06d-b748-4ee0-b40f-aca5ccbd909c` remains the rollback target. Home settings and LAB deployment were verified unchanged. No other service was deployed.

Any separately approved future direct upload must run **from `official-home/`**, explicitly target project `legendstudy-home` and its confirmed production branch, with artifact `dist/`. Never run a Pages deployment from the LAB root: it contains unrelated Functions. Do not modify DNS, LAB deployment, DB, Worker or environment bindings.

Before approved upload, recheck current deployment ID and production branch; retain that immutable deployment. Afterwards verify the domain, both store links, LAB, original site and legal pages on desktop/mobile. If broken, use Cloudflare Pages **Rollback to this deployment** for the retained production ID. As a secondary recovery, `qa/rollback-production-4104f06d.tar.gz` was reconstructed from production source `20cf31b` with its original business authority. Its hash manifest is in `qa/rollback-verification.json`. Browser verified old production renders; raw HTTP byte comparison was blocked by 403, so the reconstruction is not claimed to be a downloaded production artifact. No rollback action was executed.

Canonical detailed report: APP Unified Wiki `wiki/official-home-launch-task12.md`.
