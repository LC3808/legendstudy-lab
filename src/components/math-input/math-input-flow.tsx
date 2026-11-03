"use client";

/**
 * MATH-3B — minimal student-facing input/confirmation flow (MATH-3A §55, §19). Mobile-first,
 * accessible, and presentational: it renders a canonical ReadinessResult and raises confirmation
 * intents through callbacks. It consumes only the provider-independent Vision contract
 * (`@/lib/math-input/*`) — client-safe lib only, no provider payloads, no raw binaries.
 *
 * It proves the input contract; it is NOT the full Math product UI and renders no MATH-4 result.
 */

import {hasUnresolvedRecognition,criticalMath} from "@/lib/math-input/recognition-safety";
import {SourceRegion} from "./source-region";
import {MathText,Formula} from "../math-display/math-text";
import { useState } from "react";

import type { ReadinessResult, VisionRegion } from "@/lib/math-input/types";

export interface ConfirmationIntent {
  regionId: string;
  confirmedRawText: string;
  acceptedAsIs: boolean;
}

export interface MathInputFlowProps {
  readiness: ReadinessResult;
  sourceFile?: (region: VisionRegion) => File | undefined;
  onConfirm: (intent: ConfirmationIntent) => void;
  onInvalidate?: (regionId: string) => void;
}

const STATUS_LABEL: Record<ReadinessResult["status"], string> = {
  READY_FOR_EVALUATION: "평가 준비 완료",
  NEEDS_CONFIRMATION: "확인 필요",
  NEEDS_REUPLOAD: "다시 업로드해 주세요",
  INPUT_FAILED: "입력을 처리할 수 없습니다",
};

export function RegionConfirmation({
  region, sourceFile,
  onConfirm, onInvalidate,
}: {
  region: VisionRegion;
  sourceFile?: File;
  onConfirm: (intent: ConfirmationIntent) => void;
  onInvalidate?: (regionId: string) => void;
}) {
  // Normalized math can omit prose such as final maxima/minima. Keep the complete transcription.
  const interpreted = region.rawText.trim() ? region.rawText : region.normalizedMath ?? "";
  const [value, setValue] = useState(interpreted);
  const [confirmed,setConfirmed]=useState(false);
  const inputId = `math-input-region-${region.regionId}`;

  return (
    <li className="math-input-region" data-region-id={region.regionId}>
      <SourceRegion file={sourceFile} region={region}/>
      <p className="math-input-region__context">
        원본에서 읽은 부분
        {region.evidenceRef ? <span className="math-input-region__evidence"> (원본 이미지 영역)</span> : null}
      </p>
      <p>페이지 {region.pageIndex+1} · {({TEXT:'텍스트',MATH:'수식',TABLE_REGION:'표',GRAPH_REGION:'그래프',DIAGRAM_REGION:'도형',VISUAL_REGION:'시각 자료'})[region.regionType]} · 인식 신뢰도 {({HIGH:'높음',MEDIUM:'보통',LOW:'낮음',AMBIGUOUS:'기호 불명확',UNREADABLE:'판독 불가'})[region.confidence]}</p>
      <p>신뢰도가 높아도 원본과 일치한다는 뜻은 아닙니다. 부호·지수·첨자·분수·괄호·부등호·적분 구간·숫자와 단위를 확인해 주세요.</p>
      {criticalMath(interpreted)&&<p>수학 기호 원본 대조 필요 · UNCERTAIN (학생 확인 전)</p>}
      <p className="math-input-region__reading">이렇게 읽었습니다: <MathText text={interpreted || "(읽을 수 없음)"}/></p>
      {region.normalizedMath && <div aria-label="인식 수식 미리보기"><Formula source={value}/></div>}
      {['LOW','AMBIGUOUS','UNREADABLE'].includes(region.confidence)&&<p role="status">인식이 불확실합니다. 원본을 보고 수정해 주세요. 인식 오류를 풀이 오류로 채점하지 않습니다.</p>}
      <details><summary>최초 인식 원문</summary><pre style={{whiteSpace:'pre-wrap'}}>{region.rawText}</pre></details>
      <label htmlFor={inputId} className="math-input-region__label">
        수정할 내용
      </label>
      <textarea
        id={inputId}
        name={inputId}
        className="math-input-region__field"
        value={value}
        onChange={(event) => {setValue(event.target.value);setConfirmed(false);onInvalidate?.(region.regionId);}}
      />
      <p role="status">{confirmed?"확인됨":"원본과 비교한 뒤 확인 또는 수정을 눌러 주세요."}</p>
      <div className="math-input-region__actions">
        <button
          type="button"
          disabled={value!==interpreted||hasUnresolvedRecognition(interpreted)||!interpreted.trim()||region.confidence==="UNREADABLE"} onClick={() => {onConfirm({ regionId: region.regionId, confirmedRawText: interpreted, acceptedAsIs: true });setConfirmed(true);}}
        >
          확인
        </button>
        <button
          type="button"
          disabled={hasUnresolvedRecognition(value)||!value.trim()||(region.confidence==="UNREADABLE"&&value===interpreted)} onClick={() => {onConfirm({ regionId: region.regionId, confirmedRawText: value, acceptedAsIs: value === interpreted });setConfirmed(true);}}
        >
          수정
        </button>
      </div>
    </li>
  );
}

export function MathInputFlow({ readiness, onConfirm, onInvalidate, sourceFile }: MathInputFlowProps) {
  return (
    <section className="math-input-flow" aria-label="수학 답안 입력">
      <h2 className="math-input-flow__status" data-status={readiness.status}>
        {STATUS_LABEL[readiness.status]}
      </h2>

      {readiness.status === "NEEDS_CONFIRMATION" ? (
        <>
          <p className="math-input-flow__hint">아래 부분만 확인해 주세요. 나머지는 다시 풀 필요가 없습니다.</p>
          <ul className="math-input-flow__regions">
            {readiness.confirmationRequired.map((region) => (
              <RegionConfirmation key={region.regionId} region={region} sourceFile={sourceFile?.(region)} onConfirm={onConfirm} onInvalidate={onInvalidate} />
            ))}
          </ul>
        </>
      ) : null}

      {readiness.status === "NEEDS_REUPLOAD" ? (
        <p className="math-input-flow__message">사진이 흐리거나 일부가 잘려 다시 올려야 합니다.</p>
      ) : null}

      {readiness.status === "READY_FOR_EVALUATION" ? (
        <p className="math-input-flow__message">입력이 준비되었습니다. 평가를 시작할 수 있습니다.</p>
      ) : null}
    </section>
  );
}
