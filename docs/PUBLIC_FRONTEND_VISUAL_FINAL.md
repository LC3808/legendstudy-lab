# LEGENDSTUDY LAB — PUBLIC FRONTEND VISUAL FINAL (완료 보고)

지시: PUBLIC FRONTEND VISUAL FINAL / MANUS IMPLEMENT GO (Owner 승인 2026-10-08)
시작 기준: origin/main `b79e9ba` (지시서의 `3a1c69f`보다 최신 remote를 사용)

---

## 0. 최종 보고

```
FRONTEND_VISUAL_FINAL:  PARTIAL
                        (HOME 경계·LAB 리듬·depth·한국어 개행·200% 접근성은 완료.
                         Pricing/Header/Footer/Login은 점검·검증 완료, 재설계는 하지 않음)

PRODUCTION:
  main:       371e30a  (→ 이 보고서 commit)
  deployment: 2667e3d0 (github:push/main, aliases https://lab.legendstudy.com)

HOME:
  section divider:  복원 (Three LABs / Connected Data / Start 앞, dark neutral 1px)
  depth:            --product-shadow-lift 도입, hero 계열 surface에 적용
  hierarchy:        유지 (문구·순서·CTA·IA 변경 없음)

KOREAN_WRAP_AUDIT:
  pages checked:  HOME, Header, Login, 내신 LAB, 모의·수능 LAB, 논술 LAB, Pricing,
                  Footer, Terms, Privacy, Refund, Support, Account deletion,
                  Checkout, MY/Account  (1440·1280·390·360·320 및 200% text)
  fixes:          overflow-wrap: anywhere → break-word (음절 단위 wrap 방지)
                  .site-shell h1/h2/h3 에 overflow-wrap: anywhere (200% 접근성)
                  한국어 어절 중간 개행: 데스크톱 0건 (아래 5절)

LAB:
  internal:   섹션 리듬 복원 (뷰포트 높이 채움) + 공유 depth/radius
  mock/suneung: 내신 LAB과 동일 family 유지
  essay:       기능(첨삭권 header·credit state·대학/시험 UI) 변경 없음, shell만 정렬

PRICING:
  visual:                기존 product card/selection/promotion 구조 유지·검증
  payment flow preserved: YES (onClick/order/Toss handler 수정 없음)

FUNCTIONAL_LOGIC_CHANGED: NO
DB_CHANGED: NO
PAYMENT_CHANGED: NO

KNOWN_LIMITATIONS:
  - /terms/ 데스크톱 개행 2건 (한국어 어절 아님, 아래 5절)
  - 모바일 320~390 법률 문서 개행 (Latin·숫자··)
  - MY/Admin visual polish 는 Codex 기능 closeout 이후 (지시서 §3)
  - 로그인 상태 논술 LAB 화면은 자격증명 부재로 라이브 실측 불가
```

## 1. 변경 범위

```
src/app/globals.css          (public CSS만)
scripts/qa-korean-wrap.py    (전수 감사 도구, 신규)
.gitignore
```

컴포넌트·페이지·라우팅·결제·인증·Credit·DB 로직은 한 줄도 변경하지 않았습니다 (`git diff`
기준 코드 diff 0건). 지시서 §2·§18의 금지 항목을 모두 유지했습니다.

## 2. HOME — 섹션 경계 복원 (§5)

현재 Production에는 `.ll-labs { border-top: 0 }`, `.ll-cta { border-top: 0 }`로
section divider가 제거되어 있어, 네 개의 큰 section이 하나의 긴 스크롤로 보였습니다.

복원 방식:

- `.ll-labs::before`, `.ll-cta::before` — section 시작 지점에 dark neutral 1px rule
- `.ll-connect`는 자체 panel이므로 `::before`를 panel **위쪽**에 absolute로 배치
  (둥근 모서리에 선이 겹치지 않게)
- 선은 reading measure 폭만 차지하고 viewport를 가로지르지 않음
- `--ll-section-rule: color-mix(in srgb, var(--ll-ink) 20%, transparent)`
  — 검정 계열, 1px, 과하지 않게
- 작은 card에는 선을 추가하지 않음 (기존 hairline 유지)

## 3. LAB — 내신 / 모의·수능 / 논술 (§10·§11·§12)

- `.score-lab { min-height: max(34rem, calc(100svh - 8rem)) }`
  기존 `65vh` + 큰 padding 때문에 card 아래에 화면 한 장이 비어 "미완성"처럼 보였습니다.
  이제 header와 footer 사이를 채우며 중앙 정렬됩니다 (짧은 페이지가 의도된 구성으로 읽힘).
- 내신 LAB · 모의·수능 LAB 동일 rule 사용 → 같은 서비스군으로 보임
- 공유 depth: `--product-shadow-lift`(부드러운 ambient shadow) + `--radius-xl`
  → HOME hero panel, 내신/모의·수능 hero, 논술 LAB hero·첨삭권 bar가 같은 깊이 언어
- 논술 LAB: 기능 요소(첨삭권 header, credit state, 대학/시험 card) 손대지 않고
  radius/shadow만 family에 맞춤

## 4. 공유 visual system (§17)

새로 만든 token은 1개:

```css
--product-shadow-lift: 0 1px 2px rgba(23,43,69,.05), 0 24px 48px -28px rgba(23,43,69,.22);
```

기존 `--product-canvas / --product-border / --product-shadow / --radius-* / --brand`는
그대로 재사용했습니다. 대규모 디자인 시스템 리팩터링은 하지 않았습니다.

## 5. Korean Typography / Wrapping Audit (§8·§9)

도구: `scripts/qa-korean-wrap.py`
모든 text node를 순회하며 **글자별 client rect**를 읽어, 공백으로 나뉜 어절이 두 줄에
걸치면 보고합니다 (합성 test로 검출력 확인: 좁은 box에서 「지금」이 「지 / 금」으로
분리되는 것을 정확히 잡아냄).

| width | 한국어 어절 중간 개행 |
|---|---|
| 1440 / 1280 | **0건** (한국어) |
| 390 / 360 / 320 | 법률 문서 밀집 텍스트에서 소수 |
| 200% text | 0건 |

데스크톱에서 검출된 것은 2건뿐이며 **모두 한국어 어절이 아니라 숫자·라틴 문자열**입니다:

| 화면 | 문자열 | 실제 끊긴 위치 |
|---|---|---|
| /terms/ | `서비스(LegendStudy 논술 LAB)입니다` | `…서비스` ⏎ `(LegendStudy…` (여는 괄호 앞) |
| /terms/ | `전화 문의는 010-6469-7654입니다` | `010-6469-` ⏎ `7654입니다` (하이픈 뒤) |

두 경우 모두 `word-break: keep-all`의 대상이 아니고 CSS로 위치를 지정할 수 없어,
**문구를 바꾸지 않고** 그대로 두었습니다. 수정하려면 `policy-document.tsx`의 legal
renderer에서 해당 run을 `nowrap` span으로 감싸는 markup 변경이 필요하며, 이는 법률
문서 렌더러를 건드리는 변경이라 Owner 판단이 필요합니다.

적용한 개선:

- `.site-shell { overflow-wrap: break-word }` (기존 `anywhere`)
  `anywhere`는 box의 min-content 폭을 **한 글자**로 줄여, grid/flex에서 track이
  붕괴하며 한국어가 음절 단위로 wrap될 수 있습니다. `break-word`는 긴 URL 대체
  기능은 유지하면서 min-content를 줄이지 않습니다.
- `.site-shell h1, h2, h3 { overflow-wrap: anywhere }` — 200% text 대응(6절)

## 6. 200% text 접근성 (추가 수정)

`/privacy/` **146px**, `/support/` **18px** 의 가로 스크롤이 있었습니다.
원인은 `개인정보처리방침` H1이 `keep-all` 때문에 한 줄로만 배치되어 container(342px)를
넘어선 것(512px)이었습니다.

제목에만 `overflow-wrap: anywhere`를 적용해 **어절이 한 줄에 들어갈 수 없을 때만**
끊기도록 했습니다. 일반 크기 wrap 품질은 그대로입니다.

## 7. 검증

```
pnpm lint              PASS
pnpm typecheck         PASS
pnpm test              PASS  43 files / 485 tests
verify-boundaries.mjs  BOUNDARY_AUDIT=PASS
pnpm build (static)    PASS
```

가로 overflow (13 public 화면 × 7 조건, 모두 0px):

```
1440 · 1280 · 390 · 360 · 320 · 390@200% · 1440@200%
```

라이브 (deployment 2667e3d0, commit 371e30a):

```
/                overflow=0  dividers=[ll-labs:rule, ll-connect:rule, ll-cta:rule]
/score-analysis/ overflow=0
/exam-analysis/  overflow=0
/essay-lab/      overflow=0
/login/          card 560px, 최소 문구 유지
```

## 8. 남은 작업

1. **MY / Admin visual polish** — 지시서 §3대로 Codex 기능 closeout 이후 별도 진행.
2. **/terms/ 2건** — 5절 참조. legal renderer markup 변경 여부는 Owner 결정.
3. **Pricing / Header / Footer / Login** — 이번에 구조 변경 없이 점검만 했습니다.
   추가 visual 요구가 있으면 별도 지정이 필요합니다.