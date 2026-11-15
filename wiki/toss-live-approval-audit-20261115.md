# Toss LIVE 승인 오류·재시험 준비 점검 — 2026-11-15

상태: **PARTIAL / 즉시 재시험 불가(서비스 PAUSED)**. 읽기 전용 조사. 실제 주문 생성·Toss confirm/cancel·결제·지급·설정 변경·배포 0. 결제 실행은 Owner가 수행한다.

## 확인 결과

| 항목 | 근거 및 판정 |
|---|---|
| 당시 심사 | 기존 11/4 인계는 Owner의 LIVE/도메인 승인 확인 이후 첫 시도. 후속 기록에는 앱카드·ISP 인증과 카드사별 순차 반영 안내. 해당 카드사·승인 반영 시각은 남아 있지 않아 당시 완료 여부 확정 불가. |
| 현재 MID | 실제 토스 상점관리자 `leglabn24k`: 계약완료, 계약일2026-11-02, 정산 정상. 국민/하나/BC/신한/삼성/현대/롯데/농협/우리 모두 심사승인. 해외브랜드 AMEX/Diners/Discover/JCB/Mastercard/VISA/UnionPay 미신청. 국내 승인과 해외브랜드 미신청은 구분. |
| 서비스 상태 | Cloudflare canonical9105e9e8, source902057c. PAYMENT_MODE=LIVE, PAYMENT_ENABLED=false, TOSS_MID=leglabn24k, 운영 origin/DB 일치. 읽기 전용 runtime POST200: PAUSED/LIVE/consumer_purchase=false. DB configuration LIVE. |
| LIVE 키 | client/secret 모두 Production secret_text 등록. runtime200은 live_ck/live_sk 형식·MID 설정·Finance 비어있지 않음 검사를 통과했다는 뜻이다. 암호화 secret 원문을 추출하지 않았으며 현재 두 키의 실제 발급 MID/세트 일치·유효성은 NOT TESTED. 11/4 provider의 MID leglabn24k 확인은 과거 근거이지 현재 키 검증 대체가 아니다. |
| 결제창 | v2 standard SDK, requestPayment(method=CARD, 서버가 만든 주문·금액·success/fail URL). card.flowMode/cardCompany/easyPay/submall 인자 없음. 기본 통합창이며 코드에서 특정 카드/간편결제 강제 없음. 당시 Owner는 앱카드·ISP 진행 확인. |
| confirm | 실제 토스 로그 Trace037d14319a903f0ebcbb35a840090b34와 11/4 13:38:34 KST/400/INVALID_UNREGISTERED_SUBMALL 일치. body는 paymentKey/orderId/amount=4900 세 필드, Idempotency-Key 존재. paymentKey·키 원문은 문서에 복제하지 않는다. |
| 서브몰 | 구현에서 서브몰 등록/임의 ID 전달 없음. 오류 메시지만으로 별도 서브몰 시스템이 필요하다고 판단하지 않는다. provider측 내부 매핑·해당 인증 적합성은 Toss의 Trace 조사로 확정해야 한다. |
| 테스트 이력 | 운영 DB TEST20: PAID/TEST_RECORDED10, ORDER_CREATED10, 실제 Credit grant0. LIVE1: FAILED/NONE/grant_id null/paid_at null. 이후 LIVE 성공 또는 재시도 주문 없음. |
| 현재 재현 | 실결제·승인 API 실행 안 함. 동일 오류 재현/해소는 NOT TESTED. |
| 지급·중복 | 아래 서버/DB 계약 및 152개 회귀 PASS. 실제 LIVE 성공 지급 E2E는 아직 없음. |

## 실패 주문 및 원인 구분

주문 `662851a3-77ec-4a17-b83e-7707d41c5ac3`, 1회4900원. KST13:38:04 생성 →13:38:34 CONFIRM_STARTED →13:38:35 UNKNOWN →13:38:41 REJECTED. 승인 operation FAILED/PROVIDER_REJECTED. 확인된 DB 지급0. 카드 명세의 실제 청구·보류 여부를 DB만으로 단정하지 않는다.

공식 오류는 미등록 하위몰 또는 카드사 인증 필요를 함께 설명한다. 계약일 이틀 후·순차 승인 안내라는 이력상 **카드사 등록 반영 지연이 유력 가설**이나 원인 확정은 아니다. 실제 카드사와 11/4 당시 등록 상태, Trace 기반 Toss 내부 거절 사유가 필요하다. 현재 9개 카드사의 심사승인은 유리한 재시험 근거이나 최종 거래 성공을 보장하지 않는다. 서브몰 추가·키 교체·인증방식 변경 근거 없음.

## 재시험 전에 남은 조건

1. **Finance 인증**: 마지막 검증된 갱신 이력의 만료는2026-11-11 11:25:53KST, 자동 갱신 없음. 현재 binding 존재만 확인했으며 갱신/실유효성은 미확인. 기존 credential 경로로 읽기 전용 get/nonexistent 검증 후 필요 시 기존 신원·권한 그대로 갱신해야 한다. 이번에는 토큰/서명키/권한 변경 없음.
2. **API 접근 정책**: 토스 실제 LIVE 접근 정책 화면에서 '대한민국'·연결키3개 확인. 11/9 시행 공지. 현재 배포 secret과 해당 정책의 연결 일치·Cloudflare 결제 Worker 실제 egress 국가/IP는 미검증. 구매자 국가가 아닌 서버 egress 기준이다. 다른 계층의403 API_KEY_ACCESS_DENIED를 기존400 SUBMALL과 혼동하지 않는다. 정책 삭제/범위 확대 없이 기존 서버 경로의 읽기 요청으로 확인 필요.
3. **키 세트 확인**: 비밀을 노출하지 않는 안전한 방식으로 현재 배포 LIVE client/secret과 해당 MID 세트 확인. 현재 metadata와 형식 검사만으로 완전 일치라고 보고하지 않는다.
4. **신규 결제 재개**: 현재 PAUSED이므로 Owner 재시험 시점에 명시적으로 신규 결제 활성화가 필요하다. DB를 TEST로 되돌리지 않는다. 이번 '우선 조사' 범위에서는 활성화하지 않는다.
5. **Owner 실결제**: 승인 확인된 국내 카드로 일반 회원의 새 주문 사용. `review@`의 고정 검증 계정은 TEST로 강제 분리되므로 LIVE 시험 계정으로 사용하지 않는다. 기존 실패 주문 재사용/수동 완료 금지. 이전 smoke 기준1회4900원을 재사용하려면 Owner가 금액·계정 확인 후 직접 실행. 실패/시간초과면 새 결제를 반복하기 전에 기존 주문을 조회해 결과부터 확인한다.
6. **성공 판정**: Toss DONE/MID/orderId/paymentKey/KRW/amount/balance/approvedAt 대조 → DB PAID/POSTED·purchase grant1·거래1·잔액+1·WEB/APP 반영 확인. 환불은 이번 범위가 아니며 별도 Owner 실행/지시 없이는 하지 않는다.

## 기존 지급·중복 방지 계약

Provider lookup-first. IN_PROGRESS일 때만 confirm, DONE이면 재승인 없이 finish. 미확정 오류는 UNKNOWN으로 유지하며 자동 지급 없음. ABORTED/EXPIRED 조회시에만 REJECTED. 모든 응답의 MID·주문·키·통화·금액 검증 후 지급한다.

운영 payment_process는 계정→주문→operation 행 잠금을 사용. LIVE confirm_finish 안에서 credit_post_grant(external_reference=payment/주문UUID), PAID/POSTED, operation SUCCEEDED, CONFIRMED를 단일 DB 트랜잭션으로 처리한다. TEST는 TEST_RECORDED/지급 없음. 유효기간은 실제 승인일+3개월. 중복 finish는 기존 성공 상태/paid_at를 확인한다.

운영 UNIQUE 확인: 주문별 CONFIRM1개, pending operation1개, provider idempotency key, provider/mode/payment identity, credit grant external_reference, transaction idempotency_key, 주문 grant_id. timeout/finish 실패 시 기존 operation/멱등키로 복구하며 다른 identity는 거절. 정책 변경 없음.

## 검증·변경 내역

cloudflare/payments.test.ts, payment-runtime, payment-checkout, payment-test: **152 PASS/0 FAIL**. 합성 테스트이며 실제 금융 승인을 대체하지 않는다. 11/4 배포a901568과 현재 cloudflare/payments.ts diff 없음. 운영 payment_process 정의/unique 인덱스를 읽기 확인. 코드·DB·키·RLS·서브몰·인증방식·접근 정책 변경 없음. Wiki만 기록한다.

기존 상세 인계: APP origin/codex/material-service-app-20261022의 wiki/payment-live-activation-20261104.md. 현재 APP main에 없는 문서라 과거 TEST-only 문서로 대체하지 않았다.

## 공식 참고

- [Toss 오류 코드](https://docs.tosspayments.com/reference/error-codes)
- [SDK CARD/flowMode](https://docs.tosspayments.com/sdk/v2/js/payment-direct)
- [API 키 세트·MID](https://docs.tosspayments.com/reference/using-api/api-keys)
- [API 키 접근 정책](https://docs.tosspayments.com/reference/using-api/api-key-access-policy)
