# 관리자 운영 콘솔 PHASE 3 — 실제 화면 UX 검수·UI 개편 설계 (2026-11-14)

> 담당: Claude (UX·IA) · 단계: **실제 구현 검수 + UI 상세 설계**(구현·배포 제외)
> 검수 기준: 운영 배포 `9229b2c9` / 소스 `a1fdcb2`(브랜치 `codex/lab-admin-operations-20261114`) **실제 코드 열람**. 설계 기준: [admin-essay-operations-ia-20261114.md](admin-essay-operations-ia-20261114.md)(7그룹 IA) · [essay-lab-admin-console-redesign-20261114.md](essay-lab-admin-console-redesign-20261114.md).
> **이번 단계 WEB·Flutter 코드·DB·RPC·운영 배포 변경 없음.** Codex가 소유한 파일(`admin-lab-operations.tsx`·`lab-operations.ts`·`admin-members-view.tsx`·`admin-credit-members.tsx`·`essay-runs/page.tsx` 등)은 **읽기만** 했고 수정하지 않았다.

표기: ✅구현 / 🟡부분 / ⚪미구현 / 🧩Codex 운영 적용

> **검수 요약:** 4개 화면 모두 **기능·데이터는 이미 구현**(Codex PHASE 2 운영 적용). PHASE 3는 **가독성·정보 계층·원시값 표현·새 창 미리보기**의 UI 개선이다. 데이터 계약(`admin-lab-filtered-v1`/`admin-lab-detail-v1`)·서버 페이지네이션·권한은 **그대로 유지**한다. 신규 평가 엔진·결과 구조 생성 없음.

---

## 1. 현재 UX 문제점 (실제 코드 근거)

### A. 회원 목록 (`admin-members-view.tsx`, `admin-dashboard-view.tsx`)
- 컬럼: `이메일·계정상태·학교·학년·현재상태·희망전공·닉네임·가입일·상세`. **닉네임을 원문 그대로** 출력 → 긴 닉네임이 행 높이/정렬을 깨뜨림(말줄임 없음).
- 정보 밀도 불균형: 이메일(김)·학교명·희망전공이 길이 편차 큼, 고정폭/말줄임 규칙 부재.

### B. 첨삭 요청·결과 목록 (`admin-lab-operations.tsx` `/admin/essay-runs`)
- 통계가 `<dl class=admin-detail__grid>` **텍스트**로 표시(KPI 타일 아님) → 눈에 안 띔.
- 필터가 **3덩이로 분산**: ①대학·시험·상태·출처 한 줄 ②회원 검색 별도 `<form>` ③요청 시작/종료일 별도 → 한 화면에서 기준이 흩어짐.
- 표는 정보는 충분하나(대학·시험/요청·완료/상태/이용권·회차) 상태·지연이 **시각 강조 없이** 텍스트.

### C. 첨삭 상세 (`AdminLabDetail`)
- 단일 세로 스크롤에 **처리 과정·이용권 거래·처리 정보(Provider)·재처리·오류 진단·답안·결과**가 **평면 혼재** → 지나치게 김.
- 원시값 노출: 이용권 거래 `type`(reserve/consume/…)·billing `reason`(paid_cycle/included_revision)·`status`·diagnostics `code`가 **한국어 변환 없이** 그대로.
- `labAlerts`가 "실패 진단 기록 있음 — 현재 상태와 구분"을 이미 경고하지만, 레이아웃상 **정상 완료 vs 과거 실패 진단**이 한눈에 안 나뉨.
- `<details>`의 `QlStructuredValue value={run.result}` 원시 덤프가 길이를 키움.

> 참고: 현재 상세는 이미 학생 결과 렌더러 `EvaluationReport`를 **재사용**하고 문항별 `/ql` 딥링크·운영/피드백 교차 링크를 제공한다(✅). 문제는 **계층·표현**이지 기능 부재가 아니다.

---

## 2. 닉네임 정책 및 UX

### 현재(코드 확인)
- 검증 = **공백 제외 1~80자**, 제어문자 금지. WEB `src/lib/my/data.ts:112`(`[...nickname].length>80`), APP `nicknameValidationError`(`value.runes.length>80`). **DB에 길이 CHECK 제약 없음**(앱·서버 경로 검증).
- 카운트 = **코드포인트**(JS `[...str]`, Dart `runes`) → ZWJ·피부톤 이모지가 복수로 집계(플랫폼 간 미세 불일치 소지).

### 제안
| 항목 | 정책 |
|---|---|
| 최대 길이 | **표시 문자 20자**(공백 포함) |
| 카운트 단위 | **grapheme cluster**(WEB `Intl.Segmenter('ko',{granularity:'grapheme'})`, APP Dart `characters` 패키지) — 한글·영문·이모지 **1 글자=1**로 WEB·APP·서버 **동일** |
| 적용 지점 | 회원가입·온보딩·프로필 수정(WEB·Flutter) **클라이언트** + **서버 쓰기 경로 검증**(profiles update RPC/경로) |
| 기존 데이터 | **강제 수정 없음**(DB 제약 미도입 유지). 기존 20자 초과는 저장 유지, **다음 저장 시에만** 20자 규칙 적용 |
| 관리자 목록 | **한 줄 말줄임**(`text-overflow:ellipsis`, `max-width`, `title`로 전체 hover) |
| 관리자 상세 | **전체 닉네임** 표시 |

- 마이그레이션: 일괄 수정/트리밍 금지. "다음 편집 시 적용" 방식이라 기존 사용자 영향 없음. 서버 검증은 **신규/변경 값에만** 20 grapheme 상한.
- 문자 수 계산 방식과 서버 검증을 WEB·APP·서버가 **동일 함수 규칙**으로 공유(grapheme). 현재 코드포인트 기준과의 차이를 Codex가 반영.

---

## 3. 첨삭 요청·결과 목록 UX 개편 (`/admin/essay-runs`)

**계약 유지:** `admin_lab_runs_filtered` → `admin-lab-filtered-v1`(summary·universities·exams·items·total·offset·limit25). 서버 페이지네이션·회원 검색·기간 그대로.

```
┌ 상단 KPI (타일, summary 재사용) ───────────────────────────┐
│ 전체요청 N │ 완료 N │ 진행중 N │ 실패 N │ 무료재첨삭 N │ 베타연결 N │
│  (현재 필터 기준 · "목록과 동일 조건" 뱃지)                 │
├ 필터 바 (1~2줄, 묶음) ─────────────────────────────────────┤
│ [기간 시작][종료] [대학▾][시험▾][상태▾][출처▾] [회원 검색____][적용]│
├ 목록 (스캔 용이) ──────────────────────────────────────────┤
│ 요청시각 │ 회원 │ 대학·시험 │ 유형 │ 상태●(색) │ 처리시간 │ [상세] │
│ 11/22 14:03 │ a@… │ 연세대·논술 │ 유료 │ ●완료 3/3 │ 2분 │ [상세] │
│ (진행중=주황·실패=적·완료=기본, 지연 30분+ 뱃지)           │
└ [이전] 2/12 [다음] · 총 N회 · 최근 요청순 ─────────────────┘
```
- **KPI**: 기존 dl → `KpiTile`(대시보드 패턴) 타일 행. **"목록과 동일 조건" 명시**(KPI·목록 모두 같은 필터).
- **필터**: 3덩이 → **한 필터 바**(기간·대학·시험·상태·출처·회원)로 1~2줄. 날짜/검색을 분리 폼에서 통합.
- **상태 강조**: 상태·결과 n/m·지연에 **상태 색상**(기존 디자인 시스템) + 지연/실패 뱃지.
- **정보 밀도 축소**: "이용권·회차" 2줄을 유형 칩 1개로(상세에서 전체).
- **모바일**: 표 → **카드 리스트**(요청시각·회원·대학/시험·상태칩·[상세]).
- 정보 우선순위: 상태>대학·시험>요청시각>회원>처리시간.
- 빈 상태: "조건에 맞는 첨삭 요청이 없습니다"(기존). 오류: "조회 실패 · 권한 확인 후 재시도"(기존). 권한: operator 외 접근 차단(서버).

---

## 4. 첨삭 상세 재구성 (`AdminLabDetail`) — 6영역 계층화

단일 스크롤 → **접이식 6섹션**(A·B 기본 펼침, C~E 요약+펼침, F 본문). `admin-lab-detail-v1` 그대로.

```
A. 첨삭 요약 [펼침]  대학·시험·회원·요청/완료·상태●·문항수 · [학생 화면으로 미리보기]
   ⚠ 경고(labAlerts): 지연/실패/차감-결과 불일치 … (현재 상태 경고만, 과거 진단과 분리)
B. 처리 상태 [펼침]  요청생성→이용권예약→AI평가→결과저장→완료  (실제 기록 단계만 체크)
C. 이용권 [요약+펼침]  유형(유료/무료재첨삭)·예약·차감·복구 · 거래내역 표(한국어 라벨)
D. AI 처리 정보 [기본 접힘]  Provider·모델·호출수·처리시간·비용(cost_status)
E. 오류·재처리 [조건부]  재처리 n회 · 최종 결과 · [과거 실패 진단] 별도 블록(현재상태 아님 명시)
F. 학생 답안·첨삭 결과  문항별 제출답안 → EvaluationReport(학생 렌더러) → [문항별 /ql 검수]
   원시 결과: <details>저장 원본</details>
```
- **정상 vs 과거 오류 분리:** B는 **현재 완료 경로**만, E는 **과거 실패/진단**만. `labAlerts`의 "실패 진단 기록 있음 — 현재 상태와 구분"을 E 헤더로 승격 → 완료 건이 실패로 **오인되지 않게**.
- **원시값 → 한국어**(§6 라벨맵): 거래 `type`·billing `reason`/`status`·diagnostics `code`를 라벨 변환, 원문은 각 항목 `title`/펼침에 보존.
- **기술 상세 기본 접힘**: D(Provider/비용)·F 원시 덤프.
- 정보 우선순위: 요약·경고 > 처리상태 > 이용권 > 답안·결과 > (접힘)AI처리/원시.
- 빈/오류: "표시 가능한 완료 결과 없음"·"저장 형식 표시 불가 — 원본 확인"(기존 문구 유지). 결과 열람 이벤트 "확인 불가 — 미연결"(기존, 임의 생성 금지).

---

## 5. 학생용 첨삭 결과 새 창

**Owner 결정 반영:** 관리자가 **실제 학생이 보는 결과 화면**을 새 탭으로 확인.

### 확인 결과(코드)
1. **학생용 결과 렌더러 위치(WEB):** `src/components/my/evaluation-report.tsx`(`EvaluationReport`→`HumanEvaluationReport`) + `essay-result-page.tsx` + `exam-result-layout.tsx`/css. 라우트 `src/app/my/essays/result/page.tsx`.
2. **WEB vs Flutter:** 학생이 모바일에서 본 화면은 **Flutter Native**(별도 저장소·위젯)로 WEB과 **레이아웃이 다를 수 있음**. **WEB에서 Flutter Native UI를 그대로 재사용 불가** → 지시대로 **WEB 학생용 결과 UI(`EvaluationReport`)를 기준**으로 한다. (현재 `AdminLabDetail`도 이미 이 렌더러를 인라인 재사용.)
3. **미리보기 데이터 계약:** 신규 없음. `admin-lab-detail-v1`의 `run.result`/`answers`를 기존 `examReports`→`EvaluationReport`에 그대로 투입.
4. **재사용 범위:** 결과 본문 렌더러(`EvaluationReport`)·결과 레이아웃(`exam-result-layout`)·css 재사용. 학생 전용 액션(재첨삭·코멘트 폼)은 **미리보기에서 숨김/비활성**.
5. **새 창 라우팅:** `[학생 화면으로 미리보기]` → `window.open('/admin/essay-runs/preview?run=<id>', '_blank')` (관리자 전용 읽기 라우트). 학생 세션 가장(`/my/essays/result`로 보내지 않음) 금지.
6. **권한 검증:** 새 탭 라우트도 **operator 서버 검증**(admin-lab-detail-v1 재조회). `/ql` 권한(quality_operators)은 불변. 결과 수정·재첨삭 실행 **불가**(읽기 전용).
7. **결과 없음 UX:** "표시 가능한 완료 결과가 없습니다"(저장 결과 null/parse 실패 시 기존 문구). 빈 탭 대신 안내.

> **핵심 원칙:** 학생 렌더러 재사용·관리자 결과 UI 복제 금지·읽기 전용·학생 가장 금지·실데이터·신규 엔진/구조 생성 금지.

---

## 6. 정보 표현 규칙 (코드 확인된 라벨맵)

| 원시값 | 출처 | 한국어 | 근거 |
|---|---|---|---|
| `reserve` | credit_transactions.transaction_type | 이용권 예약 | `my/data.ts` |
| `consume` | 동 | 이용권 차감(사용) | credit-display `consume→논술 첨삭` |
| `release` | 동 | 예약 해제 | `my/data.ts` |
| `refund` | 동 | 환불 | credit-display |
| `settled` | billing.status / credit_state | 차감 확정 | `ops.test` `settled` |
| `reserved` | 동 | 예약 | essay-runtime client |
| `released` | 동 | 해제 | 동 |
| `included` | credit_state | 무료 포함(추가 차감 없음) | essay-runtime client |
| `pending` | 동 | 대기 | 동 |
| `paid_cycle` | billing.reason | 유료 첨삭 | `ops.test` |
| `included_revision` | billing.reason | 무료 재첨삭 | lab-operations `labAlerts` |
| `signup_bonus`/`purchase`/`promotion`/`admin_grant` | credit origin | 신규가입 무료 / 이용권 구매 / 프로모션 지급 / 관리자 지급 | credit-display, `admin.test` |
| 평가·회차 필드 전반 | monitoring | **기존 `monitoringLabels` 재사용** | `lib/admin/monitoring.ts` |
| `EXACT_QUOTE` (diagnostics code) | — | **미확정 — WEB 코드에 매핑 없음** | *Owner 지시: 의미 불명확 코드 임의 번역 금지 → 서버/APP 평가 파이프라인에서 확인 후 라벨링. 그 전까지 원문 표기* |

- **구현 방식:** `admin-lab-operations.tsx` 상세의 raw 출력(`t.type`, `billing.reason`, `billing.status`, diagnostics `code`)을 **기존 라벨맵(`monitoringLabels`·credit-display·`opsBillingLabel`)으로 치환**. 라벨 없는 코드(EXACT_QUOTE 등)는 **원문 유지 + 상세 펼침**.
- 상태 색상은 **기존 관리자 디자인 시스템**(네이비/청회색/Teal/오렌지·상태색) 유지. 운영 상태와 과거 오류를 색·섹션으로 구분.

---

## 7. 화면 설계 산출물 (정보 우선순위·컴포넌트·원천·이동·상태·권한·모바일)

| 화면 | 정보 우선순위 | 주요 컴포넌트 | 데이터 원천 | 이동 | 빈/오류/권한 | 모바일 |
|---|---|---|---|---|---|---|
| 1 회원 목록 | 계정상태>이메일>학교/학년>닉네임 | `admin-members-view` 표 + 닉네임 말줄임 | `admin_members`(members-v*) | 상세 패널 | 빈=결과없음 / operator | 카드형 |
| 2 첨삭 목록 | 상태>대학·시험>요청시각 | KPI 타일 + 필터바 + 표/카드 | `admin_lab_runs_filtered`(admin-lab-filtered-v1) | 상세 | 기존 문구 / operator | 카드 리스트 |
| 3 첨삭 상세 | 요약·경고>처리상태>이용권>답안 | 6 접이식 섹션 + `EvaluationReport` | `admin_lab_run_detail`(admin-lab-detail-v1) | /admin/operations·/admin/essay-feedback·/ql | 결과없음/파싱실패 문구 / operator·(/ql 별도) | 세로 스택 |
| 4 결과 새 창 | 결과 본문 | 학생 `EvaluationReport`/result-layout | 동 detail의 result/answers | 새 탭(read-only) | 결과없음 안내 / operator | 학생 결과 반응형 |

---

## 8. 기존 컴포넌트·API 재사용 / 신규 필요 여부

**재사용(신규 불필요):** `admin-lab-filtered-v1`/`admin-lab-detail-v1`, `monitoringLabels`·credit-display·`opsBillingLabel`, `EvaluationReport`/`exam-result-layout`, `KpiTile`(대시보드), `admin-table`/`AdminPanel`/디자인 토큰, `labAlerts`.

**신규(최소):**
1. **닉네임 20 grapheme 검증 유틸**(WEB `Intl.Segmenter` + 서버 쓰기 경로 + Flutter `characters`). — 유일한 로직 신규. DB 제약 미도입.
2. **관리자 결과 미리보기 라우트** `/admin/essay-runs/preview`(operator 읽기, 기존 렌더러·계약 재사용). 신규 데이터 계약 없음.
3. (선택) 라벨 미확정 코드(EXACT_QUOTE 등) 매핑 테이블 — 서버/APP 확인 후.
> **신규 RPC·평가 엔진·결과 구조 없음.** 전부 표현·레이아웃·클라이언트 유틸.

---

## 9. Codex 구현 명세
- **대상 파일(Codex 소유):** `admin-lab-operations.tsx`(목록 KPI 타일화·필터 바 통합·상태 색·상세 6섹션·라벨맵 치환·미리보기 버튼), `admin-members-view.tsx`/`admin-dashboard-view.tsx`(닉네임 말줄임 컬럼), 신규 `app/admin/essay-runs/preview/page.tsx`, 닉네임 검증(WEB `my/data.ts`·회원가입/온보딩, 서버 경로) + APP. **Claude는 설계만, 코드 미수정.**
- **불변:** 데이터 계약(admin-lab-*v1)·서버 페이지네이션·검색·기간·operator/quality_operators 권한·학생 렌더러·기존 기록. DB 제약 미도입.
- **원칙:** 원시값은 기존 라벨맵으로만 치환(불명확 코드 임의번역 금지, 원문 보존). 정상/과거 오류 분리. 기술 상세 기본 접힘. 미리보기는 읽기 전용·학생 가장 금지.
- **디자인:** 기존 관리자 디자인 시스템·상태색 유지. PC 우선, 모바일 카드형 반응형.

## 10. Owner 결정 필요 사항
1. 닉네임 **20 grapheme** 상한·**grapheme 카운트** 확정(현재 80 코드포인트) + "다음 편집 시 적용" 마이그레이션 승인.
2. 결과 **새 창 라우트** 신설 승인(`/admin/essay-runs/preview`, operator 읽기).
3. 라벨 미확정 코드(EXACT_QUOTE 등) **서버/APP 의미 확인** 담당·시점.
4. 첨삭 상세 **기본 접힘/펼침 기본값**(D AI처리·원시 덤프).

---

## 제약 재확인
실제 코드 검수 + 설계 문서뿐. **WEB·Flutter·DB·RPC·운영 배포 변경 없음.** Codex 소유 파일은 읽기만(수정 없음). 추측으로 기능 상태를 적지 않았다(✅/🟡/⚪/🧩, 미확정은 '확인 필요'로 표기). 신규 평가 엔진·결과 데이터 구조 생성 없음. Owner 검토 후 Codex가 UI 구현.
