# 2026-10-25 관리자 구매 집계·목록 정리

기존 통합 릴리스 후 Owner 요청. 결제/종류·기간 원장 목록은 페이지당 5개로 조회한다. 원장 예약/소비는 한국어로 구분하고 크레딧 출처와 행위를 분리한다.

## 운영 조사 (개인정보 없는 집계)
- Toss TEST 완료 3건 / 47,700 KRW. 기존 payment_orders 집계는 모바일 IAP를 포함하지 않았다.
- Google 구매 지급 1건/1크레딧, Apple 2건/4크레딧. 합계 3건/5크레딧이며 구매 출처 사용 1크레딧 후 가용 잔액 4이다. 5크레딧을 5거래로 세지 않는다.
- KST 10월24일 00:28~00:30의 동일 decision에는 reserve +1과 consume 잔액-1/예약-1 두 행이 있다. 합계 잔액-1/예약0. 이 두 행은 중복 차감이 아니다.
- IAP 지급 기록에는 실제 결제 금액·통화·스토어 환경이 저장되지 않는다. 표시 가격으로 실제 매출을 추정하지 않는다. 신규 RPC는 지급 시각 기준 플랫폼별 구매 건수·지급량만 제공한다. 웹 주문 상태 필터는 모바일 지급에 적용하지 않는다.

## DB 적용
Owner가 precheck → apply → postcheck 실행. secdef/stable/고정 search_path/authenticated 허용/anon·service_role 차단 결과 모두 예상 일치. 기존 함수나 Ledger 행은 수정하지 않았다. rollback.sql은 새 조회 RPC만 제거한다. UI가 의존하므로 WEB 이전 배포 복귀 후 제거한다.

## 보존 검토 7항
1. 기존 Ledger는 불변 원천으로 보존한다.
2. 과거 사실 UPDATE/삭제 없음, 현재 집계만 읽는다.
3. 기존 계정·grant·거래 식별 관계를 유지한다.
4. 새로운 개인정보나 결제자료 수집/저장 없음.
5. 조회는 기존 관리자 및 활성 계정 경계를 적용한다.
6. 출력은 플랫폼 집계만 포함하며 학생 PII/답안/거래 식별자 원문을 제외한다.
7. 파생 지급 집계와 스토어 현금 매출을 구분하며 확인 불가 금액을 0원으로 단정하지 않는다.

## 검증
관리자 테스트 102 PASS (13파일), typecheck·수정 파일 lint·Production build PASS. 로컬 PostgreSQL: 3건/5지급, 소비 제외, 상품/날짜 경계, 역할 차단, rollback PASS. 기존 전체 suite 실패는 이번 관련 검사 결과와 별도이며 전체 PASS를 주장하지 않는다.

## 배포·복귀
배포 전 정상 WEB: e5106e3 / f73a03d0-6fa7-4969-9e93-d099fb513a1c. Essay Worker 및 Math 실행/과금 계약 변경 없음. 배포와 화면 검증 결과는 아래에 추가한다.

## DB·스토어 후속 준비
운영 verify-iap-purchase v23 ACTIVE 확인. 10월23일 v17 실패 인수인계는 현재 지급 성공 상태와 다르므로 재복구/재구매하지 않는다. 기존 실제 지급 3건이 존재한다. 현재 스토어 콘솔의 배포/심사 버전은 별도 확인해야 하며 과거 build19/Android18 기록을 최신으로 단정하지 않는다. 신규 대학 공개나 결제 설정 변경 없음.

## 운영 검증 완료
Production source `8261d17d1d379feff16e247267583ea4a165f86b`, 배포 `7ff387f2-4625-40e2-b557-61b71c1dbd64`. canonical API environment=production/status=success 확인. 실제 관리자 결제 화면에서 App Store2건/4 + Google1건/1, 합계3건/5 표시. 결제 통계/개별 주문/크레딧 통계 각5행, 통계 다음 페이지2 전환 및5행 확인. 기존 구매 잔액4와 새 설명 확인. 원격 코드 SHA 일치.

스토어 후속: 기존 IAP 작업 디렉터리의 ignored production config로 양 플랫폼 `tool/store-release --check` PASS. APP 구매/크레딧 관련12테스트 PASS. 현재 체크아웃 Android signing config 존재, iOS Auth.local.xcconfig 부재(기존 안전한 설정 재사용 여부 확인 필요). 스토어 버전 확인은 Apple 로그인/Play 기존 개발자 계정 전환 대기. 업로드/심사 제출/결제 설정 변경은 하지 않았다.

## 후속 Owner 사용자 내역 정책 — 로컬 수정, 미배포
APP/WEB 사용자 내역은 reserve/release를 숨기고 같은 decision의 consume을 합산하여 `논술 첨삭` 및 부호 있는 크레딧 수량으로 표시한다. WEB은 기존 필터/합산을 재사용하고 decision 없는 legacy consume도 보존한다. 원장/잔액계산/관리자표시는불변. APP15테스트/analyze, WEB80테스트(2skip)/typecheck/lint/boundary PASS. 대학·시험명은현재크레딧조회에없어추정하지않음. 앱수정전빌드를지적한Owner지시에따라이번변경빌드·배포/push 보류. 기존Production8261d17은그대로다.
