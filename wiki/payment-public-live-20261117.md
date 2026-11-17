# 일반 로그인 사용자 Toss LIVE 공개 — 2026-11-17

Owner가 “전체 결제 가능하게 수정해봐”로 기존 admin 단일 QA 및 PAUSED 유지 정책을 대체했다. 일반 인증 사용자 네 상품 LIVE, 고정 review UID TEST 전용. 비로그인 주문/타인 주문/클라이언트 금액 변조는 차단. 실제 카드 인증·결제는 Owner 직접, 환불 별도. 상품 1/3/5/10회 4900/11900/17900/29900원, 기존 원장/지급 계약 보존.

## 구현과 검증

PAYMENT_PUBLIC_ENABLED=true일 때만 fresh Auth의 일반 사용자 구매 허용. 기존 QA 제한 경로는 비공개 설정 시 유지하며 PAYMENT_ENABLED=false가 우선한다. review UID의 과거 LIVE 승인도 차단. DB는 이미 일반 LIVE/review TEST를 구분하므로 11/15 미적용 QA SQL은 적용하지 않는다. 신규 스키마/SQL 변경0.

합성 전체2108 PASS/5 SKIP, TypeScript 및 변경 ESLint PASS, Pages Functions 빌드 PASS. 현재 운영 소스0bcf681의 GA4 파일·타입을 그대로 보존했고 배포 계획에서 비결제 API 입력75 및 정적자산3070개 보존 확인. 결제 API 두 파일만 동작 변경하며 UI 자산은 모두 그대로 사용한다.

Finance는 기존 signer/subject/essay_finance 역할 유지, 기존 JWKS와 일치 확인 후7일 갱신 토큰으로 읽기 RPC PT404 확인. 만료2026-11-24 18:03:34 KST. 자동 갱신 미구현이며 그 전에 기존 절차로 갱신 필요. Secret은 비공개 임시파일만 사용, 로그/Git/채팅 출력0.

## 운영 진행

사전 기준 deployment a5fc7139-2807-40bc-8985-3e175ae73e83, mode LIVE/enabled false. PAUSED 단계에서 Finance Secret 및 명시적 public flag만 갱신·배포, 관리자 읽기 진단 후 PAYMENT_ENABLED=true 활성화 예정. 실제 반영 영수증은 후속 기록한다. 롤백은 PAYMENT_ENABLED=false로 신규 결제를 중지하는 배포이며, 기존 DONE 복구·기록은 보존한다. 배포 후에도 실제 카드 승인/지급 E2E 전에는 실결제 성공이라고 보고하지 않는다.

## 실제 배포 영수증

복구단계526ed879-1b91-443a-9371-80b07fe39ccc: PAUSED 상태 관리자 Finance PT404(권한확인), Toss200/MID일치. 공개배포3f7a57bb-5096-488c-bef1-f28787f7f458/source01d2624: PAYMENT_PUBLIC_ENABLED=true, PAYMENT_ENABLED=true, MODE LIVE. 비로그인runtime consumer_purchase=false. 기존3070자산 및 비결제API75입력 보존. 기존설정 중 Finance/Public/Enabled만 변경. SQL0.

pricing에서 admin 1c4900원 LIVE Toss창 확인, 신규주문86f4d220-6527-4689-8723-52800802b2b6 생성, 잔액92·지급0. 실제 인증/결제는 Owner 인계중이며 승인/지급성공은 미검증이다. review TEST와 일반비관리자 허용은 합성테스트PASS, 이번 운영 계정전환E2E는 미실행.

## LIVE E2E 성공 — 11/17 18:11:53 KST

Owner 직접 카드결제 완료. 주문86f4d220-6527-4689-8723-52800802b2b6: LIVE/4900원/PAID/POSTED, CONFIRM SUCCEEDED. 지급1개·purchase원장+1 한 행, 잔액92→93. 실제WEB /account/credits/ 구매+1/구매분1/전체93 확인. 유효기간2027-02-17 18:11:53 KST. 중복지급0·환불0. APP실기기 잔액은 NOT TESTED. 일반LIVE공개 유지. Finance11/24 갱신필요.

## 환불 시험 및 요금 UI 후속

Owner가 일반 결제 유지·방금4900원 주문 환불 시험과 pricing 경계/문구/줄바꿈 수정을 요청했다. DB 사전검사에서 해당 구매grant는 purchase+1만 존재, 사용/예약0으로 전액 환불 대상. 기존 support-inspect/support-cancel 서버 API를 사용하는 Owner 고정UID 전용 환불 제어를 관리자에 추가했다. 서버의 기존 freshAuth/support허용목록/finance권한/미사용계산을 유지하며 금액은 클라이언트가 전송하지 않는다. 대상 확인과 실제 실행을 분리하고 실행시 금액·회수량 확인, 중복 클릭 잠금 및 요청키 재사용, 불확실한 응답 시 재실행 차단 안내를 적용했다. 실제 환불은 아직 수행하지 않았다.

pricing 상단header 테두리, 페이지 범위 섹션/FAQ/카드 내부 구분선 대비 강화. ‘적용 준비 중’ 제거, 비활성 쿠폰 적용 동작은 유지. 판매설명 max-width 해제와 의미단위 nowrap으로 ‘최초 첨삭 1회’ 중간 분리 방지. 다른 페이지 전역 시각 변경은 없다.

관련5파일200 PASS, TypeScript/ESLint/webpack static build PASS. UI 배포는 pricing/admin-payment 두 경로와 추가 hashed assets만 변경, 현재 LIVE 설정·결제API·그 외 기존정적자산 보존. 실제 배포/환불 결과는 후속 기록.

UI 운영배포2e1a82a9-8d0d-4906-85e5-7b5350d45e84/source afc60eb. pricing 실제배너/구분선/설명줄바꿈/준비중문구삭제 확인. 기타3059경로·API·설정 보존. 관리자에서 기존 support-inspect 성공:4900원/회수1/eligible. Owner 최종환불 실행 인계중, 환불완료 아님. 모바일viewport 시각검수 미실행.


## LIVE 환불 E2E 성공 — 11/17 18:25:26 KST

Owner 직접 환불 실행·확인 후 운영 DB/WEB 검증: 주문86f4d220-6527-4689-8723-52800802b2b6 CANCELLED/REVOKED, CANCEL SUCCEEDED 4900원/error null. 원장 purchase_v1 +1 및 purchase_cancel_v1 -1 각각1행·예약0, 중복회수0. WEB 환불완료 메시지 및 이용권 전체92·구매0 확인(93→92). 기존 서버의 Toss 취소응답 검증 성공이며 독립 Toss GET/카드명세/APP 실기기는 미검증. 일반LIVE·review TEST 유지, 추가배포/SQL 없음. Finance11/24 18:03:34 KST 이전 갱신 필요.


## 이용안내 항목별 테두리 후속

Owner 요청에 따라 /pricing/ 판매상품·쿠폰·구매안내·이용범위·방법·조건·FAQ·환불·고객센터·사업자정보 각 section을 2px navy 전체 테두리·흰 배경·동일 여백으로 구분한다. FAQ 질문별 테두리와 이용단계/연락처 대비도 보완한다. 기존 논술LAB 카드 경계 정책을 재사용하며 가격/문구/결제/DB 변경0. 운영 검증은 후속 기록.
