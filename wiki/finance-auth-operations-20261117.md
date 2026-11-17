# Finance 자동 갱신 구현·운영 인계

**PARTIAL / NOT DEPLOYED**. Owner 요청의 운영 적용 순서 5번에 따라 별도 운영 승인 대기.
정책·전체 비교·권한/원복/검증의 정본은 APP Wiki `wiki/finance-auth-renewal-20261117.md`다.

## 구현 위치

- `cloudflare/finance-auth/{credential,core,worker}.ts`: 동일 ES256/7일/essay_finance 발급, JWKS·읽기 검증,20%이전갱신,60/300/900/3600초 재시도, 단일DO 직렬화, AES-GCM 저장, alarm+cron.
- `cloudflare/finance-client.ts`: false/미설정=기존, shadow=새상태만 검증, true=자동. 유효한 기존 Secret fallback. PostgREST JWT 거절만 동일 RPC 한 번 재시도. 비Production·비Finance 목적지 차단.
- 기존 payment RPC/권한/멱등성 유지. `/api/payments/finance-auth-status` 고정Owner freshAuth. 기존 관리자 결제 화면에 상태·경고 패널.
- 신규 Worker 설정 `cloudflare/finance-auth/wrangler.bootstrap.jsonc`(cron없음) → `wrangler.jsonc`(15분). 둘 다 workers_dev/preview_urls=false. 공개 route 추가 금지.

## 승인 대상으로 고정한 변경

1. 동일 계정에 `legendstudy-finance-auth` Worker와 `FinanceVault` SQLite DO 설치.
2. Worker Secrets FINANCE_SIGNING_JWK(기존키), FINANCE_SUBJECT(기존값), FINANCE_PUBLISHABLE_KEY(기존값), FINANCE_STORAGE_KEY(새32바이트) 등록. 원문을 CLI인자/로그/Git/채팅에 쓰지 않는다. secret bulk 입력은 보호된 프로세스 stdin 또는 Owner Dashboard 사용.
3. Pages legendstudy-lab Production private service binding FINANCE_AUTH→legendstudy-finance-auth. Preview 미연결. 기존 PAYMENT_FINANCE_TOKEN 유지.
4. PAYMENT_FINANCE_AUTO=shadow로 새 서버코드·관리자 화면 배포 → Owner상태/읽기/실제 alarm/cron/비Owner403 검증 → true 전환 배포. PAYMENT_ENABLED=true·MODE=LIVE·PUBLIC=true·review TEST 및 Toss키 불변.
5. 이후 토큰 갱신은 DO 내부에서만 수행하며 환경변수 교체·재배포가 필요 없다. SQL/GRANT0, 실제결제/환불0.

## 원복

PAYMENT_FINANCE_AUTO=false + Pages 재배포 또는 직전 배포 복귀. 기존 Secret 만료11/24 18:03:34 KST 뒤에는 먼저 기존 방식으로 같은 claims의7일 토큰을 읽기검증 후 해당 Secret 한 항목만 교체해야 한다. 서명키·암호화키를 임의 회전하거나 DO 자격증명 이력을 삭제하지 않는다. 키 분실은 승인된 복구 절차로 처리한다.

## 보안 및 한계

같은 프로젝트 EC private key는 암호학적으로 Finance 전용이 아니다. 발급 코드의 고정claims·private binding·공개라우트없음·운영자 접근 제한으로 격리하지만 signer 침해 위험이 남는다. Pages에는 서명키를 넣지 않는다. DO는 AES-256-GCM 암호문으로 active/previous를 보관한다. 실제 CF 다중리전·알람·전환은 승인 후 검증. 외부 알림채널은 없으며 관리자 상태확인/Cloudflare 로그만 제공; 이메일 발송/독립 외부heartbeat/사용자알림탭 미구현.

## 검증 영수증

전체2161 PASS/5 SKIP 뒤 최종 목적지·shadow·멱등성·실제읽기 상태 추가 검사202 PASS. TS/ESLint/Next build/Pages compile/Worker dry-run PASS. 실제 후보/기존토큰 읽기 PT404, 비시간claims동일, 익명401. 주문22/operation13/ledger889행·payment_process MD5·ACL 불변. 기존배포 fb94f1da-0603-4a45-9d65-d387edb730b7 보존; 설정/Secret 업로드0. 실제 자동갱신 운영 완료가 아니다.
