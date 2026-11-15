# 논술 LAB 전용 운영 대시보드 설계 (2026-11-15)

> 담당: Claude (UX·IA) · 단계: **설계 전용**(구현·배포 제외)
> 조사 기준: 운영 배포 `7ea8cef7` / WEB `d90e2ec`(브랜치 `codex/lab-admin-operations-20261114`) · Claude 최종 `2a50926` **실제 코드·데이터 계약 열람**.
> 연속: [admin-essay-operations-ia-20261114.md](admin-essay-operations-ia-20261114.md)(7그룹 IA) · [admin-console-final-ux-audit-20261115.md](admin-console-final-ux-audit-20261115.md)(PHASE 4) · [admin-lab-operations-20261114.md](admin-lab-operations-20261114.md)(Codex 데이터 계약).
> **이번 단계 WEB·Flutter·DB·RPC·운영 배포·결제/Credit 정책 변경 없음.** Codex 소유 파일은 **읽기만** 했다.

상태 표기: DONE(운영·계약 확인) / PARTIAL(계약 있으나 미연결) / NOT IMPLEMENTED(원천 없음) / NOT TESTED(미검증) · 근거: (CODE)=코드 열람 / (설계)=제안
재사용 등급: **A** 기존 RPC 즉시 / **B** 기존 응답 조합 / **C** 기존 RPC 최소 확장 / **D** 신규 집계 필요 / **E** 현재 데이터 없음

> **설계 결론(먼저):** 논술 LAB 대시보드는 **기존 데이터의 운영 허브**다. KPI·운영상태·최근활동·품질·피드백·이용권/비용은 **대부분 기존 RPC(A/B)**로 성립한다. **유일한 신규 집계(D)는 ① 고유 이용 학생 수 ② 대학·시험별 집계** 둘뿐이며(현재 계약은 회차 합계·필터 목록만 제공), 그 외는 재사용이다.

---

## 1. 설계 목적 / 2. 기존 IA와의 관계 / 3. 신규 메뉴 배치

- 목적: 관리자가 한 화면에서 **"지금 논술 LAB이 잘 돌고 있나 · 얼마나 쓰이나 · 품질·수익은 어떤가"**에 즉시 답(§1의 12개 질문).
- **기존 7그룹 IA 유지.** 신규는 **운영 대시보드 그룹**에 추가(첨삭 운영 하위 아님 — Owner 결정: 핵심 서비스·수익모델):
```
▼ 운영 대시보드
  ├─ 대시보드            (/admin, 전체 서비스)
  ├─ 논술 LAB 대시보드   (신규 /admin/lab-dashboard, 논술 첨삭 허브)
  └─ 공지사항 관리        (/admin/notices)
```
- `src/lib/admin/navigation.ts`의 `ADMIN_NAV`/`ADMIN_GROUPS`에 항목 1개 추가(라우트 신규, 권한=operator). 기존 메뉴·권한 불변.
- **중복 금지:** 일반 대시보드의 `AdminLabWarningStrip`(논술 LAB 운영 확인)은 **간결 요약 유지**, 상세는 신규 대시보드로 이동(§11).

---

## 4. 전체 대시보드 정보구조 (6영역)

실제 데이터 가용성 기준 권장 순서:
```
① 핵심 KPI (최근7일 기본 · 기간 선택)        ← 활동·성장
② 운영 상태·조치 (현재/7일, 기간 분리)       ← 장애·조치 (①과 블록 분리)
③ 최근 첨삭 활동 (최근 10건 표)              ← 실시간 감각
④ 대학·시험별 이용 현황 (순위/막대)          ← 어디가 많이 쓰나
⑤ 첨삭 품질 + 학생 피드백 (한 섹션 2분할)    ← 품질·목소리
⑥ 이용권·매출·비용 (지급/사용/매출/AI비용)   ← 수익성
```
원칙: 운영상태(②)와 일반통계(①④⑥) 블록 분리 · 상세는 전부 기존 페이지로 이동 · 예시 수치 금지(0은 0으로).

---

## 5. 핵심 KPI 정의표

기본 기간 **최근 7일(KST)**, 선택 오늘/7일/30일/전체. **현재 상태 지표(처리 중)는 기간 집계와 분리.**

| KPI | 정의 | 단위 | 기간 | 중복제거 | 데이터 원천 | 기존 RPC | 재사용 | 상태 |
|---|---|---|---|---|---|---|---|---|
| A 이용 학생 수 | 선택 기간 첨삭 요청을 생성한 **고유 회원** | 명 | 선택 | 회원 distinct | runs.user_id | `admin_lab_runs_filtered` | **D**(summary에 distinct 없음) | PARTIAL(설계) |
| B 첨삭 요청 수 | 선택 기간 생성된 요청 **회차** | 회차 | 선택 | 회차 | runs | `admin-lab-filtered-v1.summary.requested` | A | DONE |
| C 첨삭 완료 수 | **요청이 선택 기간에 생성**되고 현재 완료 | 회차 | 선택(접수 기준) | 회차 | runs | `summary.completed` | A | DONE |
| D 첨삭 실패 수 | 선택 기간 접수 중 최종 실패 | 회차 | 선택(접수) | 회차 | runs | `summary.failed`·`admin_essay_operations` | A | DONE |
| E 현재 처리 중 | **현재** reserved/processing | 회차 | **현재(기간無)** | 회차 | live | `admin_essay_operations.live.processing` | A | DONE |
| F 평균 처리 시간 | 완료 회차 요청→완료 소요 | 초 | 선택(완료 기준) | 완료 회차 | operations | `admin_essay_operations.avg_seconds`(p50/p90) | A | DONE |

> **집계 기준 경고(Owner §5):** C "완료"는 **접수일 코호트 기준**(선택 기간 접수분의 현재 완료)인지 **완료일 기준**인지 라벨에 명시. 현재 `admin-lab-filtered-v1.summary`는 **접수(created_at) 코호트** 집계 → "선택 기간 접수분 중 완료"로 표기. 처리 시간(F)은 `admin_essay_operations`(완료 기준)라 **분모가 다름** → 같은 지표로 합산 금지.
> **오늘 vs 7일**: 같은 RPC 2회 호출(윈도우만 변경) = **B 조합**, 신규 아님.

---

## 6. 운영 상태·조치 정의표

PHASE 4 strip 개편안(상태 카드+tone+기간 뱃지)을 **대시보드 전용으로 확장**. 실제 계약 있는 항목만.

| 항목 | 집계 | 기간 | 중복 | 위험 판정 | 이동 | RPC | 재사용 | 상태 |
|---|---|---|---|---|---|---|---|---|
| 최근 7일 실패 | 접수 7일 중 실패 | 7일 접수 | 회차 | >0 주의(장애 단정 X) | `/admin/essay-runs?state=failed` | `admin_essay_operations.summary.failed` | A | DONE |
| 현재 처리 중 | reserved/processing | 현재 | 회차 | 중립(정상 가능) | `?state=reserved` | `.live.processing` | A | DONE |
| 현재 재시도 대기 | retry_pending | 현재 | 회차(처리중과 **중복 가능**) | 확인 필요 | `/admin/operations` | `.live.retry_pending` | A | DONE |
| 신규 학생 피드백 | status=new | 전체·대기 | 코멘트 | >0 확인 | `/admin/essay-feedback?status=new` | `admin_essay_feedback.stats.pending` | A | DONE |
| 품질 검수 대기 | UNREVIEWED 사례 | 현재 | 사례 | 모집단 정의 시 | `/ql` | hq review state | **C/E**(검수 대상 모집단 미정의 시 생성 금지) | PARTIAL |
| 장시간 미완료 | 30분+ 미완료 | 현재 | 회차 | **임계값 확인 필요** | `/admin/essay-runs?state=reserved` | `labAlerts`(상세 단위, **집계 미연결**) | **D** | PARTIAL |
| 이용권 차감 이상 | 차감 있고 결과 없음 등 | — | — | 상세 단위만 | `/admin/credit`·상세 | `labAlerts`(상세), 집계 없음 | **D** | PARTIAL |
| 결과 저장 누락 | 완료인데 결과 없음 | — | — | 상세 단위만 | 상세 | `labAlerts`(상세) | **D** | PARTIAL |

> **핵심:** 처리 중 ↔ 재시도 대기는 **동일 회차일 수 있음** → **합산해 "장애 N건"으로 표시 금지**(각각 별도 카드). 0=중립. 장시간 미완료/차감 이상/결과 누락은 **현재 개별 상세(`labAlerts`)에서만** 판정되고 **대시보드 집계는 없음** → 통합 경고 집계는 **D(신규), P2**. 임계값(30분 등)은 실제 처리시간 분포(F의 p50/p90) 확인 후 Owner 확정.

---

## 7. 최근 첨삭 활동 (UX)

- `admin-lab-filtered-v1.items`(최근 요청순, 25/page) **상위 10건** 표시(대시보드는 1페이지만).
- 컬럼: 요청시각 · 회원 · 대학 · 시험 · 유형(유료/무료재첨삭/베타) · 상태(색) · 완료시각 · [상세]. 대학·시험 길면 **2줄 요약**.
- 데이터 적으면 빈 공간 늘리지 않음(실제 운영 58요청 규모). 클릭 → **기존 `/admin/essay-runs` 상세**(신규 화면 없음) → 답안·AI결과·이용권·처리과정·/ql 연결.
- 재사용 **A**, 상태 DONE.

---

## 8. 대학·시험별 이용 현황

| 지표 | 원천 | 재사용 | 상태 |
|---|---|---|---|
| 대학별 요청/완료/실패 | runs 집계 | **D**(현재 `universities[]`는 필터 목록뿐, **집계 없음**) | PARTIAL(설계) |
| 대학별 이용 학생(고유) | runs.user_id distinct | **D** | PARTIAL |
| 무료 재첨삭·평균 처리시간(대학별) | runs/operations | **D** | PARTIAL |

- UI: **초기 데이터 규모가 작으므로** 복잡 차트 금지 → **순위표 또는 가로 막대**. 대학 선택 → `/admin/essay-runs?university=<id>` 필터 이동(기존). 시험별도 기존 연결.
- **동일 학생 복수 첨삭**: 이용 학생 수(distinct) ≠ 요청 수(회차) 구분. **베타/운영 구분**(source=beta_credit) 필터.
- **신규 집계(D) 필요 근거:** `admin-lab-filtered-v1.summary`는 전역 합계, `universities[]`는 드롭다운용 목록 → **대학×(요청/완료/실패/고유학생)** 교차 집계가 계약에 없음. 페이지네이션 items(25)로 클라이언트 집계는 **전체를 못 담아 부정확** → 서버 집계 1종 필요(§13 D-1).

---

## 9. 첨삭 품질 + 학생 피드백 (한 섹션·2분할)

### A. 첨삭 품질 (`/ql` 재사용, quality_operators 권한 유지)
- 검수 완료·판정(PASS/PASS_WITH_NOTES/NEEDS_REVIEW/FAIL)·최근 사례·검수 대기(UNREVIEWED). 재사용 **A/B**.
- **검수 대상 모집단 미정의 시 "검수 대기 N"을 임의 생성 금지**(§6). 모집단 정의 전엔 "최근 검수 사례·판정 분포"만.
- 상태 PARTIAL(모집단 정의·대기 집계 계약 확인 필요).

### B. 학생 피드백 (`admin_essay_feedback` 재사용)
- 제출 수·평균 만족도(긍정/부정%)·부정 피드백·미처리(new)·최근 코멘트. `stats{total,positive,negative,bugs,pending,resolved}` = 재사용 **A**, DONE.
- **실제 0건이면 "0건" 명시.** 코멘트 없음을 만족도 높음으로 해석 금지(Owner §9). 피드백 선택 → 해당 첨삭·`/ql` 연결(현재 연결 약함 → PHASE 4 P1).
- 단, Codex 보고: `essay_feedback` 전용 RPC 설치 상태는 확인 필요(이전 문서 기록) → 피드백 집계는 **PARTIAL**로 표기.

---

## 10. 이용권·매출·비용

| 항목 | 정의 | 원천 | 기존 RPC | 재사용 | 상태 |
|---|---|---|---|---|---|
| 무료/유료 이용권 지급 | origin별 지급 사건 | credit ledger | `admin_credit_member_list`·credit report | A/B | DONE |
| 이용권 사용 확정(차감) | consume/settled | ledger | `admin_essay_operations`(credit groups)·credit | A | DONE |
| 무료 재첨삭 | included_revision | runs/ledger | `summary.free_revisions`·operations `free_rewrite_count` | A | DONE |
| 유료 결제 완료·환불 | 결제 금액 | payment | `/admin/payment`(admin-payment-view) | A | DONE |
| AI 처리 비용 | Provider 실기록 | operations costs | `admin_essay_operations`(ACTUAL/ESTIMATED/UNKNOWN) | A | PARTIAL(UNKNOWN 다수) |
| 첨삭당 평균 비용 | ΣACTUAL ÷ 완료(영수증) | operations | `known_subtotal_per_receipted_run_usd` | A | PARTIAL |

> **구분 원칙(Owner §10):** 이용권 지급 ≠ 사용, 유료 이용권 사용 ≠ 당일 결제 매출, **비용 미집계(UNKNOWN) ≠ 0원**(operations가 이미 ACTUAL/ESTIMATED/UNKNOWN 구분 — 그대로 표기). **신규 과금 로직 없음.**

---

## 11. 일반 대시보드와의 관계
- 일반 `/admin` 유지. `AdminLabWarningStrip`은 **요약만**(PHASE 4 안 A 상태 카드), 상세는 "논술 LAB 대시보드로 →" 링크. **동일 정보 반복 최소화**(요약 vs 종합).

---

## 5-wire. PC 저충실도 와이어프레임
```
논술 LAB 대시보드            [기간: 오늘/7일*/30일/전체]  [새로고침]
┌ ① 핵심 KPI (6, 숫자 큼) ─────────────────────────────────┐
│ 이용학생 42 │ 요청 58 │ 완료 47 │ 실패 10 │ 처리중 1(현재) │ 평균 3분 │
├ ② 운영 상태·조치 (①과 분리, 상태 카드+기간뱃지) ─────────┤
│ 실패(7일) 10 ⚠→ │ 처리중 1(현재)→ │ 재시도 1(현재)→ │ 신규피드백 0 │
│ ⓘ 처리중·재시도는 중복 가능 · 대기만으로 장애 판정 안 함   │
├ ③ 최근 첨삭 활동 (상위 10) ──────────────────────────────┤
│ 요청시각 회원 대학 시험 유형 상태● 완료 [상세→/admin/essay-runs]│
├ ④ 대학·시험별 이용 (순위/막대) ──[D 신규 집계]───────────┤
│ 성균관대 ▇▇▇ 요청 n·학생 m·완료 k   (선택→essay-runs?university)│
├ ⑤ 품질 | 피드백 (2분할) ─────────────────────────────────┤
│ 판정 분포·최근 검수→/ql │ 만족도 %·미처리 0·최근 코멘트→feedback│
├ ⑥ 이용권·매출·비용 ──────────────────────────────────────┤
│ 무료지급·유료지급·사용확정·무료재첨삭 │ 결제매출·AI비용(UNKNOWN 구분)│
└──────────────────────────────────────────────────────────┘
```

## 6-wire. 모바일·태블릿
- KPI 6 → **2열 그리드**, 운영 상태 카드 세로 스택, 최근 활동 표 → **카드 리스트**, 대학별 막대 세로, ⑤⑥ 세로 1열. PC 우선·모바일 반응(기존 `focus-*`/`admin-*` 반응형 토큰).

---

## 13. 기존 데이터·RPC 재사용표

| 대시보드 영역 | RPC/계약 | 재사용 등급 |
|---|---|---|
| KPI 요청/완료/실패 | `admin-lab-filtered-v1.summary` | A |
| KPI 처리중/평균시간/비용 | `admin_essay_operations`(live·avg·costs) | A |
| 오늘 vs 7일 | 위 RPC 윈도우 2회 | B |
| 최근 활동 10건 | `admin-lab-filtered-v1.items` | A |
| 운영 상태 4종 | `admin_essay_operations`+`admin_essay_feedback` | A(=현재 strip) |
| 품질 | `/ql` hq-read | A/B |
| 피드백 | `admin_essay_feedback.stats` | A |
| 이용권·매출 | credit ledger·`/admin/payment` | A/B |
| AI 비용 | `admin_essay_operations` costs | A |
| **고유 이용 학생 수** | — | **D** |
| **대학·시험별 교차 집계** | — | **D** |
| **통합 운영 경고 집계**(장기미완료·차감이상·결과누락) | `labAlerts`(상세만) | **D** |

### 14. 신규 집계 필요 여부 (D 항목만 — 최소화)
- **D-1 `admin_lab_dashboard_summary`(신규, 권장 1종)**: 선택 기간 윈도우로 **고유 이용 학생 수 + 대학별(요청/완료/실패/고유학생/무료재첨삭/평균시간)** 집계 반환. 근거: 현재 계약은 전역 합계·필터 목록만 제공해 교차 집계 불가, items(25 page)로는 전수 집계 불가. operator 게이트·`search_path=''`·`statement_timeout`·anon/service 거부·읽기 전용.
- **D-2(P2) 통합 운영 경고 집계**: `labAlerts` 규칙(30분+·차감-결과 불일치)을 **서버 집계**로. 임계값은 F(p50/p90) 분포·Owner 정책 확정 후. 그 전엔 "확인 불가"(현 strip 카피 유지).
- 그 외 전부 **기존 계약 재사용** — 신규 RPC는 D-1(P0~P1), D-2(P2)뿐. 기존 운영 데이터·Credit Ledger **불변**.

---

## 15. 성능·캐시·오류 처리
- **초기 로딩 최소:** KPI·운영상태·최근10건·대학집계(D-1)만. **첨삭 상세 전량 로딩 금지**(상세는 진입 시 `admin_lab_run_detail` 개별).
- **병렬 조회:** 영역별 독립 `useReadReport`(기존 패턴) → 병렬. **부분 표시**: 한 영역 실패해도 다른 영역 정상(기존 `r.error` per-section).
- **중복 호출 방지:** KPI와 운영상태가 같은 `admin_essay_operations`를 쓰면 **윈도우별 1회 공유**(동일 range 캐시). 오늘/7일 전환 시에만 재조회.
- **새로고침:** 영역별/전역 버튼(기존 strip·focus 패턴). **무거운 통계 SQL 신설 금지** — D-1은 인덱스 가능한 단일 집계(기간·대학 group by), Supabase 안정성 고려.
- **캐시:** 클라이언트 메모(기간 키) + 서버는 `statement_timeout`. 실시간성 낮은 ④⑥는 더 긴 간격 허용.

---

## 16/12. P0·P1·P2 로드맵

- **P0 (MVP, 기존 데이터 우선):** 신규 메뉴·라우트 / ① 핵심 KPI(요청·완료·실패·처리중·평균 = A) / ② 운영 상태(기존 strip 4종 = A) / ③ 최근 활동 10건(A) / 기존 상세 이동 / ④ **기본 대학별(D-1 1종 신설)**. 이용 학생 수(distinct)는 D-1에 포함.
- **P1 (운영 품질):** ⑤ 품질(/ql)·피드백 / ⑥ 이용권·비용·매출 요약 / 운영상태 상세 연결 강화(피드백→/ql).
- **P2 (분석 고도화):** 대학·시험별 추이, 모델 버전별 품질, 무작위·위험기반 검수, 재작성·재첨삭 학습효과, D-2 통합 경고, 수익성 고도화.

## 17. Codex 구현 명세 초안
- **신규:** `src/app/admin/lab-dashboard/page.tsx` + `admin-lab-dashboard-view.tsx`(영역별 기존 `useReadReport` 조합), `navigation.ts`에 메뉴 1개. **신규 RPC는 D-1 하나**(`admin_lab_dashboard_summary`, operator·읽기전용·기존 패턴). 일반 대시보드 strip은 요약 유지 + 신규 대시보드 링크.
- **재사용:** `admin-lab-filtered-v1`·`admin_essay_operations`·`admin_essay_feedback`·credit·payment·`/ql`·`KpiTile`(tone)·`AdminPeriodFilter`·`admin-*`/`focus-*` CSS.
- **불변:** 모든 기존 RPC 계약·권한(operator/quality_operators)·Credit Ledger·결제·기록. 예시 수치 금지(0은 0). 처리중+재시도 합산 금지. UNKNOWN≠0원.
- **디자인:** 네이비·청회색·Teal·오렌지, 숫자>라벨 위계, 운영상태 vs 통계 블록 분리, 박스 중첩·장문 축소, PC 우선 반응형, 화려한 차트 지양.

## 18. Owner 결정 필요 사항
1. **신규 집계 D-1(`admin_lab_dashboard_summary`) 신설 승인** — 고유 학생 수·대학별 집계(현 계약으로 불가).
2. KPI "완료" 기준 = **접수 코호트** 고정 여부(처리시간과 분모 다름 명시).
3. 장시간 미완료 **임계값**(30분?) — 처리시간 분포 확인 후 확정 / D-2 통합 경고 신설 시점(P2).
4. 품질 "검수 대기" **모집단 정의**(없으면 대기 집계 미표시).
5. `essay_feedback` 운영 RPC 설치 상태 확인(피드백 집계 전제).
6. 메뉴 라우트명(`/admin/lab-dashboard`) 확정.

---

## 제약 재확인
설계 문서뿐. **WEB·Flutter·운영 DB·RPC·배포·결제/Credit 정책 변경 없음.** Codex 소유 파일 읽기만. 실제 코드로 확인한 계약(A/B·DONE)과 설계 제안(D·PARTIAL)을 구분했고, 운영 데이터 없는 지표는 예시 수치로 채우지 않았다. 신규 집계는 **D-1(P0~P1) 1종 + D-2(P2)**로 최소화. PHASE 4 작업과 충돌 없음(신규 파일·기존 strip 요약 유지). Owner 검토 후 Codex 구현.
