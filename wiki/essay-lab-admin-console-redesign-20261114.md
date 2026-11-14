# 논술 LAB 관리자 운영 콘솔 개편 설계 (WEB) — 2026-11-14

> 담당: Claude (UX·IA) · 단계: **조사·IA 재설계·구현 명세**(구현·배포 제외)
> 기준: WEB 작업트리 `claude/admin-ux-overhaul-20261109`(HEAD `8f969f3`) 실제 코드 열람. 운영 배포본과 코드가 다를 수 있어, 상태는 **코드 기준**으로 표기.
> 선행: [admin-learning-admissions-overview-redesign-20261114.md](admin-learning-admissions-overview-redesign-20261114.md), [admin-ux-overhaul-20261109.md](admin-ux-overhaul-20261109.md).
> **이번 단계 운영 DB·RPC·WEB·Flutter·결제/Credit 정책 변경 없음.**

표기: ✅구현 / 🟡부분(PARTIAL) / ⚪미구현(NOT IMPLEMENTED) / 🧩Codex P0 진행중(중복금지)

> **핵심 결론 (먼저):** 논술 LAB 관리자 콘솔은 **이미 상당 부분 구현**돼 있다. 이번 개편은 **신규 구축이 아니라 ① 메뉴 IA 재그룹핑 ② 흩어진 화면을 "한 건의 첨삭" 중심으로 잇는 연결자(operations↔/ql, feedback↔/ql, credit↔첨삭) ③ 운영 경고 스트립** 이 핵심이다. 학생 코멘트·만족도·품질 루브릭은 **이미 존재**하므로 중복 생성하지 않는다.

---

## 0. 현재 구현 상태 (코드 근거)

현재 관리자 메뉴는 `src/lib/admin/navigation.ts`(`ADMIN_NAV`/`ADMIN_GROUPS`)가 단일 출처다.

| 영역 | 화면/RPC | 상태 |
|---|---|---|
| 대시보드 | `/admin` `admin-dashboard-view` — KPI(가입·공부·첨삭권사용·결제·문의) + 회원/공부/희망/지원/합격/문의 focus | ✅ |
| 회원 | `/admin/members` Student 360 `admin-members-view` | ✅ |
| 이용권 | `/admin/credit` `admin-credit-view`(회원별 `creditMembers` + 현황 + `admin-credit-report` + 지급/복구) | ✅ |
| 결제 | `/admin/payment` `admin-payment-view` | ✅ |
| 이용권·매출·비용 | `/admin/analytics` | ✅ |
| **평가·비용 모니터링** | `/admin/operations` `admin-essay-monitoring`(RPC `admin_essay_operations`) — 5탭: 운영현황/평가처리/API비용/장애·재처리/이용권사용 + **평가 상세**(재처리·실패진단·Provider영수증·이용권거래) | ✅ |
| 베타 | `/admin/beta`, `/admin/beta/usage`, `/admin/beta/failures` `admin-beta` | ✅ |
| **피드백·오류 신고** | `/admin/essay-feedback` `admin-essay-feedback`(RPC `admin_essay_feedback`/`_update`) — 상태 new→reviewing→resolved→closed, 메모, 이력, 통계 | ✅ |
| 1:1 문의 | `/admin/inquiries` | ✅ |
| 공지 | `/admin/notices` | ✅ |
| **평가 품질 관리** | `/ql` `QualityConsole`(**별도 authz `quality_operators`**) — 사례목록/상세(문항맥락·학생답안전체·평가요약·재작성체크리스트·AI생성재작성)·검토폼(루브릭·findings·판정·정정)·불변 이력 | ✅ |
| 논술 자료 검수 | `/admin/materials` | ✅ |
| 논술 학습 분석 | `/admin/data/essay-usage` `AdminLearningHub` | ✅ |
| 사용자 답안 샘플 검수 | `/admin/data/samples` | 🟡 기존 `/ql` 연결 |
| 만족도·피드백 분석 | `/admin/data/satisfaction` | 🟡 |
| 베타 검증 결과 | `/admin/data/verification` | ⚪ NOT_TESTED 표기 |

### 0-1. 학생 코멘트·만족도 — **이미 구현** (`src/components/essay-feedback.tsx`)
- `EssayFeedback({evaluationRef,bugOnly})` — 결과 화면에 노출(`page.tsx`도 `<EssayFeedback bugOnly/>`). **선택 사항**("남기기 (선택)"), 필수 아님.
- `kind='quality'`: 만족도(helpful/unhelpful 또는 **1~5 숫자 rating**) + 좋았던/아쉬웠던 이유 체크박스(대학 평가기준 이해·구체적 피드백·재작성 도움·명확한 설명 / 정확성 부족·추상적·실제 답안과 다른 지적·평가기준 연결 부족·느림·복잡) + 자유 의견(≤5000) + category(helpful/inaccurate/rubric/score/unclear/function/other).
- `kind='bug'`: category(submission/ocr/evaluation/result/rewrite/credit/display/other) + 설명.
- **`evaluation_ref`로 첨삭 회차에 연결**, `request_key` 멱등, RPC `essay_feedback_submit`, PII 미첨부.

### 0-2. 품질 루브릭 — **배포된 정규 계약** (`hq-rubric-v1`, migration `20261001000200_human_quality_persistence.sql`)
- 판정 `HQ_DISPOSITIONS`: PASS/PASS_WITH_NOTES/NEEDS_REVIEW/FAIL. 평가 verdict OK/CONCERN/FAIL/NA.
- 필수 차원 `diagnosis, core_priority, actionability, evidence_adherence, stance_preservation, hallucination_absence`(+조건부 `sentence_feedback, progression, generated_rewrite`). 차단 차원: `diagnosis, hallucination_absence`.
- **선정 사유 `HQ_SELECTION_REASONS`: EARLY_CENSUS, RANDOM_SAMPLE, ANOMALY, USER_REPORT, OPERATOR_REQUEST, MODEL_CHANGE_AUDIT, DISPUTE, OTHER** ← §6 샘플링 분류가 **이미 계약에 존재**.
- findings(issue_category·severity·target), 권고 조치, 검토 상태(UNREVIEWED~DISAGREEMENT).

---

## A. 관리자 전체 IA 개편안

### A-1. 기존 메뉴 구조 (그대로)
`ADMIN_GROUPS` = 기본 운영 / 분석·품질 / 운영 점검 / 유입·행동(GA4) — 기능 축.

### A-2. 개선 메뉴 구조 (운영 업무 흐름 축, 제안)
메뉴 **수를 늘리지 않고** 기존 항목을 6묶음으로 **재그룹핑**(라우트·화면 보존):

| 묶음 | 포함(기존 화면) | 성격 |
|---|---|---|
| **A. 운영 대시보드** | `/admin`(KPI) + **논술 운영 경고 스트립(NEW 조립)** | 첫 화면·경고 |
| **B. 회원·이용권** | `/admin/members`, `/admin/credit`, `/admin/payment` | 사람·지갑 |
| **C. 첨삭 운영** | `/admin/operations`(평가 모니터링)·`/admin/beta*` | 첨삭 처리 단위 |
| **D. 첨삭 품질** | `/ql`(별도 authz 유지) + `/admin/data/samples` | 품질 검수 |
| **E. 학생 피드백** | `/admin/essay-feedback` + `/admin/data/satisfaction` + `/admin/inquiries` | 목소리 |
| **F. 운영 분석** | `/admin/analytics`·`/admin/data/essay-usage`·비용·`/admin/data/verification` | 추이·비용 |

### A-3. 메뉴 통합·이동 계획
- **라우트/컴포넌트/권한 불변.** `ADMIN_GROUPS` 재구성 + 라벨 정리만(예: "평가·비용 모니터링"→"첨삭 운영", 그룹 소속 이동). `/ql`은 **병합하지 않음**(별도 `quality_operators`).
- 중복 제거: "사용자 답안 샘플 검수"(`/admin/data/samples`)는 `/ql` 사례 목록과 역할 중복 → **D 묶음에서 `/ql`로 단일화**(링크만 유지).

### A-4. 기존 기능 보존 계획
모든 기존 라우트·RPC·권한 경계(operator vs quality_operators)·불변 이력·PII 가드 **유지.** 개편은 그룹·라벨·연결 링크·조립 카드에 한정.

---

## B. 화면별 UX 명세 (저충실도 와이어프레임 포함)

### B-1. 이용권 관리 (`/admin/credit`) — §3
**현재(코드):** `AdminCreditMembers` 기본 정렬 `balance_desc`(사용 가능 높은 순), 정렬옵션 balance_asc/granted_desc/used_desc/joined_desc, 컬럼(사용가능·예약·유료·무료·기타·**최근 사용일**=이용권 사용 확정일)·검색·페이지네이션·지급/상세. **"최근 첨삭" 기준 정렬·컬럼은 없음**(현재는 이용권 사용일 기준).

**개선(제안):** 🧩 *Codex P0 "이용권 관리 최근 첨삭순"과 겹치므로 데이터 계약은 Codex, UX만 명세.*
```
[검색____][정렬 ▾ 최근 첨삭순*][표시 10 ▾]        총 N명
회원            | 사용가능 | 최근 첨삭요청 | 완료 | 최근 첨삭 대학 | 상태 | 상세
abc@…           |   3      | 11/22 14:03  |  5   | 연세대        | 정상 | [상세]
*기본 최근 첨삭요청순 · 잔액순은 옵션으로 유지
```
- 신규 컬럼(최근 첨삭요청·완료 수·최근 첨삭 대학)은 **essay 세션 조인 필요** → `creditMembers` 계약 확장(§C, Codex).
- **상세**: 기존 `AdminMemberDetailPanel`에 **이용권 사용 이벤트**와 **첨삭 완료 이벤트를 별도 타임라인**으로 병치 → 정합성 이상(차감 있는데 첨삭 없음 등) 즉시 식별. (operations 평가 상세의 이용권 거래 이력 재사용.)

### B-2. 회원별 첨삭 현황 — §4 일부
회원 상세에서 `/admin/operations`를 **해당 user_id로 필터**해 그 회원의 첨삭 목록·상세로 진입(링크). 신규 화면 아님.

### B-3. 첨삭 운영 목록·상세 (`/admin/operations`) — §4
**현재(코드):** 필터 type(인문/상경/수리)·state(성공/실패/예약)·source(beta_daily/signup/paid/free_rewrite/other)·retry, 25/page. 상세 = 재처리·실패 진단·Provider 영수증·이용권 거래 이력.
**개선(제안):**
```
첨삭 운영  [기간][대학▾][시험▾][회원____][상태▾][최초/재첨삭▾][베타/일반▾]
evaluation_id | 회원 | 대학 | 시험 | 문항 | 상태 | 소요 | 재처리 | 이용권출처 | [상세]
└ 상세: A요청 | B처리과정 | C이용권 | D결과→[/ql 사례로] | E운영(오류·검수상태·학생코멘트)
```
- 추가 필터: **대학/시험/최초·재첨삭/베타·일반**(베타는 source=beta_daily로 이미 구분 가능). 회원 필터.
- **D 결과(학생 답안·AI 첨삭·평가 기준)는 `/admin/operations`에 노출하지 않고 `/ql`로 링크**(PII·권한 경계 유지). "한 건의 첨삭 전체 과정"은 **operations 상세 ↔ /ql 사례 상호 링크**로 달성(병합 아님).

### B-4. 품질 검수 (`/ql`) — §5
**현재(코드):** 사례 상세(문항맥락·학생 제출 답안 전체·평가 요약·재작성 체크리스트·AI 생성 재작성 구별)·검토폼(판정·루브릭 차원·findings·검토 사유·권고 조치)·불변 이력·정정. **대부분 DONE.**
**개선(제안) — Owner 8기준을 기존 루브릭에 매핑(신규 차원 최소):**

| Owner 기준(§5) | 기존 HQ 차원/요소 | 상태 |
|---|---|---|
| A 평가 기준 반영 정확성 | `evidence_adherence`+`diagnosis` | ✅ |
| B 학생 답안 근거의 구체성 | `evidence_adherence` / finding `EVIDENCE_MISREAD` | ✅ |
| C 잘한 점의 타당성 | `diagnosis`/`core_priority` | ✅ |
| D 보완할 점의 타당성 | `core_priority`/`actionability` | ✅ |
| E 개선 방향 실행 가능성 | `actionability` | ✅ |
| F 근거 없는 평가 여부 | `hallucination_absence`(차단) + `UNSUPPORTED_CLAIM`/`INVENTED_ERROR` | ✅ |
| G 문항별 평가 일관성 | (부분) `progression` | 🟡 교차문항 일관성 미약 → 후속 검토 |
| H 전달 문장의 명확성 | `sentence_feedback`(정확성 중심) | 🟡 "명확성" 관점 보강 후보 |
- **대학 평가 기준(루브릭 원문)을 사례 상세에 병치**하는지 확인 필요 → 현재 상세는 verification_status 등 맥락만. **평가 기준 텍스트 병치**가 가장 가치 있는 보강(§C 데이터 확인).

### B-5. 학생 코멘트 — §7 (신규 금지, 기존 재사용)
**결론: 신규 시스템 만들지 않는다.** `EssayFeedback`(rating·이유·자유의견·evaluation_ref·선택사항)이 이미 Owner 요구를 충족. 보강 후보만:
- 결과 화면 하단 노출 위치·문구 점검(이미 "이번 첨삭이 얼마나 도움이 되었나요?" 1~5점).
- 코멘트 유형(평가 이해 안 됨/기준 안 맞음/설명 부족/유용/오류)은 기존 category에 매핑(unclear/rubric/abstract/helpful/bug). 누락 시 **라벨만 추가**.

### B-6. 학생 코멘트 운영 (`/admin/essay-feedback`) — §8
**현재(코드):** 상태 new→reviewing→resolved→closed, 메모, 이력, 통계, evaluation_ref→Owner 검수 링크.
**개선(제안):**
- 처리 흐름 **신규→검토중→(재검토)→조치완료**: 기존 4상태 활용, 필요 시 "재검토" 1개 추가.
- **코멘트→품질 검수 연결**: `evaluation_ref` 있는 USER_REPORT 유형을 `/ql` 사례로 보내 **선정 사유 `USER_REPORT`**(이미 계약 존재)로 검수 기록 → 개선 과제 연결. (현재는 `/owner-review`로 링크 → **`/ql` 링크 추가** 제안.)
- 목록에 **대학·시험 맥락 컬럼** 추가(evaluation 조인) — 현재는 evaluation_ref만.
- **학생에게 처리 결과 노출 여부는 Owner 정책 결정**(기본: 내부 처리, 선택: "검토 완료" 상태만 노출).

### B-7. 운영 분석 (§9) — 기존 분석 재배치
`/admin/data/essay-usage`(이용)·operations(처리/비용)·satisfaction(품질·만족도)로 이미 분산. **분모·분자 명시 KPI 표**(§C)로 묶고, 데이터 없는 지표(E 비용 일부·학습효과)는 후속 분리.

---

## C. 데이터 계약 명세

### C-1. 기존 RPC·DB 재사용 (변경 없음)
| 용도 | RPC/계약 |
|---|---|
| 첨삭 운영·상세 | `admin_essay_operations`(+estimate/check_alerts) — run·retry·diagnostics·provider receipts·credit ledger |
| 이용권 | `creditMembers`, `dashboard`(credit), `admin-credit-report`, 지급/복구 RPC |
| 피드백 | `essay_feedback_submit`(학생), `admin_essay_feedback`/`admin_essay_feedback_update`(운영) |
| 품질 | `hq-read-v1`/`hq-write-v1`(QualityClient·HumanReviewClient), 불변 이력 |
| 베타 | `admin-beta`(usage/failures) · source=`beta_daily` 필터 |
| 대시보드 | 기존 `admin_admissions_analytics`/`admin_admission_outcomes`/support/study |

### C-2. 신규 데이터 필요 여부 (후보만, Owner 승인·대부분 Codex P0)
1. 🧩 **`creditMembers` 확장**: 최근 첨삭 요청일·완료 수·최근 첨삭 대학(essay 세션 조인), 정렬 `recent_essay_desc`. **Codex P0.**
2. **피드백 목록 대학·시험 맥락**: `admin_essay_feedback`에 evaluation 조인 필드(또는 클라이언트 2차 조회). 소규모.
3. **피드백→/ql 연결**: 신규 데이터 아님 — evaluation_ref로 `/ql` 사례 라우팅 + 선정 사유 USER_REPORT(계약 존재).
4. **운영 경고 스트립**: 신규 집계 아님 — operations alerts + feedback pending + 품질 UNREVIEWED 수를 **기존 응답 조합**.
5. (후속) 품질 상세에 **대학 평가 기준 원문 병치** — 자료 계약 확인 필요.

### C-3. 관리자 권한
- operator(`admin_operator()`+`account_private.allowed`) = 대부분. **`/ql`은 `quality_operators` 별도** — 병합 금지(답안 원문 열람 권한 분리).
- 모든 신규/확장은 기존 패턴(SECURITY DEFINER·`search_path=''`·게이트·`revoke public,anon`·`grant authenticated`).

### C-4. 집계 정의 (KPI 표, 분모·분자 명시 발췌)
| 지표 | 분자/분모 | 원천 | 상태 |
|---|---|---|---|
| 첨삭 완료율 | 완료 ÷ 요청(접수일 코호트) | `admin_essay_operations.summary` | ✅ |
| 최종 실패율 | failed ÷ 요청 | 동 | ✅ |
| 평균 처리 시간 | Σduration ÷ 완료 | run.duration_seconds | ✅ |
| 재첨삭율 | 재첨삭 회차 ÷ 완료 | ledger/parent | 🟡 |
| 첨삭당 평균 비용 | Σcost_usd ÷ 완료(ACTUAL만) | provider receipts | 🟡(UNKNOWN 제외) |
| 만족도 긍정률 | 긍정 ÷ 응답 | `admin_essay_feedback.stats` | ✅ |
| 품질 검수 통과율 | PASS(+NOTES) ÷ 검토 | hq review state | ✅ |
| 검수 대기 | UNREVIEWED 수 | hq | ✅ |

---

## D. 구현 로드맵

### P0 — 즉시 (🧩 **Codex 진행중, Claude 중복 금지**)
이용권 최근 첨삭순·회원별 첨삭 이력·첨삭 처리 과정·실제 답안/결과 조회·기존 품질 검수 연결 → **데이터 계약·구현은 Codex.** Claude는 §B UX 명세·IA 그룹만 제공.

### P1 — 운영 품질 (Claude 설계 대상)
- 품질 상세 **대학 평가 기준 병치**(데이터 확인 후), Owner 8기준↔루브릭 매핑 라벨.
- **피드백→/ql 연결**(USER_REPORT) + 피드백 목록 대학·시험 컬럼 + "재검토" 상태(선택).
- **운영 경고 스트립**(대시보드): 첨삭 실패·이용권 이상·검수 대기·코멘트 미처리 — **실제 데이터만**, 임의 예시 수치 금지.
- 메뉴 IA 재그룹핑(`ADMIN_GROUPS`) + 라벨 정리 + samples→/ql 단일화.

### P2 — 분석 고도화 (후속)
- 대학별/모델 버전별 품질 분석, **자동 샘플링**(무작위+층화+위험기반+신규대학, 선정사유 계약 재사용), 학습 효과 분석, 비용 커버리지 향상.

### 작업 범위 분담(제안)
- **Codex:** P0 데이터 계약·구현(이용권↔첨삭, 처리 과정, 답안/결과 조회).
- **Claude:** P1 IA·연결 UX·경고 스트립·품질 매핑(설계→Owner 승인 후 구현).
- **Owner 결정:** 아래 §Owner.

---

## 디자인 시스템 (§12)
기존 관리자 디자인 유지: 네이비 기반·청회색/Teal 보조·오렌지 강조·상태 색·카드/테이블 구분·가독성 우선. 장식 최소. **PC 우선**, 태블릿/모바일은 기존 반응형. 기존 `admin-surface`/`AdminPanel`/`admin-table`/토큰 재사용.

## 베타 기록 (§10)
`/admin/beta*` + operations source=`beta_daily` 필터로 **베타·운영 동일 화면 조회 + 구분 필터** 이미 가능. 성균관대 등 기존 베타 평가에 결과가 있으면 `/ql` 검수 대상으로 활용. **과거 데이터 삭제·임의 변환 금지.** 베타 이용권 정책 차이는 기존 베타 운영 문서 확인.

## Owner 결정 필요 사항
1. 학생 코멘트 **처리 결과를 학생에게 노출**할지(내부 처리 vs "검토 완료" 노출).
2. 품질 검수 **"재검토" 상태 추가** 여부.
3. 품질 상세에 **대학 평가 기준 원문 병치** 범위(자료 권한·표시 정책).
4. 메뉴 **IA 재그룹핑 적용** 승인(라우트 불변, 그룹/라벨만).
5. P1 **운영 경고 스트립**의 경고 임계값(현재 임계값 규칙 비활성 상태).
6. P0 분담 확정(이용권↔첨삭 계약을 Codex가 전담하는지).

---

## 제약 재확인
설계·명세 문서뿐. **운영 DB·RPC·WEB 배포·Flutter·결제/Credit 정책 변경 없음.** 추측으로 구현 상태를 적지 않았다(코드 기준 ✅/🟡/⚪/🧩). 기존 기능(코멘트·루브릭·운영 모니터링·대시보드)은 **이미 구현**이므로 중복 설계하지 않는다. Codex P0와 겹치는 범위는 UX·IA만 제시. Owner 검토 후 구현.
