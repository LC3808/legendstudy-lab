# 관리자 콘솔 PHASE 3 — 2026-11-14/15

Owner PHASE3 / Claude `331aae9`, 기존 WEB `a1fdcb2`, 운영 `9229b2c9` 기준.
[UX 설계](https://github.com/LC3808/legendstudy-lab/blob/331aae9/wiki/admin-console-ux-review-20261114.md), [최종 IA](https://github.com/LC3808/legendstudy-lab/blob/3e84708/wiki/admin-essay-operations-ia-20261114.md), [PHASE2](admin-console-phase2-20261114.md).

## 변경

- 기존 filtered/detail RPC·URL·관리자 게이트·별도 quality_operators 보존. 신규 관리자 RPC 없음.
- 요청/완료/진행/실패/무료 재첨삭/베타 KPI는 동일 서버 필터의 전체 집계. 필터 한 영역, 회원 컬럼 추가, 기존 검색·기간·페이지 이동/URL 유지.
- 상세 6영역: 요약/처리/답안·결과 기본 펼침, 이용권/AI/과거 오류·재처리 기본 접힘. 존재하는 처리 단계만 표시하고 과거 오류와 최종 상태 구분.
- `/admin/essay-runs/preview/?run=UUID` 새 탭: 기존 admin detail 서버 권한으로 조회, ExamResultLayout/EvaluationReport 재사용. 재작성·추가 첨삭·피드백 제출·음성 생성 제외. 결과 없으면 비활성, 팝업 차단 시 직접 링크 안내. 학생 가장 없음.
- 회원/최근가입 목록 닉네임 한 줄 말줄임·전체 title, 상세 원문 유지.
- WEB Intl.Segmenter + Unicode16 호환 계산, Flutter characters 1.4.1, DB Unicode16 UAX29. Unicode17 Intl에서 `U+2701 ZWJ U+2701` 분할이 달라 버전 고정 호환 처리. 공식 16.0 테스트 1,093개로 검증.
- 신규·변경 이름만 20 grapheme. 기존 이름이 같으면 profile payload에서 제외. 학교/학년 저장 보존. APP 온보딩/프로필 공통 검증; 입력 자동 절단 없음.

## 서버 적용 및 원복

설계의 "DB CHECK 없음"과 달리 실제 `profiles_display_name_check`가 80 코드포인트를 제한했다. 20개 가족 이모지를 막으므로 `nickname_private`의 비공개 검증 함수와 INSERT/UPDATE 트리거로 교체했다. 직접 RPC execute 권한 없음; RLS/기존 lifecycle 트리거 유지. INSERT ON CONFLICT의 기존 동일 이름도 보존한다.

[적용](../supabase/candidates/nickname_grapheme_20261114/apply.sql), [원복](../supabase/candidates/nickname_grapheme_20261114/rollback.sql), [격리 검증](../supabase/candidates/nickname_grapheme_20261114/test_isolated.py).
운영 migration `nickname_grapheme_20` 적용 성공. 타임아웃 lock 3s/statement 30s. 데이터 UPDATE/DELETE 없음. 원복은 새로 허용된 >80 코드포인트 이름이 있으면 안전하게 거부한다. 해당 이름을 삭제/축약하여 원복하지 않는다.

적용 전후: 프로필 660, run58; 닉네임/첨삭 전체행/이용권 원장 해시 동일. quality rows 없음(해시 null). 보안 advisor 기존 5분류 건수 동일(58/1/9/164/1), 신규 없음. 현재값을 과거 이력으로 덮어쓰지 않음.

보존 질문: (1) 기존 발생/기록시점 유지 (2) 답안/평가 원본 불변 (3) 일괄 profile 갱신 없음 (4) 동일 auth UUID (5) 학습/과금/결과 분리 유지 (6) 기존 권한·보존기간 유지, 신규 수집 없음 (7) UI 집계는 기존 파생 RPC 사용, 원본 사실 대체 없음.

## 검증

- WEB 집중 52 PASS; tsc/변경 ESLint/Next webpack production build PASS.
- 전체 WEB 2,007 PASS / 기존 11 FAIL / 기존 1 ERROR / 5 SKIP. 기존7파일: catalog-demand-projection, catalog-demand, public-discovery, university-theme, materials 각1; admin-analytics2; admin-console4. admin-console의 mock study.total 누락 error 동일. 새 실패 없음.
- boundary audit 기존 checkout test-environment 문구 실패 유지; 감사 규칙 변경 없음.
- Flutter 집중 92 PASS, analyze PASS, Wiki handoff PASS. 스토어 제출/설치 없음.
- 격리 PG17: Unicode1,093/20·21/legacy unchanged INSERT·UPDATE/upsert/RLS/원복·재적용 PASS.
- 운영 read-only: SKKU run `f5573d7a-a579-48eb-89b4-d7953c74f5f9` completed, 답안3/결과3; 비관리자 동일 RPC `42501 ADMIN_REQUIRED`.
- 운영 사용자 닉네임 변경 제출: NOT TESTED (실데이터 보존); 합성 격리 DB/클라이언트 테스트로 검증.
- 브라우저 및 배포: 진행 중, 확인 후 아래에 기록.

## Unicode 출처

[Unicode16 UCD](https://www.unicode.org/Public/16.0.0/ucd/), [Dart characters](https://pub.dev/packages/characters/changelog).
생성기 입력: GraphemeBreakProperty.txt, DerivedCoreProperties.txt, emoji-data.txt, GraphemeBreakTest.txt. Unicode License v3를 SQL candidate 디렉터리에 보관. WEB generator는 저장소 루트에서 `python3 supabase/candidates/nickname_grapheme_20261114/generate_web.py UCD_DIRECTORY`로 실행.
