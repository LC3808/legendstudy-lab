# APP 행동 분석 구현 — 2026-11-15

상태: 코드·자동 테스트 완료, WEB 운영 배포 준비, 새 Flutter 계측의 실기기 수신 NOT TESTED. 스토어 제출하지 않는다.

## 기존 구현과 설계 판정 차이

설계의 '실제 앱 이벤트 미수집' 판정은 현재 코드·기존 운영 검증과 다르다. APP `usage_tracking.dart` 및 `analytics-v1`은 이미 Firebase 초기화/수집 게이트·screen_view/menu_view/material_open·논술 LAB 및 첨삭 이벤트를 구현했다. APP Wiki `app-ga4-usage-20261105.md`에 iOS 실수신과 분리된 속성562560908/스트림16278486227,16278789792가 기록되어 있다. WEB `3cf19a3` 앱 보고서 구현은 현재 운영 코드/Worker에는 빠져 있어 해당 구현을 선택 복구하고 확장했다. 별도 Postgres 이벤트 저장소를 만들지 않는다.

## 수집 계약

| 이벤트 | 발생 지점 / 중복 방지 | 속성 |
|---|---|---|
| screen_view | 기존 확정 경로 변경, 같은 경로 rebuild/query 수정 제외 | 유한 화면명, Firebase 자동 platform/time |
| menu_view | 기존 확정 메뉴 진입, 클릭과 별도 | menu_id/schema_version=1 |
| menu_click | 하단 홈/자료/학습/LAB/MY의 실제 선택마다 | 유한 menu_id/schema_version=2 |
| material_search | 현재 요청의 검색 완료, 초기 browse/페이지추가/retry/낡은 응답 제외 | schema_version=2, 검색어 전송 없음 |
| pdf_view | PDF viewer ready 후 한 경로 인스턴스당 최초 1회 | schema_version=2, URL/제목 없음 |
| bookmark_add / bookmark_remove | 저장소 쓰기 성공 후, 기존 진행중 mutation 차단 재사용 | schema_version=2, 학생/자료 식별자 없음 |
| study_timer_start | 타이머 시작 로컬 영속 저장 성공 후, 복원/resume/모의고사 제외 | schema_version=2 |
| study_timer_complete | 실제 타이머 기록 로컬 저장 성공 후, 짧은/폐기/모의고사 제외 | schema_version=2/duration_ms |
| essay_lab_view / essay_submit_start | 기존 LAB 진입·첨삭 시작 호출 재사용 | 기존 비식별 허용 속성 |

식별은 기존 Firebase 앱 인스턴스 기준이다. 회원 UUID/이메일/닉네임/검색어/답안/평가문을 새 이벤트로 보내지 않는다. 호출 시각/platform은 SDK가 기록한다. 타이머 완료 행동은 서버 동기화 완료를 의미하지 않는다. 공부시간·Credit·평가 결과의 기준은 기존 DB 원장이다.

Firebase SDK의 기존 오프라인 큐를 사용한다. 별도 재전송 큐·이중 Postgres 쓰기 없음. 전송 실패를 catch하여 사용자 기능을 막지 않는다. 클라이언트 성공 경계에서 중복 호출을 줄이지만 분석 수신의 exactly-once를 보장하지 않는다. 새 버전 이전의 검색/클릭/기능 이력을 복원하지 않는다.

## 관리자 보고서

기존 `/api/admin/ga4?surface=app` 계약을 복구, `platform=all|ios|android` 추가. GET/same-origin/유효 사용자 조회/admin_operator 게이트/서버 서비스 계정 사용을 유지한다. WEB 스트림은 혼합하지 않는다. 기존 legacy WEB GA 보고서 변화 없음.

`/admin/data/app-usage/`: 오늘/7일/30일 및 플랫폼 선택, 행동 이벤트 수/화면 조회/메뉴 클릭/기능 실행/고유 이용자, 화면/메뉴 클릭/기능 TOP10. 기존 DAU/WAU/MAU 및 메뉴 진입/자료 상세 열림 보고서도 보존한다. 고유 이용자를 이벤트·메뉴별로 합산하지 않는다. 화면 순위는 등록된 화면명 범위이며 자동/미등록 screen_view가 포함되는 전체 화면 이벤트 수와 다를 수 있다.

기간별 원본은 GA Data API에서 집계하며 TOP10 페이지를 전체 합계로 사용하지 않는다. 배치는 최대5요청. 미설정·오류·수신 미확인·임계값·표본·기타행 통합을 구분한다. 최초 수신일은 2026-11-05 이후 보고서 관측 범위의 첫 날짜이며 설치일·최초 수집 시작일이라고 단정하지 않는다. 당일 지연 가능성을 표시한다. 신규 기능 이벤트의 값이 없으면 0회 이용으로 표시하지 않는다.

수집 게이트 `ANALYTICS_ENABLED`와 기존 Firebase 설정을 유지한다. 서버는 기존 읽기 서비스 계정과 앱 property/stream 두 공개 설정만 사용한다. GA 보존기간 콘솔의 이번 실측은 NOT TESTED. 기존 설정을 임의 변경하지 않았다. 신규 분석 테이블·SQL·권한 부여 없음.

## 보존 검토 7문항

1. 저장 사실: 비식별 행동 발생이며 공식 학습/지원/평가 완료 사실과 분리한다.
2. 기존 이력: Postgres 원장·기존 Firebase 이벤트 보존; 변경/삭제 없음.
3. 업데이트 의미: 새 앱 이후 이벤트 추가; 과거 projection을 이벤트로 변환하지 않는다.
4. 식별: 익명 앱 인스턴스/유한 메뉴 taxonomy, 신규 사용자 식별·교차서비스 연결 없음.
5. 분석 용도: 이용 경향만, 성적 향상/합격 인과·예측으로 해석하지 않는다.
6. 접근: 기존 관리자 게이트와 서버 credential; /ql 별도 권한 유지.
7. 확장·보존: 기존 SDK/GA4만 재사용, 원장 중복 저장 없음. 설정되지 않은 보관·동의 정책을 구현 완료로 주장하지 않는다.

## 검증

WEB GA 보고서33 PASS. Flutter 관련54 PASS(화면 이동/자료 열림·검색·북마크·타이머 포함), 변경 범위 analyze PASS. WEB 전체2049 PASS/1 FAIL/5 SKIP의 1FAIL은 추가 메뉴로 25→26개가 된 기대값이며 실제 링크와 기존7개 그룹 검증을 보완하여 해당12테스트 PASS. TypeScript/ESLint/production 정적 build PASS. Flutter iOS simulator build PASS. 실기기 신규 이벤트 발생→수신→보고서 연결은 NOT TESTED, 새 계측 운영 앱 배포 완료 아님.

API 기준: [GA Data API dimensions/metrics](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema). 배포·최종 전체 회귀·브라우저 검증 결과는 아래 후속 기록에 추가한다.

최종 전체 WEB 회귀: 2050 PASS / 5 SKIP / 0 FAIL / 0 ERROR (274 files, 270 passed/4 skipped).
