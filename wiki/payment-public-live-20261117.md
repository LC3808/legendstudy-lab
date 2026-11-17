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
