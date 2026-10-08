# LEGENDSTUDY LAB — MY DASHBOARD VISUAL / UX FINAL

지시: MY DASHBOARD VISUAL / UX FINAL · MANUS IMPLEMENT GO (Owner 승인 2026-10-08)
시작 기준: `origin/main` 최신 (Codex `4de6dfa` 포함, `git fetch` 후 reconcile)

```
MY_VISUAL_FINAL:  COMPLETE

PRODUCTION:
- main:        1f6d04f
- deployment:  3d0579c4  success  → https://lab.legendstudy.com

FUNCTIONAL_LOGIC_CHANGED: NO
DB_CHANGED: NO
PAYMENT_CHANGED: NO
CODEX_FUNCTIONS_PRESERVED: YES
```

## 변경 파일

```
src/components/my/dashboard.tsx        레이아웃/IA 재구성 (handler 호출부는 동일)
src/components/my/profile-editor.tsx   학교·학년 read view 재구성
src/app/globals.css                    MY visual system 교체
src/components/my/dashboard.test.tsx   신규 (IA·metric·empty state 회귀 방지)
```

읽기/쓰기 함수(`src/lib/my/data.ts`)와 RPC, query, migration, auth, profile 생성,
Credit, 학교 검색 backend, Admin backend는 한 줄도 변경하지 않았습니다.
Codex가 같은 시점에 추가한 `src/lib/my/contract.ts` · `contract.test.ts`는 merge로
그대로 보존했습니다.

## 1. Page Title

- before: `--type-h1` (1440에서 56.8px) — Hero headline 급
- after:  `clamp(1.6rem, 2.4vw, 2.05rem)` (1440에서 32.8px, 기존의 약 58%), weight 600

section heading(`clamp(1.05rem, 1.5vw, 1.22rem)`)보다 확실히 크지만 페이지 전체를
압도하지 않습니다.

## 2. Identity

- MY 제목 바로 아래 compact row.
- 표시 값: 로그인한 계정 이메일 하나.
- Web 계정에는 nickname 필드가 없습니다(`PublicAuthUser = { id, email }`,
  `MyProfile`에도 없음). 새 필드를 만들지 않았고, 따라서 닉네임 자리는 비어 있습니다.
  닉네임을 노출하려면 Codex의 data contract 확장이 필요합니다.

## 3. 내 이용 현황

- 큰 문장 card → metric row.
- `첨삭권` — canonical `credit_summary()`의 `spendable`, meta에 `무료 · 구매 (· 기타)`.
- `만료 예정` — `next_expiry` 있으면 날짜(`dateLabel`), 없으면 `없음` + `만료 예정 없음`.
- CTA hierarchy: `첨삭권 구매` = primary, `구매·사용 내역` = outline.
- **이용권 metric은 표시하지 않았습니다.** 기간형 entitlement authority가 아직 없고
  (`credit_summary()`는 첨삭권만 반환), 지시서의 "가짜 구독권을 만들지 않는다" 원칙에
  따랐습니다. entitlement가 생기면 같은 grid에 tile 하나를 추가하면 됩니다.
- 쿠폰/가짜 성공 UI 없음.

## 4. 나의 학교·학년

DB field 나열 제거. 현재 상태가 무엇을 의미하는지 먼저 결정합니다.

| 현재 상태 | 표시 |
|---|---|
| 재학생 | 현재 상태 `재학생` / 학교 `학교명` / 학년 `2학년` |
| N수·검정고시 등 · 기타 | 현재 상태 `…` / 학교·학년 `해당 없음` |
| 미설정 | `학교와 현재 상태를 아직 설정하지 않았습니다.` + `[학교·학년 설정]` |

- `설정 안 함` · `미설정` 문구는 read view에서 완전히 제거했습니다.
- 학교 코드가 없으면 학교명 대신 `아직 설정하지 않았습니다`.
- `[학교·학년 변경]` 버튼은 그대로이며, edit 화면의 `saveMyProfile` /
  `searchSchools` handler는 변경하지 않았습니다.
- status enum은 DB authority 그대로 `student / retaker / other` 3종만 사용합니다.

## 5. 나의 목표

결과 중심으로 변경:

```
희망 전공    사회·상경            [변경]
관심 대학
  연세대학교 · 경영학과    [변경][삭제]
  …
[+ 대학·학과 추가]
```

- 대학 검색창은 기본 화면에서 사라지고 `[+ 대학·학과 추가]`로 열립니다(접기/펼치기만
  추가, `searchUniversities` / `addTarget` / `editTarget` handler 재사용).
- 관심 대학이 없으면 `관심 대학을 추가해보세요.` 짧은 empty state.
- 5개 제한(`data.targets.length>=5`)과 중복 방지 조건은 기존 로직 그대로입니다.

## 6. 나의 지원 현황 / 나의 논술 LAB

- 지원 현황: `등록된 지원 내역이 없습니다.` 한 줄. 큰 빈 card 없음.
  `아직 구현되지 않았습니다` 표현 없음.
- 논술 LAB: `아직 논술 기록이 없습니다.` + `[논술 LAB 시작하기]`(→ `/essay-lab/`).
  기록이 있으면 기존 기록 목록 + `기록 보기 →`(→ `/my/essays/`)로 전환됩니다.
  실제 data가 없을 때 mock 수치를 넣지 않았습니다.

## 7. 다른 LAB / 계정 및 지원

- 다른 LAB: 두 개의 compact navigation card(320px), 각각 한 줄 가치 문구.
- 계정 및 지원: 최하단 compact 버튼 2개. MY의 중심처럼 보이지 않게 배치.

## 8. Visual hierarchy / Density

- 모든 section을 같은 큰 white card로 만들지 않았습니다. section 사이는 hairline
  (`--product-border`)이고, surface는 기록 성격의 section(학교·학년, 목표)과 metric
  tile에만 사용합니다. 색은 기존 `--product-*` / `--brand` token 그대로입니다.
- 1440에서 첫 viewport 안에 identity · 내 이용 현황 · 학교·학년 · 나의 목표가 모두
  들어옵니다 (전체 페이지는 약 2,300px).

## 9. Responsive / 접근성

| 조건 | horizontal overflow |
|---|---|
| 1440 · 1280 · 768 · 390 · 360 · 320 | 0 |
| 1440 · 390 · 360 · 320 @200% text | 0 |

- 한국어 음절 단위 wrap: MY 화면 1440/1280/390/360에서 **0건**
  (`scripts/qa-korean-wrap.py` 재사용).
- 200% text에서 `minmax(12~14rem, 1fr)` grid가 넘치던 문제를
  `minmax(min(100%, 12rem), 1fr)`로 수정했습니다.
- Mobile에서 metric card는 stack되고 버튼 tap target은 유지됩니다.

## 10. 검증

```
pnpm lint / typecheck        PASS
pnpm test                    47 files / 519 tests  PASS
verify-boundaries.mjs        BOUNDARY_AUDIT=PASS
pnpm build (static export)   PASS
```

신규 `src/components/my/dashboard.test.tsx` 6건:
section 순서, identity 라인, metric row + CTA hierarchy, 학교·학년 fact 표시
(`설정 안 함`/`미설정` 부재 포함), 검색창 기본 닫힘, empty state.

기존 Codex handler 회귀 test(`goals.test.tsx` 2건, `owner-data.test.tsx` 1건)는
수정 없이 통과합니다.

## 11. 한계

1. **로그인 상태 라이브 MY는 실측하지 못했습니다.** Production 심사용 계정의
   password는 repo/Wiki/채팅에 기록하지 않는 원칙이라 사용할 수 없었습니다.
   대신 (a) 동일 컴포넌트를 stub client로 렌더한 임시 harness로 두 상태(full/empty)를
   캡처·검증한 뒤 harness를 제거했고, (b) 로그인 상태와 동일한 조건을 vitest로
   고정했습니다. Owner가 로그인 상태에서 `/account/`를 한 번 확인해 주시면
   좋습니다. 라이브에서는 `/account/` route, 비로그인 surface, overflow 0을
   실측했습니다.
2. **Identity 닉네임 미표시** — Web 계정에 nickname authority가 없습니다(§2).
3. **`이용권` metric 미표시** — entitlement authority 부재(§3).
4. Admin/Student 360 visual은 지시서 §22대로 이번 범위에서 제외했습니다.
   Header/관리자 문구도 변경하지 않았습니다.