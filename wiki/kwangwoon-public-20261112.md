# 광운대학교 자연·수리 운영 공개 · 2026-11-12

**PUBLISHED — 21시험·42문항 운영 연결 및 사용자 공개 완료.** 최종 운영 확인: 2026-11-12 14:35 KST. 신규 HOLD·미공개 문항은 0개다. 전체 대학 연결 완료나 AI 첨삭 품질 검수 완료를 뜻하지 않는다.

동국대 7시험·20문항 공개 및 2026 모의 Q1 HOLD를 Owner 확인 결과로 인수했다. 다음 대학은 **서울여자대학교**이며 이번 작업에서 착수하지 않았다.

## 기존 자료와 공개 범위

2021–2026학년도 수시 14시험과 2021–2027학년도 모의 7시험이다. 기존 Registry 42개 ID, 문항 단위, 평가 기준, Math package, Worker 자료의 SHA를 유지했다. 이전 TECH 검증(DB 849 / WEB 86 / APP 43 / Python 26)을 재사용했다. 새로운 평가 엔진이나 제품 UI는 만들지 않았다.

- [정확한 ID·SQL SHA](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/kwangwoon_public_20261112/scope.json)
- [문항별 공식 지면 계획](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/natural_tech_ready_20261112/kwangwoon-source-plan.json)
- [PDF 지문·APP/WEB 매핑](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/kwangwoon_public_20261112/pdf-audit.json)

공식 원본의 문제 영역을 분리한 기존 PDF 후보 21파일·78쪽을 재사용했다. 원본·후보 SHA와 픽셀 일치 계약, 숨김 텍스트·주석 부재를 확인하고 전체 지면을 렌더링하여 확인했다. 2021 수시 2교시 Q1 연속 지면과 Q2 시작 부분, 2022 모의 Q2 펼침면의 기존 검수 결과도 유지했다. 문제·수식·평가 기준의 내용 편집은 없었다.

원본 본문 검색에서 명시적 상업 이용·복제·재배포 금지 문구는 발견되지 않았다. 이는 새로운 법률 판단이나 이용 허락 취득을 뜻하지 않는다. 이번 Owner의 공식 PDF 연결·검증 문항 공개 지시에 따라 정확한 42문항 범위를 반영했다. 성균관대 PDF RIGHTS_HOLD는 해제하지 않았다.

## 실제 운영 적용

| 구분 | Migration | 결과 |
|---|---|---|
| PDF | `20261112053152_kwangwoon_21_official_problem_pdfs_read` | 21파일 업로드·다운로드 SHA 일치, 정확한 파일의 인증 사용자 SELECT 정책 1개 추가 |
| Math·Worker | `20261112053237_kwangwoon_42_math_public_release` | 636행 연결, 168개 상태 ACTIVE, 기존 내부 허용 목록 2개에 42문항 추가 |
| 시험 목록 | `20261112053243_kwangwoon_42_browse_public_release` | 기존 목록 함수에서 대상 20시험의 숨김만 해제 |

636행은 Math 8테이블의 594행과 기존 private Worker 자료 42행이다. 신규 RPC는 0개이며 기존 함수 3개의 본문 중 허용·숨김 목록만 변경했다. 서명·소유자·실행 권한과 첨삭 엔진은 보존했다.

기존 광운대 목록 17시험은 동일하게 보존됐고 총 37시험이 됐다. 이 중 이번 대상은 자연계열 21시험·42문항이다. 다른 41개 대학의 목록 반환값과 나머지 16개 숨김 시험도 그대로 유지됐다. 일반 계정 역할의 Math 목록은 기존 340문항에서 382문항이 됐으며, 기존 340문항의 내용은 모두 동일했다.

PDF는 private `essay-material-originals`에 새 SHA 경로로 추가했다. 기존 `account_service_allowed()`를 이용해 정확한 21파일만 허용한다. 기존 RLS 정책 271개는 동일하며 신규 정책은 1개다. 정상 계정 역할에서 21파일 조회, 익명 0파일, 탈퇴 대기 3개 계정 각각 0파일을 확인했다. 삭제 중 계정은 격리 환경에서 차단 PASS이며 운영에는 해당 계정이 없어 NOT TESTED다.

WEB 배포: `df045831-8152-4d90-bd92-30f7847da1f9`
배포 소스: `f931f958359cd1d62eaa147450ba564ead2d713e`

기존 비논술 자산 2,182개, API 소스, 라우팅, Secrets와 Preview 설정을 보존했다. 공개 시험 308→329, 확장 시험 138→159, Math 공개 문항 340→382로 세 공개 범위만 확장했다. 실제 운영 도메인의 논술·로그인·공개 목록 응답은 200, 비로그인 학생 PDF API는 401이었다. APP 배포·스토어 제출은 하지 않았다.

## 시험별 공개

| 학년도·시험 | 시험 ID | 공개 문항 |
|---|---|---:|
| 2021 수시 1교시 | `c435f96e-0ce0-5603-ac22-c0984662eb98` | 2 |
| 2021 수시 2교시 | `a68fa7e1-b701-5c7b-95ae-cfc46850614f` | 2 |
| 2021 수시 3교시 | `eb9c551a-dd29-5454-9a55-8b58a2bb432d` | 2 |
| 2021 모의 | `cb4dc5d6-df44-519d-82b4-64833a13304e` | 2 |
| 2022 수시 1교시 | `de78b082-d9b1-5234-8bb9-d7f7543294db` | 2 |
| 2022 수시 2교시 | `1a3a3532-8fa1-5d33-917c-e99d441e1788` | 2 |
| 2022 수시 3교시 | `18902739-69fc-53c8-a9a7-6bf620c9008b` | 2 |
| 2022 모의 | `76b32d03-e941-51e0-9355-46c139a0617a` | 2 |
| 2023 수시 1교시 | `a2a9d777-2237-50c2-af89-a617b88c5bff` | 2 |
| 2023 수시 2교시 | `5ebc33d1-1097-5ed4-b521-6b9a25d13eaf` | 2 |
| 2023 모의 | `3368bb8c-eaf7-5c8f-9e50-aa86c3eb36a1` | 2 |
| 2024 수시 1교시 | `d2abfee2-2412-5630-9af8-a858116b6759` | 2 |
| 2024 수시 2교시 | `baceb638-55ee-5d78-8ff4-93dad7832914` | 2 |
| 2024 모의 | `10ade245-4c6a-552b-beae-5dc7af3b75bd` | 2 |
| 2025 수시 1교시 | `b1e3505a-359e-5122-bf42-32b1cb49a174` | 2 |
| 2025 수시 2교시 | `1705c7d2-e11d-570f-9a4a-d220d0600acd` | 2 |
| 2025 모의 | `91802b60-96bf-5cb6-abef-d1c1a738ae6f` | 2 |
| 2026 수시 1교시 | `44eba80d-09ed-5e8c-a988-01e90c78ffd4` | 2 |
| 2026 수시 2교시 | `45febe31-1b94-5648-a081-e335f82e81a4` | 2 |
| 2026 모의 | `1e66b782-4e74-5fd4-b36d-032991875522` | 2 |
| 2027 모의 | `6f01f238-622d-5a85-9a04-8bb5a7b9759d` | 2 |

## 검증 결과

| 검증 | 결과 | 범위 |
|---|---|---|
| 운영 SQL | PASS | 사전 158 / 적재 후 199 / 활성화 126 |
| 기존 데이터 | PASS | 적재 전후 20개 비교 동일, 활성화 후 19개 불변 그룹 및 변경 함수 owner/ACL 보존 |
| 격리 Worker 계약 | PASS | 42문항 제출·멱등성·Mock 결과·타계정 접근 차단·재작성·재첨삭·비파괴 원복 |
| 격리 Storage | PASS | 계정 상태 6종, 다른 파일·버킷 차단, 정책 원복 후 객체 보존 |
| 격리 목록 | PASS | 42개 대학 × anon/authenticated, 적용·원복·중복 적용 거부 |
| WEB | 410 PASS / 1 SKIP | 기존 공개 기능 및 자료 계약 |
| APP | 39 PASS | PDF 실제 바이트, 목록, 수학 세션, 혼합 제출, 복원 계약 |
| 정적 검사·빌드 | PASS | 타입 검사, 변경 테스트 ESLint, Next 및 Functions 빌드 |
| 보안 advisor | 기존 222항목 동일 / 신규 0 | 기존 5종 경고·안내를 별도 보존 |

초기 WEB 1건은 PDF 기대 총수 미갱신, APP 1건은 이전 미승인 후보를 참조한 테스트 fixture 때문에 실패했다. 실제 공개 42문항의 메타데이터와 정확한 총수로 테스트를 보완했으며 최종 실패는 0건이다. 제품 코드 변경으로 우회하지 않았다.

운영 일반 계정 **역할**의 목록·기록 조회를 확인했으며 실제 로그인 브라우저 세션 검증과 구분한다. 운영 검수 답안 생성 0건, Provider 호출 0회, AI 품질 판정 0회다. 임시 DB 접속 만료와 Cloudflare 첫 조회 401은 각각 변경 전에 발생했고 기존 인증 갱신 후 완료했다. 636행 적재를 중복 실행하지 않았다.

### 실제 브라우저·실기기 범위

브라우저는 **PARTIAL**이다. 실제 운영 도메인의 비로그인 브라우저에서 자연계열 21회차, 2027 모의 Q1·Q2의 Registry ID, 사진·수식 답안 입력 영역, PDF 파일명·쪽수, 로그인 후 첨삭 안내를 확인했다.

문제 보기 클릭 후 해당 브라우저에서 PDF 또는 새 탭은 확인되지 않아 실제 PDF 렌더링은 **NOT TESTED**로 남긴다. 로그인·답안 저장·제출·결과·재첨삭 화면, iPhone·Android 실기기 역시 **NOT TESTED**다. 격리 Mock 검증을 실제 AI 검수나 실기기 PASS로 기록하지 않는다. AI 첨삭 품질은 전체 대학 연결 후 Owner가 통합 검수한다.

## 보존·복구

원본, Registry, 시행 학년도·문항 ID, 평가 버전과 사용자 기록의 연결 관계를 보존했다. 기존 답안·평가·Credit 정책과 auth identity, 접근 목적, 보존 기간의 의미를 변경하지 않았다. 공식 근거·학생 학습 사실·Mock 결과·모델 판단도 구분한다. 개인정보 신규 수집이나 검수 계정 특권 부여는 없었다. [기존 데이터 보존 전략](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/wiki/longitudinal-learning-admissions-data-strategy.md)을 따른다.

이전 WEB 배포와 세 공개 범위의 복원 정보, 신규 첨삭 진입·목록·PDF 정책의 원복 SQL을 준비했다. 장애 시 신규 공개 범위 회수 → 42문항 첨삭 진입 차단 → 새 20시험 숨김 → 필요시 신규 PDF 정책 회수 순서다. 사용자 기록·공식 파일·연결 자료는 삭제하지 않는다. 현재 함수·배포 지문이 달라지면 자동 복구를 중단한다. 격리 원복은 PASS이며 운영 원복은 실행하지 않았다.

동국 Q1, 숭실 Q2, 성균관 15 RIGHTS_HOLD, 한국항공 5 HOLD, 중앙대 과학 11 HOLD는 유지한다. 한국항공 7문항은 기존 DRAFT 상태다. 전체 대학 작업 완료로 처리하지 않는다.

## Git·증빙·다음 순서

APP 사전 검증 커밋: `9a4e511`. 배포 WEB 소스는 위에 기록했다. 최종 증빙·Wiki HEAD는 이 문서를 포함한 커밋 및 완료 보고를 참조한다. 다음 대학은 **서울여자대학교**다.

- [최종 운영 결과](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/kwangwoon_public_20261112/final-release.json)
- [목록·보존 검증](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/kwangwoon_public_20261112/browse-production-verification.json)
- [WEB 공개 확인](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/kwangwoon_public_20261112/web-production-receipt.json)
- [브라우저 관측 범위](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/kwangwoon_public_20261112/browser-verification.json)
- [보안 검사](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/kwangwoon_public_20261112/security-advisors.json)
- [WEB 원복 범위](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/kwangwoon_public_20261112/web-rollback.json)
