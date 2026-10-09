# Credit history display — 2026-10-09

Owner confirmed a real Production Admin grant and correct balance/history. That is
OWNER_VERIFIED acceptance of the preceding task; no grant is repeated in this task.

`src/lib/credit-display.ts` is the shared presentation authority:

- `formatCreditGrantType`: signup_bonus/signup_bonus_v1 → 신규가입 무료;
  admin_grant/manual_support → 관리자 지급; promotion → 이벤트 지급;
  compensation → 이용 보상; purchase → Credit 구매; refund → 환불.
- `formatCreditReason`: signup_bonus_v1 + actual delta3 → 가입 축하 Credit 3개.
  Strip only the `manual_support:` prefix, retaining the entered reason. `오류`
  remains `오류`; it does not infer compensation. `오류 보상` stays `오류 보상`.
- `formatCreditActor`: system → 자동 지급; operator → 관리자;
  school_admin → 학교 관리자; promotion_system → 이벤트 자동 지급.
  Accepts Admin actor_kind or canonical actor_reference, without displaying UID.
- Unregistered types/actors show 기타 Credit 내역 / 기타 주체. Missing values are
  explicit. Unknown free-text reasons remain intact rather than inventing meanings.

Admin origin/type helpers re-export the shared formatter (no duplicate maps).
Member detail/Credit lookup keep the existing table columns. MY Credit history and
Essay personal dashboard reuse the same existing bounded `readHistory` query;
only already-readable reason_code/actor_reference columns are added to projection.
Owner/account filters, RLS, count/aggregation, balance deltas and ordering unchanged.
No new RPC, migration, write, grant test, Payment/Toss/IAP or Ledger policy change.

Verification:85 relevant tests PASS; lint/typecheck/boundary/build PASS. Immutable
source fixture and positive grant/refund amounts retained. Actual Chromium build
at1440/390/360 across Admin member detail, MY Credit, Essay dashboard:9 checks PASS,
raw codes/UID hidden, zero grant requests. Synthetic data, not a new authenticated
Production grant test. Credit content readable at200% text; separate Admin search
filter has an existing216px page overflow at390px/200%, reproduced on unchanged
Production. Outside this display refinement; Credit region remains in viewport.
