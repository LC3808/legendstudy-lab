# 대학 UUID 42개 연결 및 기기 검증 — 2026-11-14

상태: 식별자·운영 API DONE / 실제 계정 실기기 검수 PARTIAL.
기준 APP c4511dd, WEB 041e6cd. 관리자 페이지네이션 재개발·스토어 제출·Provider 호출 없음.
Owner의 2026-11-13 신규 마스터 등록 조건부 승인 범위 안에서 실행했다.

## 식별자와 공식 근거

기존 35 UUID 보존·재사용, 신규 7, 미연결 0. 이름 유사도 추측 매핑 없음.
기존 마스터에서 exact slug/공식 이름과 한국산업기술·신흥대·한북대·을지의과·서울보건/kpu 별칭 충돌 조회 0.
기존 사용자 참조는 등록 전 해당 대학 master 부재로 0; 등록 직후 7개 각각 target/application/exam 참조 0.
온보딩/관심 대학은 동일 universities active SELECT, 지원 대학 FK도 동일 ID를 사용한다.
WEB Catalog·운영 API·APP 번들 Catalog의 source ID→UUID 42개 동일성을 자동 검증했다.
기존 APP 번들은 13개 null이 남아 있어 기존 생성기의 universities-only 옵션으로 보완했다. PDF manifest는 미변경.

| 대학 | source ID | 신규 UUID | 공식 명칭 근거 |
|---|---|---|---|
| 동덕여자대학교 | dongduk | `550973d4-e672-4a5a-90f0-8f2ba5a95d55` | [공식 원문](https://www.dongduk.ac.kr/www/main/index.do) |
| 서경대학교 | seokyeong | `62171755-3e5c-406d-9f87-4ee0df4c70de` | [공식 원문](https://www.skuniv.ac.kr/main) |
| 수원대학교 | suwon | `4e93f243-74e7-4f8e-b58b-fa537a39ddf8` | [공식 원문](https://ipsi.suwon.ac.kr/main) |
| 신한대학교 | shinhan | `7b8ae450-5e6e-49bc-a69c-272bd0214ddf` | [공식 원문](https://www.shinhan.ac.kr/) |
| 을지대학교 | eulji | `8540780d-01e6-4361-8190-1768cf4cdbca` | [공식 원문](https://www.eulji.ac.kr/webshr/univ/download/2021Guide.pdf) |
| 한국공학대학교 | tukorea | `d25c9a74-4969-4143-872c-1c850338dd0b` | [공식 원문](https://iphak.tukorea.ac.kr/img/file/2026_guidebook.pdf) |
| 한신대학교 | hanshin | `cd20d37c-916a-4910-bb9c-6efb0bc67f67` | [공식 원문](https://www.hs.ac.kr/kor/index.do) |

을지 입학처 직접 요청은 502였으나 기존 공식 대학 도메인의 학칙 PDF/도서관 페이지에서 명칭을 교차 확인했다. 일정 날짜는 신규 생성하지 않았다.

## 운영 적용·보존·복구

Migration `20261113145945_complete_university_catalog_seven` (2026-11-13 23:59 KST).
신규 universities 7행 INSERT만 영구 반영. 기존 대학 ID/사용자 행 UPDATE·DELETE 0.
사전 트랜잭션 적용 후 ROLLBACK 검증 PASS; 실제 적용 완료 및 사후 active 7 확인.
기존 대학 전체 JSONB 동일성, student_target_universities/student_applications/essay_exams 행 수와 정렬 해시 동일성은 migration 내부 guard로 검증했다. 불일치 시 전체 abort.
기존 RLS `universities_public_select` active 조건과 updated_at trigger 재사용. 함수·RLS·권한·Credit·Auth 정책 정의 변경 없음. anon 신규7 조회 PASS. 새 계정별 데이터 저장은 하지 않았다.

WEB API-only 배포 소스 `c995178`, Pages `798de461-c684-428e-90dc-3d3489191cc2`.
기존 정적 자산·프로젝트 설정 보존; 운영 응답 42 UUID/52전형/일정 원문20 유지.
복구: 이전 Pages `4a0e7c79-36dd-4a92-90e9-a0816a3672f2`로 API를 되돌리고 필요 시 exact UUID+slug 7개만 비활성화한다. 기존 참조/ID를 삭제하지 않는다.
WEB `supabase/candidates/university42_20261114/rollback_visibility.sql` 제공. BEGIN/UPDATE/SELECT/ROLLBACK 연습 PASS, 연습 후 active7 재확인. 실제 복구 commit은 실행하지 않았다. 비활성화는 신규 선택/공개 조회를 숨기므로 장애 시에만 사용한다.
WEB `wiki/university42-release-receipt-20261114.json`은 DB 신규7과 사용자 변경0을 구분한다.

## 검증 결과

- WEB Catalog/API 관련 9 PASS, Functions build PASS, 운영 응답/배포 보존 검증 PASS.
- Flutter 집중 테스트 18 PASS: 운영 응답과 번들42 일치, 지원 우선/관심/중복/unknown/오류, 계정 전환.
- Flutter 변경 영역 analyze: No issues found.
- 전체 Flutter 최종 결과: 2569 PASS / 11 SKIP / 기존 5 FAIL (D3 1, mobile IA 4); 수정 후 신규 실패 0.
- 최초 전체 실행 2568 PASS/11 SKIP/6 FAIL. 기존 D3 navigation 1 + mobile IA 4와 별도로 오래된 대학 소식 RPC fixture 1 실패를 발견했다. 현재 운영 Catalog loader 주입으로 테스트를 교체하고 계정 전환 동작 1 PASS를 확인했다. 제품의 데이터 조회 계약은 유지했다.
- Android 물리 기기: 미연결, NOT TESTED.
- Android LS_phone emulator: 기존 guest 홈 조작 1 PASS; 대학 소식/계정 전환 모의 계약 17 PASS. 실제 Android 운영 계정 로그인·재실행 세션 복원은 NOT TESTED.
- iPhone12ProMax: 별도 bundle `com.legendstudy.app.task04c.qa`, 표시명 LS04C QA profile build/install/process launch PASS. 실제 화면 터치와 운영 로그인 시나리오 NOT TESTED.
- 기존 iPhone 운영 `com.legendstudy.app` 1.0.2(75) 설치 URL/버전 동일. 기존 로그인 세션을 추출·이전하거나 앱을 삭제/덮어쓰지 않았다. QA 프로젝트의 build67은 이 작업 브랜치 메타데이터이며 APP75 설치본과 별개다.

Owner는 기존 운영 앱에 로그인되어 있으나 QA 앱은 없다고 알렸고 이후 취침했다. 별도 QA 앱을 설치했지만 그 앱의 신규 로그인은 수행할 수 없었다. 추가 입력 요청 없이 가능한 검증을 완료했다.
따라서 실제 계정의 관심/지원/중복/일정/상세/계정 A→B/세션 재실행/오류 후 재시도는 실기기 PASS로 승격하지 않는다. 모의 계약 테스트와 실제 로그인 검수는 별도다.
기존 로그인/온보딩/MY/학습/학교 순위/자료 저장/PDF/LAB은 전체 자동화 결과 범위에서만 평가; 실제 계정 회귀는 NOT TESTED.

## 변경 파일과 재현

APP: university_catalog.dart, university_news.dart(loader 주입), catalog_news_live_test.dart, task04_account_switch_test.dart, export_catalog.mjs, integration_test/university_news_contract_device_test.dart 및 Wiki.
WEB: 신규7 migration, essay-public-catalog.json, API-only deployment guard, 신규 ID 목록, 롤백 SQL, 배포 영수증 및 Wiki.

- `node tool/essay_ux/export_catalog.mjs <WEB checkout> --universities-only`
- `NEWS_LIVE_FIXTURE=<captured operating response> flutter test test/catalog_news_live_test.dart test/catalog_news_test.dart test/university_news_test.dart test/task04_account_switch_test.dart`
- `flutter test integration_test/university_news_contract_device_test.dart -d <emulator>`: 모의 계정/데이터, 실계정 검증 아님.

비공개 env·device 로그·빌드 산출물은 Git에 넣지 않았다. 최종 HEAD는 이 문서를 포함한 각 저장소 최신 commit으로 추적한다.

## 보존 검토 7항목

1. 신규 master 등록 사실/시각은 migration·UUID 영수증에 기록; 학생 이력 발생 없음.
2. 공식 명칭 링크/원래35/신규7과 배포 ID로 맥락 추적 가능.
3. 기존 행 UPDATE/DELETE 없음. 비파괴 rollback도 ID/참조 보존.
4. 계정 identity·소속·학년도 변경 없음.
5. 대학 식별 metadata이며 학생 지원/합격 사실을 생성하지 않음.
6. 추가 개인정보 수집 없음. 기존 RLS·권한·동의·보존 정책 유지.
7. 이름 유사도나 추정 일정을 원본 사실로 저장하지 않음; 기존 일정 원문20만 재사용.

Canonical 상세 Wiki는 APP 저장소의 동일 이름 문서다.
