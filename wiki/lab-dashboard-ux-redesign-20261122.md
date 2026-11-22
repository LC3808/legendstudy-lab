# 논술 LAB 대시보드 UI/UX 개편 + 재시도 분석 설계 (2026-11-22)

> 담당: **Claude = UI/UX 설계·검토** (이 문서) · Codex = 데이터 분석·구현·검증·배포 · Owner = 정책·운영 변경 승인
> 대상: `/admin/lab-dashboard` · `/admin` · `/admin/essay-runs` · 조사 기준: `origin/codex/lab-admin-operations-20261114` **실제 코드 열람**.
> 선행: [essay-lab-dashboard-design-20261115.md](essay-lab-dashboard-design-20261115.md)(설계) · [admin-console-final-ux-audit-20261115.md](admin-console-final-ux-audit-20261115.md)(PHASE 4).
> **이번 단계 WEB·Flutter·DB·RPC·운영 배포·이용권 원장·결제 변경 없음.** Codex 소유 파일은 **읽기만** 했다.
> **역할 경계:** 재시도 12회 **실제 포렌식(로그 조사)은 Codex의 데이터 분석 역할**이다. Claude는 **재시도 분석 UI 설계 + Codex 조사 쿼리 명세**를 제공하며, **운영 데이터 포렌식을 직접 실행하지 않았다**(§7). 운영 장애가 확인되면 **원인·최소 수정안을 먼저 보고하고 요청 재진행·원장 변경은 Owner 승인 후**.

상태: DONE / PARTIAL / NOT TESTED · 근거: (CODE)=코드 / (화면)=Owner 2026-11-22 화면

---

## 0. 현재 구현 상태 (CODE) — 이미 많이 구현됨

`/admin/lab-dashboard` = `admin-lab-dashboard.tsx`가 3개 RPC 조합:
- **`admin_lab_dashboard_summary`**(`admin-lab-dashboard-v1`): `students`(고유 학생)·`avg_seconds`·`duration_samples`·`universities[]`(요청/학생/완료/실패/무료재첨삭/베타).
- **`admin_lab_runs_filtered`**(`admin-lab-filtered-v1`): KPI 요청/완료/실패 + 최근 10건.
- **`admin_essay_operations`** + **`admin_lab_operation_stats`**(`admin-lab-operation-stats-v1`): `LabStatusCards`(기간별 요청/완료/실패/**재시도 발생** + 현재 처리중/재시도대기/피드백/보관).

현재 구성: KPI 5(학생·요청·완료·실패·평균시간) → LabStatusCards(기간별+현재상태) → 최근 10건 → 대학별 → 피드백 → (지연 로딩)이용권·매출·비용.

> **이미 반영된 PHASE 4 권장(유지):** 상태 카드·tone·보관 제외·"처리중·재시도 중복 비합산"·"실행 잠금 확인 전 중단 판정 안 함"·재시도 발생 기간 집계 — 전부 DONE(CODE). PHASE 3/4 설계가 운영에 녹았다.

---

## 1. 기존 대시보드 문제점 (화면 + CODE)

| # | 문제 | 실제 근거 |
|---|---|---|
| 1 | **KPI 중복** | 요청/완료/실패가 **상단 KPI 행(`admin_lab_runs_filtered`)**과 **LabStatusCards 기간별(`admin_lab_operation_stats`)** 양쪽에 **다른 RPC로 중복 표시** (CODE) |
| 2 | **재시도 12회 원인 불명** | `재시도 발생 N건` 단일 숫자 → `/admin/operations` 링크뿐. 원인 분류·고유 요청 수·자동 복구 없음 (CODE) |
| 3 | 처리중 정상/중단 불명확 | 카피로 "중단 판정 안 함"은 있으나 **Worker 상태(마지막 실행·잠금 만료)를 표시 안 함** (CODE) |
| 4 | 최근 활동 가독성 | 표에 **처리 시간·재시도 열 없음**, 회원이 **email/user_id 원문** 노출 (CODE) |
| 5 | 요청별 처리시간·재시도 이력 미표시 | 활동 표가 상태만, duration/retry 없음 (CODE) |
| 6 | 조치 필요 요청 찾기 어려움 | **"확인 필요 요청" 전용 영역 부재** (CODE) |
| 7 | 카드 설명 과다 | `note`에 periodNote+기준+갱신+부가설명 3~4줄 (CODE) |
| 8 | 완료율·시각 우선순위 | **완료율 KPI 없음**, 평균 "535.2초" raw (CODE·화면) |

---

## 2. 전체 정보구조 (7영역, 중복 제거)

```
① 핵심 이용 KPI     이용학생·요청·완료·완료율·평균시간      (admin-lab-dashboard-v1 + runs)
② 현재 운영 상태     처리중·장시간처리·재시도대기·실패·조치필요 (현재·기간무관, 보관 제외)
③ 재시도·처리 성능   총재시도·재시도경험요청·자동복구·P50/P95·장시간  (NEW 분석)
④ 조치가 필요한 요청  장시간/잠금만료/재시도반복/실패/Worker불명확 목록  (NEW)
⑤ 최근 첨삭 활동     처리시간·재시도 열 추가·회원 식별자화
⑥ 대학별 이용 현황   기존 유지 + (가능 시)평균시간·재시도
⑦ 이용권·매출·비용·품질  하단 보존, 상단과 시각 분리
```
**중복 제거 원칙:** 요청/완료/실패는 **①에만** 1차 노출. ②는 "현재 상태"(처리중/재시도대기/실패/조치필요), ③은 재시도·성능 분해. 동일 수치 반복 금지, **단 핵심 경고(실패>0·조치필요>0)는 ②에 요약 중복 허용**.

---

## 3. 상단 핵심 이용 KPI (5개)

| KPI | 정의 | 포맷 | 원천 | 재사용 |
|---|---|---|---|---|
| 이용 학생 수 | 선택 기간 요청 생성 고유 회원 | n명 | `admin-lab-dashboard-v1.students` | A DONE |
| 첨삭 요청 | 선택 기간 생성 회차 | n회 | `.summary.requested`(runs) | A DONE |
| 첨삭 완료 | 선택 기간 접수분 현재 완료 | n회 | `.summary.completed` | A DONE |
| **완료율(NEW)** | 완료 ÷ 요청(선택 기간 접수) · **처리중은 실패 아님** | n% | 완료/요청(B, 클라이언트) | **B** |
| 평균 처리 시간 | 완료 회차 요청→완료 | **8분 55초**(보조 535초) | `admin-lab-dashboard-v1.avg_seconds`·`duration_samples` | A(포맷 B) |

- 완료율 **도움말**: "선택 기간 접수 요청 중 현재 완료 비율. 처리 중은 미완료로 집계, 실패 아님." (툴팁)
- 평균 시간 **포맷 변경**(초→분·초), 보조로 원본 초. **집계 모집단·재시도/대기 포함 여부 표시** — `avg_seconds`가 요청→완료 전체(재시도·대기 포함)인지 **Codex 계약 확인 후 명시**(현재 note "요청→완료"만).
- 기존 **기간(today/d7/d30/custom≤93일)·이용권 출처 필터 재사용**. 출처=베타 발급 연결 여부(TEST/LIVE 결제와 무관 — 현 note 유지·강조).

---

## 4. 현재 운영 상태 (②, 기간 무관·보관 제외)

기존 `LabStatusCards` "현재 운영 상태" 4카드(처리중/재시도대기/피드백/보관) **유지** + **장시간 처리·조치 필요 추가**:
| 카드 | 판정 | 비고 |
|---|---|---|
| 현재 처리 중 | reserved/processing | 남색(정상 가능) |
| **장시간 처리(NEW)** | **Worker 마지막 실행·실행 잠금 만료 기준**(단순 경과 아님) | 주황 "확인 필요" — Worker 미확인 시 **"상태 확인 필요"**(§Owner §5) |
| 현재 재시도 대기 | retry_pending | 주황 · 처리중과 **중복 가능·비합산**(현 note 유지) |
| **현재 실패·조치 필요(NEW)** | 최종 실패 + 결과 누락/차감 이상 | 빨강 |
- 각 카드 클릭 → 해당 조건 `/admin/essay-runs` deep link(기존 `labDashboardHref` 재사용, visibility·state).
- **장시간/조치 필요는 Worker 상태 필드 필요** → `admin-lab-operation-stats` 또는 전용 RPC에 `last_run_at·lock_expires_at·stalled` 추가 = **C/D**(Codex·Owner). 없으면 "상태 확인 필요"로만.

---

## 5. 재시도·처리 성능 분석 (③, NEW)

| 지표 | 정의 | 단위 | 원천 | 재사용 |
|---|---|---|---|---|
| A 총 재시도 | 재시도 이벤트 수 | 회 | `admin-lab-operation-stats-v1.retries` | A DONE |
| B 재시도 경험 요청 | 재시도 ≥1 고유 요청 | 건 | 재시도 보유 distinct run | **C/D**(현 계약 미제공) |
| C 자동 복구 성공 | 재시도 후 완료 고유 요청 | 건 | 재시도∩완료 | **C/D** |
| D 평균 처리 시간 | = §3 | 초/분 | dashboard-v1 | A |
| E 중앙값(P50) | 완료 분포 중앙 | 초 | operations p50_seconds | A(이미 있음) |
| F 장시간 처리 요청 | 임계 초과 완료/진행 | 건 | Worker/duration | **C/D** |
| (옵션) P95·최장·Provider 오류유형별 | | 회 | operations p95_seconds·diagnostics code | A/D |
> **12회를 "총 재시도"로만 보지 않고 A(횟수)·B(고유 요청)·C(복구)로 분해.** 데이터 없으면 **"집계 불가/수집 준비 중"**, **임의 0 금지**. 원인별 분류(§7)는 집계 전까지 UI에 "원인 조사 중" 링크(/admin/operations 장애·재처리 탭).

---

## 6. 재시도 12회 원인 조사 — **Codex 데이터 분석 명세** (Claude 미실행)

> **이 포렌식은 Codex의 데이터 분석 역할.** 아래는 Claude가 제공하는 **조사 쿼리 명세**다. 실제 운영 로그 조사·판정은 Codex가 수행하고, 운영 장애 확인 시 원인·최소 수정안을 Owner에게 먼저 보고한다. Claude는 운영 데이터를 변경·재진행하지 않았다.

- **고유 요청 분해:** 재시도 12회가 몇 개 고유 `evaluation`/`run`에서 났는지 — `admin_essay_operations`(issues=true) rows의 `retry_count` 합 vs distinct run 수.
- **원인 분류(실제 로그 근거):** 각 run의 `diagnostics[].stage/code` + `calls[].call_state/provider/model` + `failure_codes` → ① Provider Timeout ② Rate Limit ③ Provider 5xx ④ Worker 실행 오류 ⑤ DB 저장 오류 ⑥ 응답 형식 오류 ⑦ 기타 ⑧ 원인 미확인.
- **AI 중복 호출 vs DB 저장 실패 재호출 구분:** `calls` 수·`call_state`로 **AI 응답 생성 후 DB 저장 실패로 재호출**된 경우 식별(추가 Provider 비용 발생 여부 = `calls[].cost_usd`/`cost_status` 합).
- **현재 처리 중 1건:** 해당 run `created_at`·마지막 `call_state`·`diagnostics`·실행 잠금 — 정상 진행 vs 중단 판정(단순 경과 아님).
- **산출:** 원인별 건수 표 + 고유 요청 수 + 자동 복구 수 + 추가 비용 + 조치 필요 run 목록. → §5 UI 지표에 반영.

---

## 7. 조치가 필요한 요청 (④, NEW 목록)

표시 대상: 장시간 처리 · 실행 잠금 만료 · 재시도 반복 · 현재 실패 · Worker 상태 불명확. **실제 운영 데이터만**.
```
요청시각 | 회원 | 대학·시험 | 현재 상태(배지) | 경과 시간 | 재시도 | [상세]
```
- **'확인 필요' ≠ '장애 확정'**(배지·카피 구분). `[상세]`=기존 `/admin/essay-runs` 상세. **대시보드에서 재진행·보관·삭제 직접 실행 없음**(기존 관리 화면에서 조치). 재진행·보관 기능 **신규 구현 안 함**(기존 재사용).
- 데이터: "needs-attention" 필터 = Worker 상태 + 재시도반복 + 실패 → **C/D**(전용 RPC 또는 operations issues 재사용). 없으면 operations 장애·재처리 탭으로 링크.

---

## 8. 최근 첨삭 활동 테이블 개선 (⑤)

현재: 요청시각·회원(email/uid)·대학·시험·첨삭유형·상태·상세.
개선: **요청시각 · 회원(식별자) · 대학·시험 · 처리시간 · 재시도 · 상태(배지) · 관리**.
- 회원: **닉네임/간결 식별자 우선**, email 전체는 상세에서(현재 email/uid 원문 → `display_name` 우선, `title`=uid).
- 대학·시험: 대학 1행 + 시험 보조 작은 텍스트(현재도 2행 — 유지).
- 처리 시간: 완료=실제 소요(completed−created, **B 클라이언트**), 진행중=현재까지 경과, 미확인="확인 필요".
- **재시도 열(NEW):** run별 retry_count — `admin-lab-filtered-v1.items`에 **미포함** → **C**(items에 retry_count 추가) 또는 상세에서만.
- 첨삭 유형(무료재첨삭/베타)은 **보조/상세로** 이동(열 축소).
- 상태 배지 색: 완료 Teal · 처리중 남색 · 재시도중 주황 · 확인필요 주황 · 실패 빨강 · 보관 회색. **과도한 빨강 지양**. 표시용 상태 ≠ 실제 DB 상태(변경 없음).

---

## 9. 대학별 이용 현황 (⑥)
기존 `universities[]`(대학/요청/고유학생/완료/실패/무료재첨삭/베타) **유지**. 추가 후보: 평균 처리시간·재시도(정확 집계 가능 시만, **C**). 대학명 클릭 → `/admin/essay-runs?university` (기존 재사용). **요청 수 적어 성능 과대 해석 주의** 카피 유지. 합계≠전체 고유 학생(현 note 유지).

## 10. 이용권·매출·비용·품질 (⑦)
하단 `LabDashboardFinance`(지연 로딩) **보존**, 상단 운영 지표와 **시각 분리**(섹션 구분선·배경). **UNKNOWN 비용 ≠ 0원**(operations 구분 유지). 결제·Finance 자동 갱신·Toss LIVE 변경 없음.

---

## 11. 디자인 시스템 (Owner 제공 토큰)
`--navy #1F3A5F · --teal #0F766E · --warn #D97706 · --danger #DC2626 · --text #243247 · --muted #64748B · --bg #F8FAFC · --card #FFFFFF · --border #E2E8F0`.
- 상태 배지: 정상/처리중=navy, 재시도/확인필요=warn, 실패=danger, 완료=teal, 보관=muted. **정상 KPI엔 강조색 남발 금지**(기본 text/card). 핵심 숫자 크게, **긴 note→툴팁/도움말**(현 3~4줄 note 축소), 카드 높이 통일·표/카드 정렬 일관.
- 기존 `KpiTile`(tone ok/warn/danger/info)·`AdminPeriodFilter`·`admin-table`·`focus-*`·`lab-status-grid` 토큰 재사용 → Codex 구현 지연 방지.

## 12. 반응형
- PC(1440): KPI 5 한 줄, ②③ 구분, 활동 표 가독 우선. 태블릿(768): KPI 2~3열. 모바일(430/390/375/320): **KPI 2열**, 표→카드형(`data-label` 이미 있음 — 재사용). 가로 넘침 방지, 사이드바 충돌 없음. 검증 폭 320/375/390/430/768/1440.

---

## 13. 데이터 계약 재사용 / 신규 필요
| 지표 | RPC | 재사용 |
|---|---|---|
| KPI 5(완료율 제외)·대학별·평균 | `admin_lab_dashboard_summary`·`admin_lab_runs_filtered` | A |
| 완료율·처리시간 포맷·활동 처리시간 | 기존 조합 | **B** |
| 기간별 요청/완료/실패/재시도·현재상태 | `admin_lab_operation_stats`·`admin_essay_operations` | A |
| 재시도 경험 요청·자동 복구·원인 분류 | — | **C/D**(operation-stats 확장 또는 신규 집계) |
| 장시간/잠금만료/조치필요·Worker 상태 | — | **C/D** |
| 활동 재시도 열 | admin-lab-filtered items | **C**(retry_count 추가) |
> 신규 DB/RPC 필요 시 **AGENTS.md 승인 절차·Owner 승인 후**. 기존 결제·이용권 원장·학생 결과 불변. 페이지네이션 결과 전체 집계 금지.

## 14. P0/P1 로드맵 (Claude 설계 기준)
- **P0(운영 장애·DB 변경 없이):** ⑥ 재시도 12회 **Codex 포렌식** + 현재 처리중 1건 상태 판정 → 원인·최소 수정안 Owner 보고. KPI 중복 제거·완료율·평균 포맷(B)·활동 처리시간·배지·설명 축소(기존 데이터).
- **P1(승인 후):** 재시도 분해(B/C 고유요청·복구)·조치필요 목록·장시간/Worker 상태(C/D)·활동 재시도 열(C).

## 15. Codex 구현 명세
- **대상(Codex 소유):** `admin-lab-dashboard.tsx`(KPI 중복 제거·완료율·평균 포맷·활동 표 열·배지), `admin-lab-warning-strip.tsx`(장시간/조치필요 카드·note 축소), `lab-dashboard.ts`/`operation-stats`(재시도 분해·Worker 상태 = C/D), 활동 items retry_count(C). **Claude 설계만, 코드 미수정.**
- **불변:** 기존 RPC 계약·권한(operator/quality_operators)·보관/Worker 제외 정책·이용권 원장·결제·Toss LIVE·학생 화면. 표시용 상태 ≠ DB 상태. 임의 0·추정 금지. 포맷은 기존 토큰.

## 16. Owner 승인 필요 사항
1. **재시도 12회·처리중 1건 포렌식 결과에 따른 요청 재진행·원장 수정**(있다면) — Owner 승인 후 Codex.
2. 재시도 분해·조치필요·Worker 상태용 **신규/확장 RPC·DB Migration**(C/D) 승인(AGENTS.md 절차).
3. 장시간 처리 **임계값**(Worker 실행·잠금 기준) 확정.
4. 평균 처리 시간 **재시도/대기 포함 여부** 계약 명시.
5. 완료율 **정의 문구**(처리중=미완료, 실패 아님).

---

## 제약 재확인
UI/UX 설계·검토 문서뿐. **WEB·Flutter·DB·RPC·운영 배포·이용권 원장·결제 변경 없음.** Codex 소유 파일 읽기만. 재시도 **포렌식은 Codex 데이터 역할**이라 Claude는 설계·쿼리 명세만 제공하고 **운영 데이터 조사·재진행·변경을 실행하지 않았다**. 추측 상태를 적지 않고(DONE/PARTIAL·C/D 구분), 데이터 없는 지표는 "집계 불가/수집 준비 중"으로 표기(임의 0 금지). Owner 검토·승인 후 Codex 구현.
