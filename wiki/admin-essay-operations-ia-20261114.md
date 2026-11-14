# 관리자 IA 통합 설계 — 학습·입시 + 논술 LAB 운영·품질 (2026-11-14)

> 담당: Claude (UX·IA) · 단계: **통합 IA 설계**(구현·배포 제외)
> 성격: 기존 설계 **통합·조정** 문서. 기존 문서를 폐기·재작성하지 않는다.
> 통합 대상:
> - [student-my-redesign-20261114.md](student-my-redesign-20261114.md) — A. 학생 MY (학생용, 참조·보완)
> - [admin-learning-admissions-overview-redesign-20261114.md](admin-learning-admissions-overview-redesign-20261114.md) — B. 관리자 학습·입시 분석
> - [essay-lab-admin-console-redesign-20261114.md](essay-lab-admin-console-redesign-20261114.md) — C. 논술 LAB 운영·품질 (상세 화면·와이어프레임)
> - **[admin-lab-operations-20261114.md](admin-lab-operations-20261114.md) — Codex P0 구현·데이터 계약 (운영 적용 완료)**
> **이번 단계 운영 DB·RPC·WEB·Flutter·결제/Credit 정책 변경 없음.**

표기: ✅구현·운영 / 🟡부분 / ⚪미구현 / 🧩Codex P0(운영 적용 완료)

> **통합 결론:** B(학습·입시 분석)와 C(논술 운영·품질)는 **하나의 관리자 시스템** 안에서 목적이 다른 분석 영역이다. 이번 문서는 둘을 **7개 상위 메뉴**로 통합하고, **기존 URL·권한을 보존하는 마이그레이션**과 **통합 KPI**를 정의한다. Codex P0가 **이미 운영 적용**(`/admin/essay-runs`, 이용권 최근요청순, `admin-lab-v1`/`admin-lab-detail-v1`)됐으므로, Claude는 이를 **기준 구현**으로 삼아 상위 IA·흐름만 설계한다.

---

## 1. 기존 관리자 IA (전수, 코드/Codex 계약 기준)

`src/lib/admin/navigation.ts`(`ADMIN_NAV`) 단일 출처 + Codex P0 신규 라우트.

| 기존 메뉴 | 라우트 | 권한 | 상태 |
|---|---|---|---|
| 대시보드 | `/admin` | operator | ✅ |
| 회원 (Student 360) | `/admin/members` | operator | ✅ |
| 이용권 | `/admin/credit` | operator | ✅ (🧩 **최근 요청순 기본·활동 컬럼 적용**) |
| 결제 | `/admin/payment` | operator | ✅ |
| 이용권·매출·비용 | `/admin/analytics` | operator | ✅ |
| 평가·비용 모니터링 | `/admin/operations` | operator | ✅ (파이프라인·비용·경고) |
| **첨삭 회차(답안/결과)** | 🧩 `/admin/essay-runs` | operator | ✅ **신규·운영 적용** (`admin-lab-v1`/`detail-v1`) |
| 베타 관리/이용/실패 | `/admin/beta[/usage|/failures]` | operator | ✅ |
| 피드백·오류 신고 | `/admin/essay-feedback` | operator | 🟡 UI ✅ / **전용 RPC 설치는 Codex 보고상 미설치 — 확인 필요** |
| 1:1 문의 | `/admin/inquiries` | operator | ✅ |
| 공지 | `/admin/notices` | operator | ✅ |
| **평가 품질 관리** | `/ql` | **quality_operators(별도)** | ✅ |
| 논술 자료 검수 | `/admin/materials` | operator | ✅ |
| 학습·입시 종합 현황 | `/admin/data/learning` 외 | operator | ✅ (→ 문서 B) |

---

## 2. 개선 관리자 IA (7개 상위 메뉴, 운영 업무 흐름 축)

메뉴 **수를 늘리지 않고** 기존 항목을 Owner 권장 7묶음으로 재배치(라우트·권한 보존):

| # | 상위 메뉴 | 포함(기존 화면) | 1줄 역할 |
|---|---|---|---|
| 1 | **운영 대시보드** | `/admin` + **논술 운영 경고 스트립(NEW 조립)** | 첫 화면·경고 |
| 2 | **회원·이용권** | `/admin/members`·`/admin/credit`(최근요청순)·`/admin/payment` | 사람·지갑·첨삭 이력 |
| 3 | **첨삭 운영** | 🧩`/admin/essay-runs`(회차·답안/결과) + `/admin/operations`(파이프라인·비용) + `/admin/beta*` | 한 건의 첨삭 전 과정 |
| 4 | **첨삭 품질 관리** | `/ql`(별도 authz) + `/admin/data/samples`→/ql 단일화 | 품질 검수 |
| 5 | **학생 피드백** | `/admin/essay-feedback`·`/admin/data/satisfaction`·`/admin/inquiries` | 학생 목소리 |
| 6 | **학습·입시 분석** | `/admin/data/learning|study|...`(문서 B의 3축) | 코호트·퍼널 |
| 7 | **매출·비용·서비스 안정성** | `/admin/analytics`·operations 비용/경고·`/admin/data/verification` | 돈·안정성 |

**B↔C 연결:** 6(학습·입시 분석)과 3·4(논술 운영·품질)는 **회원(member)·기간·운영자 제외 필터를 공유**하되 모집단·목적이 다르다. 회원 상세(Student 360)에서 3의 첨삭 회차로, 5의 코멘트에서 4의 품질 검수로 **교차 이동**한다.

### 2-1. 메뉴별 역할 (§3)
- **1 대시보드**: 서비스 상태 1분 파악 + 주의 항목 우선(실패·이용권 이상·검수 대기·코멘트 미처리). 실데이터만.
- **2 회원·이용권**: 누가·얼마나 썼나. 이용권 ↔ 첨삭 이력 정합성.
- **3 첨삭 운영**: 한 건 첨삭의 요청→처리→이용권→결과→운영. `/admin/essay-runs`(회차·읽기전용 답안/결과) + `/admin/operations`(재처리·Provider 비용·경고).
- **4 첨삭 품질**: 답안×대학 기준×AI 결과 비교 검수(`/ql`, 권한 분리 유지).
- **5 학생 피드백**: 만족도·코멘트·오류신고 → 품질/운영 조치 연결.
- **6 학습·입시 분석**: 희망→지원→합격 퍼널·학습 참여(문서 B).
- **7 매출·비용·안정성**: 이용권 소비·Provider 비용·전환·장애.

---

## 3. 기존 URL·권한 보존 마이그레이션 계획

| 항목 | 변경 | 비고 |
|---|---|---|
| 라우트(URL) | **불변** | `/admin/*`, `/ql`, 🧩`/admin/essay-runs` 그대로 |
| 권한 경계 | **불변** | operator vs **quality_operators**(/ql) 병합 금지 |
| 메뉴 그룹 | `ADMIN_GROUPS` 재정의(7묶음) + 라벨 정리 | 코드상 그룹 상수만 |
| 신규 메뉴 | **없음**(경고 스트립은 대시보드 내 카드, 라우트 아님) | 메뉴 수 불변 |
| 통합/이동 | samples→/ql 링크 단일화; operations·essay-runs를 "첨삭 운영" 하위로 | 화면 보존 |
| 구현 순서 | 그룹 상수 → 라벨 → 링크(교차 이동) → 경고 스트립 | 각 단계 독립 배포 가능 |

신규 메뉴 vs 위치 변경 구분: **신규 라우트 추가 없음.** 전부 기존 화면의 **그룹 소속·라벨·상호 링크** 조정이다(🧩 essay-runs는 Codex가 이미 추가·배포).

---

## 4. 이용권 관리 UX (§현 지시 4·4) — 🧩 Codex 적용 완료
- 기본 정렬 **최근 첨삭 요청순**, 잔액순은 옵션 — **Codex 적용**(`admin_credit_member_list` 확장).
- 활동 컬럼(최근 첨삭 요청·완료 수·최근 첨삭 대학) — **Codex 적용**.
- 회원 상세: 이용권 사용 이벤트 ↔ 첨삭 완료 이벤트 병치(정합성). 상세 설계는 문서 C §B-1.
- **Claude 추가 없음**(중복 금지). 상위 IA(2번 묶음)에 배치만.

## 5. 첨삭 운영 UX (§현 지시 5) — 회차 중심
- 🧩 `/admin/essay-runs`(`admin-lab-v1`): summary·items·universities, total·offset·limit25. 필터는 Codex 구현 기준. **베타/일반**은 daily_grants 연결로 구분, **대학/시험/최초·재첨삭/회원** 필터는 구현 범위 확인 후 보강 제안.
- `/admin/operations`(`admin_essay_operations`): 파이프라인 상태·재처리·Provider 영수증·경고. **두 화면의 역할 분리**(운영=비용/경고, 회차=건별 답안/결과)를 메뉴·링크로 명확화.

## 6. 첨삭 상세 UX (§현 지시 6) — 한 건 전 과정
🧩 `/admin/essay-runs` 상세(`admin-lab-detail-v1`): **run·billing·ledger·calls·retries·diagnostics·children·reviewed_questions**. 답안/결과 **읽기 전용**(학생 렌더러 재사용, 원문 Git 미보관), 기존 `/ql` 상세 **deep link**.
- 결과 열람 이벤트 = 현재 **null(미연결)**. 무료 재첨삭 = included_revision/required **0**. → 후속 데이터.
- Claude 제안: operations 상세 ↔ essay-runs 상세 ↔ /ql 사례 **3자 상호 링크**(권한 경계 유지, 병합 아님).

## 7. 품질 검수 UX (§현 지시 6) — `/ql`, 기존 재사용
- 기존 `hq-rubric-v1` 루브릭(diagnosis·core_priority·actionability·evidence_adherence·stance_preservation·hallucination_absence[차단]·sentence_feedback·progression) + 판정/ findings/ 불변 이력 **재사용**. Owner 8기준↔차원 매핑은 문서 C §B-4.
- **핵심 보강 1종**: 사례 상세에 **대학 평가 기준(루브릭 원문) 병치** → AI 첨삭 결과와 **일치 여부 빠른 비교**. (현재 상세는 문항 맥락·verification_status 중심; 기준 원문 병치 데이터 확인 필요.)
- 신규 검수 체계는 불필요(기존으로 충분). 초기=폭넓은 수동 검수, 후속=무작위+위험기반(선정 사유 `RANDOM_SAMPLE`/`ANOMALY`/`USER_REPORT`/`MODEL_CHANGE_AUDIT` **계약 이미 존재**).

## 8. 학생 코멘트 UX (§현 지시 7)
- 학생: 만족도(1~5 또는 helpful/unhelpful) + 자유 코멘트 + 선택 의견 유형 + **첨삭 회차 연결**(`evaluation_ref`) — 코드상 `EssayFeedback`에 **이미 존재**, 선택 사항, 결과 열람 흐름 비방해.
- **단, Codex P0 보고: "essay_feedback 전용 RPC 미설치 / 신규 코멘트 원장 없음".** → UI는 있으나 **운영 원장/RPC 설치 상태 불명확 → Owner·Codex 확인 필요**(미설치면 코멘트 수집이 운영에서 동작하지 않을 수 있음).
- 관리자: `/admin/essay-feedback`(상태 new→reviewing→(재검토)→resolved→closed·메모·이력). 목록에 **대학·시험·첨삭 회차 맥락 컬럼** 보강, **코멘트→/ql 검수 연결**(`USER_REPORT`).
- 기존 피드백·오류 신고와 **중복 신설 금지**(동일 `essay_feedback` 체계 재사용).

---

## 9. 관리자 KPI 통합 (§8)

기존 학습·입시 KPI(문서 B) **유지** + 논술 운영 KPI 추가. 모집단 혼합·베타/일반 혼동 금지.

| KPI | 집계 대상(모집단) | 기간 | 중복 제거 | 원천 | 기존 RPC | 상태 |
|---|---|---|---|---|---|---|
| 최근 첨삭 요청 | 요청 전체(베타/일반 구분) | 접수일 | 회차 | essay runs | 🧩`admin_lab_runs`/`admin_essay_operations` | ✅ |
| 완료된 첨삭 | 완료 회차 | 접수일 | 회차 | 동 | 동 | ✅ (운영 47) |
| 진행 중 첨삭 | reserved/processing | 현재 | 회차 | 동 | 동 | ✅ (1) |
| 실패한 첨삭 | 최종 실패 | 접수일 | 회차 | 동 | 동 | ✅ (10) |
| 실제 결과 존재 | 결과 저장 회차 | 접수일 | 회차 | `admin-lab-detail` | 🧩 | ✅ |
| 품질 검수 대기 | UNREVIEWED 사례 | 현재 | 사례 | hq review state | `/ql` | ✅ |
| 학생 코멘트 미처리 | status=new | 현재 | 코멘트 | essay_feedback | `admin_essay_feedback` | 🟡(RPC 설치 확인) |
| 이용권 이상 징후 | 차감↔첨삭 불일치·복구대기 | 기간 | 건 | ledger | operations/credit | 🟡 |

- **모집단 주의:** 전체 회원 ≠ 고3·N수 ≠ 첨삭 이용자. 전환율은 동일 모집단 내에서만.
- **베타/일반 구분:** daily_grants 연결로 분리 집계(성균관대 베타 3문항 등 과거 기록 보존).

---

## 10. 기존 데이터 재사용
문서 B·C의 재사용 표 + Codex 계약(`admin-lab-v1`/`admin-lab-detail-v1`, `admin_credit_member_list` 확장). 신규 집계 최소: 경고 스트립은 **기존 응답 조합**.

## 11. 신규 데이터 필요 여부 (후보)
1. 🟡 **essay_feedback 운영 RPC/원장 설치 확인·보강**(Codex 보고상 미설치) — Owner 결정.
2. 피드백 목록 **대학·시험 맥락 컬럼**(evaluation 조인) — 소규모.
3. 품질 상세 **대학 평가 기준 원문 병치** — 자료 권한·표시 정책 확인(후속).
4. **결과 열람 이벤트**(현재 null)·**무료 재첨삭 eligibility**(현재 0) — 후속.
5. 운영 경고 임계값 규칙(현재 비활성) — Owner.
> 그 외 KPI·경고·교차 링크는 **신규 데이터 불필요**.

## 12. Codex P0 작업과의 관계 (경계)
- **Codex(운영 적용 완료):** 이용권 최근요청순·활동 컬럼, 회원별 LAB 이용, `/admin/essay-runs` 회차·답안/결과(읽기전용)·원장/호출추적, `/ql` deep link, `admin_credit_member_list`/`admin_lab_runs`/`admin_lab_run_detail`. 성균관대 베타 3문항·정합성 확인. **파일: `admin-lab-operations.tsx`·`lab-operations.ts`·`admin-credit-members.tsx`·`essay-runs/page.tsx` 등 — Claude 수정 금지.**
- **Claude(설계만):** 상위 IA 7묶음·마이그레이션·통합 KPI·경고 스트립·교차 링크·품질 기준 병치·피드백↔/ql·학생 MY 보완. **동일 파일 동시 수정 없음**(Claude는 wiki만).
- 충돌 방지: Codex 구현 결과(`admin-lab-v1` 등)를 **기준**으로 화면·흐름 설계. Codex와 겹치는 UI 변경은 진행하지 않는다.

## 13. 단계별 구현 로드맵
- **P0 — 🧩 Codex (완료/진행):** 이용권 정렬·회원별 첨삭·답안/결과·처리 과정·`/ql` 연결. *Claude 중복 없음.*
- **P1 — 관리자 UX 개편(Claude 설계→승인 후):** 7묶음 IA·라벨·교차 링크, 운영 경고 스트립, 품질 기준 병치, 피드백↔/ql·대학/시험 컬럼·재검토 상태, 대시보드 개선. essay_feedback RPC 설치 확인.
- **P2 — 분석 고도화:** 무작위+위험기반 검수(선정 사유 계약 재사용), 대학별·모델 버전별 품질 분석, 학습 효과 분석, 비용 커버리지.

## 14. Owner 결정 필요 사항
1. **essay_feedback 전용 RPC/코멘트 원장 설치 여부**(Codex 보고상 미설치) — 학생 코멘트 운영의 전제.
2. 학생 코멘트 처리 결과를 **학생에게 노출**할지(내부 vs "검토 완료" 노출).
3. 품질 상세 **대학 평가 기준 원문 병치** 범위(자료 권한·표시 정책).
4. 메뉴 **7묶음 IA 재그룹핑 적용** 승인(라우트·권한 불변).
5. 운영 경고 스트립 **임계값**(현재 규칙 비활성).
6. 품질 검수 **"재검토" 상태 추가** 여부.
7. P2 자동 샘플링 도입 시점.

---

## 제약 재확인
통합 설계 문서뿐. **운영 DB·RPC·WEB 배포·Flutter·결제/Credit 정책 변경 없음.** 기존 두 문서(학생 MY·학습입시)는 유지하고 연동 부분만 보완했다. Codex P0는 **이미 운영 적용**이므로 기준 구현으로 참조하고 동일 파일을 수정하지 않는다. 추측으로 구현 상태를 적지 않았다(✅/🟡/⚪/🧩). Owner 승인 전 관리자 전체 UI 개편을 진행하지 않는다.
