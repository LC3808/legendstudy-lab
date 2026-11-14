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
- Flutter 집중 93 PASS, analyze PASS, Wiki handoff PASS. 스토어 제출/설치 없음.
- 격리 PG17: Unicode1,093/20·21/legacy unchanged INSERT·UPDATE/upsert/RLS/원복·재적용 PASS.
- 운영 read-only: SKKU run `f5573d7a-a579-48eb-89b4-d7953c74f5f9` completed, 답안3/결과3; 비관리자 동일 RPC `42501 ADMIN_REQUIRED`.
- 운영 사용자 닉네임 변경 제출: NOT TESTED (실데이터 보존); 합성 격리 DB/클라이언트 테스트로 검증.
- 실제 Chrome 운영 검증 PASS: 전체 KPI58/47/1/10/20/1, 베타 필터1/완료1, 페이지 offset25→50→25 및 조건 변경 초기화, 목록 복귀 시 베타조건 유지.
- SKKU 상세 A/B/F 펼침·C/D/E 접힘 확인. 새 탭 실제 생성, 결과3/답안3 표시, 재작성·추가요청·음성생성·피드백 제출 버튼 없음. 390px 모바일 결과 확인.
- 미완료 실제run에서 preview disabled 확인. 회원 닉네임 max-width192px/ellipsis/nowrap 및 전체 title 보존 확인.
- 운영 `/account`에서 21한글 오류·20가족이모지 정상 counter 확인 후 **취소**, 사용자 프로필 저장 없음.
- 팝업차단 안내는 자동화 PASS / 실제 브라우저 강제차단 시나리오 NOT TESTED. 비관리자 DB 차단 PASS / 별도 비관리자 로그인 브라우저 NOT TESTED.
- 기존 이용권/피드백/quality 코드·RPC 유지 및 전체 회귀 실행. 이번 PHASE3에서 별도 `/ql` 검수 저장/피드백 제출/결제 동작은 NOT TESTED, 운영 원장 변경 없음.

## 운영 배포와 Git

최종 배포 `7ea8cef7-0104-42ac-bfc2-6d317d8d624f` success, source `4988cd86e08cbc930c0d881999ea06763090af67`.
관리자·/ql·학생 결과·/account 본문/해당 RSC 자산만 반영. 마지막 배포5개 account 자산, 나머지2,705개 기존 자산 보존. 기존 worker SHA256 `a6d8dd9b1ee386cb672c7a002c3946b9e0d616120dc7a43057b7cd3e80fee98b`, API/functions/config 동일 검증.
소스 브랜치 `codex/lab-admin-operations-20261114`, APP `codex/operations-commercial-20261113` Commit/Push. 운영 release rollback 기준9229b2c9와 중간c903da5d 비공개 백업 보존. 스토어 제출 없음.
운영 DB 검증과 WEB 배포 DONE. Flutter 코드/테스트 DONE, 설치·스토어 배포 미수행.

## Unicode 출처

[Unicode16 UCD](https://www.unicode.org/Public/16.0.0/ucd/), [Dart characters](https://pub.dev/packages/characters/changelog).
생성기 입력: GraphemeBreakProperty.txt, DerivedCoreProperties.txt, emoji-data.txt, GraphemeBreakTest.txt. Unicode License v3를 SQL candidate 디렉터리에 보관. WEB generator는 저장소 루트에서 `python3 supabase/candidates/nickname_grapheme_20261114/generate_web.py UCD_DIRECTORY`로 실행.
