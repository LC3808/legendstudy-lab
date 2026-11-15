# 학습·입시 분석 통합 구현 — 2026-11-15

현재 상태: A~C 운영 구현·관리자 브라우저 확인 DONE. D 새 Flutter 계측은 코드·빌드 완료, 실기기 수신 NOT TESTED. E 기존 앱 GA4 실집계·표시 DONE, 신규 행동 데이터 수신은 PARTIAL.

## 선행 작업

[운영 정합성 점검](operations-integrity-20261115.md)을 재사용한다. WEB ac76f9a / 운영 96b17f18, APP 66ff682. 이전 전체 테스트 2032 PASS / 5 SKIP / 0 FAIL / 0 ERROR, Flutter 관련 20 PASS. 지원 삭제 후 요약 캐시 결함 수정. APP82QA는 Owner가 삭제하여 현재 지원 8건·결과 이벤트 18건이다. 한양대 장기 요청의 승인 필요한 종료·예약 해제는 별도 보류하며 자동 재처리하지 않았다.

## A — 자료 순위

기존 admin_learning_rankings_page와 서버 검색·10개 페이지를 유지한다. 저장 학생/저장 기록과 열람 학생/학생·자료 쌍을 구분한다. 자료명은 2줄 및 전체 원문 펼침, 숫자 우측 정렬, 현재 페이지 내 상대 학생 수 막대, 검색 결과 건수·현재/전체 페이지를 제공한다. recent_views는 최근 상태 projection이며 조회수·재열람 횟수가 아니다.

입시 관심/자료 이용/학습 활동의 세 KPI 그룹. 자료 유형 content_type은 존재하나 시험 유형·학년·시행 연도의 일관된 구조화 계약은 없다. 제목 추측 필터는 추가하지 않는다.

## B — 종합 집계

기존 대시보드 희망 대학·전공·지원·합격 영역을 공통 컴포넌트로 재사용한다. 현재 전공/대상 프로필과 기간 내 등록 기록의 모집단을 구분한다. 대학별 학생 수 합계는 전체 고유 학생 수와 다를 수 있다.

기존 admin_learning_analytics-v1에 saved_users/recent_users/application_users/active_users, study_daily, interest_application을 추가한다. 기존 필드·버전·인자·기간 제한·권한 유지. 활동 학생은 저장/최근 열람/공부 기록자의 합집합이며 앱 전체 활성 이용자가 아니다. 일별 공부는 KST 경계와 선택 기간으로 자른 실제 완료 구간의 합집합이다. 현재 관심 대학과 지원은 같은 사용자 UUID·대학 ID·학년도로 비교하며 시간 순서나 전환율을 주장하지 않는다. 저장·관심 변경의 과거 추이는 생성하지 않는다.

## C — Student 360

기존 회원 상세에 프로필/희망 대학·전공, Student360 공부·지원, 저장·최근 열람, 대학별 논술 활동, LAB 회차, 이용권이 이미 존재한다. 새 기록 테이블을 만들지 않는다. admin_applications_list-v1에 원본 user_id만 추가하고 /admin/members/?member=UUID로 기존 상세를 연다. 목록 자체는 전체 기간임을 표시한다. 기존 필터·페이지는 유지하며 ID가 없는 이전 응답에는 임의 이름 매칭 링크를 만들지 않는다.

## SQL 및 운영 검증

후보: `supabase/candidates/learning_analytics_20261115/`. 마이그레이션: `20261115112035_learning_analytics_additive_read_contract.sql`.

2026-11-15 운영 적용 완료. 사용자 데이터 DML 없음, 테이블·RLS·Credit·결제·첨삭 엔진 변경 없음. 기존 함수 정의 해시가 달라지면 적용/원복을 거부한다. CREATE OR REPLACE로 기존 ACL 보존.

- 격리 PostgreSQL 17 합성 데이터: 기존 필드 동등성, 중복 구간, KST 자정, 기간 경계, 학년도 다른 지원, 제외 계정, 일반 사용자 거절, 익명 실행 권한 없음, 원복 정의·ACL 동일, 재적용 PASS.
- 운영 읽기 전용 EXPLAIN ANALYZE: 31일 53.420ms / 400일 37.439ms. 해당 데이터·캐시 상태의 단일 관측이며 보장 latency가 아니다.
- 운영 적용 후 고정 구간 2026-10-16~2026-11-16 KST: 저장175건/64명, 최근2525쌍/581명, 활동585명, 공부33명/297901625ms, 지원8건/3명. 일별 합계297901625ms와 전체 동일. 현재 관심 대학·학년도 일치 지원0건(과거 관심 없음 의미 아님).
- 지원 ID fingerprint `3e472ca16be73b6d0ff02231e593c8e3`, 결과 이벤트 `126e8bb15a0268497d67620544eb1f4a`: 적용 전후 동일.
- 함수 해시 analytics `1fd12f054b54f89a08ae096c5520d077`, applications `7ff011d6e2cac7a8e81467a7b3c11e60`; 기존 authenticated/service_role ACL 그대로, anon EXECUTE false.
- 로그 최근24시간 해당 두 함수명 관련 기록 없음. 무오류의 포괄적 증거로 해석하지 않는다.

## 검증 현황

WEB 집중35 PASS + 종합 KPI2 PASS. TypeScript·변경 파일 ESLint PASS. 실제 운영 브라우저·모바일·새 UUID 상세 링크 검증은 NOT TESTED(배포 후 수행 예정). 전체 회귀·빌드·배포는 진행 중.

## 집계 제외 정책

닉네임/이메일로 테스트 사용자를 추정하지 않는다. 현재 읽기 계약은 account_private.allowed를 유지한다. 공개 스키마/account_private의 기존 필드를 확인했으나 신뢰 가능한 테스트 계정 전용 필드·제외 계약을 확인하지 못했으며, 현재 통계는 별도 테스트 제외가 적용된 것처럼 표시하지 않는다.

보안 advisor 전후 항목·건수 동일(신규 경고 없음). 기존 보안/성능 경고는 본 작업에서 광범위 수정하지 않는다. 참조: [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter).


## 운영 배포 및 실제 브라우저 — 2026-11-15 20:36~20:40 KST

1차 운영 `ac1c8d0b-3e65-4dec-943b-53ea74dbd29a`, WEB `bf03b4c`, APP `103c35d` push 완료. canonical 성공·전체 asset manifest·기존 Functions 라우팅 일치 검증 PASS. 학생 정적 자산 2773개 보존. 앱 GA4 공개 속성·스트림 두 설정만 복구, credential/다른 설정 보존. 별도 HTTP 클라이언트는 Cloudflare 403이므로 이 응답을 앱 권한 검증으로 주장하지 않는다.

- 실제 로그인 관리자: 자료 화면 KPI3그룹·2줄 제목·숫자 열·상대 막대 확인, 2페이지 11~20위 서버 이동 PASS. 검색·모바일 후속 결과 아래 기록.
- 학습·입시: 활동585명/저장64명/열람581명, 지원3명·8건, 최종합격0/1단계2 표시. 집계 시점에 새 사용자 기록이 발생할 수 있어 이전 스크린샷 수치와 차이 자체는 결함이 아니다.
- 실제 지원 목록→UUID 링크→Student360: 기존 회원 목록에 없는 선택 회원도 상세 표시, 지원6건·최근 열람1건·LAB활동·Credit 영역 연결 PASS. 개인 식별/이메일은 검증 문서에 복제하지 않는다.
- 일반 사용자 차단은 격리 SQL·API 자동 테스트로 검증. 이번 운영 브라우저에서 별도 비관리자 로그인 검증 NOT TESTED. /ql 게이트 수정 없음.
- WEB 전체2050 PASS/5 SKIP/0 FAIL/0 ERROR + UUID 직접 진입 대상3 PASS. 최종 안내 문구/링크5 PASS. TS·변경범위 ESLint·production build PASS.
- DB 읽기 함수2개만 확장. 신규 테이블·RLS·사용자 원장 DML 없음. 검증용 합성 데이터는 격리 DB에서만 사용.

한양대 오래된 회차 종료·예약 해제는 이전 원인 보고의 Owner 승인 필요 항목으로 유지한다. 재처리/완료 처리/삭제 실행 없음. APP82QA 지원8건 집계 반영은 Owner의 기존 삭제 결과이며 이번에 데이터를 삭제하지 않았다.


## 최종 인계

운영 배포 **9105e9e8-3606-472d-976e-2b2ab493438e** / 운영 코드 **902057cb663b4cd131bd5f054806d44619ca80fd**. 원격 push 완료. 1차 배포 대비 기존 비관리자 정적 자산2788개 보존, Worker hash 동일. canonical/manifest/Functions routes/설정 전체 대조 PASS. 최종 운영 브라우저에서 새 집계 범위 문구·대시보드 앱 분석 링크 확인 PASS.

자료 검색 '2027'→검색4개/1페이지, 기존 전체 순위는 독립 유지 PASS. 390px viewport override에서 그룹별2개 KPI와 세로 흐름 확인; 브라우저 확대 배율 영향으로 DOM CSS 폭487px 관측, 정확한 CSS390px 및 실기기 검증은 NOT TESTED. 임시 viewport 복원 완료. 전반 모바일 기기 검증 완료로 주장하지 않는다.

실제 iOS·30일 GA4 조회: 등록된 행동32,473/화면17,770/고유 이용자580/기능182(관측20:40 KST). Android·오늘 수신미확인. GA4와 Supabase 활성 학생은 식별·모집단이 다르므로 합산·직접 비교하지 않는다.

### 상태별 남은 범위

- DONE: 자료표/KPI/검색·페이지, 기존 학습·입시 집계 재사용·일별 공부·현재 관심과 지원 비교, UUID Student360 연결, 기존 앱 GA4 실조회, WEB 운영 배포·Git push·Wiki.
- PARTIAL: 신규 Flutter 행동 수집은 코드54테스트·정적 분석·iOS simulator build 완료, 운영 앱 업데이트 전. 이벤트 생성부터 GA 수신까지의 신규 기능 종단 검증은 아직 아님.
- NOT TESTED: 새 Flutter 실기기 전송/오프라인/비활성 수집, GA 보존기간 콘솔 실측, 별도 비관리자 운영 브라우저 로그인, 정확한 CSS390px·물리 모바일.
- 별도 Owner 결정: 오래된 한양대 요청 실패 종료·예약 해제(기존 보고의 구체 ID/전후 영향 검토 필요), 테스트 계정 식별·통계 제외 정책. 신규 광범위 제외 규칙이나 일괄 데이터 삭제 없음.
