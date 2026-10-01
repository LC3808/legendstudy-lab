"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { QualityCaseDetail } from "@/lib/quality/contract";
import type { HumanReviewClient } from "@/lib/quality/human-review-client";
import type { HqJudgment, HqJudgmentCursor } from "@/lib/quality/human-review-contract";
import { humanReviewErrorKind, type HumanReviewErrorKind } from "@/lib/quality/human-review-errors";
import { buildSubmitPayload, expectedOutputSha256, extractFindingTargets, type HumanReviewDraft } from "@/lib/quality/human-review-view";

import { QualityReviewForm } from "./quality-review-form";
import { QualityReviewHistory } from "./quality-review-history";

/**
 * Human Review section inside case detail: history + submission/correction form.
 * Visually distinct from AI-generated feedback. All writes go through the
 * canonical RPC; the AI evaluation is never mutated.
 */

type LoadState = "loading" | "loaded" | "error";

function newSubmissionId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `sub-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

function submitErrorMessage(kind: HumanReviewErrorKind): string {
  switch (kind) {
    case "UNAUTHORIZED":
    case "FORBIDDEN":
      return "검토 기록 권한이 없습니다.";
    case "NOT_FOUND":
      return "평가를 찾을 수 없습니다.";
    case "VALIDATION":
      return "제출 내용이 서버 검증을 통과하지 못했습니다. 판정·항목·이슈 대상을 확인하세요.";
    case "IDEMPOTENCY_CONFLICT":
      return "동일 제출 키로 다른 내용이 이미 접수되었습니다. 내용을 새로 작성해 제출하세요.";
    case "STALE_CORRECTION":
      return "이미 다른 정정이 존재합니다. 최신 검토에서 다시 정정하세요.";
    case "UNSUPPORTED_RUBRIC":
      return "지원하지 않는 contract 버전입니다.";
    case "NETWORK_AMBIGUOUS":
      return "네트워크 상태가 불확실합니다. 같은 내용으로 다시 시도하면 중복 없이 처리됩니다.";
    default:
      return "검토 기록 중 오류가 발생했습니다.";
  }
}

export function QualityReviewPanel({
  humanReview,
  evaluationId,
  detail,
  onReviewed,
}: {
  humanReview: HumanReviewClient;
  evaluationId: string;
  detail: QualityCaseDetail;
  onReviewed: (evaluationId: string) => void;
}) {
  const [judgments, setJudgments] = useState<HqJudgment[]>([]);
  const [historyState, setHistoryState] = useState<LoadState>("loading");
  const [historyError, setHistoryError] = useState<HumanReviewErrorKind | null>(null);
  const [cursor, setCursor] = useState<HqJudgmentCursor | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [correctionOfId, setCorrectionOfId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const attemptRef = useRef<{ signature: string; id: string } | null>(null);

  // Load history for the open case. The panel is remounted per evaluation (keyed
  // by the parent), so per-case resets happen on mount — the effect only fetches
  // and sets state inside async callbacks (React 19 effect rules).
  useEffect(() => {
    let active = true;
    humanReview
      .listJudgments(evaluationId)
      .then((page) => {
        if (!active) return;
        setJudgments(page.judgments);
        setCursor(page.nextCursor);
        setHistoryState("loaded");
      })
      .catch((error) => {
        if (!active) return;
        setHistoryError(humanReviewErrorKind(error));
        setHistoryState("error");
      });
    return () => {
      active = false;
    };
  }, [humanReview, evaluationId, reloadToken]);

  // Event-handler reset (allowed outside an effect) used by retry and post-submit.
  const reloadHistory = () => {
    setHistoryState("loading");
    setHistoryError(null);
    setReloadToken((t) => t + 1);
  };

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    humanReview
      .listJudgments(evaluationId, { cursor })
      .then((page) => {
        setJudgments((prev) => [...prev, ...page.judgments]);
        setCursor(page.nextCursor);
      })
      .catch((error) => {
        setHistoryError(humanReviewErrorKind(error));
        setHistoryState("error");
      })
      .finally(() => setLoadingMore(false));
  }, [cursor, loadingMore, humanReview, evaluationId]);

  const submit = useCallback(
    (draft: HumanReviewDraft) => {
      const sha = expectedOutputSha256(detail);
      if (!sha) {
        setServerError("이 평가에는 출력 해시(provenance.output_sha256)가 없어 검토를 기록할 수 없습니다.");
        return;
      }
      // Idempotency: reuse the submission id while the intended payload is unchanged;
      // a changed draft yields a new id. A network-ambiguous retry keeps the id.
      const signature = JSON.stringify({ evaluationId, correctionOfId, draft });
      const id = attemptRef.current && attemptRef.current.signature === signature ? attemptRef.current.id : newSubmissionId();
      attemptRef.current = { signature, id };

      const targets = extractFindingTargets(detail);
      const payload = buildSubmitPayload({ draft, evaluationId, expectedOutputSha256: sha, clientSubmissionId: id, targets });

      setSubmitting(true);
      setServerError(null);
      humanReview
        .submitJudgment(payload)
        .then(() => {
          attemptRef.current = null;
          setCorrectionOfId(null);
          setFormKey((k) => k + 1); // reset the form to empty
          reloadHistory(); // refresh history (shows loading, bumps token)
          onReviewed(evaluationId); // refresh list review-state
        })
        .catch((error) => {
          // Do not auto-retry and do not rotate the submission id here.
          setServerError(submitErrorMessage(humanReviewErrorKind(error)));
        })
        .finally(() => setSubmitting(false));
    },
    [detail, evaluationId, correctionOfId, humanReview, onReviewed],
  );

  return (
    <section className="ql-review-panel" aria-label="인간 검토" data-testid="ql-human-review">
      <header className="ql-review-panel__head">
        <p className="eyebrow eyebrow--accent">HUMAN REVIEW · 인간 품질 검토</p>
        <p className="ql-muted">AI 평가와 별개의 운영자 검토입니다. 제출은 불변 이력으로 기록되며 AI 평가 자체를 변경하지 않습니다.</p>
      </header>

      <div className="ql-review-panel__history">
        <p className="eyebrow">검토 이력</p>
        {historyState === "loading" ? <p className="ql-state" aria-live="polite">검토 이력을 불러오는 중입니다.</p> : null}
        {historyState === "error" ? (
          <div className="ql-callout ql-callout--error" role="alert">
            <p>{historyError === "NOT_FOUND" ? "평가를 찾을 수 없습니다." : historyError === "UNAUTHORIZED" ? "검토 이력 조회 권한이 없습니다." : "검토 이력을 불러오지 못했습니다."}</p>
            <button type="button" className="button button--outline button--small" onClick={reloadHistory}>다시 시도</button>
          </div>
        ) : null}
        {historyState === "loaded" ? (
          <QualityReviewHistory judgments={judgments} onCorrect={setCorrectionOfId} hasMore={Boolean(cursor)} onLoadMore={loadMore} loadingMore={loadingMore} />
        ) : null}
      </div>

      <div className="ql-review-panel__form">
        <p className="eyebrow">{correctionOfId ? "검토 정정" : "새 검토 기록"}</p>
        <QualityReviewForm
          key={`${evaluationId}:${formKey}:${correctionOfId ?? "new"}`}
          detail={detail}
          correctionOfId={correctionOfId}
          submitting={submitting}
          serverError={serverError}
          onSubmit={submit}
          onCancelCorrection={correctionOfId ? () => setCorrectionOfId(null) : undefined}
        />
      </div>
    </section>
  );
}
