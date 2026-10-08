"use client";

/**
 * MATH-3B — minimal student-facing input/confirmation flow (MATH-3A §55, §19). Mobile-first,
 * accessible, and presentational: it renders a canonical ReadinessResult and raises confirmation
 * intents through callbacks. It consumes only the provider-independent Vision contract
 * (`@/lib/math-input/*`) — client-safe lib only, no provider payloads, no raw binaries.
 *
 * It proves the input contract; it is NOT the full Math product UI and renders no MATH-4 result.
 */

import { useState } from "react";

import type { ReadinessResult, VisionRegion } from "@/lib/math-input/types";

export interface ConfirmationIntent {
  regionId: string;
  confirmedRawText: string;
  acceptedAsIs: boolean;
}

export interface MathInputFlowProps {
  readiness: ReadinessResult;
  onConfirm: (intent: ConfirmationIntent) => void;
}

const STATUS_LABEL: Record<ReadinessResult["status"], string> = {
  READY_FOR_EVALUATION: "평가 준비 완료",
  NEEDS_CONFIRMATION: "확인 필요",
  NEEDS_REUPLOAD: "다시 업로드해 주세요",
  INPUT_FAILED: "입력을 처리할 수 없습니다",
};

function RegionConfirmation({
  region,
  onConfirm,
}: {
  region: VisionRegion;
  onConfirm: (intent: ConfirmationIntent) => void;
}) {
  const interpreted = region.normalizedMath ?? region.rawText;
  const [value, setValue] = useState(interpreted);
  const inputId = `math-input-region-${region.regionId}`;

  return (
    <li className="math-input-region" data-region-id={region.regionId}>
      <p className="math-input-region__context">
        원본에서 읽은 부분
        {region.evidenceRef ? <span className="math-input-region__evidence"> (원본 이미지 영역)</span> : null}
      </p>
      <p className="math-input-region__reading">이렇게 읽었습니다: {interpreted || "(읽을 수 없음)"}</p>
      <label htmlFor={inputId} className="math-input-region__label">
        수정할 내용
      </label>
      <input
        id={inputId}
        name={inputId}
        className="math-input-region__field"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="math-input-region__actions">
        <button
          type="button"
          onClick={() => onConfirm({ regionId: region.regionId, confirmedRawText: interpreted, acceptedAsIs: true })}
        >
          확인
        </button>
        <button
          type="button"
          onClick={() => onConfirm({ regionId: region.regionId, confirmedRawText: value, acceptedAsIs: value === interpreted })}
        >
          수정
        </button>
      </div>
    </li>
  );
}

export function MathInputFlow({ readiness, onConfirm }: MathInputFlowProps) {
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
              <RegionConfirmation key={region.regionId} region={region} onConfirm={onConfirm} />
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
