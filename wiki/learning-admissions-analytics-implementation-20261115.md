# 학습·입시 분석 통합 구현 — 2026-11-15

현재 상태: A~C 코드 및 읽기 계약 구현, WEB 배포·실제 브라우저 검증 대기. D~E 기존 GA4 경로 복구·확장 진행 중. 완료 보고가 아니다.

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

닉네임/이메일로 테스트 사용자를 추정하지 않는다. 현재 읽기 계약은 account_private.allowed를 유지한다. 신뢰 가능한 일반 테스트 계정 분류와 제외 옵션은 추가 조사 중이며, 현재 통계는 별도 테스트 제외가 적용된 것처럼 표시하지 않는다.

보안 advisor 전후 항목·건수 동일(신규 경고 없음). 기존 보안/성능 경고는 본 작업에서 광범위 수정하지 않는다. 참조: [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter).
