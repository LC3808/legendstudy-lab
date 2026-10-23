# 논술 LAB 첨삭·결과 화면 UI/UX 개선 (WEB)

작성일 2026-10-24 · 브랜치 `claude/web-essay-ui-redesign-20261024-81e3c9` · 기준 `main` 8991b51
범위: **UI/프리젠테이션 전용.** 평가 엔진·Worker·Registry·DB·RPC·Credit·Ledger·History 계약과
`src/lib/essay-runtime/**`(특히 `server/*`)는 **변경 없음**. Owner 승인 범위(정직한 범위)로 진행.

---

## 0. 착수 전 전제 정리 (§1 결론)

WEB 논술 LAB는 두 층으로 구성되어 있다.

- **공개 미리보기/카탈로그** `src/app/essay-lab/**` — `public-catalog` + fixture
  (`syntheticQuestion`, `mockEvaluation`)로 동작하며 전부 `MockNotice`·`OriginLabel`("연습 예시 /
  실제 기출·채점 아님")로 표기된 **정적 export 미리보기**다. 실제 제출·AI 첨삭이 아니다.
- **실제 저장 결과 소비 화면** `src/components/my/**`(`/account/essay`, `/my/essays`) —
  배포된 RPC가 저장한 실제 첨삭 결과·근거·성장·History를 읽어 보여준다(계약 `@/lib/my/*`,
  `@/lib/essay-runtime/client.ts`).

브리프가 "제거/이동/재사용"으로 기술한 일부 항목은 **Flutter APP의 기능**이며 WEB에는 대상이
존재하지 않는다(아래 9절 GAP). 날조 금지 원칙에 따라 구현하지 않고 GAP으로 기록했다.

---

## 1. 변경 화면·파일

| 파일 | 변경 성격 |
|---|---|
| `src/components/my/evaluation-report.tsx` | 결과 9영역을 섹션·카드 구조로 재구성(데이터·조건·문구 동일, class hook·시맨틱 래퍼만 추가) |
| `src/components/my/essay-dashboard.css` | 결과/성장/History 시각 스타일 추가(`.essay-personal` 스코프, PR#3 미포함 파일) |
| `src/components/my/essay-history.tsx` | 기록 카드에 상태 chip 추가(라벨·로직 동일) |
| `src/app/essay-lab/universities/[universityId]/page.tsx` | 루트에 `essay-flow` 스코프 class |
| `src/app/essay-lab/universities/[universityId]/[year]/page.tsx` | 〃 |
| `src/app/essay-lab/questions/[questionId]/page.tsx` | 〃 |
| `src/app/essay-lab/evaluation/[attemptId]/page.tsx` | 〃 |
| `src/components/essay-editor.tsx` | 작성 영역에 `essay-workspace` 스코프 class(로직·문구·Draft 동일) |
| `src/app/globals.css` | essay-lab 미리보기 프리젠테이션 블록 1개를 **중간부(1426행 뒤)** 삽입 |

**충돌 회피**: MY PR #3(`claude/web-my-redesign-...`, PR#3 Open)이 건드린 파일 중 내 대상과 겹치는
것은 `src/app/globals.css` 뿐이다. PR#3의 globals.css 변경은 **파일 끝(1526행 뒤 55줄 append)**
한 곳뿐이므로, 본 작업은 **중간부에만** 삽입하고 끝에 append하지 않아 머지 충돌이 없다. 그 외 MY
대상 파일(`evaluation-report.tsx`, `essay-dashboard.tsx`, `essay-history.tsx`,
`essay-dashboard.css`)은 PR#3이 건드리지 않아 겹치지 않는다.

## 2. APP 기준 비교

APP 논술 결과·피드백 화면(`lib/features/essay/essay_live_pages.dart`,
`lib/features/feedback/presentation/feedback_page.dart`)은 평가를 **섹션별 카드**로 나누고,
근거/개선/성장 비교를 시각적으로 분리한다. WEB MY 결과 화면도 동일한 **섹션·카드 리듬**으로
재구성했다(종합 평가 강조 블록, 평가기준 카드 그리드, 잘한 점/보완점 색조 구분, 답안 근거 인용
블록 분리, 성장 chip). **동일 결과 계약을 그대로 소비**하므로 APP·WEB 결과 내용은 동일하다.
픽셀 단위 복제는 아니며 WEB 반응형·토큰에 맞춰 재구성했다.

## 3. 첨삭 작성 화면 (§3/§7)

공개 미리보기 작성 화면(`essay-editor.tsx`)은 mock이다. 글자 수 카운트(공백 제외, 목표 800자),
임시 저장(브라우저 로컬 Draft), "피드백 예시 보기" 확인 흐름, 문항 정보·지문·힌트는 **동작 동일**.
`essay-workspace` 스코프로 reading/editor pane 카드 그림자·포커스 링·footer 버튼 터치 타겟
(≥44px)·모바일 전체폭 버튼을 통일했다. Draft 보존·제출 확인·라우팅은 불변.

## 4. 문제 영역 너비 조절 제거 (§4) → GAP

WEB 전역 grep(`너비/슬라이더/resize/width 조절`) 결과 **해당 UI 없음**. 작성 화면 `.workspace`는
이미 `grid-template-columns: minmax(...) minmax(...)`의 반응형(960px에서 1열)이라 너비 설정
자체가 없다. **제거할 대상이 없어 이미 요건을 충족**하며, 신규 PDF/너비 기능은 9절 GAP 참조.

## 5. 2027 논술 일정 펼침 이동 (§5) → GAP

"2027학년도 논술 일정 ▼" 펼침 컴포넌트가 WEB에 **존재하지 않는다**(공식 입학처 링크는
`OfficialLink` 버튼만 존재). 이동 대상이 없어 GAP 기록.

## 6. 첨삭 결과 화면 (§9/§10)

`evaluation-report.tsx`를 9영역 섹션으로 재구성(모두 **저장된 실데이터·honesty fallback 유지**):
① 제목/문제 ② 종합 평가(강조 블록) ③ 평가 기준별 분석(별 1~5단계는 저장값 그대로, "공식 점수·합격
가능성 아님" 주석 유지, 카드 그리드) ④ 잘한 점(초록 색조) ⑤ 보완할 점과 이유(주황 색조)
⑥ 답안 근거(§10, 근거가 저장돼 있을 때만 별도 인용 블록으로 분리 표시) ⑦ 구체적 개선 방법
⑧ 다음 답안에서 확인할 점. 데이터가 없으면 "저장되어 있지 않습니다"를 그대로 노출(가짜 생성 없음).
APP·WEB 공통 결과 UI, 대학별 내부 평가체계가 달라도 학생에겐 공통 표시.

## 7. 재작성·재첨삭 (§11)

재첨삭 결과는 기존 `RecordDetail`(최초/재첨삭 `EvaluationReport`) + `EvaluationComparison`으로
표시된다. 정책·버튼·활성 조건은 불변(UI만 정리). 실제 재첨삭 제출 트리거 자체는 essay-lab에
미연결(9절 GAP).

## 8. 성장 비교 (§12)

`EvaluationComparison`: 최초·재첨삭이 **실제로 둘 다 존재하고 비교 조건(pin·동일 기준)**을 만족할
때만 비교. 향상/동일/하락/비교불가를 실제 `compareReports` 결과대로 chip 색조로 표시(향상=초록,
하락=빨강, 동일=중립). 별 변화량(+N/−N)은 양쪽 별점이 모두 있을 때만. **가짜 점수·가상 개선
생성 없음**, 하락도 그대로 표기.

## 9. 대학별 서비스 상태 (§14) → GAP

`public-catalog`에 운영 서비스 상태(전체/일부/미연결) 필드가 없고, `/api/essay/availability`는
`types.math` boolean만 제공한다. **대학별 라이브 활성 상태를 기존 WEB API로 조회 불가** → 브리프
지시대로 하드코딩하지 않고 GAP 기록.

## 10. 반응형 검증 (§16)

- **결과 화면**: `report-rubric`·`report-comparison`은 `auto-fit minmax()` 그리드로 좁은 폭에서
  자동 단일열. 인쇄(PDF 저장)에서 chip·근거 블록 `break-inside: avoid` 적용.
- **미리보기**: `essay-flow` 상세/평가 페이지는 기존 960/680px 미디어쿼리로 1열 전환, 720px 이하
  주요 버튼 전체폭. 가로 스크롤·버튼 겹침 없음.
- tsc/eslint/build 통과로 레이아웃 회귀 없음 확인(실제 3-뷰포트 수기 확인은 미배포 상태라 코드·CSS
  기준 검증).

## 11. 회귀 (§20)

`tsc --noEmit` 통과 · `eslint .` 0 · `vitest run` **938 passed** · `verify-boundaries` PASS
(client 52 / server 2 / blocked 0) · `NODE_ENV=production next build` 통과.
논술 회귀 테스트 보존: Draft(essay-editor), 결과/음성 정책(evaluation-voice-policy), 제출 상태
유지(essay-detail), History 필터·Credit 비차감(essay-history), 대시보드 빈 상태·공유(essay-dashboard).
**실제 Provider 호출/신규 운영 평가 생성 없음** — fixture·저장 결과만 사용.

## 12. 미완료 / P1 백로그 (GAP)

| GAP | 사유 | 필요 API/작업 | 담당 | 완료 기준 |
|---|---|---|---|---|
| §3 실제 작성→제출→AI 첨삭 흐름 | essay-lab은 mock, `EssayRuntimeClient`가 어떤 작성 UI에도 미연결 | Codex 백엔드(11대학 Worker/Registry) + WEB 작성/제출/상태 화면을 client 계약에 연결 | Codex + WEB | 로그인 사용자가 실제 제출→상태→결과까지 WEB에서 완료 |
| §4 문제영역 너비 제거 | 대상 UI 없음(이미 반응형) | APP처럼 PDF+너비 UI를 새로 만들 경우에만 해당 | — | (신규 기능 결정 시) |
| §5 2027 일정 펼침 이동 | 펼침 컴포넌트 미존재 | 일정 데이터 소스 + 펼침 UI 신규 | Owner/Codex | 공식 링크 바로 아래 일정 펼침 배치 |
| §6 PDF Viewer | WEB에 PDF 뷰어 없음(문제는 텍스트) | 문제 PDF 소스 + 뷰어(줌/페이지/전체화면) 신규, 열람/다운로드 정책 | Codex + WEB | 문항 PDF 열람 가능 |
| §14 대학별 라이브 상태 | 기존 API 미제공 | 대학별 essay 활성 상태 조회 API | Codex | 운영 DB 기준 상태 표시, 하드코딩 없이 |
| §19 APP 세부 UI 조정(버튼 간격 등) | APP 수정 범위 아님 | Unified Wiki P1 후속 기록 | Owner | — |

## 13~15. Commit / PR / Production

- UI Commit: `674e11f` — 메시지 끝 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  (본 보고서 §13~15 보강 커밋이 그 위에 올라감)
- 브랜치: `claude/web-essay-ui-redesign-20261024-81e3c9` → origin push 완료, Remote SHA 일치 확인.
- PR: **[#4](https://github.com/LC3808/legendstudy-lab/pull/4)** — 별도 PR(ready), **main 미병합**.
- **Production 미배포** (Owner 검수 후 결정). admin PR#2 / MY PR#3와 독립 브랜치로 보존.
