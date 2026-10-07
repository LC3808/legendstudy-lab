# LAB PRICING / CHECKOUT FINAL UX FIX — 완료 보고

작업 지시: `pasted_content_25.txt` (LAB PRICING / CHECKOUT FINAL UX FIX, OWNER DIRECTIVE)
범위: `/pricing/`, `/payments/checkout/`, 학교 단체/이벤트 프로모션, 관련 CSS/UI interaction

---

## 최종 보고 (Owner 지정 포맷)

```
MAIN_COMMIT:            8cc25c7  (8cc25c71d3917e04e8c8c9da72f7e1a7cd5f007c)
PRODUCTION_COMMIT:      8cc25c7  (Cloudflare Pages deployment ba3a28d9, github:push / main)

PRICING_HERO_WRAP:      PASS   (1440/1280/1024 = 1줄, 자연 wrap 768 이하, overflow 0)
LAB_NAME_EMPHASIS:      PASS   (font-weight 800 + --brand-text)
PRIMARY_TEXT_COLOR:     BLACK  (.pricing-page/.checkout-page --ink-body #10161d)
SECTION_TITLE:          판매 상품
DEFAULT_CARD_BORDER:    BLACK  (1px rgb(23,43,69) = --ink, 4개 상품 동일)
RECOMMENDED_BORDER_SPECIAL: NO
RECOMMENDED_BADGE:      YES    (추천 badge, --brand 배경)
SELECTED_COLOR_TOKEN:   --brand: #ffac14   (기존 LAB identity token, 이전 이름 --ll-orange)
SELECTED_SHADOW:        YES    (0 0 0 2px brand/55% + 0 14px 32px -22px brand/70%)
DEFAULT_SELECTED:       5 CREDITS (추천 상품 = 기본 선택)
INITIAL_BUTTON_STATE:   STABLE (정적 export 시점부터 선택/라벨 확정, hydration 후 변화 없음)
FIRST_CLICK:            PASS   (1회 클릭으로 선택 완료 + 즉시 결제하기)
PROMOTION_SECTION:      RESTORED
TEST_PAYMENT_COPY_VISIBLE: NO  (라이브 /payments/checkout/ notice = null)
PRICING_CHECKOUT_VISUAL_MATCH: PASS (computed style 13개 항목 전부 동일)
PAYMENT_BACKEND_CHANGED: NO
TOSS_CONFIRM_FIX_PRESERVED: YES (1437b99 = HEAD의 ancestor)
PRODUCTION_VERIFIED:    YES
REMAINING_UI_BLOCKER:   NONE
```

---

## 1. Hero 문구 줄바꿈

기존에는 52rem(832px) measure에서 `…구체적으로 / 보여주는 논술 첨삭 서비스입니다.`로
"구체적으로 보여주는" 구절 중간이 잘렸습니다.

수정: `@media (min-width: 1024px)`에서 `max-width: 66rem` + `font-size: 0.96rem`.
문장 실측 폭은 0.96rem에서 약 958px이고 wrapper는 1440에서 1088px, 1024에서 984px입니다.
`<br>`은 사용하지 않았습니다 — measure로만 제어하므로 200% 텍스트 확대에서도 자연 reflow 됩니다.

| viewport | hero 줄 수 | overflow |
|---|---|---|
| 1920 | 1 | 0 |
| 1440 | 1 | 0 |
| 1280 | 1 | 0 |
| 1024 | 1 | 0 |
| 900 / 768 | 2 (자연 wrap) | 0 |
| 390 / 360 | 4 (자연 wrap) | 0 |

## 2. 서비스명 강조 / 본문 색

- `LegendStudy 논술 LAB` → `<strong class="pricing-hero__service">`, `font-weight: 800`,
  `color: var(--brand-text)`.
- `--brand-text: color-mix(in srgb, var(--brand) 52%, var(--ink-strong))` → `#8b6925`,
  흰 배경 대비 **5.07:1** (AA 통과). 새 색상 코드를 만들지 않고 기존 `--brand`에서 파생했습니다.
- 본문/상품 정보: `.pricing-page, .checkout-page` 스코프에서 `--ink-body: #10161d`,
  `--ink-muted: #3d4753`. `Credit당 가격` 등 secondary metadata만 muted 유지.

## 3. 제목 / 카드 규격

- 섹션 제목 `Credit 판매 상품` → `판매 상품`.
- `.plan-card` 하나로 `/pricing/`과 `/payments/checkout/`이 같은 카드를 렌더합니다.
- 기본 border: `1px solid var(--ink)` — 1/3/5/10 Credits 전부 동일 색·동일 굵기.
- 추천 상품 굵은 border 제거. 추천은 오직 `추천` badge로만 표현.
- subtle shadow: `0 1px 2px rgba(23,43,69,.07), 0 10px 26px -24px rgba(23,43,69,.5)`.
- 선택 상태: `border-color: var(--brand)` (1px) + brand glow. border 굵기를 바꾸지 않으므로
  layout shift가 없습니다.
- 폐기: `--checkout-selected: #d02b2b` / 6px 붉은 선택 border, checkout 전용 2px 굵은 border.
  (`out/_next/static/chunks/*.css`에 `checkout-selected` 0건)

### 두 페이지 카드 computed style 비교 (1440)

| 속성 | /pricing/ | /payments/checkout/ |
|---|---|---|
| border | 1px rgb(23,43,69) | 동일 |
| radius | 13.6px | 동일 |
| shadow | rgba(23,43,69,.07) 0 1px 2px, rgba(23,43,69,.5) 0 10px 26px -24px | 동일 |
| padding | 21.6px 19.2px | 동일 |
| 상품명 | 15.2px / 800 | 동일 |
| 가격 | 32.8px / Georgia | 동일 |
| 추천 badge | bg rgb(255,172,20) / text rgb(14,33,56) | 동일 |
| 선택 border | rgb(255,172,20) / 1px | 동일 |
| 선택 shadow | color(srgb 1 .6745 .0784 / .55) 0 0 0 2px, … | 동일 |

## 4. 첫 클릭 이중 동작 버그

원인: 최초 렌더에서는 선택 상태가 없어 모든 버튼이 `구매하기`였고, hydration 후에야
선택 개념이 생겨 `선택하기`/`결제하기`로 다시 그려졌습니다.

수정: `pricingPlans` 데이터에서 기본 선택(5 Credits)을 정하고, 라벨은 **선택 여부만으로**
결정합니다. 정적 export 시점에 이미 최종 라벨이 나오므로 hydration이 라벨을 바꾸지 않습니다.

라이브 Production 실측 (`lab.legendstudy.com`, runtime `REVIEW`):

| | 1 CREDIT | 3 CREDITS | 5 CREDITS | 10 CREDITS |
|---|---|---|---|---|
| 최초 진입 | 선택하기 | 선택하기 | **선택 + 추천 + 결제하기** | 선택하기 |
| 10 CREDITS 1회 클릭 후 | 선택하기 | 선택하기 | 추천 유지 / 선택하기 | **선택 + 결제하기** |

`결제하기`의 활성 여부는 서버가 판단합니다. 익명 방문자는 `consumer_purchase=false`이므로
disabled(라벨은 동일하게 결제하기)로 렌더되며, allowlist 심사 계정에서는 서버가 열어줍니다.

## 5. 학교 단체 / 이벤트 프로모션 복구

삭제 직전 구현(`09db4c2^`)을 기준으로 `src/components/pricing-promo-form.tsx`를 복구하고
`promotionCopy`를 `src/lib/pricing.ts`에 되돌렸습니다.

- 섹션 제목: `학교 단체 이용 / 이벤트 프로모션`
- lead: `학교나 이벤트에서 받은 쿠폰 번호가 있다면 입력해 주세요.`
- 입력 필드 + `적용하기` 버튼(disabled), form은 left aligned, compact 처리
- backend가 없으므로 `쿠폰 적용 기능은 결제 기능과 함께 제공될 예정입니다.` 라고 사실대로 표시
- 위치: `Credit 이용 조건` 다음 (핵심 구매정보가 아닌 보조 영역)

## 6. TEST 결제 설명 삭제

`checkoutNotice('TEST'|'REVIEW')` → `null`. 라이브 체크아웃에서 `.checkout-notice`
텍스트는 `null`임을 실측했습니다.

NOT_READY / PAUSED는 실제 이용 불가 상태이며 disabled 버튼의 이유를 설명하는 유일한
문구이므로 유지했습니다. (Production runtime은 REVIEW이므로 실제로는 표시되지 않습니다.)

## 7. 검증

```
pnpm lint              PASS
pnpm typecheck         PASS
pnpm test              PASS  24 files / 273 tests
verify-boundaries.mjs  BOUNDARY_AUDIT=PASS
pnpm build (static)    PASS  Compiled successfully
```

- overflow = 0: 1440 / 1024 / 768 / 390 / 360 (로컬 export + 라이브)
- 200% 텍스트: 1440 / 1024 / 768 / 390 / 360 전부 overflow 0
- 접근성: 카드 제목은 `h3[id]` + `aria-labelledby`, 버튼은 실제 `<button>`(선택/결제 모두),
  쿠폰 입력은 `label[for=promotion-code]` + `aria-describedby`
- 페이지 필수 요소: 사업자정보/고객센터/이용약관·개인정보·환불·고객센터 링크 유지
  (boundary guard 통과)

## 8. 배포

UX 변경 commit: `753596b` (remote `e1adc86` 위로 merge → `8cc25c7`, 최초 Production 배포)
이 보고서는 그 뒤 `docs/` 전용 commit으로 같은 tree를 게시합니다 (빌드 산출물 동일).

- Branch: `main` (origin/main과 동일, ahead/behind 0)
- Cloudflare Pages 프로젝트 `legendstudy-lab`, production branch `main`, `pnpm build` → `out`
- GitHub push 자동 배포: deployment `ba3a28d9-991a-45d0-b199-2a5636e917bd`,
  `commit_hash 8cc25c71d3917e04e8c8c9da72f7e1a7cd5f007c`, aliases `https://lab.legendstudy.com`
- 라이브 확인: `/pricing/` 200, `/payments/checkout/` 200

## 9. 변경 금지 항목 확인

- `cloudflare/` (payment Function) — 이번 작업에서 diff 0건
- `PAYMENT_MODE` / `PAYMENT_FINANCE_TOKEN` / `PAYMENT_REVIEW_SUBJECTS` /
  `TOSS_TEST_*` / `TOSS_MID` / Supabase payment DB / migrations / RPC /
  finance role / ES256 / confirm·cancel — 미변경
- LIVE key / LIVE activation — 없음
- `src/lib/payment-runtime.ts` 변경은 `checkoutNotice` 문구 1곳뿐이며
  `checkoutOpen`, `purchaseEnabled`, `checkoutAvailable` 로직은 그대로입니다.
- Toss success confirm fix `1437b99` — HEAD의 ancestor로 보존

## 10. 참고 (Owner 판단 필요)

- `/payments/test/`(내부 심사용 harness)에는 `구매하기` / `테스트 결제` 문자열이 남아 있습니다.
  이번 지시 범위(`/pricing/`, `/payments/checkout/`)가 아니고 어떤 사용자 화면에서도
  링크되지 않아 유지했습니다.
- `결제하기` 버튼 색은 사이트 공통 CTA 색 `--accent: #e76f2f`입니다. 선택 강조색만
  `--brand: #ffac14`로 지정하라는 지시였으므로 공통 CTA 색은 건드리지 않았습니다.
  필요하면 별도 지시로 통일할 수 있습니다.
