# LegendStudy+ 관리자 학습·입시 종합 현황 개편 설계 (WEB) — 2026-11-14

> 담당: Claude (UX·IA) · 단계: **조사·구조설계·개선안**(구현·배포 제외)
> 기준 커밋: **WEB `041e6cd`**(codex/essay-public-natural-20261112) · Owner 기준일 2026-11-13
> 본 문서는 **실제 WEB 코드(`legendstudy-lab` @ `041e6cd`)를 직접 열람**해 작성했다.
> 선행: [personalization-my-ux-ia-20261113.md](personalization-my-ux-ia-20261113.md). 학생 MY 개편은 [별도 문서](student-my-redesign-20261114.md).
> **이번 단계 코드·DB·운영 배포 변경 없음.**

표기: ✅배포·운영 / 🟡부분 / ⛔배포대기(설계·검증 완료, 운영 승인 대기) / ⚪미구현

---

## 1. 현재 관리자 화면 구조 (코드 근거)

관리자 입시·학습 분석은 **두 진입점**에 걸쳐 있다.

### 1-1. `/admin` 메인 — `admin-dashboard-view.tsx`
- **입시 준비 분석** `admin_admissions_analytics`(✅): `aspiration{students, records, major_students, universities[{label,students,priority1}], majors}` + `application{eligible, students, records, coverage_pct, avg_per_student, universities, admission_types}`.
- **합격 결과** `admin_admission_outcomes`(✅): `totals{final_accepted, accepted_students, decided_apps, result_students, stage_pass_only, rejected, registered, not_registered, accept_rate_apps, accept_exp_rate_students}` + universities·admission_types.
- **개별 지원 로스터** `admin_applications_list`(✅, operator 전용): "누가·어디에·전형·상태". RPC 미적용 시 "(준비 중)" 플레이스홀더 렌더.

### 1-2. `/admin/data/*` — `admin-data-page.tsx` (`AdminDataPage({section})`)
| section | 화면 | 상태 |
|---|---|---|
| `learning`(기본)/`insights` | **학습·입시 랭킹**: targets/saved/recent/applications 각 패널 → `AdminLearningRankings` | ✅ **서버 페이지네이션+검색** |
| `study` | 공부시간 분석: `admin_dashboard_study`(총계+학년별), 1인당 평균 | ✅ |
| (school, StudySchool) | 학교별 공부시간 TOP(총시간/1인평균/참여수)·학교 미등록 그룹 | ⛔ **`admin_study_by_school` 배포대기** |
| `scores` | 성적·학습 분석 | ⚪ NOT_IMPLEMENTED(academic_performance null 계약) |
| `verification` | 베타 검증 | ⚪ NOT_TESTED |
| `samples` | 첨삭 품질 검수 | 기존 `/ql/` 권한 |
| overview/installs/students/satisfaction/conversion/visitors/essay-usage | `MergedEntry` 리다이렉트 / `AdminAnalytics` / `AdminLearningHub` | ✅ 통합 |

### 1-3. 핵심 — **페이지네이션은 이미 운영 배포** (재개발·오기록 금지)
`admin_learning_rankings_page` RPC(migration `20261113144252`, ✅ 배포):
- operator 게이트(`admin_operator()` + `account_private.allowed`), `search_path=''`, `statement_timeout='8s'`.
- 파라미터: `p_from/p_to`(≤400일 검증), `p_kind∈{targets,saved,recent,applications}`, **`p_page`·`p_page_size`(≤100)·`p_search`(≤200자)**.
- 응답 `admin-learning-rankings-v1`: `total_count·total_pages·rows[{id,label,records,users,rank}]·sort=users_desc_id_asc`.
- 명칭 해석: targets/applications→`universities.name`, saved/recent→`content_items.title`(없으면 '명칭 확인 필요').
- 집계 모집단 `eligible = profiles where account_private.allowed(id)`.

> **따라서 "TOP 10 제한이 남아 있다"는 기술은 틀림.** 랭킹은 **전 구간 서버 페이지네이션·검색·전체 건수** 지원. (단, **학교별 공부 랭킹**은 별개 RPC `admin_study_by_school`로 ⛔배포대기.)

---

## 2. UX 문제점

1. **입시 분석이 두 진입점으로 분산.** `admin_admissions_analytics`/`outcomes`/`roster`는 `/admin`, 랭킹은 `/admin/data/learning`에 있어 **"입시 준비 → 지원 → 제출 → 합격"의 흐름을 한 화면에서 못 본다.**
2. **지표 정의가 화면마다 각주로 흩어짐.** 각 패널 하단 주석(집계 기준·모집단)이 좋지만, **지표 정의 일람(원천·중복제거·기간)**이 한 곳에 없어 운영자가 지표 간 모집단 차이를 혼동할 수 있다.
3. **서로 다른 모집단을 전환율로 오인할 위험.** `aspiration.students`(희망 등록자)와 `application.eligible`(고3·N수 자격자)은 **모집단이 다르다.** 단순 나눗셈 전환율은 왜곡.
4. **운영자/테스트 계정 혼입.** 현재 집계 모집단은 `account_private.allowed`(접근 허용)일 뿐 **운영자 제외가 아니다.** 선행 조사에서 **실제 지원 2건이 전부 운영자 테스트**였음 → 소표본에서 수치 왜곡.
5. **배포대기·미구현 혼재.** 학교 랭킹(⛔)·성적(⚪)·검증(⚪)이 같은 메뉴에 섞여, 무엇이 "데이터 없음"이고 무엇이 "곧 나옴"인지 운영자가 구분하기 어렵다.

---

## 3. 개선 IA (권장안)

**핵심 질문** "학생들이 무엇을 쓰고 / 학습·입시가 어떻게 진행되며 / 어디서 멈추나" → **3개 상위 축**(기존 RPC 재배치 중심):

```
관리자 · 학습·입시 종합 현황
├─ [상단] 핵심 KPI 스트립  (희망등록·실제지원·제출·합격 / 학습학생·총공부 / 저장·열람)
│         + 공통 필터: 기간 · 학년(고3/N수) · [운영자 제외 ☑]
├─ A. 입시 준비 현황
│    · 희망 등록(aspiration) · 실제 지원(application) · 대학별/전형별 · 합격 결과(outcomes)
│    · 개별 지원 로스터(operator)
│    · 퍼널은 "모집단 명시 단계 지표"로 표기 (전환율 자동계산 금지, §4 주)
├─ B. 학습 활동 현황
│    · 공부 기록 학생·총 공부시간·학년별 · 학교별 참여(⛔ 배포 후)
│    · 자료 저장/열람 랭킹 (서버 페이지네이션·검색 유지)
└─ C. 서비스 이용 현황
     · 활성 사용자·주요 기능 이용·논술 LAB·유료 전환 (기존 AdminAnalytics/Hub 연결)
```

- **재배치 중심**: A는 `/admin` dashboard-view의 admissions/outcomes/roster를, B는 `/admin/data` learning/study/school을 한 축으로 묶는다. **신규 집계 최소.**
- 상세 순위·로스터는 **상단 KPI와 분리**(2-6 UX: 핵심 상단, 상세 하단).
- ⛔배포대기·⚪미구현은 **"데이터 없음" 아닌 명시 배지**로 구분 유지.

---

## 4. KPI 정의표 (운영자 오해 방지)

| 지표명 | 정의 | 집계 대상(모집단) | 기간 | 중복 제거 | 원천 | 기존 RPC | 상태 |
|---|---|---|---|---|---|---|---|
| 희망 대학 등록 학생 | 기간 내 등록·현존 희망 대학 보유 학생 | allowed 학생 | created_at∈[from,to) | 학생 distinct | `student_target_universities` | `admin_admissions_analytics.aspiration` | ✅ |
| 실제 지원 학생/건수 | 기간 내 생성·현존 자기보고 지원 | **고3·N수 eligible** | created_at∈[from,to) | 학생/건 distinct | `student_applications` | `admin_admissions_analytics.application` | ✅ |
| 지원 커버리지 | eligible 중 지원 등록 비율 | application.eligible | 동 | — | 동 | `.application.coverage_pct` | ✅ |
| 합격 결과 | 최종합격·합격학생·판정건·단계합격·불합격·등록/미등록 | 결과 보고 학생 | 결과 이벤트 | 비초월 이벤트 | `student_application_events` | `admin_admission_outcomes.totals` | ✅ |
| 저장 자료 | 기간 내 저장·현존 북마크 | allowed 학생 | created_at | 학생·자료쌍/건 | `bookmarks`⋈`content_items` | `admin_learning_rankings_page(saved)` | ✅ |
| 최근 열람 | 최근 열람시각 기간 내 학생·자료쌍 | allowed 학생 | viewed_at | 학생·자료쌍 | `recent_views`⋈`content_items` | `...rankings_page(recent)` | ✅ |
| 학습 기록 학생 | 동기화·합산 대상 구간 보유 학생 | allowed 학생 | 구간 경계 자름 | 학생 distinct·겹침 합산 | `study_sessions` | `admin_learning_analytics.study_users` | ✅ |
| 총 공부시간 | 합산 대상 구간 합(겹침 제거) | 동 | 동 | 겹침 병합 | 동 | `admin_dashboard_study` | ✅ |
| 학년별 공부시간 | 학년(현재 프로필)별 합·1인평균 | allowed 학생 | 동 | 겹침 병합 | 동 | `admin_dashboard_study.grades` | ✅ |
| 학교별 공부 TOP | 학교 소속 합·1인평균·참여수 | 학교 등록 학생 | 동 | 겹침 병합 | `study_sessions`+학교 | `admin_study_by_school` | ⛔배포대기 |
| 성적대별 공부 | 내신/모의 등급대 평균 공부 | — | — | — | 성적 데이터 | — | ⚪미연동 |

> **전환율 주의(2-3):** 희망 등록 학생(전체 allowed)과 실제 지원 eligible(고3·N수)은 **모집단이 다르므로** 둘을 나눈 전환율을 자동 계산·노출하지 않는다. 퍼널은 **각 단계 지표를 모집단 라벨과 함께** 병렬 표기하고, 전환율은 **동일 모집단 내**(예: eligible→지원→제출→합격)에서만 계산한다.

---

## 5. 화면 와이어프레임 (저충실도)

```
[기간▼][학년: 전체/고3/N수 ▼][운영자 제외 ☑]      조회시각·출처
┌ 핵심 KPI ─────────────────────────────────────┐
│ 희망등록 120 · 지원 48(커버리지40%) · 제출 40 · 합격 12 │  ← 모집단 라벨
│ 학습학생 300 · 총공부 1,240h · 저장 860 · 열람쌍 2,100 │
└───────────────────────────────────────────────┘
A. 입시 준비
  대학별 지원 TOP [검색___][◀ 2/12 ▶]  전체 285건
  전형별 분포 · 합격 결과(최종합격12·단계합격5·미등록3)
  [개별 지원 로스터 — operator]
B. 학습 활동
  학년별 공부시간 표 · 자료 저장/열람 랭킹(서버 페이지네이션)
  학교별 공부 TOP … (⛔ "운영 배포 후 자동 표시")
C. 서비스 이용 → 기존 분석 화면 링크
(소표본 구간 '집계 전/비공개')
```

---

## 6. (= 와이어프레임, 상단 5 참조)

## 7. 기존 RPC 재사용 계획

| 축 | 재사용 RPC(변경 없음) |
|---|---|
| A 입시 | `admin_admissions_analytics`, `admin_admission_outcomes`, `admin_applications_list` |
| B 학습 | `admin_learning_analytics`, `admin_learning_rankings_page`(페이지네이션·검색), `admin_dashboard_study`, (`admin_study_by_school` 배포 후) |
| C 이용 | 기존 `AdminAnalytics`/`AdminLearningHub` |

**재배치·연결만.** 신규 집계는 §8 한정.

## 8. 추가 데이터 필요 여부
- **운영자 제외 필터**(신규, 선택): 기존 RPC에 `p_exclude_operators boolean default false` **오버로드/신규 함수**로 추가 → 내부 `eligible`에서 `profiles.is_operator`/`is_admin` 제외. **기존 함수·테이블 불변.** (가장 우선순위 높은 신규.)
- 학교별 공부(`admin_study_by_school`): ⛔ **배포대기** — 신규 아님, 운영 승인 사안.
- 성적대별·검증: ⚪ 별도 권한·연동 필요(후속).
- 그 외 상단 KPI·퍼널은 **기존 RPC 응답 조합으로 신규 불필요.**

## 9. 테스트 계정 처리 방안
- `profiles.is_operator`/`is_admin`로 **식별만**. **기존 사용자 데이터 삭제·변경 제안하지 않음.**
- "운영자 제외 ☑" 토글(기본 OFF) → §8 필터. 켜면 집계에서 운영자 모집단 제외, 라벨에 "(운영자 제외)" 표기.
- 소표본 SUPPRESSED(minimum_sample) 로직 유지.

## 10. MVP 범위
- **A/B/C 3축 재배치** + **핵심 KPI 스트립**(기존 응답 조합) + **모집단 라벨·전환율 가드**(자동전환율 제거) + **운영자 제외 토글**(신규 필터 1종). 페이지네이션·검색·권한 **그대로 유지.**

## 11. 후속 개선 범위
- `admin_study_by_school` 운영 적용(승인 후 B에 자동 노출), 성적 연동 분석, 베타 검증 E2E, 퍼널 시계열(코호트 추적), 유료 전환 심화.

## 12. Codex 구현 명세 초안
- **대상:** `src/components/admin/admin-data-page.tsx` + `admin-dashboard-view.tsx`를 **A/B/C 축 레이아웃**으로 재구성(라우트·RPC 호출 계약 **불변**). 상단 `AdminKpiStrip`(기존 응답 조합) 신설.
- **전환율 가드:** 서로 다른 모집단 지표를 나눈 비율 **렌더 금지**; 퍼널은 단계별 모집단 라벨 병렬.
- **운영자 제외(신규 RPC, Owner 승인 시):** `p_exclude_operators boolean default false` 신규 함수/오버로드. SECURITY DEFINER·`search_path=''`·operator 게이트·`revoke public,anon`·`grant authenticated`. 기존 함수 불변.
- **유지:** 서버 페이지네이션/검색/전체건수, 기간·학년 필터, operator 게이트, 모바일 반응형, 관리자 디자인 시스템(`AdminPanel`/`admin-table`).
- **금지:** 기존 RPC·테이블·데이터 변경, TOP 10 복구(이미 페이지네이션), 운영 배포.

---

---

## [보완 2026-11-14 통합] 논술 운영 IA와의 연결

> 통합 설계 [admin-essay-operations-ia-20261114.md](admin-essay-operations-ia-20261114.md)에서, 본 문서의 학습·입시 3축은 **7개 상위 메뉴 중 "6. 학습·입시 분석"**에 해당한다. 논술 운영·품질(메뉴 1~5,7)과 **하나의 관리자 시스템**을 이루되 **목적·모집단이 다른 별도 분석 영역**이다.

- **공유:** 회원(Student 360)·기간·**운영자 제외 토글**을 논술 운영/품질과 공유. 회원 상세에서 본 문서의 지원/합격과 논술 첨삭 회차(🧩`/admin/essay-runs`)로 교차 이동.
- **분리 유지:** 학습·입시 모집단(전체/고3·N수)과 논술 첨삭 이용자 모집단을 **혼합하지 않는다**(전환율은 동일 모집단 내에서만). 통합 KPI 표는 통합 문서 §9.
- **변경 없음:** 본 문서의 설계(3축·KPI 정의·전환율 가드·운영자 제외)는 그대로 유효. 이 보완은 **연결 관계만** 명시한다.

---

## 제약 재확인
설계 문서뿐. **WEB·DB·RPC·운영 배포 변경 없음.** 페이지네이션은 **이미 운영 배포**됐음을 반영(재개발·오기록 금지). 학교 랭킹은 ⛔배포대기, 성적·검증은 ⚪. 기준 커밋 WEB `041e6cd`. 학생 MY 개편은 [별도 문서](student-my-redesign-20261114.md). Owner 검토 후 구현 범위 확정.
