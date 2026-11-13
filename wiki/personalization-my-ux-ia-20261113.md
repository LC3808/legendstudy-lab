# LegendStudy+ 개인화 · 홈/MY/관리자 정보구조(IA) 개편 설계안 (2026-11-13)

> 담당: Claude (Product UX / IA Lead) · 단계: **조사·구조설계·개선안 제안**(구현·배포 제외)
> 본 문서는 **실제 코드·운영 DB·Wiki를 교차검증**해 작성했다. 코드/DB에 없는 기능을 구현된 것으로 보고하지 않는다.
> 이번 단계에서 **DB·API·Flutter·WEB 코드 수정 없음, 운영 배포 없음.** Owner 검토 후 구현 범위 확정.
> 관련 기반: [codex-handoff-learning-admissions-20261111.md](codex-handoff-learning-admissions-20261111.md), [codex-work-plan-20261111.md](codex-work-plan-20261111.md).

---

## 0. 조사 결과 — 현재 구현 상태 (코드·DB 근거)

표기: ✅구현·운영 / 🟡데이터는 존재하나 미노출 / ⚪미구현(설계 대상) / 🔴검증불가

| 영역 | 현재 상태 | 근거(파일/테이블) |
|---|---|---|
| **홈(`/`)** | 공개 마케팅 랜딩. **개인화 로그인 홈 없음.** | `src/app/page.tsx` = `<LabLanding/>`(비로그인 전용, `useAuth` 미사용) |
| **'나의 대학 소식'** | ⚪ **코드에 없음** = Owner가 말한 "준비 상태"는 **미구현**(설계 대상) | `grep '소식'` → `notices.tsx`만. 홈/MY 어디에도 섹션 없음 |
| **MY(`/account`)** | ✅ `MyDashboard`. 프로필·관심대학·지원현황·이용권·LAB·성장·학습시간·학교진입·계정 | `src/app/account/page.tsx`→`src/components/my/dashboard.tsx` |
| **관심 대학** | ✅ 직접 insert(RPC 아님), 최대 5개, `status='interested'` | `student_target_universities`, `src/lib/my/data.ts`(addTarget) |
| **희망 전공** | ✅ 프로필 단일 값, 고정 선택지(`majorOptions`) | `profiles.intended_major`, dashboard `GoalsEditor` |
| **실제 지원** | ✅ 이벤트소싱, 고3·N수만(`showsApplications`) | `student_applications`/`_events`, `my_application_save/event`, `applications.tsx` |
| **합격 결과** | ✅ 이벤트 kind(accepted 등), 합격 이력 보존 | `student_application_events`(§handoff 8) |
| **공부시간** | ✅ 요약 패널 | `study_sessions`, `my_study_summary()`, `study-summary.tsx` |
| **학교별 공부 순위** | ✅ `/school` | `student_school_ranking/card`, `school-view.tsx` |
| **논술 LAB 기록** | ✅ MY에 최근 3건 노출 | `essay_practice_sessions`, `readEssays`, dashboard `EssayRecords` |
| **저장한 자료(북마크)** | 🟡 **데이터 존재, 학생 WEB 미노출**(관리자 집계만) | `bookmarks(user_id,content_item_id,created_at)`, `admin_learning_analytics.saved` |
| **최근 열람 자료** | 🟡 **데이터 존재, 학생 WEB 미노출**(관리자 집계만) | `recent_views(user_id,content_item_id,viewed_at)`, `admin_learning_analytics.recent` |
| **논술 일정/모집요강** | ✅ **catalog 상세에 이미 렌더**(개인화 연결은 ⚪) | `essay-public-catalog.json`(42개 대학, offerings→admissionDetails.facts.exam_date/time, OFFICIAL_CONFIRMED), `university-catalog-detail.tsx` |
| **공식 입학처 링크** | ✅ catalog `researchSources[].url`(공식) | 동 catalog |
| **관리자 학습·입시 종합현황** | ✅ 6지표 + 3분할 + 개별지원로스터 | `admin_learning_analytics`(targets/saved/recent/applications/study_users/study_ms), `admin_admissions_analytics`, `admin_admission_outcomes`, `admin_applications_list` |
| **테스트 계정 혼입** | 🟡 실제지원에 운영자 계정 포함, **구분 가능**(삭제·변경 없이 필터) | `profiles.is_admin/is_operator`(실제지원 2건=운영자 테스트) |

**핵심 구조 비대칭(설계에 중요):**
- 관심 대학 = **직접 테이블 insert**(RLS), 실제 지원 = **RPC + 이벤트소싱**. 입력 경로·검증 방식이 다름.
- 저장/열람 자료는 **APP 활동 원천**(WEB 쓰기 없음) → WEB은 조회만 신설 가능.
- 홈은 현재 **비로그인 마케팅 전용** → 로그인 사용자용 개인화 표면이 아예 없음.

---

## A. 현재 UX 문제점

1. **개인화 홈 부재.** 로그인 후에도 홈은 마케팅 랜딩. "나의 입시 데이터가 쌓이는 곳"이라는 약속(홈 메타카피)과 달리, 로그인 사용자가 자기 데이터를 보는 첫 화면이 없다.
2. **'나의 대학 소식'이 개념만 존재.** 코드 미구현인데 "준비 상태"로 노출될 경우 **빈 약속**이 된다(빈 상태 UX 부재).
3. **MY 과밀·평면 나열.** `/account` 한 화면에 프로필·관심대학·지원현황·이용권·LAB·성장·학습시간·학교·계정이 **동일 비중**으로 쌓여 있어, "학습 현황"과 "입시 준비"를 빠르게 구분하기 어렵다.
4. **입시 데이터 분절.** 관심 대학(직접입력)·실제 지원(이벤트소싱)·논술 일정(catalog)·합격 결과가 서로 다른 화면/모델에 흩어져, 한 대학 기준으로 묶여 보이지 않는다.
5. **자료 자산 미활용.** 학생이 APP에서 저장/열람한 자료(`bookmarks`/`recent_views`)가 WEB MY에 전혀 안 보여, "흩어진 데이터를 연결"한다는 제품 약속과 괴리.
6. **논술 일정의 개인화 단절.** 42개 대학 논술 일정 데이터가 catalog 상세에만 있고, "내 관심/지원 대학"과 연결되지 않아 학생이 직접 찾아가야 한다.
7. **홈·MY 역할 미정의.** 둘 다 "나의 ○○"를 지향하나 경계가 없어 중복·혼란 소지.
8. **집계 신뢰도 리스크.** 관리자 지표에 운영자 테스트 데이터가 섞여, 소표본 구간에서 수치 왜곡 가능(현재 실제지원 2건이 전부 운영자).

---

## B. 홈 · MY · 관리자 — 화면 역할 구분

| 화면 | 한 줄 정의 | 핵심 질문 | 주기 |
|---|---|---|---|
| **홈(개인화)** | "오늘·이번주 무엇을 할지" 액션 허브 | 지금 내가 해야 할 일? 다가오는 일정? | 매 방문 |
| **MY(`/account`)** | "내 입시·학습 자산의 전체 현황·관리" | 내 데이터가 맞나? 수정·관리 | 가끔(관리 시) |
| **관리자** | "운영 의사결정용 모집단·전환·실적 집계" | 코호트가 어떻게 움직이나? | 운영 리듬 |

원칙:
- 홈 = **요약 + 다음 행동**(읽기 중심, 편집은 MY로 링크). MY = **상세 + 편집**(CRUD). 관리자 = **집계·코호트**(개인 식별은 operator 게이트).
- **중복 최소화**: 같은 데이터는 홈=요약 카드 / MY=전체 관리로 **역할만 다르게**. 편집 UI는 MY에만 둔다.

---

## C. 권장 정보 구조

### C-1. 개인화 홈 (신규, 로그인 사용자)
우선순위 순 카드 스택:
1. **오늘의 학습** — 오늘/이번주 공부시간, 학교 순위 변동(요약). → 상세 `/school`
2. **나의 대학 소식**(신규 핵심) — 관심+지원 대학 기준 다가오는 **논술 일정**, 공식 입학처 링크, D-day. → 상세 catalog
3. **지원 현황 요약**(고3·N수만) — 지원 n건·상태 분포·합격 결과. → 상세 MY
4. **이어서 보기** — 최근 열람 자료 / 진행 중 논술 첨삭. → 자료·`/my/essays`
5. **이용권/알림** — 잔여 이용권·만료 임박, (후속)알림.

### C-2. MY(`/account`) 재구성 — 2개 상위 묶음
- **입시 준비**(상단): 프로필 → 관심 대학 → 실제 지원·합격 → (논술 일정 요약)
- **학습·자산**(하단): 학습시간·목표 → 학교 순위 진입 → 저장/최근 자료 → 논술 첨삭 기록 → 이용권 → 계정
- 현재 평면 9개 섹션을 위 2묶음·접이식(accordion)으로. 편집은 전부 MY에 유지.

### C-3. 관리자 종합현황 — 의사결정 축으로 재편
단순 6카드 나열 → **퍼널·코호트 3축**:
- **입시 준비 퍼널**: 희망 등록 → 실제 지원 → 제출 → 합격(전환율·이탈). 기존 `targets→applications→outcomes` 연결.
- **학습 참여**: 공부시간·학습학생·학교 랭킹(참여율). 
- **콘텐츠 활용**: 저장/열람 자료·논술 LAB 사용(자료→학습 연결).
- 공통 필터: 기간·학년(고3/N수)·**운영자 제외 토글**(신규). 소표본 SUPPRESSED 유지.

---

## D. 화면별 와이어프레임 (저충실도)

### D-1. 개인화 홈
```
┌───────────────────────────────────────────┐
│ 안녕하세요, {이름} 님            [알림🔔]   │
├───────────────────────────────────────────┤
│ 오늘의 학습                                 │
│  이번주 12h30m · 우리 학교 3위(▲1)   [더보기]│
├───────────────────────────────────────────┤
│ 나의 대학 소식                      [관리]  │
│  ● 연세대 논술  D-12  11/24(일) 09:00 [일정↗]│
│  ● 성균관대 논술 D-19  ...            [일정↗]│
│  (관심/지원 대학 없음 → 빈 상태 카드)        │
├───────────────────────────────────────────┤
│ 지원 현황 (고3·N수)                 [MY로] │
│  지원 4 · 제출 2 · 1단계합격 1 · 결과대기 1 │
├───────────────────────────────────────────┤
│ 이어서 보기                                 │
│  최근 열람: {자료명} · 논술 첨삭 진행 1건   │
└───────────────────────────────────────────┘
```

### D-2. '나의 대학 소식' 카드 상태 (빈/오류 포함)
```
[정상]  ● {대학} {전형} 논술  D-{n}  {날짜} {시간}  [일정 출처↗][입학처↗]
[관심무]  아직 관심/지원 대학이 없어요 → [관심 대학 추가]
[일정무]  {대학}: 확인된 논술 일정이 없어요 → [공식 입학처 확인↗]
[갱신실패] 일정을 불러오지 못했어요 · {확인일} 기준 → [다시 시도]
```

### D-3. MY 재구성
```
마이페이지
┌─ 입시 준비 ──────────────────────────────┐
│ ▸ 나의 프로필 (학교·학년·N수·희망전공)    │
│ ▸ 관심 대학 (최대5) ……………… [편집]      │
│ ▸ 실제 지원·합격 (고3·N수) …… [편집]      │
│ ▸ 나의 대학 소식(요약) ………… [홈에서]    │
├─ 학습 · 자산 ────────────────────────────┤
│ ▸ 학습시간·목표  ▸ 학교 순위 →           │
│ ▸ 저장한 자료 / 최근 열람 (신규 노출)     │
│ ▸ 논술 첨삭 기록  ▸ 이용권  ▸ 계정        │
└──────────────────────────────────────────┘
```

### D-4. 관리자 종합현황(퍼널 축)
```
[기간▼][학년▼][운영자 제외 ☑]
입시 준비 퍼널:  희망 120 ─▶ 지원 48 ─▶ 제출 40 ─▶ 합격 12   (전환율 표기)
학습 참여:       학습학생 300 · 공부 1,240h · 학교 랭킹 TOP[…]
콘텐츠 활용:     저장 860 · 열람쌍 2,100 · 논술 LAB 90
(소표본 구간 ‘집계 전/비공개’)
```

---

## E. 기존 데이터 재사용 범위 (신규 개발 불필요)

| 기능 | 재사용 자산 | 비고 |
|---|---|---|
| 나의 대학 소식(일정) | `essay-public-catalog.json`(exam_date/time, OFFICIAL_CONFIRMED, researchSources) | catalog 렌더 로직 그대로. **관심/지원 대학과 매칭만 신규** |
| 공식 입학처 링크 | catalog `researchSources[].url`(`officialUrl` 가드) | 재사용 |
| 관심 대학 | `student_target_universities` + `readGoals`/`addTarget` | 재사용 |
| 실제 지원·합격 | `my_applications`/`my_application_events` + 이벤트 kind | 재사용 |
| 공부시간 | `my_study_summary()` | 재사용 |
| 학교 순위 | `student_school_card/ranking` | 재사용 |
| 논술 기록 | `essay_practice_sessions` + `readEssays` | 재사용 |
| 저장/최근 자료 | `bookmarks`/`recent_views`(+ content_items 조인) | **데이터 존재**, 조회 RPC만 신규 |
| 관리자 지표 | `admin_learning_analytics` 외 4종 | 재배치만, 신규 집계 최소 |

---

## F. 추가로 필요한 데이터 · API (현재 없음 → 신설 후보)

> 모두 **후보**. Owner 승인 후 §handoff 11 패턴(SECURITY DEFINER·`search_path=''`·게이트·anon/public REVOKE)으로 구현.

1. **`my_home_summary()`** (신규 RPC) — 홈 1콜 집계: 이번주 공부시간, 학교순위 요약, 지원 상태 분포, 최근 열람 1건, 논술 진행 수. (기존 RPC 조합 or 단일 집계)
2. **`my_university_news()`** (신규 RPC 또는 클라이언트 조합) — 관심+지원 대학 id ∩ catalog 일정 매칭 → D-day 정렬. catalog는 정적 JSON이므로 **클라이언트 조합으로도 가능**(API 없이). 서버화는 선택.
3. **`my_saved_materials(p_offset)` / `my_recent_views(p_offset)`** (신규 RPC) — `bookmarks`/`recent_views` + `content_items` 제목 조인, 본인 소유만. (현재 학생 WEB 조회 경로 없음)
4. **알림(후속)** — 논술 D-day/일정 변경 푸시. 스키마·채널 신규. MVP 제외.
5. **운영자 제외 플래그** — `admin_*` 집계에 `exclude_operators boolean` 파라미터(또는 뷰). 테이블 변경 없이 RPC 내부 `profiles.is_operator` 필터.
6. **content_items 조회 계약 확인 필요** — `bookmarks.content_item_id`가 가리키는 제목/URL 소스(미조사). Codex가 `content_items` 스키마 교차확인 후 조회 RPC 설계.

---

## G. 개발 우선순위

- **P0 (가치·저비용·재사용)**: ① 나의 대학 소식(catalog×관심/지원 매칭, 클라이언트 조합) ② 개인화 홈 뼈대(기존 요약 재배치) ③ MY 2묶음 재구성(순수 레이아웃).
- **P1**: ④ 저장/최근 자료 조회 RPC + MY 노출 ⑤ `my_home_summary()` 단일 집계화(성능) ⑥ 관리자 퍼널 재편 + 운영자 제외 토글.
- **P2(후속)**: ⑦ 알림/푸시 ⑧ 논술 일정 변경 감지 ⑨ 전형별 맞춤 정보(모집요강 상세).

## H. MVP vs 후속

- **MVP**: 개인화 홈(요약+나의 대학 소식) + 빈/오류 상태 UX + MY 재구성 + (가능하면)저장/최근 자료 노출. **기존 데이터만** 사용, 신규 집계 RPC 최소(`my_saved_materials`/`my_recent_views`만).
- **후속**: `my_home_summary` 집계 최적화, 관리자 퍼널 재편·운영자 제외, 알림, 전형별 모집요강.

---

## I. Codex 구현용 명세 초안 (요약)

> 상태 변경 없음. 아래는 **설계 명세 초안**이며 구현은 Owner 범위 확정 후.

### I-1. 개인화 홈 라우트
- `/` 비로그인 → 현행 `LabLanding` 유지. **로그인 시** 개인화 홈 분기(신규 `MyHome` 컴포넌트) 또는 신규 `/home`.
- 데이터: 기존 `my_study_summary`, `student_school_card`, `my_applications`, `readEssays`, `recent_views`(신규 RPC). 정적 catalog는 번들 재사용.

### I-2. 나의 대학 소식
- 입력: 관심(`student_target_universities`) + 실제지원(`my_applications`) 대학 id 집합.
- 매칭: `essay-public-catalog.json` universities[].universityId == 대학 id → offerings(2027)→admissionDetails(OFFICIAL_CONFIRMED/PARTIAL).facts.exam_date/time → D-day 계산·정렬.
- 상태: 정상/관심무/일정무/갱신실패(와이어 D-2). 공식 링크 `officialUrl` 가드 필수(비공식 URL 차단).
- **클라이언트 조합 가능(신규 API 불필요)** — catalog가 정적이므로 MVP는 RPC 없이.

### I-3. 저장/최근 자료 (신규 RPC)
- `my_saved_materials(p_offset int)`, `my_recent_views(p_offset int)` — SECURITY DEFINER, `search_path=''`, 본인 소유(`user_id=auth.uid()`), `bookmarks`/`recent_views` ⋈ `content_items`(제목·종류·URL), 페이지네이션. anon/public REVOKE, authenticated GRANT.
- **선행 확인**: `content_items`(또는 자료 메타 테이블) 스키마·RLS. 미확인 → Codex 1차 작업.

### I-4. 관리자 퍼널·운영자 제외
- `admin_learning_analytics` 등에 `p_exclude_operators boolean default false` 추가(신규 함수 or 오버로드) → 내부 `eligible`에서 `profiles.is_operator`/`is_admin` 제외. **기존 함수 불변**, 신규 객체로.
- 퍼널 UI: 희망→지원→제출→합격 전환율. 소표본 SUPPRESSED 유지.

### I-5. 불변·게이트 규칙(필수)
- 신규 RPC: SECURITY DEFINER + `set search_path=''` + 소유 검증 + anon/public REVOKE.
- 기존 RPC/테이블 **불변**, 확장은 신규 객체.
- 테스트 계정: **삭제·변경 금지.** 집계는 `is_operator` 필터로 구분만.

---

## 2절 전용 — '나의 대학 소식' 7개 검토 항목 답

- **A. 지원 vs 관심 우선순위** → **실제 지원 > 관심**(지원=확정 행동). 동일 대학이 양쪽이면 지원으로 1회. 관심은 `priority`(1지망) 보조 정렬.
- **B. 공식 입학처 공지 연결** → catalog `researchSources[].url`(공식) + `officialUrl` 가드. 비공식 URL 비노출.
- **C. 논술 일정·모집요강** → catalog `admissionDetails.facts.exam_date/time`(OFFICIAL_CONFIRMED). 모집요강 본문은 미보유 → 입학처 링크로 대체(MVP).
- **D. 전형별 정보** → `admission_type`(지원)·offerings.campus/전형 매칭. 상세 모집요강은 P2.
- **E. 빈 상태** → 관심/지원 0 → "관심 대학 추가" CTA. 일정 0 → 입학처 링크 유도.
- **F. 일정 미확인·갱신 실패** → catalog `verifiedAt` 표기 + "다시 시도". 정적 JSON이라 "갱신 실패"는 실질적으로 **데이터 부재/구버전**으로 수렴 → 확인일 명시로 신뢰 확보.
- **G. 알림 확장** → D-day/일정변경 푸시(P2). 스키마·채널 신규 필요, MVP 제외.

---

## 제약 재확인
이번 단계 산출물은 **설계 문서뿐**이다. DB·API·Flutter·WEB 코드·운영 배포 **변경 없음.** 코드/DB에 없는 기능을 구현된 것으로 적지 않았다(미구현은 ⚪로 명시). Owner 검토 후 구현 범위를 확정한다.
