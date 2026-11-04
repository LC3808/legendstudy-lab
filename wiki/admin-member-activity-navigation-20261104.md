# Member materials and consistent admin navigation — 2026-11-04

Owner requested recent5 bookmarks/favorites and recently viewed materials, plus consistent menus between admin pages. Owner clarified favorites=bookmarks; they are one list, not duplicated.

## Implementation

- `admin_member_recent_activity(uuid)` reads existing bookmarks/recent_views/content_items. Each list returns at most5, ordered by timestamp DESC then immutable rowID DESC. Totals are separate. Recent views reflect latest timestamp per stored material, not a fabricated click history. No collection/write changes.
- Admin operator and actor/subject lifecycle checks; fixed search_path; anon/PUBLIC/service_role execute revoked. No user table grants changed. Missing member raises PT404; real empty lists show empty, errors do not show zero.
- Member detail shows title, saved/viewed timestamp in KST, and validated HTTP(S) source link. It rejects a mismatched member response. No extra favorite table or copied rows.
- Root cause of inconsistent navigation: previous scoped asset releases kept older admin route assets. All `/admin/*` and `/ql/*` now publish from one build. Every admin surface uses the same14 links/four groups; route selection only changes active state. Student-facing assets and current API/settings remain preserved.
- Before broadening admin asset scope, restored the deployed `admin_credit_report` v2 source/action/period/member filters, grant/action statistics, pagination and original-row detail in source. This keeps beta vs signup/event/manual/paid classifications and reservation vs consumption distinctions. No credit SQL/write paths changed. APP/WEB inquiry integration remains on support_admin_* contracts.

## Validation

-35 targeted UI tests PASS: activity rows/unsafe links/mismatched subjects; common navigation across5 pages; support integration; credit v2 filters/paging; existing payment and credit operations; independent Student360.
- Disposable PostgreSQL PASS: recent5 ordering, totals, separate members, empty member, denied roles and lifecycle, plus existing dashboard cohort regression.
- Changed-source lint, TypeScript and static export163 routes PASS.
- Preapply bookmarks59/hash `a73976846f93337a3f0f17d66aa7d151`; recent views347 (legitimate user activity may continue). Fixed cutoff ledger hash `5a753f5f3e79095f33323051d09a6756`.

Migration: `supabase/migrations/20261104102732_admin_member_recent_activity.sql`. Rollback of the new function only: `drop function public.admin_member_recent_activity(uuid);` after restoring prior WEB. Original data is untouched.

Production receipt and actual UI read checks are appended after deployment. No financial operations, user evaluations/replies, or APP build/integration performed.

## Production completion

- Read-only member activity RPC applied; bookmark checksum and pre-10:00 UTC credit ledger checksum unchanged.
- Initial activity release: cfb01da / 927b62a8-7750-4a58-ba65-52c3db04d3c1.
- Owner follow-up: dashboard is the first independent navigation link, outside every category, named 대시보드. Source ee017d2e6e3fcb0d11f3588f532f7167ef6e178c.
- Final WEB: 4cc2bdbd-7ec8-42c8-88f8-1e8aec09b13f, 2026-11-04 19:37 KST. Manifest exact, 49 bindings unchanged, existing student assets/API preserved.
- Navigation regression 12 PASS; 163-route production build and TypeScript PASS.
- Authenticated production browser: member bookmark latest5 of7 and recent-view latest5 of9 show titles/KST dates; existing APP inquiry present; credit v2 source/action statistics present; dashboard first outside categories on inquiries/credit/dashboard.
- During immediate release propagation an older dashboard document/chunk was observed. Fresh release navigation loaded correctly; subsequent credit → dashboard navigation succeeded with the new top-level link.
- No replies, grants, consumption, payments, refunds or APP builds executed.

## School chart alignment follow-up
- Source f9a5c6c: dedicated school chart columns use common 42% label, flexible track and 3ch right-aligned count. Previously each row sized its label independently, shifting track starts and making equal counts appear different.
- Production 51f34857-677e-4985-956a-eeb374bd0f76, 2026-11-04 19:46 KST; exact manifest and unchanged49bindings verified.
- Build/TypeScript PASS. Authenticated DOM geometry: all20 tracks share identical start and width; count1 bars are exactly one quarter of count4. No data or SQL changes.
