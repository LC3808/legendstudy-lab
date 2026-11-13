# 개인화 PHASE1 UUID 보완·PHASE2 순위 페이지네이션 — 2026-11-13

## 결과

대학 연결 **35/42**. 기존29 보존, 강남·덕성·삼육·상명·성신·한국기술교육6의 기존 활성 마스터 UUID를 명시적으로 연결했다. source slug와 kr-UUID slug의 차이를 확인하고 공식 전체 대학명과 기존 유일 마스터 행을 개별 대조했다. 유사도 알고리즘/새 UUID/중복 대학 생성0. 매핑 근거는 WEB wiki/university-uuid-mapping-20261113.json.

미연결7: 동덕여대·서경대·수원대·신한대·을지대·한국공학대·한신대. 현재 public.universities 전체 조회에서 해당 정식 대학 행 및 Catalog slug가 확인되지 않았다. 다른 원천의 공식 학교 코드와 구 명칭까지 확인 후 마스터 등록이 필요할 수 있다. 등록 시 관심/지원 선택 목록과 UUID FK 연결에 영향이 있으며, 논술 시험 생성·공개와는 분리해야 한다. 임의 신규 등록0. 해당 대학만 미확인 상태, 다른35 대학 서비스 계속.

## 관리자 적용 범위

/admin/data/learning/ 및 해당 universities/materials-data/applications 분류 화면의 희망 대학·자료 저장·최근 열람·실제 지원 네 순위. 기존 admin_learning_analytics 및 admin_admissions_analytics 응답·권한·집계 원천은 변경하지 않았다. 신규 admin_learning_rankings_page RPC1개가 동일 eligible/accounts/기간/facts를 사용하여 전체 집계에서 검색·정렬·10건 페이지 조회한다. users DESC, ID ASC; 전체건수/전체페이지/현재페이지/이전/다음 제공. 기간·사용자·종류 변경은 컴포넌트 key 재생성, 검색은 page1. 로그인 계정 변경/화면 해제 후 비동기 결과 반영 방지.

기존 종합 현황의 고유 학생 수 정렬을 유지한다. 저장/열람은 현재 남은 기록, 최근 열람은 학생×자료쌍이다. 실제지원은 자기보고 기록이며 합격성과로 환산하지 않는다. 새 RPC는 admin_operator + account_private.allowed, authenticated EXECUTE만 허용; anon/PUBLIC 실행 금지. 기존 RLS/Credit/결제/첨삭 변경0.

TOP10 전수 조사에서 별도 /admin 대시보드의 희망대학·전공·지원대학·전형·합격대학 요약도 확인했다. 이들은 다른 집계 기준의 요약 위젯으로 그대로 유지하며 기존 전체 현황 링크로 진입한다. **모든 대시보드 요약의 TOP10까지 제거한 것은 아니다.** 이번 운영 적용은 요청한 학습·입시 종합 현황의 네 순위다. 전공/합격 등 요약 위젯 자체의 페이지네이션은 후속 범위다.

## 운영

Migration 20261113144252_admin_learning_rankings_page. 함수1개 추가, 기존 함수 변경0/사용자 행 쓰기0. 원복: 새 함수의 authenticated 실행권한을 회수하고 이전 WEB 배포로 복구한다. 기존 기록 삭제 없음. 후보 실행을 BEGIN/ROLLBACK으로 검증한 뒤 실제 적용했다. 테스트 첫 시도에서 profiles.is_admin이 운영에 없음을 발견했으며 해당 트랜잭션은 롤백됐다. 실제 admin_users 및 admin_operator 계약으로 검증을 수정했다.

Pages 4a0e7c79-36dd-4a92-90e9-a0816a3672f2 / 소스214b6ad. 기존 학생 정적자산과 배포 설정 보존, 관리자 자산만 교체. API 변경은 Catalog6 UUID 연결. 운영 Catalog42/52/일정원문20/UUID35 확인. 현재 운영 API와 동일 backend를 APP이 재사용한다.

## 검증

- RPC: 각 종류 전체 페이지 합계=total_count, 중복 ID0, 검색0건, 잘못된 페이지 거부, 미인증/정상 비관리자 거부, anon실행권한없음. 30일 실제 집계45/49/189/3개. 전부 트랜잭션 내 비교; 실제 데이터 변경0.
- WEB: 새 UI2 PASS + 관련 대시보드/뉴스9 PASS + UUID/API9 PASS(중복3 제외 총17개). TypeScript PASS, production build PASS, Functions build PASS.
- Flutter: 기존/신규/운영 응답 파서17 PASS, 변경영역 Analyze 이슈0.
- 실기기: iPhone2대 무선 감지. 이번 수정본 설치·실제 계정 로그인·관심/지원/중복/미확인/계정전환은 실행하지 않아 전부 NOT TESTED. Android 기기 미감지. 기기 감지를 기능 PASS로 기록하지 않는다. APP 스토어 제출0.
- 관리자 실로그인 브라우저 클릭 검수 NOT TESTED. 서버 권한·단위 UI 검증과 구분한다.

PHASE1 식별자 전체 연결은 PARTIAL(35완료/7미연결). PHASE2 네 순위 서버 페이지네이션·운영 배포 DONE, 실사용 로그인 검수 NOT TESTED. 학생MY·관리자 전체개편 명세는 별도 잔여 작업.
