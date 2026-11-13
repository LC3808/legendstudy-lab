# 잔여 6문항 원문 재검증 및 항공대 2문항 공개 — 2026-11-13

상태: **2문항 PUBLISHED / 4문항 공식 근거 충돌 HOLD**. 전체 **304공개·4잔여·308문항**, 확장 전체는 PARTIAL이다. 성균관15와 이화87의 DONE/CLOSED는 유지한다. 이번 Owner의 마지막6문항 지시를 적용했고, 과거 잘못된 HOLD 사유를 그대로 복사하지 않았다.

## 문항별 최종 결과

| 대학 | 시험·문항 | 기존 문항 ID | 결과 | 원본 대조 결과 | 처리 및 필요한 근거 |
|---|---|---|---|---|---|
| 한국항공대학교 | 2024 공학계열 문제 1 | `74e16370-a1be-57f9-b6c7-b2e035bfbb06` | PUBLISHED | p5 로그 합·곱 전개는 일치하며 기존 부호 HOLD 판정은 잘못되었다. p6 최종값 2025/4048 확인. 근의 합 중간 부호 오기는 제곱식·최종 범위와 구분한다. | 기존 공식 풀이·평가표 유지. 서비스 원문 읽기 지침만 추가하고 원문·정답·배점을 변경하지 않았다. |
| 한국항공대학교 | 2024 공학계열 문제 2 | `f0ae1ea0-6c50-5b7e-b42b-35f436849c6f` | HOLD | p9는 거리 LM의 최댓값을 묻지만 p16–17은 부호 있는 차 h=4/t+1-ln(t²/(t²-2))를 사용한다. t→√2+에서 h→-∞, 실제 거리 |LM|는 발산하여 공식 최대 3-ln2와 충돌한다. | 공식 정의역 제한 또는 거리/부호 있는 차의 문제 목표 정정 근거 필요. 임의 정의역·정답 생성 금지. |
| 한국항공대학교 | 2024 이학계열 문제 1 | `2476c8dc-a8e4-599a-8cf2-1ffdddbb6f06` | HOLD | p5–6과 p8의 1-3(1) 부분점수는 2+2+2 대 1.5+1.5+3, 1-3(3)은 2+1+2 대 1+1+3이다. p8 1-3 제목 17점과 실제 6+5+5=16점도 다르다. | 총점만 맞추어 해결할 수 없는 부분점수 우선 기준의 공식 정정 필요. 1-4(3)의 5 대 2+3은 별도 총점 충돌로 보지 않는다. |
| 한국항공대학교 | 2026 이학계열 문제 1 | `8c11754b-d3af-56bf-9b66-d72092468f70` | HOLD | 기존 해설 부호 불일치 주장은 정정: p7 계산과 최종 -1/2^100은 일치한다. 실제 잔여 충돌은 1-1(1) 전부 미기재 p5 평가표 3점 대 p6 예시 채점 0점이다. | 전부 미기재의 공식 점수 또는 두 표의 우선 적용 근거 필요. 0점으로 임의 정정하지 않는다. |
| 한국항공대학교 | 2026 이학계열 문제 2 | `48512d94-959c-5a94-b985-7e1bd005c6b7` | PUBLISHED | p18 주 풀이의 4m²+17m+15=0, 근 -3/-5/4, 최종 -5/4가 일치한다. 기존 -17m HOLD 판정은 원문 렌더와 다르다. | 공식 주 풀이와 p14 평가표 연결. 별해의 치환 변수·분모 오기를 공식 정답으로 채택하지 않도록 서비스 읽기 지침을 분리했다. |
| 숭실대학교 | 2024 자연계열 문제 2 | `815bc344-cdbb-5b7f-82c1-dc528de46f51` | HOLD | 현재 공식 첨부 50쪽의 물리39쪽(인쇄35쪽)은 Q2 총25점, 물리44쪽(인쇄40쪽) 평가표는 소문항25+15=40점이다. 기존 SHA와 동일하다. | Q2 총점 또는 소문항 배점의 공식 정정 필요. 10+15로 추정하거나 40→25 비례 환산하지 않는다. |

페이지는 PDF 물리 페이지다. 원본 PDF/Registry ID 불변. [6문항 원문·해시·Registry·근거](https://github.com/LC3808/legendstudy-app/blob/codex/essay-natural-expansion-20261111/supabase/candidates/remaining6_20261113/source-reaudit-six.json), [4문항 잔여 목록](https://github.com/LC3808/legendstudy-app/blob/codex/essay-natural-expansion-20261111/supabase/candidates/remaining6_20261113/remaining-4.json), [중복 없는 통합304 공개/308 검수목록](https://github.com/LC3808/legendstudy-app/blob/codex/essay-natural-expansion-20261111/supabase/candidates/remaining6_20261113/owner-integrated-review-304.json).

항공대 2024공학 Q1의 로그 전개와 2026이학 Q2의 주 풀이 부호는 실제 렌더에서 정상이다. 공식 원문 안의 다른 중간 표기 오류는 원문 수정이나 새로운 정답 생성으로 처리하지 않았다. 공식 주 풀이·최종값·평가표를 기존 package에 유지하고, 오기와 주 풀이를 구분하는 **서비스 원문 읽기 지침**을 별도 표시했다. 수치 배점은 변경하지 않았다. 기존 Math Worker 구현과 결과 UI를 그대로 사용한다.

항공대 2026이학 Q1의 과거 부호 불일치 주장은 폐기했지만, 미기재 답안의 3점/0점 충돌은 남는다. 숭실대는 [현재 공식 게시물](https://admission.ssu.ac.kr/board/exam_view.asp?flag=&flag2=1&keyword=&number=124&page=1&page_no=1_2_7&srchoption=) 첨부를 다시 확인했고 SHA가 동일하다. 문제의 총25점과 평가표40점을 임의로 맞추지 않았다. 나머지4는 단순 추출·연결 누락이 아니며, 표에 기재한 공식 정정/우선 기준이 필요하다.

## 실제 운영 적용

- 적용 시각: **2026-11-13T11:35:37.680800+09:00**.
- Migration: `20261113023146_kau_two_resolved_public`. 적용 SQL SHA256 `5467598b3fb7d462d4005d86c31620e62519f60dfc2168d455bd5d6a6d336f7f`. 반복 실행하지 않는다.
- 기존2시험/2문항 ID 재사용, 신규 Registry0. Math/공식 Worker 자료 **29행** 연결.
- 기존 Math admission/catalog 함수2개의 허용 대상만 확장. 새 RPC0, 새 Storage 정책0, Provider0.
- 기존 Math451→453. 기존451 전체 동일, 이번 잔여4는 Math 공개 대상에서 제외됨.
- 기존 공개302 검수 레코드 전체 불변. 기존 사용자 답안·평가·Credit 기록과 13개 내부 이력 테이블 보존. 기존 함수360개·RLS275개·127개 관계 권한 보존.
- 기존 승인된 문제 PDF2개: authenticated SELECT2, anon SELECT0. 내부 해설/평가기준 공개 확대 없음.
- Pages `3ebc2fc1-7444-4ff4-9bc6-41c3c195a3f2` / 소스 `c7cfcc2ec06a86fc3f695bef5fc197c71a94ae53`. 기존 비논술 정적자산2221개 보존, 공개 scope 설정3개만 확장. 기존 평가 Worker 배포 불변.
- 공개 HTTP는 기존2시험의 전체 문항 메타데이터4개를 보존한다. 실제 Math 공개·제출 허용 문항은 검증된2개뿐이며 HOLD2의 메타데이터를 첨삭 가능 상태로 오인하지 않는다.

[DB 적용·보존 영수증](https://github.com/LC3808/legendstudy-app/blob/codex/essay-natural-expansion-20261111/supabase/candidates/remaining6_20261113/production-receipt.json), [공개 사후 검증](https://github.com/LC3808/legendstudy-app/blob/codex/essay-natural-expansion-20261111/supabase/candidates/remaining6_20261113/public-postflight.json), [WEB 범위 보존](https://github.com/LC3808/legendstudy-app/blob/codex/essay-natural-expansion-20261111/supabase/candidates/remaining6_20261113/web-deployment-receipt.json).

## 검증과 한계

| 검증 | 결과 |
|---|---|
| 격리 PG17 실제 기존 Math RPC, Registry/package/Worker | 사전16·사후16, 제출·결과·재작성·재첨삭·소유권·멱등22 PASS |
| 비파괴 원복 | 기존451 목록·이력·결과 조회 유지, 신규 평가 차단, 함수 복원 PASS |
| 운영 적용 전후 | 정확한 대상·원본 해시·중복·행수·기존 데이터/ACL 보존 PASS |
| 운영 WEB API/배포/기존 Worker | HTTP ID·기존 catalog·manifest·설정 일치 PASS |
| WEB 테스트/build | 관련63 PASS, Next production build PASS |
| APP 서버 PDF/결과/복원/Credit 계약 | 15 PASS / 4 SKIP |
| 운영 로그인 후 제출·결과·재첨삭 | NOT TESTED — 격리 합성 결과 계약 검증과 구분 |
| 실제 브라우저 PDF 렌더·iPhone·Android 실기기 | NOT TESTED |
| 실제 Provider / AI 품질 | 호출0 / NOT TESTED, Owner 검수 |

[격리 검증 상세](https://github.com/LC3808/legendstudy-app/blob/codex/essay-natural-expansion-20261111/supabase/candidates/remaining6_20261113/math-isolated-results.json). APP 코드 엔진·UI 변경이나 앱 배포 없이 기존 서버 PDF 매핑 계약을 검사했다. SKIP은 실행된 PASS에 포함하지 않았다.

## 원복

사전 검증된 `math-rollback-admission.sql`은 이번2문항의 신규 평가 허용만 회수하고 자료·답안·평가 이력을 삭제하지 않는다. 실제 운영 원복은 필요 없어 미실행. 실행 전 두 함수의 현재 해시가 이번 적용 후 값과 동일한지 검사하고, 후속 변경이 있으면 덮어쓰지 않는다. WEB은 이전 Pages `c3c00aca-9018-437c-bddc-0e125d38b429`와 이전3개 공개 scope로 복구한다. 다른 설정·권한·Credit 변경 금지. PDF Storage 정책은 이번 변경0이므로 복구 대상이 아니다.

## Owner 검수 및 후속

[한국항공대 사용자 진입](https://lab.legendstudy.com/essay-lab/universities/kau/)에서 2024 공학 Q1 또는 2026 이학 Q2를 선택한다. 답안→기존 Math Worker→[기존 결과](https://lab.legendstudy.com/my/essays/)→재작성·재첨삭 경로를 사용한다. 실제 AI 품질은 Owner가 통합 검수한다.

추가 공개2, 전체304/308. 항공3·숭실1은 공식 충돌 해소 전 공개하지 않는다. 전체 DONE/CLOSED로 표시하지 않는다. 구현 WEB SHA는 위 적용 기록, 최종 문서 HEAD는 `git rev-parse HEAD` 및 이 문서 커밋으로 확인한다. 원본·비공개 package·인증정보는 Git에 포함하지 않는다.
