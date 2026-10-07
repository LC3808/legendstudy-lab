"use client";

import { useMemo, useState } from "react";

import type { QualityCaseDetail } from "@/lib/quality/contract";
import {
  HQ_CONDITIONAL_DIMENSIONS,
  HQ_DISPOSITIONS,
  HQ_ISSUE_CATEGORIES,
  HQ_RECOMMENDED_ACTIONS,
  HQ_REQUIRED_DIMENSIONS,
  HQ_SELECTION_REASONS,
  HQ_SEVERITIES,
  type HqDimensionKey,
  type HqDisposition,
  type HqIssueCategory,
  type HqRecommendedAction,
  type HqSelectionReason,
  type HqSeverity,
  type HqVerdict,
} from "@/lib/quality/human-review-contract";
import {
  conditionalApplicability,
  DIMENSION_LABELS,
  DISPOSITION_LABELS,
  emptyDraft,
  extractFindingTargets,
  FINDING_NOTE_MAX,
  ISSUE_CATEGORY_LABELS,
  isBlockingDimension,
  RECOMMENDED_ACTION_LABELS,
  SELECTION_REASON_LABELS,
  SEVERITY_LABELS,
  SUMMARY_NOTE_MAX,
  validateDraft,
  VERDICT_LABELS,
  type DraftFinding,
  type HumanReviewDraft,
} from "@/lib/quality/human-review-view";

/**
 * Human Review submission / correction form. Collects a draft and emits it; the
 * parent panel builds the exact canonical payload, manages the idempotency key,
 * and calls the write RPC. Canonical values are preserved internally; Korean
 * labels are display-only.
 */

const REQUIRED_VERDICTS: HqVerdict[] = ["OK", "CONCERN", "FAIL"];

export function QualityReviewForm({
  detail,
  correctionOfId,
  submitting,
  serverError,
  onSubmit,
  onCancelCorrection,
}: {
  detail: QualityCaseDetail;
  correctionOfId?: string | null;
  submitting: boolean;
  serverError?: string | null;
  onSubmit: (draft: HumanReviewDraft) => void;
  onCancelCorrection?: () => void;
}) {
  const applicability = useMemo(() => conditionalApplicability(detail), [detail]);
  const targets = useMemo(() => extractFindingTargets(detail), [detail]);
  const [draft, setDraft] = useState<HumanReviewDraft>(() => {
    const base = emptyDraft(applicability);
    if (correctionOfId) base.supersedes_judgment_id = correctionOfId;
    return base;
  });
  const [confirming, setConfirming] = useState(false);

  const localErrors = useMemo(() => validateDraft(draft, applicability, targets), [draft, applicability, targets]);
  const canSubmit = localErrors.length === 0 && !submitting;

  const update = (patch: Partial<HumanReviewDraft>) => setDraft((prev) => ({ ...prev, ...patch }));
  const setVerdict = (dim: HqDimensionKey, verdict: HqVerdict) =>
    setDraft((prev) => ({ ...prev, rubric: { ...prev.rubric, [dim]: verdict } }));

  const addFinding = () =>
    setDraft((prev) => ({
      ...prev,
      findings: [...prev.findings, { issue_category: null, severity: null, targetOptionKey: null, note: "" }],
    }));
  const updateFinding = (index: number, patch: Partial<DraftFinding>) =>
    setDraft((prev) => ({ ...prev, findings: prev.findings.map((f, i) => (i === index ? { ...f, ...patch } : f)) }));
  const removeFinding = (index: number) =>
    setDraft((prev) => ({ ...prev, findings: prev.findings.filter((_, i) => i !== index) }));

  return (
    <form
      className="ql-review-form"
      aria-label={correctionOfId ? "검토 정정 양식" : "새 검토 양식"}
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        if (!confirming) {
          setConfirming(true);
          return;
        }
        onSubmit(draft);
        setConfirming(false);
      }}
    >
      {correctionOfId ? (
        <div className="ql-callout" role="note">
          <p>정정 기록입니다. 기존 검토는 이력에 보존되며, 이 기록이 새 검토로 추가됩니다.</p>
          {onCancelCorrection ? (
            <button type="button" className="button button--outline button--small" onClick={onCancelCorrection}>정정 취소</button>
          ) : null}
        </div>
      ) : null}

      {/* 종합 판정 */}
      <fieldset className="ql-field-group">
        <legend>종합 판정</legend>
        <div className="ql-radio-row">
          {HQ_DISPOSITIONS.map((disposition) => (
            <label key={disposition} className="ql-radio">
              <input
                type="radio"
                name="overall_disposition"
                value={disposition}
                checked={draft.overall_disposition === disposition}
                onChange={() => update({ overall_disposition: disposition as HqDisposition })}
              />
              <span>{DISPOSITION_LABELS[disposition]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* 필수 rubric */}
      <fieldset className="ql-field-group">
        <legend>필수 평가 항목</legend>
        {HQ_REQUIRED_DIMENSIONS.map((dim) => (
          <VerdictRow
            key={dim}
            label={DIMENSION_LABELS[dim] + (isBlockingDimension(dim) ? " · 차단" : "")}
            value={draft.rubric[dim] ?? null}
            options={REQUIRED_VERDICTS}
            onChange={(v) => setVerdict(dim, v)}
          />
        ))}
      </fieldset>

      {/* 조건부 rubric */}
      <fieldset className="ql-field-group">
        <legend>조건부 평가 항목</legend>
        {HQ_CONDITIONAL_DIMENSIONS.map((dim) => {
          const applicable = applicability[dim];
          if (!applicable) {
            return (
              <div key={dim} className="ql-verdict-row ql-verdict-row--na">
                <span>{DIMENSION_LABELS[dim]}</span>
                <span className="ql-chip">해당 없음 (NA)</span>
              </div>
            );
          }
          return (
            <VerdictRow
              key={dim}
              label={DIMENSION_LABELS[dim]}
              value={draft.rubric[dim] ?? null}
              options={REQUIRED_VERDICTS}
              onChange={(v) => setVerdict(dim, v)}
            />
          );
        })}
      </fieldset>

      {/* findings */}
      <fieldset className="ql-field-group">
        <legend>이슈 (findings)</legend>
        {draft.findings.map((finding, index) => {
          const kindOfSelected = targets.find((t) => t.key === finding.targetOptionKey)?.kind;
          return (
            <div key={index} className="ql-finding">
              <div className="ql-finding__controls">
                <label>
                  <span className="ql-label">분류</span>
                  <select value={finding.issue_category ?? ""} onChange={(e) => updateFinding(index, { issue_category: (e.target.value || null) as HqIssueCategory | null })}>
                    <option value="">선택</option>
                    {HQ_ISSUE_CATEGORIES.map((c) => <option key={c} value={c}>{ISSUE_CATEGORY_LABELS[c]}</option>)}
                  </select>
                </label>
                <label>
                  <span className="ql-label">심각도</span>
                  <select value={finding.severity ?? ""} onChange={(e) => updateFinding(index, { severity: (e.target.value || null) as HqSeverity | null })}>
                    <option value="">선택</option>
                    {HQ_SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
                  </select>
                </label>
                <label className="ql-finding__target">
                  <span className="ql-label">대상</span>
                  <select value={finding.targetOptionKey ?? ""} onChange={(e) => updateFinding(index, { targetOptionKey: e.target.value || null })}>
                    <option value="">현재 평가에서 선택</option>
                    {targets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </label>
                <button type="button" className="button button--outline button--small" onClick={() => removeFinding(index)}>삭제</button>
              </div>
              <input
                type="text"
                className="ql-finding__note"
                placeholder="이슈 메모 (선택, 개인정보·답안 전문 복사 금지)"
                maxLength={FINDING_NOTE_MAX}
                value={finding.note}
                onChange={(e) => updateFinding(index, { note: e.target.value })}
                aria-label={`이슈 ${index + 1} 메모`}
              />
              {kindOfSelected ? <small className="ql-muted">대상 종류: {kindOfSelected}</small> : null}
            </div>
          );
        })}
        <button type="button" className="button button--outline button--small" onClick={addFinding}>+ 이슈 추가</button>
      </fieldset>

      {/* operational fields + note */}
      <fieldset className="ql-field-group ql-field-group--ops">
        <legend>운영 정보 · 메모</legend>
        <div className="ql-ops-row">
          <label>
            <span className="ql-label">검토 사유</span>
            <select value={draft.selection_reason} onChange={(e) => update({ selection_reason: e.target.value as HqSelectionReason })}>
              {HQ_SELECTION_REASONS.map((r) => <option key={r} value={r}>{SELECTION_REASON_LABELS[r]}</option>)}
            </select>
          </label>
          <label>
            <span className="ql-label">권고 조치 (실행되지 않음)</span>
            <select value={draft.recommended_action} onChange={(e) => update({ recommended_action: e.target.value as HqRecommendedAction })}>
              {HQ_RECOMMENDED_ACTIONS.map((a) => <option key={a} value={a}>{RECOMMENDED_ACTION_LABELS[a]}</option>)}
            </select>
          </label>
        </div>
        <label className="ql-note-field">
          <span className="ql-label">내부 메모 (운영자 전용) · {draft.summary_note.length}/{SUMMARY_NOTE_MAX}</span>
          <textarea
            rows={3}
            maxLength={SUMMARY_NOTE_MAX}
            value={draft.summary_note}
            onChange={(e) => update({ summary_note: e.target.value })}
            placeholder="간결한 검토 근거. 개인정보·비밀값·답안 전문·사고 과정을 붙여넣지 마세요."
          />
        </label>
        <label className="ql-checkbox">
          <input type="checkbox" checked={draft.official_source_reviewed} onChange={(e) => update({ official_source_reviewed: e.target.checked })} />
          <span>공식 자료·맥락을 확인했습니다. (운영자 확인이며 서버가 정답을 증명하지 않습니다.)</span>
        </label>
      </fieldset>

      {localErrors.length > 0 ? (
        <ul className="ql-form-errors" aria-live="polite">
          {localErrors.map((err) => <li key={err}>{err}</li>)}
        </ul>
      ) : null}
      {serverError ? <p className="ql-callout ql-callout--error" role="alert">{serverError}</p> : null}

      {confirming ? (
        <div className="ql-confirm" role="alertdialog" aria-label="제출 확인">
          <p>검토 결과를 기록합니다. 기록 후 직접 수정하지 않고, 변경이 필요하면 새 정정 기록을 남깁니다.</p>
          <div className="button-row">
            <button type="submit" className="button button--primary" disabled={!canSubmit}>{submitting ? "기록 중" : "기록 확정"}</button>
            <button type="button" className="button button--outline" onClick={() => setConfirming(false)} disabled={submitting}>취소</button>
          </div>
        </div>
      ) : (
        <button type="submit" className="button button--primary ql-review-form__submit" disabled={!canSubmit}>검토 기록</button>
      )}
    </form>
  );
}

function VerdictRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: HqVerdict | null;
  options: HqVerdict[];
  onChange: (verdict: HqVerdict) => void;
}) {
  return (
    <div className="ql-verdict-row">
      <span className="ql-verdict-row__label">{label}</span>
      <div className="ql-radio-row">
        {options.map((verdict) => (
          <label key={verdict} className="ql-radio ql-radio--small">
            <input type="radio" name={`v-${label}`} value={verdict} checked={value === verdict} onChange={() => onChange(verdict)} />
            <span>{VERDICT_LABELS[verdict]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
