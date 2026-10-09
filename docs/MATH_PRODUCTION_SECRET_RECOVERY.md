# Math Production configuration recovery — 2026-10-09

> SECURITY FOLLOW-UP (Oct09): the Legacy signing secret was subsequently pasted into chat. Do not use the original-token generation/re-registration instructions below with that exposed key. Current Production has the provider Secret but neither Worker JWT (Preview also absent). Review the dependency evidence in Unified Daily before replacement/revocation; no runtime or Ledger change is authorized by this note.

**PARTIAL.** Existing code, migrations, ledger and authentication design are unchanged.

## Verified evidence

- Latest LAB main `2cd74ed`; APP integration `8e89dfc`; Unified Wiki `0491cb7` at start.
- Oct05 Unified Daily: Owner registered OpenAI key; Codex re-registered an already
  locally stored extraction JWT through Wrangler after explicit authorization.
  RPC401 resolved. This records registration/reuse, **not original JWT issuance**.
- Oct06 Daily: account lifecycle worker's legacy HS256 custom JWT failed after
  an ES256 signing change. That worker alone adopted a separately approved
  service-role path. This is **not authorization or evidence for Math substitution**.
- Current JWKS advertises ES256. This does not prove which algorithm/issuer/TTL
  the encrypted Math tokens contain, or that every legacy token is rejected.
- Math transport uses the same Production Supabase URL in both environments:
  `apikey=MATH_SUPABASE_PUBLISHABLE_KEY`, `Authorization: Bearer <worker JWT>`.
  Extraction calls `math_extraction` and bounded `math_artifact_storage`/private
  Storage; evaluation calls `math_evaluation`. These are Pages server handlers,
  not a separate external Worker URL. PostgREST/platform validates signatures
  and maps the signed role; availability only performs an additional role/exp
  check and is not the authoritative signature verifier.
- Roles `math_extraction_worker`/`math_evaluation_worker`: NOLOGIN, NOBYPASSRLS,
  enrolled under authenticator, execute own RPC=true, other role RPC=false.
  `math_executor` is not a token role. JWT audience/issuer/original operational TTL
  and signer/private-key location were **not recoverable** from the searched records.
  Auth's current user JWT expiry3600 does not establish worker TTL.
- Cloud workspace environment/local config candidates: no original three secrets.
  Supabase Edge secret inventory and Vault names: no Math provider/worker backups.
  GitHub Actions Secrets list:403 (unknown presence, not proof of absence).
  GitHub environments:empty. Cloudflare encrypted bindings exist on math-test;
  API responses cannot export the plaintext. Owner Mac filesystem is not mounted.
- **Fresh MATH_TEST_ACCESS_TOKEN Auth200**, approved math-test allowlist identity
  matches. Own credit_summary/math_input history both200; no identity/answer output.
  Previous expired-token blocker is superseded for this current session.

## Applied directly

Partial Cloudflare PATCH, matching official Wrangler's upsert semantics, adds9
non-secret Production bindings: provider OPENAI, model gpt-5.6-sol, origin
https://lab.legendstudy.com, same project/ref/URL/publishable key, and MATH_ENABLED,
MATH_PROVIDER_CALLS_ENABLED,NEXT_PUBLIC_MATH_ENABLED all **false**. Existing unrelated
bindings and Preview compared before/after unchanged. Test subject list NOT copied.
Three secret values NOT copied/minted/rotated. No schema/application code changes.

Same existing Production source commit redeployment **SUCCESS**:
`feef6f7d-113e-4193-9f59-3288c6449610`, completed 2026-10-09 17:25 KST.
Authenticated custom-domain availability and anonymous pages.dev availability
HTTP200, all four types false. Requests with default Python User-Agent to the custom
hostname returned403; browser User-Agent authenticated request succeeded. Do not
confuse that response with Supabase user authentication failure.

## Owner-only steps (all in one block)

```text
A. 공통 등록 위치
1) https://dash.cloudflare.com/ 접속.
2) Workers & Pages → legendstudy-lab → Settings → Variables and Secrets.
3) 환경은 Production 선택. Preview 및 legendstudy-lab-math-test는 변경하지 않음.
4) Add variable → Type: Secret → 아래 이름과 대응 원본 값을 등록 → Save.
   이미 등록된 원본 값을 채팅·Git·로그에 붙이지 않음.

B. MATH_PROVIDER_API_KEY
- 값: 기존 Math 테스트용 OpenAI 프로젝트에서 사용하던 실제 API Key.
- 기존 비밀번호 관리자/보안 백업에 원본이 있으면 그대로 재사용.
- Cloudflare의 “Value encrypted”는 복사할 원본 값이 아님.
- 원본이 정말 없을 때만 https://platform.openai.com/api-keys 에서
  기존 조직/프로젝트 선택 → Create new secret key → 생성 직후 안전하게 보관.
  기존 테스트 키는 폐기/교체하지 않음. 다른 프로젝트의 키를 임의 사용하지 않음.
- Cloudflare Production Secret 이름: MATH_PROVIDER_API_KEY.
- 확인: Secret 형식으로 등록됨. 실제 API 접근·모델 사용 가능 여부는 Codex가 검증.

C. MATH_EXTRACTION_WORKER_JWT
- 값: 기존 Supabase stlhijzpjfgwwdgunlsd가 수락하는 서명된 Worker JWT.
- 필요한 role: math_extraction_worker. 만료되지 않은 기존 원본을 사용.
- 원본 위치: 당시 Mac/보안 백업/기존 안전한 발급 도구의 보관본.
  Wiki에는 “기존 로컬 JWT 재등록”만 있으며 파일 경로·생성 명령은 남아 있지 않음.
- Cloudflare Production Secret 이름: MATH_EXTRACTION_WORKER_JWT.
- 원본이 없거나 만료됐다면: 임의 문자열/JWT 생성 사이트를 쓰지 말고,
  기존 승인된 signer/서명키 보관 위치부터 복구해야 함.
  Supabase Dashboard에서 이 custom-role JWT가 자동 발급된다고 안내할 근거는 없음.

D. MATH_EVALUATION_WORKER_JWT
- 값: 같은 프로젝트가 수락하는 서명된 Worker JWT.
- 필요한 role: math_evaluation_worker. 추출용 JWT와 서로 바꾸어 쓰지 않음.
- 기존 원본/발급 도구 복구 조건은 C와 동일.
- Cloudflare Production Secret 이름: MATH_EVALUATION_WORKER_JWT.

E. 하지 않을 것 / 완료 기준
- JWT 대신 Supabase access token(sbp_...), anon/publishable key, service_role key,
  로그인 사용자 access_token을 넣지 않음. 프로젝트 서명키를 회전하지 않음.
- 과거 HS256 생성 명령을 추정해 실행하지 않음. 현재 공개 JWKS는 ES256임.
- 저장 후 세 이름이 Secret으로 존재하는지 확인. 값은 보내지 않음.
- 기존 발급 도구/원본이 없으면 Worker 두 항목은 미완료로 남김.
- MATH_ENABLED / MATH_PROVIDER_CALLS_ENABLED / NEXT_PUBLIC_MATH_ENABLED는
  false 유지. 허용 사용자 목록을 전체 사용자로 확대하지 않음.
- 등록 완료 상태만 알려주면 Codex가 동일 코드 재배포, 실제 Worker 인증,
  승인된 테스트 계정의 Provider 평가 → 최초1Credit → 포함 재첨삭0Credit
  → History 검증을 수행. Secret 존재만으로 성공 처리하지 않음.
```

## Remaining verification

Production original secret connection0; provider calls/evaluation/rewrite/re-evaluation/
credit debit in this task0. Existing own Credit/History reads are not evaluation E2E.
Billing balance/limit/cost NOT_ASSESSABLE without Provider access; no charge/top-up made.
Original Math signing instructions were not found, so an exact renewal procedure cannot
honestly be claimed as restored. No fabricated issuer/audience/lifetime or signing key.

Payment/Toss/IAP, Signup, Credit ledger, Target005 HOLD, Migration010 and user data
unchanged. No new test server, grants, migration or evaluation implementation.
