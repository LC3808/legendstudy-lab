# TASK17 토스페이먼츠 재심사 안내서

2026-11-02. 현재 상태: TEST 요청·인증·승인·성공 화면 확인 완료. 실제 카드사 거절 callback/승인 후 환불은 미검증. 아래 안내는 제출 초안이며 아직 전송하지 않았다.

## 심사 접속 경로

1. https://lab.legendstudy.com/login/ 에서 기존 review@legendstudy.com 계정으로 로그인한다. 비밀번호는 기존 안전한 전달 경로를 사용하며 이 문서에는 넣지 않는다.
2. https://lab.legendstudy.com/pricing/ 로 이동한다.
3. 1/3/5/10회 이용권 중 원하는 상품을 선택한 뒤 결제하기를 누른다. 가격은 각각4,900/11,900/17,900/29,900원이다.
4. Toss 창에서 상품명 논술 첨삭 N회 이용권 TEST, 금액, “실제 결제가 안되는 테스트” 표시를 확인한다.
5. 카드사 인증을 마치면 /payments/success/ 에서 TEST 결제 확인 결과를 표시한다. 실제 이용권은 지급하지 않는다.
6. 결제창의 결제 취소는 요금 화면으로 돌아와 취소 안내를 표시한다. 결제 실패 안내 경로는 /payments/fail/ 이며 다시 시도 링크를 제공한다.

## 상품 설명 및 제한

구매한 횟수만큼 논술 첨삭을 이용하는 서비스 이용권이다. 충전형 포인트가 아니다. 각 이용권에는 최초 첨삭1회와 동일 답안 재첨삭1회가 포함된다. 재첨삭은 최초 결과 제공일로부터14일 이내, 구매 이용권은 결제일로부터3개월이다. 정기결제/자동갱신이 아니다. 기존 가격·환불 계산·유효기간은 변경하지 않았다.

WEB 요금·결제·환불 화면과 해당 경로 상단 잔액 표시만 명칭을 변경했다. APP/DB Credit 구조, WEB MY/학습화면의 기존 명칭은 이번 범위 밖이다. 따라서 홈페이지 전체 명칭 변경 완료라고 제출하지 않는다.

서버의 인증된 user_id 허용목록에 review 계정만 등록된다. payment 계정은 이번 Owner 지시로 제외한다. 관리자 권한은 심사 권한이 아니다. 일반 사용자에게는 결제를 제공하지 않는다. TEST/LIVE 분리 및 LIVE HOLD 유지.

## 검증 증빙

- 운영 배포e8c2a05f-6e13-42c3-9346-4eb42c4d9214, 소스b0176ff74a8ee59d796214f2c55c7dffed1e0f0b. Owner 명칭 정정으로 상품의 AI 접두어를 제거했다. 기존 성공 거래의 당시 기록은 보존한다.
- runtime HTTP200 REVIEW/TEST, 비로그인 consumer_purchase=false.
- 비로그인 orders/confirm/status/cancel HTTP401. 관리자 로그인 화면 결제 버튼 비활성 확인. 일반 사용자/이메일·관리자 우회 차단은 서버 회귀검증 PASS; 별도 일반계정 실제 로그인 검증은 미완료.
- Owner review 로그인 후 실제1회 TEST 주문 및 Toss 결제창 진입 PASS.
- Toss 결제창 취소→취소되었습니다 안내 PASS. 승인 후 거래취소/환불 검증과는 구분한다.
- 실패 페이지 직접접근 PASS; 실제 카드사 거절 callback은 미검증.
- 성공 승인 E2E PASS: 2026-11-02 13:30:30 KST, Toss TEST confirm HTTP200/DONE(Owner 제공 API 로그 화면), 운영 주문 f1f36979-33fa-4ee2-971d-7646d6e367f8 PAID/TEST_RECORDED/grant_id NULL, CONFIRM SUCCEEDED 정확히1건. Owner가 성공 화면의 논술랩 이용하기/마이페이지 이동을 확인했고 이후 논술 LAB으로 이동했다.
- 실제 이용권 지급0, LIVE 주문0. 기존50grants/139transactions 전체행해시 동일. 전체51/140으로 증가한1건은 signup_bonus_v1 +3이며 결제 지급이 아니다.
- 결제관련175테스트,계정/잔액15테스트,typecheck,선택파일lint,정적build PASS.

## 운영 유지·회수

기존 ES256 서명키/기존 gateway subject로 Finance JWT를24시간 갱신했고 읽기 전용 get 검증 PT404를 확인했다. Cloudflare legendstudy-lab Production에서 PAYMENT_FINANCE_TOKEN과 PAYMENT_REVIEW_SUBJECTS 두 필드만 변경했다. DB/서명검증키/ACL 변경없음. 새 토큰 만료는2026-11-03 13:21:09 KST이다. 심사 전에 유효기간을 확인하고 기존키의 갱신/단일Secret반영/보존재배포를 수행해야 한다. 자동갱신은 구성하지 않았다.

심사 종료 시 PAYMENT_ENABLED=false 및 REVIEW 허용목록 비움→보존재배포→서버차단 확인. TEST 기록은 보존한다. 공개된 JWT 복사본은 Secret삭제만으로 폐기되지 않으므로 만료와접근차단을구분한다. LIVE 전환은 별도 Owner 승인 대상이다.

## 회신 초안 — Owner 제출용, 아직 발송하지 않음

안녕하세요. 안내해주신 서비스 이용권 분류 기준에 따라 WEB 요금·결제·환불 화면의 상품 명칭을 이용권으로 변경하고, 구매 횟수만큼 논술 첨삭을 이용하는 상품임을 명시했습니다. 기존 review@legendstudy.com 계정으로 로그인한 뒤 https://lab.legendstudy.com/pricing/ 에서 TEST 결제창을 확인하실 수 있습니다. 일반 사용자의 결제는 계속 제한하며 TEST 결제에서 실제 청구나 이용권 지급은 발생하지 않습니다. TEST 결제 요청부터 승인·완료 화면까지 확인했으며, 승인 API HTTP200/DONE 및 실제 이용권 미지급을 검증했습니다. 첨부된 검증 결과를 참고하여 재검토 부탁드립니다.

실제 카드사 거절 및 승인 후 취소/환불까지 모두 검증했다고 기재하지 않는다. 전체홈페이지명칭변경을요청받은경우WEB MY/학습화면의범위차이를먼저설명한다.
