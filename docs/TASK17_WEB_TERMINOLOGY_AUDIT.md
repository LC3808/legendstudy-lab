# TASK17 WEB 전체 용어 점검 — 2026-11-02

이번 작업은 읽기 점검이다. 사용자 문구/배포/DB는 변경하지 않았다.

## 범위와 한계

현재 WEB checkout의 페이지 엔트리56개와 전체 src 문자열을 점검하고, 정적 export에서 열거한155개 운영 URL을 비로그인 HTTP GET했다(모두200). 각 응답에서 script/style을 제외한 HTML 텍스트를 검사했다. 200은 해당 화면의 로그인 이후 기능 검증을 의미하지 않는다. 로그인 필요 화면의 현재 브라우저 세션은 로그아웃 상태였으므로 본문/모달/오류분기를 실제로 모두 실행한 것은 아니다. 공개문서나 결제절차만 보는 점검보다 범위를 넓혔지만 DB에서 내려오는 자유입력 공지/게시물 전체는 조사하지 않았다.

소스 AST의 문자열/템플릿/JSX 텍스트만 검사:42파일146문자열 조각(사용자/공용23파일83조각,관리자18파일62조각,내부1파일1조각). 주석·변수명은 제외했다. 조각 수는 고유 문장 수나 운영 노출 횟수가 아니며 미사용 컴포넌트도 포함할 수 있다.

## 실제 운영 HTML에서 확인된 잔여

| 경로 | 잔여 예시 |
|---|---|
| /support/ | 미사용 크레딧, 사용한 크레딧 수, 유료 크레딧 유효기간, 무료 크레딧 |
| /essay-lab/ | 크레딧을 확인하고 있습니다 |
| /account/credits/ | 크레딧 내역 |
| /admin/credit/ | 크레딧 운영 콘솔 제목 |
| /internal/essay-connection/ | Provider·크레딧을 실행하지 않는 연결 점검 |

/pricing/, /refund/, /terms/, /privacy/, /payments/checkout/, /payments/success/, /payments/fail/의이번공개HTML검사에는잔여없음. 홈페이지등공용header는로그인시다르게보이므로이결과로전체사용자상태의잔여0을주장하지않는다.

## 로그인/조건부 사용자 화면의 소스 잔여

- 공용header: 일부정책/결제경로외에는크레딧표시, 계정안내문구.
- 마이페이지/구매사용내역: 잔액,구매버튼,표제목,빈내역,수량,만료안내,페이지metadata.
- 논술LAB: 보유/부족/조회실패/구매,베타안내와영문Credit출처라벨.
- 논술작성/회차제출: 1 Credit/1 크레딧,비용동의·무료재첨삭·추가첨삭·부족오류.
- 수리논술: 사진추출0크레딧,회차요청·실패재처리·부족안내.
- 첨삭결과/진행: 추가첨삭1크레딧,재시도0크레딧,무료재첨삭조건,피드백Credit오류.
- 고객센터: 직접문구뿐아니라기존배포가공용refundPolicy의이전문구를포함한다. 공용소스수정만으로이미배포된별도페이지가갱신되지는않았다.

## 후속 변경 기준

사용자노출문구만이용권으로통일하면된다. DB/RPC/DTO/변수명 credit,기존거래기록,APP구조는그대로둔다. 관리자전용명칭은사용자화면과구분해범위를명시한다. 기존승인거래의당시상품명을수정하지않는다. 이번에는점검만수행했다.

## 소스 위치 목록

| 파일 | 문자열 조각 수 | 구분 |
|---|---:|---|
| `src/app/account/credits/page.tsx` | 1 | 사용자/공용 |
| `src/app/account/essay/page.tsx` | 1 | 사용자/공용 |
| `src/app/account/page.tsx` | 1 | 사용자/공용 |
| `src/app/admin/credit/page.tsx` | 5 | 관리자 |
| `src/app/internal/essay-connection/page.tsx` | 1 | 내부 |
| `src/app/support/page.tsx` | 1 | 사용자/공용 |
| `src/components/account-control.tsx` | 2 | 사용자/공용 |
| `src/components/admin/admin-credit-grant-form.tsx` | 5 | 관리자 |
| `src/components/admin/admin-credit-members.tsx` | 3 | 관리자 |
| `src/components/admin/admin-credit-recovery.tsx` | 6 | 관리자 |
| `src/components/admin/admin-credit-view.tsx` | 3 | 관리자 |
| `src/components/admin/admin-dashboard-view.tsx` | 1 | 관리자 |
| `src/components/admin/admin-essay-monitoring.tsx` | 7 | 관리자 |
| `src/components/admin/admin-inquiries-view.tsx` | 1 | 관리자 |
| `src/components/admin/admin-member-credit-panel.tsx` | 7 | 관리자 |
| `src/components/admin/admin-mobile-purchases.tsx` | 4 | 관리자 |
| `src/components/admin/admin-operations-view.tsx` | 1 | 관리자 |
| `src/components/admin/admin-payment-view.tsx` | 1 | 관리자 |
| `src/components/admin/admin-release-report.tsx` | 4 | 관리자 |
| `src/components/credit-balance.tsx` | 3 | 사용자/공용 |
| `src/components/essay-beta-credit.tsx` | 2 | 사용자/공용 |
| `src/components/essay-credit-status.tsx` | 8 | 사용자/공용 |
| `src/components/essay-exam-submit.tsx` | 14 | 사용자/공용 |
| `src/components/essay-feedback.tsx` | 1 | 사용자/공용 |
| `src/components/essay-service-workspace.tsx` | 4 | 사용자/공용 |
| `src/components/exam-reentry-gate.tsx` | 1 | 사용자/공용 |
| `src/components/math-release/exam-session-submit.tsx` | 8 | 사용자/공용 |
| `src/components/math-release/session-progress.tsx` | 1 | 사용자/공용 |
| `src/components/math-release/student-route.tsx` | 2 | 사용자/공용 |
| `src/components/my/dashboard.tsx` | 9 | 사용자/공용 |
| `src/components/my/essay-session-progress.tsx` | 3 | 사용자/공용 |
| `src/components/my/exam-result-layout.tsx` | 2 | 사용자/공용 |
| `src/components/source-exam-selection.tsx` | 1 | 사용자/공용 |
| `src/lib/admin/analytics.ts` | 3 | 관리자 |
| `src/lib/admin/credit-transaction.ts` | 7 | 관리자 |
| `src/lib/admin/format.ts` | 2 | 관리자 |
| `src/lib/admin/monitoring.ts` | 1 | 관리자 |
| `src/lib/admin/navigation.ts` | 1 | 관리자 |
| `src/lib/credit-display.ts` | 7 | 사용자/공용 |
| `src/lib/essay-runtime/credit-source.ts` | 7 | 사용자/공용 |
| `src/lib/math-learning/handoff.ts` | 1 | 사용자/공용 |
| `src/lib/my/credit-expiry.ts` | 3 | 사용자/공용 |

## 2026-11-02 후속 구현 — WEB 전체 이용권 통일

Owner 최신 지시로 관리자도 포함한다. 전체 WEB의 고정 표시문구·metadata·공용 header·MY·논술/수리 제출·오류·내역·관리자 안내의 크레딧/Credit을 이용권으로 변경했다. DB/RPC/변수명·APP·과거 거래/자유입력 원문은 보존한다. 서버 결제/Secret/원장 변경 없음. 전체 회귀 1552 PASS/4 skipped, typecheck/build PASS. 배포는 현재 운영 Functions와 환경설정·기존 자산을 보존하고 새 정적 페이지 및 해시 자산을 반영한다. 로그인 이후 모든 상태를 수동 실행한 것은 아니며 소스·회귀검사로 보완한다.
