# LAB NAV HOTFIX — 이용 안내 링크 교정 (완료 보고)

지시: LAB NAV HOTFIX — 이용 안내 링크 교정
범위: 상단 navigation destination만 수정

---

## 최종 보고 (Owner 지정 포맷)

```
MAIN_COMMIT:              1471eda  (NAV hotfix)  →  이 보고서 commit이 뒤를 이음
PRODUCTION_COMMIT:        1471eda  (Cloudflare Pages deployment 6d11907b, github:push/main)

SIGNED_IN_USAGE_LINK:     /pricing/
SIGNED_OUT_USAGE_LINK:    /pricing/
HOW_IT_WORKS_IN_PRIMARY_NAV: NO
MY_LINK:                  /account/
PAYMENT_CHANGED:          NO
PRODUCTION_VERIFIED:      YES
```

---

## 1. 상단 이용 안내

| | 이전 | 이후 |
|---|---|---|
| 로그인 Header (`account-control.tsx`) | `/lab/how-it-works/` | **`/pricing/`** |
| 비로그인 Header (`publicReleaseRoutes`) | `/lab/how-it-works/` | **`/pricing/`** |

별도 「이용 안내」 페이지는 만들지 않았습니다. `/pricing/`이 이미 논술 LAB 이용 안내,
Credit 상품·가격·이용 범위·이용기간·환불정책·고객지원을 모두 담고 있습니다.

## 2. /how-it-works/

상단 navigation에서 제거했습니다. 페이지 자체는 삭제하지 않았습니다.

`publicReleasePaths`는 모든 public 문서를 그대로 유지하므로 **robots.txt와 sitemap은
변경되지 않습니다** — `/lab/how-it-works/`는 계속 allow/sitemap에 남아 있고, 단지
헤더가 「이용 안내」로 광고하지 않을 뿐입니다.

```
Allow: /lab/how-it-works/        (out/robots.txt, 변경 전과 동일)
sitemap: lab/how-it-works/       (out/sitemap.xml, 변경 전과 동일)
```

## 3. 최종 로그인 NAV

```
홈 | 내신 분석 LAB | 모의·수능 분석 LAB | 논술 LAB
우측: [이용 안내 → /pricing/] [마이페이지 → /account/] [로그아웃]
```

상단에 없는 항목을 확인했습니다: 계정 설정, 고객센터, 공개 범위, how-it-works 직접 링크
— 모두 로그인 헤더에 존재하지 않습니다 (`account-control.test.tsx`가 회귀 방지).

배포된 번들 실측 (`/_next/static/chunks/231eoxqxamuu0.js`):

```js
{className:"account-control", children:[
  Link{className:"text-link text-link--small", href:"/pricing/", children:"이용 안내"},
  Link{className:"text-link text-link--small", href:"/account/", children:"마이페이지"},
  button{... "로그아웃"}]}
```

`how-it-works` 문자열은 이 청크에 존재하지 않습니다.

## 4. 비로그인 NAV

동일 label 「이용 안내」가 legacy route를 쓰지 않도록 함께 교정했습니다.

```
서비스 → /        이용 안내 → /pricing/        공개 범위 → /lab/coverage/
```

`/pricing/`을 가리키던 별도 항목 `요금 안내`는 제거했습니다. 같은 페이지로 가는 링크가
한 메뉴에 두 개 있으면 안 되기 때문입니다. auth 관련 메뉴(로그인) contract는 그대로입니다.

## 5. 범위 준수

변경 파일:

```
src/lib/release-routes.ts        (publicReleaseRoutes / publicReleasePaths)
src/components/account-control.tsx
src/lib/release-routes.test.ts   (계약 갱신 + 회귀 테스트)
src/components/site-nav.test.tsx (회귀 테스트)
src/components/account-control.test.tsx (신규)
scripts/verify-boundaries.mjs    (회귀 guard)
```

- Pricing 내용 — 미수정
- Checkout — 미수정
- Home content — 미수정
- Toss / Payment / Supabase — 미수정

## 6. 회귀 guard

`scripts/verify-boundaries.mjs`에 추가:

- 헤더 소스(`site-nav`, `account-control`, `site-shell`, `release-routes`)에
  `href="/lab/how-it-works/"`가 있으면 실패
- public 메뉴의 「이용 안내」가 `/pricing/`이 아니면 실패
- public 메뉴에 `/pricing/` 라벨이 두 번 있으면 실패
- public 메뉴가 같은 페이지를 두 번 링크하면 실패

## 7. 검증

```
pnpm lint              PASS
pnpm typecheck         PASS
pnpm test              PASS  25 files / 278 tests
verify-boundaries.mjs  BOUNDARY_AUDIT=PASS
pnpm build (static)    PASS
```

라이브 클릭 실측 (`https://lab.legendstudy.com`):

```
헤더 링크:  서비스 → /   이용 안내 → /pricing/   공개 범위 → /lab/coverage/   로그인 → /login/
헤더에 how-it-works 포함: False
/ 에서 이용 안내 클릭      → https://lab.legendstudy.com/pricing/
/support/ 에서 이용 안내 클릭 → https://lab.legendstudy.com/pricing/
390px overflow: 0
```

## 8. 남은 항목 (Owner 판단 필요)

1. **비로그인 헤더의 「공개 범위」(`/lab/coverage/`)**
   §3의 「상단에서 없음」 목록에 공개 범위가 포함되어 있으나, 해당 목록은 로그인 NAV
   기준으로 작성되었고 §5가 이번 hotfix를 destination 수정으로 제한하므로 destination을
   바꾸지 않고 유지했습니다. 로그인 헤더에는 없습니다.
   비로그인 헤더에서도 제거할지 지시가 필요합니다.

2. **HOME hero의 「이용 안내」 링크 (`src/components/lab-landing.tsx:81`)**
   여전히 `/lab/how-it-works/`를 가리킵니다. §1·§4는 「상단」과 「Header」를 대상으로
   하고 §5가 「Home content 수정 금지」를 명시했으므로 수정하지 않았습니다.
   같은 label이므로 `/pricing/`으로 맞추려면 별도 지시가 필요합니다.

3. **`/lab/coverage/` 페이지 내부의 「이용 방법 보기」 링크**
   해당 페이지 내용의 일부이며 상단 navigation이 아니므로 유지했습니다.
