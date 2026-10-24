# 관리자 콘솔 개선 — PHASE 2·3 완료 보고

- 기준일: 2026-10-23
- 담당: Claude
- Worktree: `admin-console-redesign-1a594d` / Branch: `claude/admin-console-redesign-1a594d`
- 범위: 관리자 WEB UI/UX(PHASE 2) + 기존 데이터 기반 통계·운영(PHASE 3)
- 배포: **하지 않음**. Codex 백엔드(Worker·Registry·평가 프로필·Production DB·Credit Ledger) 무수정.

> 원칙(§17): 기존 성공 구현 재사용 · 사용성 개선 · **데이터 정확성 우선** · Codex 충돌 금지 ·
> Production DB/Credit Ledger 무변경 · 기존 서비스 보존. 가짜 통계·Mock을 운영 데이터처럼
> 표시하지 않음. 조회 계약으로 불가능한 지표는 **집계 불가 / GAP**으로 명시.

---

## 1. 요구사항별 결과 (PASS / PARTIAL / GAP)

### §3 공통 디자인 시스템 — **PASS**
카드형 레이아웃·은은한 그림자(`--shadow` 토큰)·명확한 테두리·둥근 모서리·여백·필터/선택 상태
강조·통일 타이포·모바일 반응형·표/카드 시각 계층을 `admin-ql.css`에 공통 적용. 과도한 애니메이션
없음(기존 로딩 점멸만 유지). 기존 토큰만 사용, 새 팔레트 없음.

### §4 대시보드 — **PARTIAL**
- PASS: 상단 **조치 필요 밴드**(미답변 문의·첨삭 실패·30일 내 만료 Credit·Worker[집계 불가]),
  **기간 선택 필터**(오늘/7일/30일/이번달/전체/직접선택), **누적 vs 기간 발생 지표 구분 라벨**,
  **AI 평가 성공률·실패율**(완료/실패 파생), 카드 그림자·테두리.
- GAP(집계 불가 표시): 신규가입의 **이번 달/직접 선택**(고정 버킷만 제공), 결제 **총 결제금액·환불·
  순매출**, 서비스 **활성 대학·시험·문항**, **평균 처리시간**(대시보드 계약에 없음 → 운영 화면에서 제공),
  Credit **이상 탐지**, **Worker 장애** 신호.

### §5 회원 관리 — **PASS**
- A 필터: 드롭다운 테두리(`admin-select`)·포커스 강조, 학교 검색/미설정/**필터 초기화** 버튼 시각 구분(`button--ghost`).
- B 목록: **한 페이지 10명**, **페이지 번호 + 이전·다음**(윈도우식 번호, 현재 페이지 강조).
- C 상세: 선택한 회원 **바로 아래 행**에 인라인 상세 표시(회원1 상세는 회원1↓/회원2↑), **한 번에 하나만** 펼침.
- D 미설정: 학교·학년·희망 전공·관심 대학은 **값이 있을 때만** 표시(미설정 반복 제거).
- E 디자인: 기본정보/학교·학년/계정상태/학습정보/Credit/논술 기록 **영역별 구분선·여백**.

### §6 회원 Credit 조회 오류 — **PARTIAL(원인 규명) + GAP(DB측 수정 필요)**
아래 "조회 오류 분석" 참고. 클라이언트에서 **실제 무계정 vs 조회 미해석을 구분**하도록 개선(READ-ONLY).

### §7 회원 논술 기록 조회 오류 — **PARTIAL(원인 규명) + GAP(DB측 수정 필요)**
아래 "조회 오류 분석" 참고. 상세 화면에 **조회 계정 ID**를 노출해 member-detail↔Student360 교차 대조 가능.

### §8 Credit 관리 — **PARTIAL**
- PASS: 현황(잔액/누적 지급/누적 사용/만료 예정)·**출처별 사용 가능 잔액**·회원별 조회→통합 Credit 패널(지급 단위+거래 내역).
- GAP(집계 불가): 기간 필터, 무료가입/구매/관리자 **지급(누적·출처별)**, 최초/무료재/유료재 **사용**,
  **재첨삭률·유료 재첨삭 비율**, 만료 Credit, 환불·조정, **대학별 사용**, **회원별 평균 사용량**.
  (현황 카드의 출처별 값은 *사용 가능 잔액*이며 누적 지급액이 아님을 명시.)

### §9 결제 관리 — **PARTIAL**
- PASS: 주문 목록 **한 페이지 5건** + 이전·다음 페이지네이션.
- GAP(집계 불가): **상품(1·3·5·10회권) 필터**(RPC에 sku 파라미터 없음), 상품별 판매량·매출, 결제 성공/실패/환불,
  **순매출**, **일·주·월 매출 추이 그래프**, [통계보기]. (조회 계약이 주문 목록+총건수만 제공 →
  페이지 단위 합계를 전체 통계로 표시하지 않음.)

### §10 논술·수리 운영 — **PARTIAL**
- PASS: **실제 평가 실행 횟수·성공률·실패율·처리시간 중앙값·인문/수리 유형별 총 이용량**(ops 요약 파생),
  기존 사람 검토 표시·행별 파이프라인 사실·`/ql` 링크 보존.
- GAP(집계 불가): 서비스 **대학 수·등록 시험/문항 수**, **평가 프로필 연결 문항·공식 근거 연결 문항·일반 공개 문항**,
  **대학별 이용량·대학별 비교표**, 최초/무료재/유료재 구분.

### §11 1:1 문의 — **PASS**
게시판 간격·구분선·레이아웃 개선. 상태(접수/처리 중=확인 중/답변 완료/종결=종료) 유지. **답변 기능이
이미 존재**(`admin_inquiry_reply`·`admin_inquiry_set_status`)하여 재사용 — 신규 API 불필요. 기존 문의 기록 보존.

### §12 AI 품질 검토 콘솔 — **GAP(향후) / 기존 보존 PASS**
`/ql` 콘솔과 접근 권한(`quality_operators`)·개인정보 보호 **그대로 보존**, 운영 콘솔에서 링크로 재사용.
§12의 세부 지표(대학별 성공률·유형별 오류·공식 예시답안 검증·오독·근거 누락·부당 감점·대안 인정·수리 계산
오류·재첨삭 개선 효과)는 품질 검수 데이터 계약 확장이 필요 → **GAP(별도 품질 콘솔 작업)**.

---

## 2. 조회 오류 분석 (§6·§7) — READ-ONLY

**조사 방법·경계:** 이 저장소에는 RPC의 SQL 정의가 없다(함수는 배포본 정규). 운영 DB에 특권
커넥션으로 직접 SQL을 실행하면 콘솔의 **운영자 게이트 보안 모델을 우회**하고 지시(§6 "조회 계약으로
확인", Production DB 변경 금지)에 어긋나므로 **실행하지 않았다.** 조회 계약·파서·기존 reconciliation
문서(`OVERNIGHT_ADMIN_QL_2026-10-07.md`)를 근거로 분석했다.

### §6 "Credit 계정이 없습니다"
- 경로: UI는 디렉터리의 `account_id`를 `admin_member_credit(p_account_id)`에 전달. 패널은 RPC가
  `summary: null`을 반환할 때만 "계정 없음"을 표시했다.
- 핵심: `summary`가 null이어도 파서는 ledger 페이지 합계(`grants_total`·`transactions_total`)를
  **독립적으로** 보존한다. 따라서 **합계>0 인데 summary=null** 이면 계정이 실재하나 요약이
  해석되지 않은 것(조회 오류), **합계=0** 이면 실제 무계정으로 판별 가능.
- 수정(클라이언트, READ-ONLY): 두 경우를 분리 표시 — 전자는 경고("Credit 요약을 불러오지 못했습니다")
  + 조회 계정 ID, 후자는 무계정 + 조회 계정 ID. 더 이상 "없음"으로 단정하지 않음.
- 잔여 원인(GAP, DB측): RPC 자체가 "무계정"과 "해석 실패"를 구분하지 못함. 근본 해결은 배포된
  `admin_member_credit`이 auth-uid→credit_accounts 해석을 일관되게 하거나 account-exists 플래그를
  반환해야 함. (OVERNIGHT 문서가 지적한 `admin_inquiry_detail`의 user_id↔credit_accounts.id 혼동,
  `admin_credit_snapshot`의 CANCEL_PENDING fence 누락과 동류의 식별자 해석 문제.) **지시에 따라 DB 무수정.**

### §7 "논술 기록 없음"
- 경로: 상세의 논술 수치는 `admin_member_detail`(usage.essay), Student360 패널은 독립적으로 essay 요약을 읽음.
- 핵심: 실제 첨삭 회원인데 0으로 보이면, 배포된 읽기 RPC가 essay history를 **잘못된 식별자(auth uid vs
  도메인 member id)로 조인**한 것이 유력 — §6과 동류의 식별자 해석 문제. 클라이언트에는 기록을 숨기는
  로직이 없음(확인).
- 수정(클라이언트, READ-ONLY): 상세 헤더에 **조회 계정 ID** 노출 → member-detail 수치와 Student360 essay
  요약(두 독립 읽기)을 교차 대조해 어느 읽기가 비는지 국소화 가능.
- 잔여 원인(GAP, DB측): 근본 해결은 배포된 essay-history 읽기가 올바른 member id로 조인해야 함. **DB 무수정.**

---

## 3. API·DB 추가 필요 항목 (GAP 요약)

신규 **읽기 전용** 집계/해석 RPC가 필요(임의 구현하지 않음, Codex 완료 후 Owner 승인 대상):

1. **기간 집계 RPC** — 임의 기간(이번 달/직접 선택) 기준 신규가입·첨삭·Credit·결제 발생량.
2. **결제 매출 집계 RPC** — 상품(sku)별 판매량·매출, 성공/실패/환불, 순매출, 일·주·월 추이.
3. **Credit 세부 집계 RPC** — 출처별 누적 지급, 최초/무료재/유료재 사용, 재첨삭률, 만료, 환불·조정,
   대학별 사용, 회원별 평균.
4. **운영 레지스트리 집계 RPC** — 활성 대학/시험/문항, 평가 프로필·공식 근거 연결 문항, 일반 공개 문항,
   대학별 이용량·비교.
5. **식별자 해석 수정(§6·§7)** — `admin_member_credit` account-exists/해석 일관성, essay-history 조인 키.
6. **Worker 상태 신호** — 대시보드 조치 밴드용 장애 지표.
7. **품질 검수 데이터 계약(§12)** — 대학별 성공률·유형별 오류·근거/감점/대안·수리 계산·재첨삭 개선.

---

## 4. 변경 파일

- `src/components/admin/admin-dashboard-view.tsx` — 조치 밴드·기간 필터·누적/기간 구분·AI 성공률·집계 불가.
- `src/components/admin/admin-members-view.tsx` — 10/페이지·페이지 번호·인라인 상세·미설정 숨김·구분선.
- `src/components/admin/admin-member-credit-panel.tsx` — §6 무계정 vs 조회 오류 구분·조회 ID 노출.
- `src/components/admin/admin-operations-view.tsx` — 운영 지표(성공률/실패율/중앙값/유형별)·집계 불가 블록.
- `src/components/admin/admin-payment-view.tsx` — 5/페이지 페이지네이션·상품/매출 통계 GAP 표시.
- `src/components/admin/admin-credit-view.tsx` — Credit 통계 GAP 블록.
- `src/app/admin-ql.css` — 공통 디자인 시스템·필터·페이저·인라인 상세·조치 밴드·기간 필터·문의 구분선.
- `src/components/admin/admin-console.test.tsx`, `admin-operations.test.tsx` — 신규 사양(10/페이지,
  라벨, 요약 처리시간)에 맞춘 기대값 갱신.

변경하지 않음: `src/lib/admin/*`(계약·클라이언트), 평가 엔진/Worker/Registry/DB/Ledger, `/ql` 소스·권한.

---

## 5. 회귀 검사 (§15)

- Typecheck(`tsc --noEmit`): **PASS**
- Lint(`eslint`): **PASS**
- Test(`vitest run`): **PASS** — 94 파일 / 938 테스트
- Boundary(`verify-boundaries.mjs`): **PASS** — blocked_runtime_dependencies=0
- Build(`next build`, 정적 export): **PASS** — `/admin`·`/admin/{credit,inquiries,members,operations,payment}` 정적 생성, 오류/경고 없음
- 기존 논술 LAB 서비스 경로·관리자 인증/권한(`admin_operator`, `AdminGate`)·`/ql` 보존.

**화면 검증:** 변경된 모든 뷰는 testing-library가 mock 데이터로 렌더하여 내용을 단언(자동 화면 검증).
실제 운영자 세션 스크린샷은 운영자 자격이 필요하여(가짜 생성 금지) 본 작업 범위에서 수행하지 않음.

---

## 6. Commit·Push·Remote SHA

- Branch: `claude/admin-console-redesign-1a594d`
- Commit / Remote SHA: `27a33f6cdda659b58d6ad3d1922faeaa935260ec`
- Push: `origin/claude/admin-console-redesign-1a594d` (local == remote). Production 미배포.

(이 SHA 기입은 §4 변경 파일을 담은 커밋 이후의 문서 갱신으로, 보고서 본문에만 반영됨.)

## 7. Unified Wiki (LC3808/legendstudy-docs)
본 보고서를 Wiki에 기록 필요. 현재 세션에서 외부 Wiki 저장소 접근이 설정되어 있지 않아 저장소 쓰기는
미수행 — 저장소/권한 연결 후 반영 필요(후속).
