# 논술 LAB 첨삭권 현황 — 완료 보고

지시: 논술 LAB 로그인 사용자 Credit/첨삭권 현황
범위: `/essay-lab/` 상단 상태 표시 (신규 DB·신규 상태 없음)

---

## 1. 배치

```
논술 LAB (/essay-lab/)
  ├ page-intro            대학별 논술을 구조부터 살펴보세요.
  ├ essay-credit          ← 신규: 내 첨삭권 / 기록 / 구매
  ├ mock-notice           합성 Mock foundation 안내
  └ catalog-filter        대학별 논술 (대학 선택 …)
```

지시하신 향후 구조(`논술 LAB → 내 첨삭권 N개 → [나의 첨삭 기록] [첨삭권 구매] → 대학별 논술 …`)의
2·3번째 줄에 해당합니다. 라이브 DOM 순서로 확인했습니다.

## 2. 상태별 표시

| 상태 | 표시 | 동작 |
|---|---|---|
| 로그인 · N > 0 | `내 첨삭권 5개`<br>`무료 3 · 구매 2`<br>`가장 가까운 만료일 2027.01.07` | [나의 첨삭 기록] → `/my/essays/`<br>[첨삭권 구매] → `/pricing/` |
| 로그인 · 0 | `첨삭권이 없습니다.` | [첨삭권 구매] → `/pricing/` |
| 비로그인 | 잔액 없음 | [로그인하고 첨삭 시작] → `/login/` |
| 확인 중 | `첨삭권을 확인하고 있습니다.` | 숫자를 표시하지 않음 |
| 조회 실패 | `첨삭권을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.` | `0`으로 대체하지 않음 |

`기타` Credit이 있을 때만 `기타 N`을 덧붙이고, 만료일이 없으면 만료 줄 자체를 생략합니다.

## 3. Authority (단일)

```
credit_summary()  ← Supabase self-scoped RPC (Production 적용 완료, 변경 없음)
      ↑
useCreditSummary()  ← src/components/credit-balance.tsx 에서 추출한 단일 hook
      ├── CreditBalance       /account/ (MY)
      └── EssayCreditStatus   /essay-lab/ (신규)
```

- 새 Credit state·새 essay history를 만들지 않았습니다. 브라우저는 RPC DTO를 그대로 표시하며
  합계를 스스로 계산하지 않습니다.
- `[나의 첨삭 기록]`은 MY와 **동일 라우트** `/my/essays/`입니다.
- DTO 검증(`dto_version==='credit-v1'`, 각 항목 정수·0 이상, `spendable === paid+free+other`)을
  통과하지 못하면 값을 표시하지 않고 실패 상태로 떨어집니다.
- sign-out·계정 전환 시 상태를 즉시 비우므로 이전 사용자의 잔액이 남지 않습니다.

### 만료일 문구에 대한 판단

`credit_summary()`의 `next_expiry`는 **모든 spendable grant(구매 + 가입 무료 + 기타)의 최소
만료일**입니다 (`min(expires_at) filter (where available > 0)`). 따라서
"구매 첨삭권의 가장 가까운 만료일"이라고 쓰면 무료 Credit이 먼저 만료될 때 사실과 달라집니다.
이번 범위에서 DB/RPC를 바꿀 수 없으므로 **`가장 가까운 만료일`**로 표기했습니다.
구매 전용 만료일이 필요하면 `credit_summary()`에 구매 전용 필드를 추가하는 별도 승인이 필요합니다.

## 4. 검증

```
pnpm lint              PASS
pnpm typecheck         PASS
pnpm test              PASS  27 files / 291 tests
verify-boundaries.mjs  BOUNDARY_AUDIT=PASS
pnpm build (static)    PASS
```

- 레이아웃: 1440 / 390 / 360 및 200% 텍스트에서 overflow 0, 버튼은 자연 wrap
- 통합 테스트(`credit-summary-integration.test.tsx`)는 실제 hook + 실제 컴포넌트를 가짜 Supabase
  클라이언트로 구동해, MY와 논술 LAB이 **같은 RPC 한 번**으로 같은 숫자를 표시하는지 확인합니다.
- 컴포넌트 테스트(`essay-credit-status.test.tsx`)는 5개 상태와 만료일 포맷을 고정합니다.
- boundary guard: `credit_summary` RPC 호출은 `credit-balance.tsx`에서만 가능하고, 논술 LAB 헤더는
  공유 hook을 쓰며, `/pricing/`·`/my/essays/`·`/login/` 링크와 `첨삭권` 용어를 유지해야 합니다.

## 5. 라이브

- Deployment `079303aa`, commit `f73f933`, aliases `https://lab.legendstudy.com`
- `https://lab.legendstudy.com/essay-lab/` 비로그인 상태에서 잔액 미표시 + [로그인하고 첨삭 시작] 확인
- DOM 순서 `page-intro → essay-credit → mock-notice → catalog-filter` 확인

**로그인 상태의 라이브 실측은 하지 못했습니다.** 브라우저 auth는
`getBrowserAuthConfig()`가 `https://lab.legendstudy.com` 또는 승인된 `*.pages.dev` preview
origin에서만 열리도록 설계되어 있어(의도된 보안 속성), 로컬 빌드나 임의 origin에서는 세션을
만들 수 없고 심사용 계정 자격증명도 이번 작업에 없습니다. 대신 실제 hook·컴포넌트를 구동하는
통합 테스트로 `N>0`·`0`·실패·비로그인 렌더링을 검증했습니다.

## 6. 남은 항목

1. **`/my/essays/`는 아직 placeholder입니다.** "나의 논술 기록은 준비 중입니다" 상태이므로
   논술 LAB과 MY가 같은 라우트·같은 authority를 가리키는 것은 보장되지만, 실제 첨삭 이력 목록은
   아직 존재하지 않습니다. 이력 데이터 모델이 확정되면 두 화면이 함께 채워집니다.
2. **구매 전용 만료일** — 3절 참조. 필요 시 별도 승인.
3. 로그인 상태 라이브 스크린샷이 필요하면 심사용 계정으로 로그인한 브라우저 세션이 필요합니다.
