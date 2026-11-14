# LegendStudy+ 학생 MY 개편 설계 (Flutter) — 2026-11-14

> 담당: Claude (UX·IA) · 단계: **조사·구조설계·개선안**(구현·배포 제외)
> 기준 커밋: **APP `c4511dd`** · WEB `041e6cd` · Owner 기준일 2026-11-13
> 본 문서는 **실제 Flutter 코드(`legendstudy-app` @ `c4511dd`)를 직접 열람**해 작성했다. WEB 기능과 APP 기능을 혼동하지 않는다.
> 선행: [personalization-my-ux-ia-20261113.md](personalization-my-ux-ia-20261113.md)(상위 IA). 본 문서는 그 후속 **구체 화면 설계**이며, 상위 IA에서 "🔵 미검증"으로 남겼던 Flutter 상태를 **코드로 확정**한다.
> **이번 단계 코드·DB·운영 배포 변경 없음.**

표기: ✅구현·확인 / 🟡부분(PARTIAL) / ⚪미구현 / ⛔배포대기

---

## 1. 현재 MY 구조 (코드 근거)

APP은 **5탭 StatefulShell**이다(`lib/app/router.dart`): `/home` · `/materials` · `/study` · `/lab` · `/my`.

### 1-1. MY 메인 = `ProfilePage` (`lib/features/profile/presentation/profile_page.dart`)
로그인 사용자 기준 위에서 아래로:

| 블록 | 구성 | 근거(위젯) |
|---|---|---|
| **헤더** | "MY" + 공지(`/notices`) + 설정(`/my/settings`) | `AppHeader`, IconButton×2 |
| **계정 카드** | 아바타·닉네임(+프로필 설정 유도) · `LearningInfoRow`(학교·학년) · `CreditBalanceCard`(이용권 잔액·충전·내역) | `ProfileAvatar`/`LearningInfoRow`/`CreditBalanceCard` |
| **프로필 완성도** | `ProfileCompletionCard` | ✅ |
| **섹션 "학습"** | 공부 요약(`study.summary`) · 공부 추이 보기(`/my/trends`) · 공부하러 가기(`/study`) | `studyControllerProvider` |
| **섹션 "LAB"** | `MyScoreSummary`(모의고사/내신 점수 요약) | `score_summary.dart` |
| **섹션 "관심 대학·학과"** | `AspirationsCard`(관심 대학·관심 전공·지원 대학 라벨) + `ApplicationsEntry`(실제 지원 관리 진입) | `aspirations_card.dart`, `applications_page.dart` |
| **섹션 "나의 자료"** | 저장한 자료(`/my/saved`) · 최근 본 자료(`/my/recent`) | `PersonalMaterialList` |

### 1-2. MY 하위 라우트(`/my/...`)
`credits`(이용권 내역) · `trends`(공부 추이) · `edit`(프로필 편집) · `settings`(설정) · `saved`(저장한 자료) · `aspirations`(관심 대학·학과 설정) · `school`(프로필 수정) · `recent`(최근 본 자료) · `delete-account`.

### 1-3. 항목별 구현 상태 (DONE / PARTIAL / NOT IMPLEMENTED)

| 항목 | 상태 | 근거 |
|---|---|---|
| 프로필(닉네임·아바타) | ✅ DONE | `ProfilePage` 계정 카드, `/my/edit` |
| 학교·학년 | ✅ DONE | `LearningInfoRow`, `/my/school` |
| 관심 대학 | ✅ DONE | `AspirationsCard`·`interestedUniversitiesProvider`, `/my/aspirations` |
| 관심(희망) 전공 | ✅ DONE | `intendedMajorProvider`, `AspirationsCard` "관심 전공 · {field}" |
| 실제 지원 대학 | ✅ DONE | `ApplicationsPage` 등록/수정, `my_applications`(applications-v1) |
| 지원 전형·학년도·상태 | ✅ DONE | `ApplicationsPage` "{year}학년도 · {type} · {track}" + status |
| 합격 결과·진행 이력 | ✅ DONE | "진행·결과 및 이력"(이벤트소싱 kind) |
| 공부시간 | ✅ DONE | 학습 섹션 `study.summary` |
| 공부 추이 | ✅ DONE | `/my/trends` `StudyTrendPage` |
| 학습 목표(달성률) | 🟡 PARTIAL | 공부 요약/추이는 있으나 **목표 설정·달성률 UI는 홈 D-Day/목표 중심**이며 MY에 달성률 집계 카드 없음 |
| 과목별 공부시간 | ⚪ NOT IMPL | MY·추이에 과목 축 분해 미확인 |
| 학교별 공부 순위 | ✅ DONE(진입) | 홈 `school_ranking` 카드·`/study/schools` |
| 저장 자료 | ✅ DONE | `/my/saved` `SavedPage`, `bookmarks` |
| 최근 열람 | ✅ DONE | `/my/recent` `RecentPage`, `recent_views` |
| 다운로드 자료 | ⚪ NOT IMPL | 저장/열람과 별도의 "다운로드" 목록 미확인(저장=북마크로 운영) |
| 논술 LAB 이용권 | ✅ DONE | `CreditBalanceCard`, `/my/credits` |
| 첨삭 기록 | ✅ DONE | LAB 섹션 `MyScoreSummary` + `/lab` essayRoutes |
| 내신/수능 LAB | ⛔배포대기 | `/lab/school-record`·`/lab/csat-mock` = `LabComingSoonPage`("준비하고 있습니다") |

> **상위 IA 문서 정정 확정:** 상위 IA가 "🟡 저장/열람 자료는 학생 WEB 미노출"이라 적은 것은 **WEB 한정**이 맞고, **APP에는 `/my/saved`·`/my/recent`로 이미 노출**된다(✅). "개인화 홈·나의 대학 소식 미구현"도 **WEB 한정**이며 APP은 둘 다 구현(§'나의 대학 소식'은 아래 참조).

### 1-4. '나의 대학 소식'은 홈 카드 (MY 아님) — 데이터 연결 **완료**
Owner가 과거 전한 "공식 정보 연결을 준비 중이에요" 문구는 **현재 코드(`c4511dd`)에 없다.** 카드는 이미 **서버 RPC `university_news_feed`(contract `university-news-v1`, 100건 페이지네이션·snapshot·revision)**로 연결됐다(`university_news.dart`).
- 매칭: `matchesApplication`(실제 지원: university_id+year+round+track+division, scope별) / `matchesInterest`(관심: university_id+scope=university+year).
- 정렬: 지원+마감임박(≤7일)=0 → 지원 일정=1 → 기타=2; 홈은 상위 3건.
- 상태 문구(실제): `공식 일정·소식이 아직 없어요. 일정 확인 중` / `등록한 전형 중 연결된 공식 일정이 없는 전형이 있어요` / `재확인이 필요한 자료가 있어요` / 빈 대학 시 `_UniversityLinks(empty)`.
- 홈 카드 `availability: 'official-data-required'`, **기본 노출 OFF**(`defaultHomeVisibility`) — 사용자가 홈 편집에서 켠다.

---

## 2. 기존 UX 문제점 (APP MY 기준)

1. **"한눈에 현황"이 약함.** MY는 섹션 나열(학습·LAB·관심대학·자료)이지만 **"얼마나 공부했고 / 어떤 대학 준비 중이고 / 다음에 뭘 할지"**를 **한 화면 상단에서 요약**해 주는 대시보드 헤더가 없다. 핵심 숫자(이번주 공부·지원 n건·다가오는 일정)가 흩어져 있다.
2. **입시 현황이 '관심+지원+결과'로 통합되어 보이지 않음.** `AspirationsCard`가 관심·전공·지원 라벨을 한 카드에 나열하지만 **상태 분포·합격 결과·공식 일정(홈 소식)**과 연결되지 않아, 대학 단위로 "내 입시가 어디까지 왔나"가 안 보인다.
3. **공식 논술 일정이 MY에서 단절.** '나의 대학 소식'은 **홈 카드이고 기본 OFF**라, MY에서 자기 지원 대학을 보면서 **다가오는 공식 일정**을 바로 못 본다(홈을 켜야 보임).
4. **학습 목표/달성률 부재.** 공부 요약·추이는 있으나 **목표 대비 달성률** 같은 동기 부여 지표가 MY에 없다(과목별 분해도 없음).
5. **정보 밀도·우선순위 평탄.** 계정·완성도·학습·LAB·관심대학·자료가 **동일 비중 카드**로 쌓여, 스크롤 깊은 곳(자료)과 얕은 곳(계정)의 중요도 차이가 레이아웃에 안 드러난다.

---

## 3. 개선 IA (권장안 — 확정 아님)

핵심 질문 "**나는 얼마나 공부했고, 어떤 대학을 준비하며, 다음에 무엇을 하나**"에 맞춘 **상단 요약 + 2대 묶음**:

```
MY (ProfilePage 재구성)
├─ [헤더] 계정·이용권·프로필 완성도            (유지)
├─ [NEW] 나의 현황 요약 스트립
│    이번주 공부 12h30m · 지원 4건(제출 2) · 다가오는 공식 일정 D-12
│    → 각 항목 탭하면 해당 섹션/화면으로
├─ A. 나의 입시
│    ├─ 관심 대학·학과            (AspirationsCard 유지)
│    ├─ 실제 지원·전형·상태·합격   (ApplicationsEntry 유지·강화)
│    └─ 공식 논술 일정(요약 3건)   (NEW: 홈 university_news를 MY에도 요약 삽입)
├─ B. 나의 학습·자료
│    ├─ 공부시간·추이·(목표 달성률 NEW)
│    ├─ 학교별 공부 순위 진입
│    ├─ LAB(첨삭 요약·이용권)
│    └─ 저장한 자료 · 최근 본 자료
```

- **기존 섹션·라우트 전부 보존**(삭제·경로 복잡화 금지). 변경은 ① 상단 요약 스트립 신설 ② 관심+지원+공식일정을 "나의 입시" 한 묶음으로 ③ 목표 달성률(있으면) 추가.
- 과목별 공부시간은 데이터·설계 확인 후(후속).

### 홈 ↔ MY 역할 분리
- **홈**: 오늘 할 일·오늘 공부·다가오는 일정 진입(행동 중심, 카드 커스터마이즈). **MY**: 누적 기록·입시 준비 전체·자료·설정(관리 중심).
- 중복 방지: '나의 대학 소식'은 **동일 데이터(RPC)**를 홈=행동 카드 / MY=입시 묶음 요약으로 **역할만 다르게**. 편집·상세 진입은 한 곳(해당 관리 화면)으로.

---

## 4. 화면 와이어프레임 (저충실도, 모바일)

```
┌ MY ───────────────────────────── [공지][설정] ┐
│ (아바타) 홍길동            이용권 3회 [충전]    │
│ 고3 · ○○고 · 프로필 완성 80%                   │
├───────────────────────────────────────────────┤
│ 나의 현황                                       │
│  이번주 12h30m │ 지원 4(제출2) │ 다음 일정 D-12 │   ← 탭 시 각 섹션
├── A. 나의 입시 ───────────────────────────────┤
│ 관심 대학·학과            연세대 · 경영 외 2  [설정]│
│ 실제 지원·합격  4건 · 제출2 · 1단계합격1    [관리]│
│ 공식 논술 일정                                  │
│  ● 연세대 논술 D-12 11/24(일)        [출처↗]   │
│  ● 성균관대 논술 D-19 ...            [출처↗]   │
│  (지원/관심 없음 → "관심 대학 설정" / 일정無 → 입학처 링크)│
├── B. 나의 학습·자료 ──────────────────────────┤
│ 이번주 12h30m · (목표 15h 83%)   [추이][공부]  │
│ 학교별 공부 순위 →                              │
│ LAB  첨삭 2건 · 이용권 3회           [LAB]      │
│ 저장한 자료 → │ 최근 본 자료 →                  │
└───────────────────────────────────────────────┘
```

상태 처리(각 카드): **loading** = 선형 progress + semantics 라벨(기존 패턴 유지), **error** = "…불러오지 못했어요" + 다시 시도(기존 `ErrorState`/`invalidate`), **empty** = 설정 유도 CTA(관심 대학 설정 등).

---

## 5. 카드별 정보 구조

| 카드 | 표시 요소 | 데이터 원천 |
|---|---|---|
| 나의 현황 요약 | 이번주 공부(시:분), 지원 건수·제출수, 다가오는 공식 일정 D-day | `studyControllerProvider`, `my_applications`, `university_news_feed` |
| 관심 대학·학과 | 관심 대학 라벨·관심 전공 | `interestedUniversitiesProvider`, `intendedMajorProvider` |
| 실제 지원·합격 | 대학·학과·학년도·전형·상태, 합격 이력 | `my_applications`(applications-v1) + 이벤트 kind |
| 공식 논술 일정(요약) | 상위 3건 D-day·공식 출처 링크 | `university_news_feed`(+catalog fallback) |
| 공부 요약 | 이번주 합산·(목표 달성률) | `studyControllerProvider`(목표는 §10) |
| LAB | 첨삭 요약·이용권 잔액 | `MyScoreSummary`, `CreditBalanceCard` |
| 자료 | 저장/최근 진입 | `bookmarks`/`recent_views` |

---

## 6. 주요 사용자 흐름

1. **"내 입시 어디까지?"** MY → 나의 입시 → 지원·합격 카드 → (상태별) 진행·결과 이력.
2. **"다가오는 논술 언제?"** MY 상단 요약 D-12 탭 → 공식 논술 일정 → 출처 링크(입학처).
3. **"이번주 공부 충분?"** MY 상단 요약 공부 탭 → 추이 → 공부하러 가기.
4. **"아까 본 자료 다시"** MY → 나의 자료 → 최근 본 자료.

---

## 7. 기존 컴포넌트 재사용 (신규 개발 불필요)

`ProfilePage`/`LsCard`/`SectionHeader`/`LsListRow`/`ErrorState`/`ShellPage`(쉘·디자인 시스템 유지), `AspirationsCard`, `ApplicationsEntry`/`ApplicationsPage`, `CreditBalanceCard`, `MyScoreSummary`, `PersonalMaterialList`, `UniversityNewsCard`/`matchUniversityNews`(홈 카드 로직을 MY 요약으로 재사용). **상단 요약 스트립만 조립 신규.**

---

## 8. 데이터·RPC 재사용

| 용도 | 기존 RPC/프로바이더 | 신규 필요? |
|---|---|---|
| 지원·합격 | `my_applications`(applications-v1, paginated) | 불필요 |
| 관심 대학·전공 | `interestedUniversitiesProvider`·`intendedMajorProvider` | 불필요 |
| 공식 일정·소식 | `university_news_feed`(university-news-v1) | 불필요 |
| 공부 요약 | `studyControllerProvider`(+ study RPC) | 불필요 |
| 자료(저장/최근) | `bookmarks`/`recent_views`(+ 기존 personal repo) | 불필요 |
| 이용권·첨삭 | 기존 credit/score providers | 불필요 |

> **원칙:** WEB·APP 동일 Supabase 백엔드. 상단 요약은 **기존 프로바이더 조합**으로 성립 → 신규 RPC 없이 MVP 가능.

---

## 9. 신규 구현 필요 항목
- **나의 현황 요약 스트립**(기존 프로바이더 조합 UI). 신규 데이터 없음.
- **MY 내 '공식 논술 일정' 요약 삽입**(홈 `university_news` 재사용, MY 컨텍스트 배치).
- (선택) **학습 목표 달성률** — §10 데이터 확인 후.

## 10. MVP 범위
- 상단 **나의 현황 요약 스트립**(공부·지원·다음 일정) + "나의 입시" 묶음에 **공식 일정 요약 3건** 삽입 + 기존 섹션 2묶음 재배치. **기존 데이터만.**

## 11. 후속 개선 범위
- 학습 목표 설정·달성률(목표 스키마 확인), 과목별 공부시간 분해, 다운로드 자료 목록(저장과 구분 필요 시), 내신/수능 LAB 연결(현재 ⛔배포대기), 대학 단위 타임라인(관심→지원→제출→합격) 통합 뷰.

---

## 12. Codex 구현 명세 초안
- **대상:** `lib/features/profile/presentation/profile_page.dart`에 상단 `MyStatusStrip`(신규 위젯) + "나의 입시" 묶음에 `UniversityNewsCard`(home:true 요약) 삽입. 기존 섹션·라우트 **불변**.
- **데이터:** 기존 provider 조합(`studyControllerProvider`,`applicationLabelsProvider`/`my_applications`,`universityNewsProvider`). **신규 RPC 없음.**
- **상태:** loading/error/empty 모두 기존 `ErrorState`·`invalidate`·선형 progress·semantics 패턴 준수. 공식 링크는 https·host 검증(기존 `UniversityNewsItem` 가드).
- **디자인:** `LsCard`/`SectionHeader`/`AppTokens` 토큰·간격 유지. 카드 높이 최적화(요약은 1~2줄).
- **금지:** 기존 기능 삭제·경로 변경·관심/지원 **쓰기 로직 변경** 없음(읽기 조합만).
- **선행 확인:** 학습 목표 데이터 존재 여부(달성률 카드 전제). 없으면 MVP에서 제외.

---

---

## [보완 2026-11-14 통합] 나의 논술 연동 (실제 첨삭 이용 발생)

> 통합 설계 [admin-essay-operations-ia-20261114.md](admin-essay-operations-ia-20261114.md) 후속. 실제 첨삭 이용(운영 58요청/47완료)이 발생해 MY의 **논술** 표면을 보완한다. **학습·입시·논술 균형 유지** — 논술로 MY를 과도하게 채우지 않는다. 기존 §3 "나의 학습·자료"의 LAB 카드를 확장하는 방식.

기존 MY는 LAB 섹션(`MyScoreSummary`)·논술 기록(`readEssays` 최근 3)·성장(`EssayGrowthCard`)이 이미 있다. 아래만 요약 보강(별도 대형 섹션 신설 아님):

| 보강 항목 | 데이터 | 상태 |
|---|---|---|
| 완료된 첨삭 수 | `summarizeRecords().evaluatedCycles` | ✅ 클라이언트 계산 가능 |
| 재첨삭 횟수 | `summarizeRecords().reevaluated` | ✅ |
| 최근 첨삭 대학 | `readEssays()[0].universities.name` | ✅ |
| 최근 첨삭 결과 | 기존 `EssayRecords`/report | ✅ |
| 재작성 진행 상태 | `rewrite`/`parentId`(growth 라벨: 최초/무료 재첨삭/새 답안) | ✅ |
| 보유 이용권 | 기존 `CreditBalanceCard` | ✅ |
| 첨삭 결과 코멘트(남김 여부) | `essay_feedback`(학생) | 🟡 운영 RPC 설치 확인 필요(통합 문서 §8) |
| 무료 재첨삭 가능 여부 | included_revision/required | 🟡 현재 0 — 후속(통합 §11) |

- **통합 위치:** §3-C2 "학습·자산" 하단 LAB 카드를 "나의 논술" 요약으로: *완료 n건 · 재첨삭 m건 · 최근 {대학} · [기록 보기]*, 재작성 진행 중이면 배지. 편집·상세는 기존 `/lab`·논술 기록으로 링크.
- **코멘트 연동:** 결과 화면의 `EssayFeedback`(선택)과 MY는 **중복 노출하지 않는다**(MY는 "의견 남긴 첨삭" 표시 정도). 코멘트 작성은 결과 열람 흐름에서만.
- 실제 데이터 없는 지표(무료 재첨삭 eligibility 등)는 **후속 분리**.

---

## 제약 재확인
설계 문서뿐. **Flutter·WEB·DB·RPC·운영 배포 변경 없음.** 코드에 없는 기능을 구현된 것으로 적지 않았다(⚪/⛔ 명시). 기준 커밋 APP `c4511dd`·WEB `041e6cd`. 관리자 종합현황 개편은 [별도 문서](admin-learning-admissions-overview-redesign-20261114.md). Owner 검토 후 구현 범위 확정.
