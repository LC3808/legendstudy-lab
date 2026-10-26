# 수리논술 AI 평가 시스템 기술 검토 보고서

> **작성:** Codex 세션(읽기 전용 조사) · **일자:** 2026-10-26 · **대상 저장소:** `legendstudy-lab` (LAB 웹)
> **조사 범위:** 읽기 전용. 코드/DB/Worker/Production/Credit/평가결과/학생답안을 변경하지 않음. 실제 Provider 평가 호출·재평가 없음. 본 문서에는 API 키/Secret을 노출하지 않음.
> **표기 규칙:** `[확인됨]` = 저장소 코드/문서로 직접 확인한 사실 · `[추정]` = 코드 구조에 근거한 기술적 추정(확정 아님) · `[검증필요]` = 외부 로그/시스템 확인이 필요한 항목. 근거는 `파일경로:라인` 형식으로 제시.

---

## 0. 조사 범위와 핵심 전제 (먼저 읽을 것)

이 보고서가 성립하려면 먼저 **이 저장소가 무엇을 담고 있고 무엇을 담고 있지 않은지**를 명확히 해야 한다. 이것을 잘못 이해하면 "원인 분석"이 엉뚱한 파일을 가리키게 된다.

- **`[확인됨]` 이 저장소(`legendstudy-lab`)는 LAB 웹의 정적 Next.js 랜딩/서비스 레이어다.** 실제 라이브 AI 평가(Provider 호출·큐·영속화)는 **Production 정적 사이트에서 명시적으로 제외**되어 있다. — `docs/ARCHITECTURE.md:17`(Static public pages: "live evaluator calls" 제외), `docs/ARCHITECTURE.md:21`(Server-only evaluation boundary: "AI/provider calls, queues, persistence" 제외), `README.md`(Current public scope: "does not offer live AI feedback").
- **`[확인됨]` 실제 수리논술 Math Worker(LLM을 호출해 `math-eval-v1` 출력을 생성하고 SQL로 finalize하는 프로세스)는 이 저장소에 없다.** 그 권위 구현은 **APP/Supabase 측**에 있으며, 코드 주석이 그 출처를 명시한다: APP commit `17e528b`, MATH-2C 마이그레이션 `20261002000100`, MATH-2D `20261002000200`(runtime SHA `b40bf72…`). — `src/lib/math-eval/types.ts:9`, `src/lib/math-eval/runtime/contract.ts:6`, `src/lib/math-eval/runtime/physical-contract.ts:1`.
- **`[확인됨]` 이 저장소에는 실제 Provider SDK가 없다.** `openai`/`anthropic`/`gemini`/`mathpix`/`wolfram`/`sympy` 등의 라이브 호출 어댑터가 `src`에 존재하지 않으며(전체 grep 결과 매칭은 전부 mock-adapter·bakeoff 테스트 더블·fixture·UI 문자열), 평가 어댑터는 "test doubles (no live model/CAS)"로 명시됨. — `src/lib/math-eval/evaluator.ts:1-3`, `src/lib/math-input/bakeoff/providers.ts:1-8`.
- **`[확인됨]` 따라서 이 저장소가 담고 있는 것은 "수리논술 평가의 LAB 소비자 측 계약·검증·추출 오케스트레이션 + 품질/학습/릴리스 UI"다.** 구체적으로:
  - 추출(이미지→영역) 파이프라인 오케스트레이션(모의 어댑터): `src/lib/math-input/`
  - 평가 결과 계약·LAB측 검증·물리(SQL) 직렬화 어댑터: `src/lib/math-eval/`
  - Worker 실행 흐름(claim→evaluate→validate→finalize/fail): `src/lib/math-eval/runtime/worker-client.ts`
  - 품질 콘솔(ql-read-v1 소비): `src/lib/quality/`, `src/components/quality/`
  - 성장/재첨삭/릴리스: `src/lib/math-learning/`, `src/lib/math-release/`

> **이 전제의 의미:** `INVALID_MATH_OUTPUT`의 **권위 판정은 APP/Supabase 측 canonical SQL 검증**에서 일어난다(아래 §4). 이 저장소의 `validation.ts`·`physical-contract.ts`는 그것을 **미러링**한 LAB측 fail-closed 사본이다. 원인의 "최종 확정"은 Production 로그(접근 금지)에서만 가능하므로, 본 보고서는 **코드로 재구성한 실패 경로 + Owner/Codex가 확인할 정확한 로그·코드 위치**를 함께 제시한다.

메모리 제약과도 일치: LAB은 배포된 `ql-read-v1`을 소비하며 저장소 내 draft SQL은 비(非)정규 참고본이다(권위 기준으로 쓰지 않음).

---

## 1. Executive Summary

- **`[확인됨]` 문제의 오류 코드 매핑:** Owner가 말하는 `INVALID_MATH_OUTPUT`은 이 저장소의 `EvalErrorCode`에서 **`INVALID_OUTPUT`**에 해당한다. 평가 Worker가 `fail(evaluation_id, lease_token, "INVALID_OUTPUT")`을 호출하는 경로다. — `src/lib/math-eval/runtime/contract.ts:14`, `src/lib/math-eval/runtime/worker-client.ts:107,119`.
- **`[확인됨]` `INVALID_OUTPUT`은 "모델이 결과를 못 만든" 실패가 아니다.** 그 경우는 `TIMEOUT`/`PROCESSING_FAILED`로 분기한다(`worker-client.ts:99`). `INVALID_OUTPUT`은 **모델이 결과를 생성한 뒤, LAB/Worker 후처리 단계에서 거부**될 때만 발생한다. 즉 Owner 사례(문제1 성공, 문제2·3 실패)는 아래 분류 중 **(b) 형식 오류** 또는 **(c) 정상 결과의 후처리 거부**, 또는 **(d) 평가결과↔Registry 참조 불일치**에 해당하며, **(a) 모델 무출력은 아닐 가능성이 높다**. — `worker-client.ts:92-124`, `physical-contract.ts:54-69`.
- **`[확인됨]` `INVALID_OUTPUT`을 던지는 코드 지점은 두 군데뿐이다:**
  1. `validateMathEval()`가 실패 → 로그 `MATH_VALIDATION_FAILED {codes}` → `fail("INVALID_OUTPUT")` (`worker-client.ts:104-108`)
  2. `physicalFinalize()`가 throw → 로그 `MATH_PHYSICAL_FAILED {reason}` → `fail("INVALID_OUTPUT")` (`worker-client.ts:114-121`)
- **`[추정]` 문제2·3이 재처리 후에도 실패한다는 사실은 "무작위 모델 실패"가 아니라 "구조적 불변식 위반"을 강하게 시사한다.** 가장 유력한 후보는 (i) 대안 풀이경로의 수학적 동치 불확실 판정(`physical-contract.ts:56`), (ii) 다중 소문항 평가기준의 커버리지/핀 불일치(`validation.ts:166,173`), (iii) 다중 이미지에서 선택 추출 echo 불일치(`physical-contract.ts:55`), (iv) 필수 rubric 차원 누락(`physical-contract.ts:69`)이다. **이 중 어느 것인지는 로그로만 확정 가능**하므로 §4에 Codex 확인 체크리스트를 제시한다.
- **`[확인됨]` 진단 사각지대:** `physicalFinalize`는 6개의 서로 다른 위반을 **모두 동일한 `Error("INVALID_OUTPUT")`**로 던진다(`physical-contract.ts:54,55,56,57,59,69`). 로그 `reason`은 60자로 잘린 메시지뿐이어서 **어느 불변식이 깨졌는지 구분 불가**하다. 이것이 "재처리해도 원인을 못 찾는" 운영 체감의 핵심 기여 요인이다.
- **`[확인됨]` 추출(이미지 인식) 단계는 이미 멀티모달이다.** 단순 OCR→텍스트가 아니라, 1차 비전 어댑터 + 임계영역 한정 폴백 + 병합 + 학생확인 게이트 구조다(`src/lib/math-input/orchestration.ts`). 따라서 "멀티모달 도입"의 상당 부분은 **이미 설계 완료**이며, 비어 있는 것은 **라이브 Provider 연결**이다.
- **권고(요약):** §4의 로그 2줄(`MATH_VALIDATION_FAILED`/`MATH_PHYSICAL_FAILED`)과 ql-read-v1 `processing_outcome`를 먼저 확인해 원인을 (a~d)로 확정 → `physicalFinalize`에 **위반별 구분 코드**를 추가(진단성 개선) → 이후 아키텍처는 **대안 C(하이브리드)**를 목표로 하되 단기는 **전략 A(최소 수정)로 진단성·핀 정합성부터 고친다**. 출시는 **인문 선출시(대안1)**가 기술 불확실성 대비 합리적(§12). 단, 출시 정책은 Owner 결정사항으로 남긴다.

---

## 2. 현재 수리논술 시스템 아키텍처와 기술적 한계

### 2.1 데이터 흐름 (코드 기준 재구성)

```
[이미지/타이핑 업로드]
   │  MathInputArtifact[] (modality: IMAGE/PDF/TYPED)
   ▼
[① 입력 수용 admission]           src/lib/math-input/admission.ts
   │  거부 시 INPUT_FAILED (UNSUPPORTED_INPUT / INVALID_FILE)
   ▼
[② 추출 파이프라인]               src/lib/math-input/orchestration.ts:78
   │  primary 비전 어댑터 extract → validateProviderResult
   │  blocking(임계·불확실) 영역만 fallback 어댑터로 재추출(§40)
   │  mergeRegion: 두 판독 일치→HIGH 승급 / 불일치→학생확인 / 둘 다 판독불가→HUMAN_REVIEW
   │  영역 단위 산출물 VisionRegion{ rawText, normalizedMath(LaTeX), confidence, subproblemCandidate }
   ▼
[③ 준비도 게이트 assessReadiness]  orchestration.ts:225
   │  blocking 없음 → READY_FOR_EVALUATION
   │  blocking 있음 → NEEDS_CONFIRMATION(학생확인) 또는 NEEDS_REUPLOAD(재업로드)
   ▼
[④ 학생 확인/정정]                src/lib/math-input/confirmation.ts (새 extraction version 생성)
   ▼
[⑤ 평가 claim]                    worker-client.ts:26  (math_evaluation claim, lease 발급)
   │  서버가 핀 고정한 context: leaf/profile/extraction/criteria/solutions
   ▼
[⑥ 평가 실행(LLM)]                MathEvaluatorAdapter.evaluate(input)  ※라이브 어댑터는 외부/미연결
   │  타임아웃 45s(기본)~120s(상한)  worker-client.ts:94-96
   ▼
[⑦ LAB 검증 validateMathEval]     src/lib/math-eval/validation.ts:85  (fail-closed)
   │  실패 → MATH_VALIDATION_FAILED → fail(INVALID_OUTPUT)
   ▼
[⑧ 물리 직렬화 physicalFinalize]  src/lib/math-eval/runtime/physical-contract.ts:47
   │  실패 → MATH_PHYSICAL_FAILED → fail(INVALID_OUTPUT)
   ▼
[⑨ finalize]                      worker-client.ts:123  (math_finalize_evaluation → evaluation uuid)
   │  canonical SQL 검증이 최종 권위 (MATH-2C/2D, 외부)
   ▼
[⑩ History/품질 저장 + 조회]      ql-read-v1 소비: src/lib/quality/ (processing_outcome, status)
```

### 2.2 핵심 설계 특징 `[확인됨]`

- **회차 단위·핀 고정(pinning) 평가:** Worker는 학생 브라우저가 아니라 신뢰된 평가 worker 롤에서만 claim/finalize 가능(`worker-client.ts:1-8`). 평가 입력(criteria/solutions/extraction)은 서버가 핀 고정한 불변 패키지(`physical-contract.ts:41`, `types.ts:197`).
- **Fail-closed 원자성:** 유효하지 않은 출력은 부분 publish 없이 전체 실패 처리(`worker-client.ts:73-77`). `NEEDS_HUMAN_REVIEW`는 "유효한 평가"로 finalize됨(처리 실패 아님).
- **추출 ≠ 평가 분리:** 입력 수용 게이트는 수학을 판정하지 않음(`orchestration.ts:224`). 이미지 인식 문제와 채점 정확성 문제가 코드 레벨에서 분리됨.
- **민감정보 비노출 로깅:** 실패 로그는 이슈 코드/바운드 메시지만 남기고 학생 답안·JWT를 남기지 않음(`worker-client.ts:105,117`, `math-input/runtime/errors.ts:3`).

### 2.3 기술적 한계 `[확인됨]`/`[추정]`

1. **`[확인됨]` 라이브 Provider 미연결:** 평가·추출 어댑터가 전부 모의/결정론적 더블. 실제 성능·실패율은 이 저장소만으로 확정 불가(`evaluator.ts:1`, `bakeoff/providers.ts:1`).
2. **`[확인됨]` `INVALID_OUTPUT` 진단성 부족:** 6개 물리 불변식 위반이 단일 코드로 수렴, 로그로 원인 구분 불가(`physical-contract.ts:54-69`).
3. **`[추정]` 다중 소문항/다중 이미지 취약:** 추출은 `subproblemCandidate`/`MULTIPAGE_READING_ORDER`/`SUBPROBLEM_MARKERS`를 다루지만(`bakeoff/types.ts`), 평가 단계에서 **선택 추출 1개(`selected_extraction`)**를 echo 검사(`physical-contract.ts:55`)하므로, 소문항이 서로 다른 추출/영역에 걸칠 때 매칭 실패 위험.
4. **`[추정]` 대안 풀이경로 처리의 경직성:** 동치 불확실(`MATHEMATICAL_EQUIVALENCE_UNCERTAIN`) 경로는 **검증은 통과하지만 물리 직렬화에서 하드 거부**(`validation.ts`에는 규칙 없음 ↔ `physical-contract.ts:56` throw). 즉 "사람 검토가 필요한 애매한 동치"가 완결 대신 실패로 처리됨.
5. **`[확인됨]` 출력 크기/직렬화 바운드:** Postgres `54000`→`RESPONSE_BOUND` 매핑 존재(`math-input/runtime/errors.ts`). 다중 이미지·장황한 steps일 때 finalize 페이로드 초과 가능성(토큰 잘림이 아니라 DB 응답 바운드).

---

## 3. 기존 Math Worker 구성요소 분류 (재사용/수정/교체/신규)

| 구성요소 | 파일 | 분류 | 근거·사유 |
|---|---|---|---|
| 평가 결과 도메인 타입(`math-eval-v1`) | `math-eval/types.ts` | **A. 그대로 재사용** | APP 권위 계약의 LAB 투영. 안정적, 변경 시 APP 동기화 필요 |
| LAB측 검증기 `validateMathEval` | `math-eval/validation.ts` | **B. 일부 수정** | 규칙은 유지, 단 `physical-contract`와의 **규칙 공백(동치 불확실 등)**을 메우도록 보강 |
| 물리 직렬화 `physicalFinalize` | `math-eval/runtime/physical-contract.ts` | **B. 일부 수정** | 6개 위반을 **구분 코드**로 분리(진단성). 로직 자체는 유지 |
| Worker 실행 흐름 `runWorkerEvaluation` | `math-eval/runtime/worker-client.ts` | **B. 일부 수정** | 실패 사유를 `fail` error_code에 **세분 전달**(현재 INVALID_OUTPUT 단일) |
| 평가 어댑터 인터페이스 | `math-eval/evaluator.ts` | **A. 재사용** | provider-independent 경계. 라이브 어댑터는 이 계약을 구현 |
| **라이브 평가 Provider 어댑터** | (없음) | **D. 신규 개발** | OpenAI/Gemini/Claude 중 택1~2를 이 경계 뒤에 구현 |
| 추출 오케스트레이션 | `math-input/orchestration.ts` | **A. 재사용** | 멀티모달+폴백+확인 구조 이미 완성 |
| **라이브 비전 Provider 어댑터** | (없음, mock만) | **D. 신규 개발** | `VisionProviderAdapter` 뒤 라이브 연결 |
| Provider 결과 검증 | `math-input/provider-validation.ts` | **A. 재사용** | |
| 바케오프 하네스 | `math-input/bakeoff/` | **B. 일부 수정** | mock→라이브 factory 추가(MATH-3C-2) |
| 품질 콘솔(ql-read-v1) | `quality/` | **A. 재사용** | 진단 관측 지점. `processing_outcome` 노출 |
| 성장/재첨삭 | `math-learning/`, `math-release/` | **A. 재사용** | |
| 수학 검증(CAS: SymPy/Wolfram) | (없음) | **D. 신규 개발** | 하이브리드(대안 C)에서 신규 |
| 수식 렌더링(KaTeX/MathJax) | (없음, `normalizedMath`는 LaTeX 호환) | **C. 교체/신규** | 가독성 과제(평가 정확성과 별개) |

---

## 4. `INVALID_MATH_OUTPUT` 오류 원인 분석 (핵심)

### 4.1 코드로 확정된 사실 `[확인됨]`

**오류 코드 정의:** `EvalErrorCode = "TIMEOUT" | "INVALID_OUTPUT" | "PROCESSING_FAILED" | "ACCOUNT_ERASURE"` — `contract.ts:14`. Owner의 `INVALID_MATH_OUTPUT` ≡ `INVALID_OUTPUT`.

**`INVALID_OUTPUT`을 던지는 전부(그리고 유일한) 경로:**

| # | 트리거 | 로그 라인 | 코드 |
|---|---|---|---|
| P1 | `validateMathEval(candidate).ok === false` | `MATH_VALIDATION_FAILED { codes:[...] }` | `worker-client.ts:106-107` |
| P2 | `physicalFinalize()` throw (실제 물리 경로에서만) | `MATH_PHYSICAL_FAILED { reason }` | `worker-client.ts:118-119` |

**모델 무출력/예외/타임아웃은 다른 코드로 분기:** `TIMEOUT` 또는 `PROCESSING_FAILED` — `worker-client.ts:98-100`. **따라서 `INVALID_OUTPUT`은 정의상 "모델이 뭔가를 생성한 뒤 거부된 것"이다.**

**P1(validateMathEval)이 거부하는 조건** — `validation.ts`:
- `UNKNOWN_RUBRIC_VERSION`(:92), `DUPLICATE_STEP_ID`(:100), `UNGROUNDED_STEP_REGION`(:103, 스텝이 핀 안 된 추출 영역 인용), `SELF_EDGE`/`DUPLICATE_EDGE`/`MISSING_EDGE_ENDPOINT`(:110-114), `DAG_CYCLE`(:116), `ERROR_STEP_BINDING`(:121), `UNKNOWN_ERROR_CATEGORY`(:122), `NON_MATERIAL_ROOT`(:124), `CAUSE_BINDING`/`PROPAGATED_WITHOUT_CAUSE`(:134-140), `CORE_BINDING`/`HINT_BINDING`(:148-152), **`UNPINNED_REFERENCE`(:158, 모델이 핀 안 된 풀이 참조)**, **`MISSING_CRITERION`(:173, 핀 된 평가기준 누락)/`UNPINNED_CRITERION`(:166)/`INVENTED_POINTS`(:169)**, `SHORT_ANSWER_*`(:179-184).

**P2(physicalFinalize)가 throw하는 조건** — `physical-contract.ts`(전부 동일하게 `Error("INVALID_OUTPUT")`):
- `:54` `generated_solution.origin !== "AI_GENERATED_REFERENCE"`
- `:55` **`output.selected_extraction !== input.selectedExtractionId`** (모델이 echo한 추출 id ≠ 핀 된 추출)
- `:56` **경로 중 하나라도 `MATHEMATICAL_EQUIVALENCE_UNCERTAIN`** (대안 동치 불확실)
- `:57` `step.position < 1`
- `:59` **`criterion.awarded_points != null`** (MATH-2C는 수치 배점 저장 안 함)
- `:69` **필수 rubric 차원 값 누락** (`profile.required_dimensions` 중 모델이 미출력)
- 추가: `physicalClaimToInput`는 claim 패키지가 malformed면 `Error("INVALID_CLAIM")`(:6-15,20,25,32,37)

> **진단 사각지대 `[확인됨]`:** P2의 7개 조건이 모두 동일 메시지 `"INVALID_OUTPUT"`로 throw되고, 로그는 `String(err.message).slice(0,60)`(`worker-client.ts:118`)만 남긴다. → **로그만으로는 어느 조건인지 구분 불가.** 이것이 "재처리해도 원인 미상"의 직접 원인.

### 4.2 Owner 사례(인하대 2026 자연계열 오전: 문제1 성공, 문제2·3 실패, 재처리 후에도 실패)의 (a~d) 분류

> **중요: 아래는 코드 구조에 근거한 순위화된 가설이며, 로그 없이 확정하지 않는다.**

- **(a) 모델이 유효 결과를 못 만듦:** **가능성 낮음 `[추정]`.** 그 경우 `TIMEOUT`/`PROCESSING_FAILED`로 나타나야 함(`worker-client.ts:99`). Owner가 본 코드가 `INVALID_MATH_OUTPUT`이라면 (a)는 배제됨. (단, 외부 Worker가 코드 네이밍을 다르게 쓸 수 있으므로 §4.3 체크리스트로 확인.)
- **(b) 결과는 생성됐으나 출력 형식 오류:** **가능성 중~높음 `[추정]`.** 유력 후보: 필수 rubric 차원 누락(`:69`), 선택 추출 echo 불일치(`:55`), 배점 수치 포함(`:59`). 문제2·3은 소문항·조건분기(piecewise)가 많아 모델이 요구 스키마를 완전히 채우지 못할 여지가 큼.
- **(c) 정상 결과가 Worker 후처리에서 거부:** **가능성 높음 `[추정]`.** 가장 설득력 있는 서사: 문제2·3은 대안 풀이경로가 존재(참조 이미지의 piecewise `S(x)` 3구간: cos·cos / cos·sin / sin·sin). 모델이 학생의 대안 경로를 **동치로 확신하지 못해** `MATHEMATICAL_EQUIVALENCE_UNCERTAIN` 경로 판정을 내면, **검증(P1)은 통과하지만 물리 직렬화(P2 `:56`)에서 하드 거부** → `INVALID_OUTPUT`. 문제1은 단순·정답경로 일치라 통과. **재처리해도 입력(핀 된 context)과 모델 성향이 같아 결정론적으로 재실패**하는 패턴과 부합.
- **(d) 평가결과↔Registry 참조 불일치:** **가능성 높음 `[추정]`.** 문제2·3의 평가기준(criteria)/공식풀이(solutions) 핀이 Registry에 불완전·불일치하면 `MISSING_CRITERION`(`validation.ts:173`)/`UNPINNED_CRITERION`(:166)/`UNPINNED_REFERENCE`(:158)로 P1 거부. 다중 소문항일수록 전 criterion을 1회씩 커버해야 하는 제약(:172-174)을 모델이 못 맞출 위험↑. 재처리해도 Registry가 동일하므로 재실패.

**잠정 결론 `[추정]`:** Owner 사례는 **(c) 또는 (d)**(둘 다 "정상 생성 후 후처리/참조 단계 거부")일 가능성이 가장 높고, **(b)**가 그 다음, **(a)는 배제 가능성 높음**. 단일 코드 수렴 때문에 **코드만으로는 (b)/(c)/(d) 중 확정 불가** → §4.3 필수.

### 4.3 Codex/Owner가 확인할 정확한 로그·코드·진단 항목 (확정용 체크리스트)

**읽기 전용·Production 비변경 전제로 다음을 순서대로 확인:**

1. **Worker 로그 2줄 구분 (원인을 P1/P2로 양분):**
   - `MATH_VALIDATION_FAILED`의 `codes[]` 존재 여부 → **P1(검증)**. 코드가 `MISSING_CRITERION`/`UNPINNED_*`면 **(d)**, `UNGROUNDED_STEP_REGION`이면 추출 핀 문제.
   - `MATH_PHYSICAL_FAILED`의 `reason` 존재 → **P2(물리)**. (현재 reason이 `"INVALID_OUTPUT"`뿐이면 아래 2번 개선 전까지 세부 구분 불가.)
   - 파일: `worker-client.ts:106,118`.
2. **ql-read-v1 품질 콘솔에서 해당 회차 행 확인(가장 안전·production-safe):** `QualityCaseSummary.processing_outcome`, `.status`, `.model_provider/.model_name`, `.prompt_version`, `.contract_version`, `.regime_key`, `.core_count`를 문제1 vs 문제2·3로 비교. — `src/lib/quality/contract.ts:28-59`, 화면 노출 `src/components/quality/quality-case-list.tsx:159`. 문제1은 `processing_outcome="ok"`, 문제2·3은 실패 outcome일 것.
3. **APP/Supabase `math_evaluation`의 `fail` 행 조회:** `error_code = 'INVALID_OUTPUT'`인 evaluation의 `evaluation_id`를 문제2·3 attempt와 대조. (DTO/액션 정의: `contract.ts:13,45-49`.)
4. **canonical SQL 검증 위치 확인:** MATH-2C 마이그레이션 `20261002000100`(finalize 스키마)·MATH-2D `20261002000200`(claim/finalize/fail RPC). LAB 미러와 **어느 불변식에서 갈리는지**를 이 SQL에서 특정. — 출처 주석 `physical-contract.ts:1`, `types.ts:9`.
5. **다중 이미지/추출 매칭 확인:** 문제2·3이 **단일 selected_extraction에 다수 소문항**을 담았는지, echo된 `selected_extraction`이 핀 id와 일치하는지(`physical-contract.ts:55`). 추출 영역 id가 핀 집합에 없으면 `UNGROUNDED_STEP_REGION`(`validation.ts:103`).
6. **실행시간/메모리/토큰:** 타임아웃이면 `TIMEOUT`(별개 코드)로 나오므로 `INVALID_OUTPUT`과 혼동 금지. 단 **출력 과대(RESPONSE_BOUND 54000)**는 finalize 전송 단계에서 별도 실패 가능 — `math-input/runtime/errors.ts` 매핑 확인.

**코드 개선 1건(진단성, 소규모·저위험):** `physical-contract.ts`의 7개 `Error("INVALID_OUTPUT")`를 **위반별 구분 메시지**(예: `EQUIVALENCE_UNCERTAIN`, `EXTRACTION_ECHO_MISMATCH`, `AWARDED_POINTS_PRESENT`, `MISSING_RUBRIC_DIMENSION` 등)로 바꾸고 `worker-client.ts:118`가 그 reason을 그대로 로깅하게 하면, **다음 실패부터 원인이 로그에서 즉시 특정**된다. (error_code는 계약상 `INVALID_OUTPUT` 유지, 로그 reason만 세분.) — Owner 승인 후 적용.

---

## 5. OCR→텍스트→LLM 방식의 한계 vs 원본 이미지 직접(멀티모달) 평가

- **`[확인됨]` 현재 추출은 이미 "멀티모달 비전"이다.** `VisionProviderAdapter.extract`가 아티팩트(이미지/PDF)를 받아 영역별 `rawText`+`normalizedMath(LaTeX)`+`confidence`+`subproblemCandidate`를 산출(`math-input/types.ts:88-104,133-143`). 즉 "순수 OCR→텍스트"가 아니라 **구조화 비전 추출**이며, 임계영역 폴백·학생확인으로 오인식을 방어(`orchestration.ts:129-149`).
- **OCR→텍스트→LLM의 한계 `[추정]`:** (1) 추출 단계에서 손실된 레이아웃·그래프·필기 정정 정보가 평가에 전달 안 됨, (2) 평가 LLM이 추출 텍스트만 보면 학생의 손글씨 뉘앙스·도식을 못 봄, (3) 추출 오류가 평가 오류로 전파.
- **원본 이미지 직접(멀티모달) 평가 가능성 `[추정]`:** 평가 LLM에 **원본 이미지 + 추출 텍스트(grounding)**를 함께 주면, 추출 손실을 평가 단계에서 보정 가능. 단, (a) 핀/grounding 불변식(`validation.ts`)이 "추출 영역 id"에 묶여 있어, 이미지 직접 평가 결과도 **추출 영역에 매핑**되어야 계약을 만족, (b) 비용·토큰↑, (c) 재현성·감사(provenance) 설계 필요.
- **핵심 구분 `[확인됨]`:** **수식 렌더링(가독성)과 평가 정확성은 별개 과제.** `normalizedMath`는 LaTeX 호환이므로 KaTeX/MathJax로 **표시**를 개선하는 것과, 모델이 **채점**을 정확히 하는 것은 독립적. 본 보고서는 둘을 섞지 않는다.

---

## 6. 멀티모달 LLM / 수식 OCR / 수학검증 / 렌더링 비교 (공식 문서 기준)

> **주의:** 아래 모델 성능·가격은 공개 소스 기반이며 **`[검증필요]`**(가격표는 수시 변동·소스 간 불일치). 임의 수치 생성 금지 원칙에 따라, 미확인 성능은 단정하지 않는다.

**멀티모달 LLM (수식·이미지 입력):**
| Provider | 대표 모델 | 멀티모달 | 비고 |
|---|---|---|---|
| Anthropic Claude | Opus 4.8(`claude-opus-4-8`), Sonnet 4.x | 이미지 입력 지원 | 본 시스템 모델 ID 환경과 정합. 구조화 출력(JSON)·장문 추론 강점 |
| OpenAI | GPT-4.x/최신 멀티모달 | 이미지 입력 지원 | 구조화 출력(JSON schema) 성숙 |
| Google Gemini | Gemini 2.x/최신 | 이미지·장문 컨텍스트 | 다중 이미지·긴 컨텍스트 유리 |

`[검증필요]` 대략적 API 가격대(백만 토큰, 소스 기반): Claude Opus ≈ $5(in)/$25(out), Sonnet ≈ $3/$15, Haiku ≈ $1/$5. Gemini/OpenAI는 각 공식 가격표 확인 필요. (출처는 문서 말미.)

**수식 OCR:** Mathpix — `[검증필요]` 공식 billing 기준 이미지 요청 **$0.002/request**, PDF **$0.005/page**(2025-03 인하 반영). 손글씨·LaTeX 변환 특화. 현재 추출의 `normalizedMath` 생성원으로 적합.

**수학 검증(CAS):**
- **SymPy** — 오픈소스 Python CAS. 비용 0(연산 자원만). 동치판정(`simplify`, `equals`)·수치 대입 검증에 사용. 대안 풀이경로 동치 판정(§4 (c))의 **자동화 후보**.
- **Wolfram|Alpha/Engine** — 강력하나 유료·외부 의존. 라이선스·호출비 `[검증필요]`.

**렌더링(가독성, 평가와 별개):** KaTeX(빠름·동기 렌더, 서브셋), MathJax(광범위 LaTeX 지원·느림). LAB은 정적/브라우저 환경이므로 KaTeX 우선 검토.

**결론 `[추정]`:** 채점 정확성은 멀티모달 LLM + (선택)CAS 검증의 몫, 가독성은 KaTeX의 몫. Mathpix는 추출 품질 보강용. 각 성능 수치는 자체 바케오프(§10 PoC)로 측정해야 하며 공급사 벤치마크를 그대로 신뢰하지 않는다.

---

## 7. 아키텍처 3대안 비교 및 권고

| 항목 | **A. 기존 OCR 개선** | **B. 멀티모달 직접평가** | **C. 하이브리드(권고)** |
|---|---|---|---|
| 데이터 흐름 | 이미지→비전추출(개선)→텍스트→평가LLM | 이미지(+추출 grounding)→평가LLM 직접 | 이미지+수식OCR→평가LLM(멀티모달)→CAS 동치검증→정규화 |
| 모델 역할 | 추출=비전, 평가=텍스트LLM | 평가=멀티모달 LLM 단일 | 추출=비전/Mathpix, 평가=멀티모달 LLM, 검증=SymPy |
| 채점기준 적용 | 기존 핀/criteria 그대로 | 핀 매핑 재설계 필요(이미지→영역) | 기존 핀 유지 + CAS가 동치 판정 보조 |
| 오류처리(INVALID) | P1/P2 진단성 개선 | echo/grounding 불변식 재정의 | CAS로 `EQUIVALENCE_UNCERTAIN`을 **판정→완결**로 전환 |
| 기존 코드 변경 범위 | **소** (`physical-contract`/`validation` 보강, 라이브 추출 어댑터) | **중~대** (평가 입력·grounding 계약 변경) | **중** (추출·평가 어댑터 신규 + CAS 모듈 신규, 계약은 대부분 유지) |
| 기대 효과 | 진단·핀 정합 즉시 개선 | 추출손실 보정 | 추출손실 보정 + 동치 자동판정(§4 (c) 근본 완화) |
| 리스크 | 멀티모달 손실 미해결 | 핀·감사 재설계 비용·회귀 | 구성요소 증가, 통합 복잡도 |

**최종 권고 — 단계적 C(하이브리드):** 단기엔 **A의 진단성·핀 정합 개선**을 선행(저위험, §4.3 코드 개선 포함)하고, 중기엔 라이브 **멀티모달 평가 어댑터** + **SymPy 동치검증 모듈**을 기존 `MathEvaluatorAdapter` 경계 뒤에 추가해 C로 수렴. 이유: §4의 유력 원인(c)가 "대안 동치를 실패로 처리"인데, **CAS 동치검증이 이를 `EQUIVALENCE_UNCERTAIN`→판정으로 바꿔 근본 완화**하고, 기존 핀/계약(`types.ts`/`validation.ts`)을 대부분 보존하기 때문.

---

## 8. 상경논술(언어+수리 혼합형) 평가 구조 3안

전제 `[확인됨]`: 공통 Registry·History·Credit은 재사용. 회차 단위 결과 통합·회차당 1 Credit 정산(`types.ts:216-217` 빌링 바인딩은 엔진이 Credit을 계산하지 않음). 예: 한양대 2027 모의논술 상경 문제1=Essay, 문제2=Math.

| 안 | 구조 | 장점 | 단점 | 적합성 `[추정]` |
|---|---|---|---|---|
| ① 혼합형 Worker 유지·개선 | 한 Worker가 문항 kind별 Essay/Math 경로 분기 | 통합 단순, 회차 결과 통합 자연스러움 | Essay/Math 실패 모드가 섞여 진단 난이도↑ | 소규모·현행 유지 시 |
| ② 전용 모듈 분리(동일 Worker 내) | 회차 내 문항별로 Essay 모듈/Math 모듈 호출, 결과만 회차에서 통합 | 경로별 검증·로깅 분리로 §4식 진단성↑, 코드 재사용 유지 | 모듈 간 계약·통합 레이어 필요 | **권고** |
| ③ 전용 독립 Worker | Essay Worker/Math Worker 물리 분리, 오케스트레이터가 회차 통합 | 독립 스케일·독립 배포·장애 격리 | 운영 복잡·비용↑, 회차 통합/정산 동기화 부담 | 대규모·트래픽 분리 필요 시 |

**권고 `[추정]`: ②(전용 모듈 분리).** 현재 코드가 이미 Math 경로를 독립 계약(`math-eval`)으로 두고 Essay는 별도(`essay-runtime`)이므로, **회차 통합 레이어에서 문항 kind로 모듈 라우팅**하는 ②가 기존 자산 재사용·진단성·정산 단순성의 균형이 가장 좋다. ③은 트래픽·장애격리 요구가 명확해질 때 승급.

---

## 9. 비용 산정 (시나리오별)

> **가정(명시):** 이미지 1장 ≈ 1,500 입력토큰(비전 타일 환산, `[검증필요]`), 평가 프롬프트+컨텍스트 ≈ 문항당 4,000 입력토큰, 평가 출력 ≈ 문항당 2,500 출력토큰, 재시도율 15%. 환율 **₩1,450/$** 가정. 모델가 `[검증필요]`: Claude Sonnet $3/$15(백만토큰), Mathpix 이미지 $0.002/장. CAS(SymPy)는 자체호스팅 연산비 ≈ 0. **아래 수치는 가정 기반 추정이며 실제 청구와 다를 수 있음.**

**단가(문항 1건, 이미지 포함, Sonnet 기준) 추정:**
- 수식OCR(Mathpix): 이미지수 × $0.002
- 평가 입력: (이미지토큰 + 4,000) × $3/1e6
- 평가 출력: 2,500 × $15/1e6 = $0.0375
- 재시도 15% 가산

| 시나리오 | 문항·이미지 | 이미지비용 | LLM 입력 | LLM 출력 | 재시도(×1.15) | **합계($)** | **합계(₩)** |
|---|---|---|---|---|---|---|---|
| A | 3문항·6장 | $0.012 | 3×(3,000+4,000)×$3/1e6=$0.063 | 3×$0.0375=$0.1125 | — | ≈$0.215 | ≈₩312 |
| B | 4문항·12장 | $0.024 | 4×(4,500+4,000)×$3/1e6=$0.102 | 4×$0.0375=$0.15 | — | ≈$0.317 | ≈₩460 |
| C | 5문항·20장 | $0.040 | 5×(6,000+4,000)×$3/1e6=$0.15 | 5×$0.0375=$0.1875 | — | ≈$0.437 | ≈₩634 |

**처리시간 추정 `[추정]`:** 문항당 평가 10~40s(타임아웃 45s 기본, `worker-client.ts:95`) + 추출 수초. 시나리오 C(5문항)는 병렬 처리 시 ~1분, 순차 시 3~4분.

**수익성 검토(회차=1 Credit):** 가격 정책 — 1C=₩4,900, 3C=₩11,900(≈₩3,967/C), 5C=₩17,900(≈₩3,580/C), 10C=₩29,900(≈₩2,990/C). **1회차=1문항세트 평가라고 보면** 변동 AI원가(위 표)는 회차당 ≈₩300~700로, 10C 묶음 단가 ₩2,990 대비해도 **원가율 10~23%** 수준(가정 하에서). 단 **무료가입 Credit·무료 재첨삭**이 원가를 증폭:
- 무료 재첨삭 = 같은 회차에 추가 평가 1회 → **변동원가 2배**(₩600~1,400), 수익 0.
- 무료가입 Credit = 신규 유저당 획득원가.
**결론 `[추정]`:** Sonnet 기준·가정 하에선 묶음가가 AI 변동원가를 충분히 상회하나, (1) Opus 사용 시 원가 ~1.7배, (2) 하이브리드(C)에서 Mathpix+CAS+재시도 누적, (3) 무료 재첨삭 남용이 마진을 잠식. **모델 티어(평가=Sonnet, 난제만 Opus 승급)·재첨삭 1회 제한·실패(INVALID) 시 Credit 미차감 정책**이 수익성 방어의 핵심. 실제 수치는 §10 PoC 실측으로 교체 필요(`[검증필요]`).

---

## 10. PoC 설계

**대상(3종):**
1. **건국대 자연논술 — 성공기록 회귀.** 이미 성공한 회차를 고정 입력으로 **재현성** 검증(결정론적 통과 유지).
2. **인하대 자연논술 — 장애 재현·분석.** 문제1 통과 / 문제2·3 `INVALID_OUTPUT` 재현 후 §4.3 체크리스트로 (b/c/d) 확정. piecewise `S(x)` 대안경로가 §4 (c) 가설을 유발하는지 CAS 동치검증 전/후로 비교.
3. **한양대 상경논술 — 혼합형.** 문제1 Essay·문제2 Math를 **회차 통합**해 §8 ② 모듈 라우팅 검증.

**평가 방법 `[확인됨 원칙]`:**
- **실제 학생답안 vs 공식 예시답안 구분.** 공식 예시답안을 **무조건 만점 처리 금지** — 모델이 예시답안에도 "근거 부족/동치 불확실"을 과오탐지하지 않는지(정밀도), 실제 학생답안의 오류를 탐지하는지(재현율)를 분리 측정.
- **측정 지표:** 오류탐지능력(root error recall/precision), 근거정확성(스텝-영역 grounding 적중, `validation.ts:103` 위반율), 재현성(동일 입력 N회 반복 시 결과 안정성), `INVALID_OUTPUT` 발생률·원인분포.
- **바케오프 하네스 재사용:** `math-input/bakeoff/`의 categories(`SUBPROBLEM_MARKERS`, `MULTIPAGE_READING_ORDER`, `AMBIGUOUS_EXPONENT` 등)로 추출 품질을, 평가 측은 scripted/derived 평가 어댑터(`evaluator.ts`)로 결과 품질을 측정. **라이브 호출은 Owner 승인·격리 환경에서만.**

---

## 11. 단계별 개발 전략 비교 및 추천

| 전략 | 내용 | 변경범위 | 리스크 | 효과 |
|---|---|---|---|---|
| **A. 최소 수정** | `physicalFinalize` 위반 **구분 코드**(진단성), 핀/criteria 정합 보강, ql `processing_outcome` 관측 강화, 라이브 추출 어댑터 1종 연결 | 소 | 낮음 | §4 원인 즉시 특정, 재발 시 자가진단 |
| **B. 멀티모달 도입** | 평가 어댑터에 원본 이미지+grounding 입력, echo/grounding 계약 보강 | 중 | 중 | 추출손실 보정, 난문항 정확도↑ |
| **C. 전용 파이프라인** | 하이브리드(이미지+Mathpix+멀티모달+SymPy) + 상경 모듈 분리(§8 ②) | 중~대 | 중~대 | 동치 자동판정으로 INVALID 근본 완화 |

**추천 `[추정]`: A → B → C 순차(“진단 먼저, 능력 나중”).** 지금 당장은 **A**로 `INVALID_OUTPUT`의 원인을 로그에서 특정 가능하게 만들고(가장 저위험·고효용), 데이터가 쌓이면 **B**(멀티모달)로 난문항 정확도를, 마지막에 **C**(CAS·모듈분리)로 대안경로·혼합형을 완성. 각 단계는 독립 배포·롤백 가능하도록 `MathEvaluatorAdapter` 경계를 유지.

---

## 12. 출시 전략: 인문 선출시(대안1) vs 수리 선해결 후 통합출시(대안2)

| 기준 | **대안1: 인문 선출시(~20개대)** | **대안2: 수리 선해결 후 통합** |
|---|---|---|
| 출시 지연 | 짧음(인문은 성공사례 보유) | 김(수리 INVALID 원인 규명·하이브리드 개발 선행) |
| 기술 불확실성 | 낮음 | 높음(§4 미확정, 라이브 Provider 미연결) |
| 안정성 | 높음(검증된 Essay 경로) | 통합 시점까지 미지 |
| 매출 | 조기 매출·현금흐름 | 지연, 단 통합 상품성↑ |
| 운영비 | 낮게 시작 | 초기부터 멀티모달+CAS 비용 |
| 사용자 만족도 | 인문 사용자 즉시 만족 / 수리 사용자 대기 | 전 영역 동시 만족(성공 시) |
| 확장성 | 수리는 추후 모듈 추가로 확장(계약 이미 분리) | 처음부터 통합 아키텍처 |

**분석 `[추정]`:** 수리는 **원인조차 로그로 미확정**(§4)이고 라이브 Provider도 미연결이라 **대안2는 출시 리스크가 크다.** 인문은 성공사례·검증 경로가 있어 **대안1이 기술 불확실성 대비 합리적**이며, 그 사이 수리는 전략 A(진단)→PoC(§10)로 **리스크를 선제 축소**할 수 있다. 코드상 Essay/Math 경로가 이미 분리되어 있어(인문 선출시가 수리 통합을 막지 않음) **대안1 후 수리 모듈 추가**가 자연스럽다.

> **단, 출시 정책은 임의 변경하지 않으며 Owner 결정사항으로 남긴다.** 본 보고서는 비교·권고만 제시한다.

---

## 13. Owner 의사결정 5개 질문 — 답변

**① Math Worker 개선만으로 충분한가?**
`[추정]` **부분적으로 충분, 단독으론 불충분.** 전략 A(진단성·핀 정합)는 **지금의 INVALID 재발 원인 특정·일부 거부(형식/핀)를 즉시 줄인다.** 그러나 §4 (c)(대안 동치 불확실)가 유력 원인이라면, 그 **근본 완화에는 CAS 동치검증(C)**이 필요. 권고: **A를 먼저 하고 로그로 원인 확정 후** B/C 필요성을 데이터로 판단.

**② 원본 이미지 직접평가(멀티모달)가 필요한가?**
`[추정]` **중기적으로 그렇다, 그러나 전제가 있다.** 추출은 이미 멀티모달이므로 "직접평가"의 가치는 **추출손실 보정**에 있음. 다만 grounding/핀 계약을 이미지 기반으로 재매핑해야 하며(§5), **A의 진단 데이터로 "추출손실이 실제 실패원인인지" 확인한 뒤** 도입하는 게 비용효율적.

**③ 별도 수학검증 도구(CAS)가 필요한가?**
`[추정]` **§4 (c)가 확정되면 그렇다.** `MATHEMATICAL_EQUIVALENCE_UNCERTAIN`을 물리단계가 하드 거부(`physical-contract.ts:56`)하는 현 구조에서, **SymPy 동치검증이 "불확실→판정"으로 바꿔 INVALID의 근본 원인 하나를 제거**. 우선 SymPy(무료·자체호스팅)로 PoC, Wolfram은 필요 시.

**④ 상경논술: 혼합 유지 vs 독립 분리?**
`[추정]` **전용 모듈 분리(§8 ②) 권고.** 물리적 독립 Worker(③)까지는 불필요. 공통 Registry·History·Credit 재사용 전제에서, 회차 통합 레이어의 **문항 kind 라우팅**이 진단성·재사용·정산 단순성의 최적점.

**⑤ 수리 지금 개발 vs 인문 선출시?**
`[추정]` **인문 선출시(대안1) + 수리는 병행하여 전략 A(진단)·PoC 선행**을 권고. 수리는 원인 미확정·Provider 미연결로 즉시 출시 리스크가 큼. 단, **최종 출시 정책은 Owner 결정사항.**

---

## 부록 A. 근거 파일 인덱스 (주요)

- 오류코드/계약: `src/lib/math-eval/runtime/contract.ts:11-52`
- Worker 실행·실패 분기: `src/lib/math-eval/runtime/worker-client.ts:79-125`
- LAB 검증 규칙: `src/lib/math-eval/validation.ts:85-190`
- 물리 직렬화/throw 조건: `src/lib/math-eval/runtime/physical-contract.ts:16-83`
- 도메인 타입: `src/lib/math-eval/types.ts:13-217`
- 추출 오케스트레이션(멀티모달·폴백·확인): `src/lib/math-input/orchestration.ts:78-263`
- 비전 타입/영역: `src/lib/math-input/types.ts:44-143`
- 바케오프 하네스: `src/lib/math-input/bakeoff/providers.ts`, `.../types.ts`
- 런타임 PG 오류 매핑(54000 RESPONSE_BOUND 등): `src/lib/math-input/runtime/errors.ts`
- ql-read-v1 소비(진단 관측): `src/lib/quality/contract.ts:28-59`, `src/lib/quality/client.ts`, `src/components/quality/quality-case-list.tsx:159`
- 아키텍처 경계(라이브 평가 제외): `docs/ARCHITECTURE.md:17,21`

## 부록 B. 확인·추정·검증필요 요약

- **`[확인됨]`:** 오류코드 매핑(INVALID_OUTPUT), 2개 throw 경로, 각 거부 조건, 멀티모달 추출 구조, 라이브 Provider 미연결, 진단 사각지대(단일 메시지 수렴), ql `processing_outcome` 관측 지점.
- **`[추정]`:** 인하대 문제2·3의 (c)/(d) 유력 가설, 아키텍처·전략·출시 권고, 비용 수치(가정 기반).
- **`[검증필요]`:** Production Worker 로그(MATH_VALIDATION_FAILED/MATH_PHYSICAL_FAILED), ql `processing_outcome` 실제값, APP `math_evaluation.fail` 행, MATH-2C/2D canonical SQL, 모델·OCR 실제 가격표, PoC 실측 정확도/원가.

## 부록 C. 출처(외부 공개 소스, 가격은 수시 변동 — 공식 가격표 재확인 필요)

- Anthropic API 가격(소스 종합): [metacto](https://metacto.com/blogs/anthropic-api-pricing-a-full-breakdown-of-costs-and-integration), [finout](https://finout.io/blog/claude-pricing-in-2026-for-individuals-organizations-and-developers)
- Mathpix 공식 billing: [mathpix.com/docs/ocr/billing](https://mathpix.com/docs/ocr/billing), [가격 인하 공지](https://mathpix.com/blog/image-api-price-reduction)

---

> **Unified Wiki 기록:** 본 보고서는 저장소 `docs/`에 생성됨(저장소가 곧 LAB의 1차 기록처). 외부 Unified Wiki(별도 시스템) 반영 대상이 있다면 그 위치를 Owner가 확정해 주면 동일 내용으로 등재 가능. (현재 저장소에 `wiki` 파일은 없음 — 확인 결과.)
