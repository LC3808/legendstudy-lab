# 한양대학교 자연논술 운영 연결 완료 · 2026-11-07

판정: **PRODUCTION_CONNECTED / 기술적 서비스 연결 PASS**. Owner가 추가 17시험·34문항 운영 적용을 승인했다. 기존 4시험·8문항을 유지하여 **전체 21시험·42문항**을 공개했다. 실제 첨삭 품질은 Owner·사용자 검증 대상이며 이번 작업에서 품질 PASS를 주장하지 않는다.

## 운영 적용

- Registry → 공식 평가 Package → 공통 Math Worker: 42문항 연결. 기존 16시험·32문항 ID 유지, 사전 누락 확인된 2024 수시 자연 오후1만 고정 ID로 등록했다. 기존 4시험·8문항과 다른 대학 범위는 유지했다.
- 신규 Package: 공식 채점 기준 214행, 공식 풀이 요약 102단계, 검수 해시로 고정된 공식 지면 133쪽/34문항. 원본 수학 기호는 기존 공통 Worker 입력에서 확인한다. 별도 문항별 엔진 없음.
- 학생 문제 PDF 17개: 비공개 Storage 업로드·재조회 후 크기와 SHA-256 일치. 일반 로그인 사용자의 해당 문제 PDF 열람 정책만 추가했다. 채점표·공식 풀이 원본 테이블은 학생 직접 조회 불가.
- 운영 Migration: `task20_hanyang_17_exam_packages_20261107`, `task20_hanyang_17_exam_public_connection_20261107`. 전체 TEST SQL을 복사 적용하지 않았다.
- 공개 설정은 기존 목록에 정확한 ID만 추가했다. Pages `ESSAY_PUBLIC_EXAMS` 225→242, `ESSAY_BETA_EXPANSION_EXAMS` 55→72, `MATH_PUBLIC_LEAVES` 112→146. 기존 Secret·Preview 설정 보존.
- 이 시험들은 standalone Math 경로를 사용한다. Pages Functions와 DB claim 입력을 연결했으며 별도 Essay Worker의 코드나 설정을 변경하지 않았다. 기존 결과·History·무료 재첨삭/finalize 계약 유지.

## 일반 사용자 운영 WEB 전수 검증

Owner가 관리자 권한 없는 계정으로 로그인한 뒤 한양대 자연 21회차를 각각 선택했다. **42문항 모두** 문제 PDF의 해당 페이지 렌더링, 수식·텍스트 답안 입력, 두 문항의 `첨삭 요청 준비 완료`와 활성 `회차 첨삭 요청 · 이용권 확인` 버튼을 확인했다. 관리자 화면 결과를 일반 사용자 PASS로 계산하지 않았다.

입력이 없는 문항에는 임시 검수 텍스트만 사용하고 기존 입력은 보존했다. 입력 확인 후 임시 입력을 원래 값으로 복원했다. `회차 첨삭 요청 · 이용권 확인` 및 `첨삭 진행하기`는 누르지 않았다. 사진 OCR이나 평가 Provider를 호출하지 않았다. 새 입력 확인 기록은 34건 추가됐고, 기존 입력/평가 기록은 삭제하지 않았다.

PDF 캡처 일부가 로딩 중 찍힌 것을 발견하여 **PDF 본문 로딩 완료 후 해당 첫 문항만 재확인**했다. 최종 42개 캡처에서 실제 문제 본문을 확인했다. 이는 반복 평가가 아니라 열람 증거 보완이다.

## 보존·회귀·빌드

- 기존 Math 평가 13건, Math 입력/시도 35건 및 기존 이용권 계정·지급·거래 행의 해시가 모두 보존됐다. 신규 Math 평가 0건, Provider 0회, 일일 무료 지급/견적/차감 호출 0회.
- 검증 종료 시 Math 입력/시도는 69건. 운영 전체 이용권 테이블에는 동시 서비스 활동으로 새 행이 나타났으나 사전 존재 행은 모두 동일했다. 전체 운영 건수가 고정됐다고 주장하지 않는다.
- 기존 공개 RPC 4개 ACL 동일. 학생의 공식 근거 이미지 직접 조회 차단 유지. 21시험 Catalog와 각 시험 2문항 release catalog 일치.
- 기존 TEST 계약·원복/권한 검사와 WEB 매핑 22개 PASS를 재사용했다. 최종 배포 소스로 TypeScript 포함 Next production build 및 Functions compile PASS.
- 직전 운영 공지 변경을 보존한 소스에서 배포했다. 기존 정적 자산 2,166개 중 변경된 450경로는 논술 LAB 경로이며, 그 밖의 기존 자산 해시는 동일하다.
- 터미널의 비인증 HTTP smoke는 403으로 정상 검증 근거에 포함하지 않았다. 실제 운영 UI 검증은 일반 사용자 Chrome에서 완료했다.

## 배포·원복

- 배포 소스: `fa000f62b04a67713f4734a68057db7233946af2`
- 배포 ID: `270e517f-34af-4485-af9e-b839381031b8` (production success)
- 직전 배포: `c1a9c957-d648-4d7e-a058-f55ade96452e`, 소스 `7681025cbb26d7e3b820b08eda77f747deba7830`
- 독립 브랜치: `codex/task20-hanyang-production-20261107`. 다른 에이전트의 공지 브랜치와 APP 산출물은 변경하지 않았다.
- 원복은 [기존 승인된 원복 절차](../supabase/candidates/task20_hanyang_full_connection_20261107/README.md#원복)를 따른다. 신규 17시험·34문항의 진입과 PDF 접근만 닫고 직전 함수·설정·WEB을 복원한다. 생성된 Registry·Package·평가·History·입력 기록은 삭제하지 않는다. 이후 타 작업 변경이 있으면 해당 변경분을 먼저 분리한다.

[문항별 검증 JSON](../supabase/candidates/task20_hanyang_full_connection_20261107/production-verification.json) · [Claude 배너용 공개 회차](task20-hanyang-claude-banner-20261107.md) · [한양대 LAB](https://lab.legendstudy.com/essay-lab/universities/hanyang/)

미연결 대상: **0시험·0문항**. 이 문서는 한양대 21시험·42문항 범위만 완료 처리한다. 다른 14개 대학 완료를 의미하지 않는다. 다음 대학은 Owner의 완료 확인·진행 승인 후 착수한다.
