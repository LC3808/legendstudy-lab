# 관리자 콘솔 전면 개선 — PHASE 1 분석·설계

- 기준일: 2026-10-23
- 담당: Claude
- 우선순위: P1
- 상태: PHASE 1 (분석·설계). 코드 변경 없음.
- 저장소: LC3808/legendstudy-lab

> OWNER 지시에 따라 이 문서는 **분석과 설계만** 다룬다. PHASE 2 UI 구현은 별도 작업으로
> 진행하며, Production 배포는 Codex 작업 완료 후 Owner 승인에 따른다. Codex의 평가 엔진·Worker·
> Registry·Production DB·Credit Ledger는 수정하지 않는다.

---

## 0. 작업 환경 확인 결과

OWNER 지시(§1)의 사전 확인 항목이다.

| 항목 | 지시서 기준 | 실제 환경 | 비고 |
| --- | --- | --- | --- |
| 현재 경로 | `~/development/legendstudy-admin-ui-20261023` | `~/development/legendstudy-lab/.claude/worktrees/admin-console-redesign-1a594d` | **불일치 1** — 아래 참고 |
| Git 브랜치 | `claude/admin-console-redesign-20261023` | `claude/admin-console-redesign-1a594d` | **불일치 2** — 아래 참고 |
| HEAD SHA | — | `8991b510d2c9702ecfb05315fe21363ab6df7012` | `main` / `origin/main`과 동일 |
| 미커밋 변경사항 | 보존 | 없음 (clean) | 작업 트리 깨끗함 |
| 최신 LAB 코드와 차이 | 확인 | 없음 | HEAD가 `main`과 동일 커밋 |
| 관리자 페이지 코드 위치 | 확인 | `src/app/admin/**`, `src/components/admin/**`, `src/lib/admin/**` | §2 참고 |

**불일치 처리:** 지시서는 날짜 기반 경로(`...-20261023`)와 브랜치(`...-20261023`)를 명시했으나,
실제 세션은 해시 기반 worktree(`admin-console-redesign-1a594d`)와 브랜치
(`claude/admin-console-redesign-1a594d`)에서 시작되었다. 이름만 다를 뿐 **의도한 작업 범위
(별도 worktree, admin-console-redesign 계열 브랜치)는 동일**하다. 기존 코드·운영 설정은 그대로
보존했고(clean tree), 확인 외 변경을 가하지 않았다. 브랜치/경로 명명을 지시서와 정확히 맞춰야
한다면 Owner 확인 후 재생성이 필요하다.

**최신 LAB 코드와 차이:** `HEAD = main = origin/main = 8991b51`. 이 worktree는 현재 최신 LAB
코드와 완전히 동일하며, admin 관련 선행 변경은 아직 없다.

---

## 1. 현재 관리자 콘솔 구조 (현황 감사)

관리자 콘솔은 이미 상당히 성숙하게 구현되어 있다. "백지에서 신규 구축"이 아니라 **기존 구조를
보존·확장하는 개선**이 적절하다.

### 1.1 정보 구조 (IA) — 라우트

| 라우트 | 영역 | 네비 라벨 | 구현 |
| --- | --- | --- | --- |
| `/admin/` | 대시보드 | 대시보드 | `admin-dashboard-view.tsx` |
| `/admin/members/` | 회원 | 회원 | `admin-members-view.tsx` |
| `/admin/credit/` | Credit | Credit | `admin-credit-view.tsx` |
| `/admin/payment/` | 결제 | 결제 | `admin-payment-view.tsx` |
| `/admin/operations/` | 논술·수리 운영 | 논술·수리 운영 | `admin-operations-view.tsx` |
| `/admin/inquiries/` | 1:1 문의 | 1:1 문의 | `admin-inquiries-view.tsx` |
| `/ql/` | AI 품질 | AI 품질 | 별도 권한(`quality_operators`)·별도 라우트 |

네비는 `src/components/admin/admin-surface.tsx`의 `ADMIN_NAV` 단일 소스에서 관리된다. `/ql`은
**재구현하지 않고 링크로만 연결**되며 자체 인가를 유지한다 (운영자 권한과 품질 권한을 의도적으로
분리).

### 1.2 데이터 계층 — `src/lib/admin/`

- **`client.ts` (357줄)** — 정식 읽기 클라이언트(`admin-v1` consumer). 브라우저 Supabase 세션으로
  **운영자 게이트가 걸린 SECURITY DEFINER RPC만** 호출한다. 운영 테이블 직접 접근 없음, 특권 키
  없음, 토큰·답안 본문·문의 본문 로깅 없음. 돈에 대해 **읽기 전용**.
  - 읽기 RPC: `admin_dashboard`, `admin_member_search`, `admin_member_list`, `admin_student360`,
    `admin_member_detail`, `admin_member_credit`, `admin_payment_orders`, `admin_support_metrics`,
    `admin_inquiry_list`, `admin_inquiry_detail`, `admin_operations_summary`,
    `admin_essay_operations`, `admin_math_operations`
  - 쓰기 RPC(제한적): `admin_inquiry_reply`, `admin_inquiry_set_status`, `inquiry_submit`,
    그리고 수동 Credit 지급(`admin_manual_credit_grant`, 1–100 지원 Credit; `docs/admin-manual-credit-grant.md`).
    결제에는 **취소·환불 액션이 없다**.
- **`contract.ts` (960줄)** — `admin-v1` / `admin-ops-v1` DTO 파서. 모든 파서가 **fail-closed**:
  published shape와 다르면 부분 렌더·추정치 대신 `MALFORMED_RESPONSE`를 던진다. DB가 JSON null로
  보고한 카운트("해당 서브시스템 미설치")는 **0으로 강제하지 않고 null 그대로 UI까지 보존**한다.
- **`errors.ts`** — `AdminError` 종류·사용자 카피·RPC 에러 매핑.
- **`members.ts` / `student360.ts` / `school*.ts` / `format.ts` / `ops-format.ts` /
  `ops-runtime.ts` / `grant-reasons.ts` / `finance-boundary.ts`** — 디렉터리·학생360·학교 표시·
  표시 포맷·재무 경계 유틸.

### 1.3 UI 셸 및 인가

- **`admin-surface.tsx`** — 콘솔 셸(`AdminSurface`), 네비(`ADMIN_NAV`), 쿼리 훅
  (`useAdminQuery`, account 키로 캐시 무효화), 상태 패널(로딩/에러/빈 상태), 그리고 **`AdminGate`**.
- **`AdminGate`** — DB 게이트(`admin_operator()`)의 UI 측 미러. 거부된 호출자는 데이터 뷰를
  마운트조차 하지 않으며, 이를 우회해도 DB가 PT401을 반환한다. 계정 전환/로그아웃 시 이전 계정 상태를
  즉시 언마운트.
- 모든 admin 페이지는 `noindex` + robots 제외 + 사이트맵/공개 네비 비노출. **인가는 "라우트를 숨겨서"가
  아니라 DB가 담당**한다.

### 1.4 테스트

admin 영역에만 대략 2,000+ 줄의 테스트(`admin.test.ts` 608줄, `admin-console.test.tsx` 347줄,
`ops.test.ts` 255줄, `admin-operations.test.tsx` 197줄 등). fail-closed 계약·게이트·account 키
무효화·수동 지급 재시도 등을 커버.

---

## 2. 설계 원칙 및 불변 경계 (반드시 보존)

이번 개선에서 **깨뜨리면 안 되는** 경계다. (`docs/DATA_BOUNDARIES.md`, `docs/OVERNIGHT_ADMIN_QL_2026-10-07.md`,
메모리의 LAB Quality contract / build tooling 규칙에서 도출.)

1. **Codex 자산 불변** — 평가 엔진, Worker, Registry, Production DB, Credit Ledger를 **수정하지 않는다.**
   관리자 콘솔은 이들을 **읽기 전용으로 소비**한다.
2. **재무 읽기 전용** — 결제는 조회만. 취소·환불·거래 실행 액션을 추가하지 않는다. 재무 전용 RPC
   (`essay_admin_grant` 등)와 service-role/finance 자격증명은 프런트엔드에 들어오지 않는다.
   유일한 예외는 이미 승인된 수동 Credit 지급(`admin_manual_credit_grant`, 1–100).
3. **배포된 계약만 소비** — LAB은 배포된 `ql-read-v1` / `admin-v1` / `admin-ops-v1`을 소비한다.
   리포지토리 내 LSA-2 초안 SQL 및 후보 마이그레이션
   (`20261007000100/000200/000400_*.sql`)은 **비정규(non-canonical)이며 임의 적용 금지**.
4. **fail-closed 유지** — 파서 계약을 우회해 부분 렌더·추정치를 만들지 않는다. 미설치는 0이 아니라
   "미설치/사용 불가"로 표시(예: 수리논술 런타임 미배포 시 "0건" 금지).
5. **PII/답안 본문 비노출** — 정적 export와 클라이언트 번들에 개인정보·답안 본문·프롬프트·루브릭이
   직렬화되지 않는다. 운영 화면은 평가의 **메타데이터만** 보여주고 답안 열람은 별도 인가 행위다.
6. **권한 분리 유지** — 운영자(`admin_users`)와 품질 검토자(`quality_operators`)는 별개. 하나의
   링크가 다른 권한을 부여하지 않는다.
7. **빌드/검증 규칙** — `./node_modules/.bin/*` 사용(pnpm 직접 호출 금지), `pnpm verify:boundaries`
   (Client가 `src/server` import 금지, server 모듈 `server-only` 필수, 소스 내 secret 리터럴 금지)
   를 통과해야 한다.

---

## 3. 격차 분석 — Owner 목표 대비

Owner 목표: 관리자 페이지를 **운영·회원·Credit·결제·AI 첨삭 품질을 종합 관리하는 운영 콘솔**로 개선.

핵심 6개 축은 **이미 존재**한다. 따라서 개선은 "기능 신규 구축"보다 **(a) 종합 가시성 향상,
(b) UX/정보 밀도 개선, (c) 축 간 교차 탐색**에 집중한다. 아래는 현재 상태와 격차다.

| 축 | 현재 상태 | 격차 / 개선 기회 |
| --- | --- | --- |
| 운영(논술·수리) | 파이프라인 상태·소요시간·모델/프롬프트·과금·사람검토 메타데이터 조회 | 대시보드 상단에 **운영 건강(실패율·대기·p50/p95 지연) 요약**이 없음. 에러코드/실패 추이 집계 부재. |
| 회원 | 검색·디렉터리·상세·학생360 | 대시보드↔회원↔Credit↔문의 간 **교차 딥링크**가 약함. 코호트(활성/휴면) 진입점 부재. |
| Credit | 요약·지급·거래·수동지급(1–100) | 전사 Credit 흐름(지급 origin별·만료 임박) 가시성은 대시보드에 일부만. |
| 결제 | 주문 조회(읽기 전용) | 재무 요약(매출)은 결제 오픈 전 비표시 정책 — 유지. reconciliation 필요 건 **표식은 있으나 집계/필터 진입점 부족**. |
| AI 첨삭 품질 | `/ql` 별도 콘솔 + 운영 화면의 "검토 여부" 표시 | 대시보드에서 **품질 신호(검토율·실패율) 한눈 요약** 부재. `/ql` 연결은 링크뿐. |
| 종합 대시보드 | 섹션별 지표 나열(회원/프로필/논술/수리/Credit/결제/고객지원) | **운영자 아침 점검용 "오늘의 상태" 상단 요약**과 이상징후 하이라이트 부재. 모든 섹션이 평면 나열. |

**횡단 격차 (모든 축 공통)**
- 대시보드가 평면적 — 운영자가 "지금 조치가 필요한 것"을 상단에서 즉시 파악하기 어렵다.
- 축 간 이동이 네비 탭 위주 — 한 회원의 Credit·문의·평가로 바로 가는 교차 링크가 부족.
- 반응형/정보밀도·접근성(대비, 키보드, 터치 타깃)은 PHASE 2에서 점검 대상.

이 격차들은 **모두 기존 읽기 계약(`admin-v1`/`admin-ops-v1`) 범위 안에서, 프런트엔드만으로**
대부분 해소 가능하다. 즉 Codex 자산·DB·Ledger 수정 없이 진행 가능.

---

## 4. PHASE 2 재설계 제안 (구현은 별도 작업)

> 모든 제안은 §2 경계를 지킨다. 신규 RPC가 필요한 항목은 "DB 변경 필요"로 명시하고, Codex 완료 후
> Owner 승인 시에만 검토한다. **기본 방침은 기존 읽기 계약만으로 구현.**

### 4.1 대시보드 재구성 — "운영자 아침 점검"
- 최상단 **상태 요약 밴드**: 미처리 문의, 오늘 평가 실패 건수, reconciliation 필요 주문, 30일 내 만료
  Credit 등 "조치 필요" 신호를 카드로. 모두 기존 `admin_dashboard` + `admin_support_metrics` +
  `admin_operations_summary` + `admin_payment_orders` 값으로 구성 가능.
- 기존 섹션(회원/프로필/논술/수리/Credit/결제/고객지원)은 **접기/우선순위 재배치**로 밀도 개선.
- 미설치 서브시스템은 지금처럼 "미설치"로, 추정치 금지.

### 4.2 축 간 교차 탐색
- 회원 상세 → 그 회원의 Credit / 문의 / 평가로 딥링크(모두 account-id 기반 기존 RPC로 조회 가능).
- 문의 상세의 `related`(essayEvaluations/paymentOrders) 숫자를 **클릭 가능한 진입점**으로.
- 운영 화면의 `memberId` → 회원 상세 링크.

### 4.3 운영 건강 가시화
- `admin_operations_summary`(pending/succeeded/failed, median)로 **실패율·지연 요약 카드**.
- 에러코드 상위 집계, 실패 추이는 현재 계약에 집계 필드가 없으므로 **클라이언트 측 리스트 집계**로
  1차 제공(페이지 범위 내). 전사 집계가 필요하면 신규 요약 RPC = "DB 변경 필요"(승인 대상).

### 4.4 AI 첨삭 품질 요약
- 대시보드에 **검토율·검토 대기** 요약(= `operationsSummary`의 humanReview 값). `/ql` 링크는 유지.
- 권한 분리 원칙상 품질 **판정/제출 액션은 `/ql`에만** 둔다 (운영 콘솔은 표시만).

### 4.5 공통 UX
- 테이블/카드 컴포넌트 일관화, 로딩/빈/에러 상태 재사용(이미 `admin-surface`에 있음) 확장.
- 접근성 점검: 색 대비, 키보드 포커스, 터치 타깃, 200% 텍스트(수동 지급 다이얼로그 선례 있음).
- 반응형: 좁은 폭에서 네비·메트릭 그리드 재배치.

### 4.6 명시적 비목표 (하지 않음)
- 결제 취소/환불/거래 실행 액션 신규. ✗
- 평가 재시도/무효화/재채점 등 파이프라인 쓰기. ✗ (운영 화면은 보고 전용)
- 답안 본문·프롬프트·루브릭 노출. ✗
- `/ql` 재구현·권한 병합. ✗
- 후보 마이그레이션 임의 적용. ✗

---

## 5. PHASE 2 실행 계획 및 리스크

### 5.1 단계
1. **설계 확정** — 본 문서에 대한 Owner 피드백 반영, 대시보드 와이어프레임/컴포넌트 목록 확정.
2. **읽기 전용 UI 개선** — 기존 `admin-v1`/`admin-ops-v1` 범위 내에서 대시보드 재구성·교차 링크·
   건강 요약·접근성/반응형. (DB 무변경)
3. **(승인 시) 요약 RPC 검토** — 전사 집계가 꼭 필요하면 신규 **읽기 전용** RPC를 설계해 Owner·Codex와
   조율. 후보 마이그레이션 재조정 이슈(§OVERNIGHT 문서의 `CANCEL_PENDING` fence, `admin_inquiry_detail`의
   credit account 해석)를 **선검증**.
4. **검증** — `pnpm verify`(lint/typecheck/test/verify:boundaries/build) 전부 통과. 신규 테스트 추가.

### 5.2 리스크 / 유의
- **계약 드리프트**: `admin-v1` 실제 배포본과 파서가 어긋나면 fail-closed로 화면이 에러가 된다.
  개선 전 배포 계약 재확인 필요.
- **경계 침범 유혹**: "운영자가 재시도/환불을 바로 하면 편하다"는 요구가 나와도 §2·§4.6에 따라 거부하고
  Owner 승인·Codex 범위로 넘긴다.
- **명명 불일치(§0)**: 지시서의 날짜 기반 경로/브랜치와 실제 해시 기반이 다름 — PR/배포 전 Owner 확인.
- **Codex 동시 작업**: 평가 백엔드가 진행 중이므로 계약 shape가 바뀔 수 있다. UI는 계약 버전
  (`dto_version`)을 신뢰하고 fail-closed를 유지.

### 5.3 다음 액션 (Owner 결정 필요)
- [ ] §0 명명 불일치: 현재 worktree/브랜치로 진행할지, 지시서 명명으로 재생성할지.
- [ ] PHASE 2 UI 개선을 **DB 무변경 범위로 한정**할지, 요약 RPC(§5.1-3)까지 검토 대상에 포함할지.
- [ ] 대시보드 우선순위: "조치 필요 신호" 카드에 올릴 지표 확정.

---

## 부록 A. 확인한 파일
- `src/app/admin/{page,members,credit,payment,operations,inquiries}.tsx` 및 하위 `page.tsx`
- `src/components/admin/*.tsx` (surface, dashboard, members, credit, payment, operations, inquiries,
  member-credit-panel, student360-panel, school-distribution, school-name, entry, grant-form)
- `src/lib/admin/*.ts` (client, contract, errors, members, student360, format, ops-format,
  ops-runtime, school, school-distribution, grant-reasons, finance-boundary)
- `docs/OVERNIGHT_ADMIN_QL_2026-10-07.md`, `docs/admin-manual-credit-grant.md`,
  `docs/DATA_BOUNDARIES.md`, `README.md`, `todo.md`
