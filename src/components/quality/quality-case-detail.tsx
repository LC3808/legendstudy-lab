"use client";

import type { QualityCaseDetail } from "@/lib/quality/contract";
import type { QualityErrorKind } from "@/lib/quality/errors";
import { availabilityOf, partitionImprovements, studentRewriteAttempts } from "@/lib/quality/view";

import {
  QlAvailability,
  QlFieldRow,
  QlSection,
  QlStructuredValue,
  QlUnavailable,
  qlScalar,
} from "./quality-primitives";

/**
 * Case detail panel. Renders the canonical `ql-read-v1` detail groups as
 * readable sections (task §11). The full student answer appears ONLY here.
 * Account direct identifiers (email/name/phone/OAuth) are never rendered; the
 * pseudonym is presentation only.
 */

export type DetailState = "idle" | "loading" | "loaded" | "error";

function detailErrorCopy(kind: QualityErrorKind | null): string {
  switch (kind) {
    case "UNAUTHORIZED":
      return "이 사례를 조회할 권한이 없습니다.";
    case "NOT_FOUND":
      return "해당 평가 사례를 찾을 수 없습니다.";
    case "NETWORK":
      return "네트워크 오류로 사례를 불러오지 못했습니다.";
    case "MALFORMED_RESPONSE":
      return "응답 형식이 예상과 달라 안전하게 중단했습니다.";
    case "UNSUPPORTED_DTO":
      return "지원하지 않는 contract 버전입니다. 사례를 표시하지 않습니다.";
    default:
      return "사례를 불러오는 중 오류가 발생했습니다.";
  }
}

export function QualityCaseDetailPanel({
  detail,
  state,
  errorKind,
}: {
  detail: QualityCaseDetail | null;
  state: DetailState;
  errorKind: QualityErrorKind | null;
}) {
  if (state === "idle") {
    return (
      <div className="ql-detail ql-detail--placeholder">
        <p className="eyebrow">CASE DETAIL</p>
        <p>왼쪽 목록에서 사례를 선택하면 제출 답안과 평가 근거를 상세히 검토할 수 있습니다.</p>
      </div>
    );
  }
  if (state === "loading") {
    return <div className="ql-detail"><p className="ql-state" aria-live="polite">사례를 불러오는 중입니다.</p></div>;
  }
  if (state === "error") {
    return (
      <div className="ql-detail">
        <div className="ql-callout ql-callout--error" role="alert"><p>{detailErrorCopy(errorKind)}</p></div>
      </div>
    );
  }
  if (!detail) {
    return <div className="ql-detail"><QlUnavailable /></div>;
  }

  const qc = detail.question_context ?? null;
  const submission = detail.student_submission ?? null;
  const evaluation = detail.evaluation ?? null;
  const { core, nonCore } = partitionImprovements(detail.improvements);
  const studentRewrites = studentRewriteAttempts(detail.student_attempts);
  const processing = detail.processing ?? detail.latest_processing ?? null;
  const prov = detail.provenance ?? null;

  return (
    <div className="ql-detail" aria-label="평가 사례 상세">
      <header className="ql-detail__head">
        <p className="eyebrow eyebrow--accent">QUALITY CASE</p>
        <h2>{qc?.university ?? "대학 미상"} · {qc?.exam_name ?? "시험 미상"}</h2>
        <p className="ql-detail__sub">
          {qc?.question_label ?? "문항 라벨 없음"}
          {qc?.admission_year ? ` · ${qc.admission_year}학년도` : ""}
          {" · 학생 "}{detail.student_pseudonym ?? "—"}
        </p>
        <p className="ql-privacy-note">계정 직접 식별정보(이메일·이름·전화·OAuth 식별자)는 표시하지 않습니다. 답안 본문에 개인정보가 포함될 수 있습니다.</p>
      </header>

      {/* 1. Question context */}
      <QlSection title="문항 맥락" eyebrow="QUESTION CONTEXT">
        <QlAvailability value={qc} render={() => (
          <dl className="ql-field-list">
            <QlFieldRow label="대학" value={qlScalar(qc?.university)} />
            <QlFieldRow label="시험" value={qlScalar(qc?.exam_name)} />
            <QlFieldRow label="문항" value={qlScalar(qc?.question_label)} />
            <QlFieldRow label="학년도" value={qlScalar(qc?.admission_year)} />
            <QlFieldRow label="캠퍼스" value={qlScalar(qc?.campus)} />
            <QlFieldRow label="전형" value={qlScalar(qc?.admission_track)} />
            <QlFieldRow label="검증 상태" value={qlScalar(qc?.verification_status)} />
          </dl>
        )} />
      </QlSection>

      {/* 2. Student submitted answer — FULL TEXT (detail only) */}
      <QlSection title="학생 제출 답안 (전체)" eyebrow="STUDENT SUBMISSION">
        <dl className="ql-field-list">
          <QlFieldRow label="제출 시각" value={qlScalar(submission?.submitted_at)} />
          <QlFieldRow label="시도 번호" value={qlScalar(submission?.attempt_no)} />
          <QlFieldRow label="글자 수" value={qlScalar(submission?.character_count)} />
          <QlFieldRow label="입력 방식" value={qlScalar(submission?.input_method)} />
        </dl>
        <QlAvailability
          value={submission?.answer_full_text ?? null}
          unavailableLabel="제출 답안 본문이 제공되지 않았습니다."
          emptyLabel="제출 답안 본문이 비어 있습니다."
          render={() => (
            <article className="ql-answer" data-testid="ql-answer-full">
              <p className="eyebrow">ANSWER FULL TEXT</p>
              <pre className="ql-answer__body">{submission?.answer_full_text}</pre>
            </article>
          )}
        />
      </QlSection>

      {/* 3. Evaluation summary + 4. Strengths + 9. Rewrite checklist */}
      <QlSection title="평가 요약" eyebrow="EVALUATION">
        <QlAvailability value={evaluation} render={() => (
          <>
            <dl className="ql-field-list">
              <QlFieldRow label="상태" value={qlScalar(evaluation?.status)} />
              <QlFieldRow label="요청 종류" value={qlScalar(evaluation?.request_kind)} />
              <QlFieldRow label="무효화 시각" value={qlScalar(evaluation?.invalidated_at)} />
              <QlFieldRow label="무효화 사유" value={qlScalar(evaluation?.invalidation_reason)} />
              <QlFieldRow label="교정 사유" value={qlScalar(evaluation?.correction_reason)} />
            </dl>
            <div className="ql-prose">
              <p className="eyebrow">OVERALL SUMMARY</p>
              {availabilityOf(evaluation?.overall_summary) === "present"
                ? <p>{evaluation?.overall_summary}</p>
                : <QlUnavailable label="평가 요약이 제공되지 않았습니다." />}
            </div>
            <div className="ql-sublists">
              <div>
                <p className="eyebrow">강점 · STRENGTHS</p>
                <QlAvailability value={evaluation?.strengths ?? null} render={() => (
                  <ul className="ql-bullet">{(evaluation?.strengths ?? []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                )} />
              </div>
              <div>
                <p className="eyebrow">재작성 체크리스트 · REWRITE CHECKLIST</p>
                <QlAvailability value={evaluation?.rewrite_checklist ?? null} render={() => (
                  <ul className="ql-bullet">{(evaluation?.rewrite_checklist ?? []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                )} />
              </div>
            </div>
            {availabilityOf(evaluation?.uncertainty_note) === "present"
              ? <p className="ql-note">불확실성: {evaluation?.uncertainty_note}</p> : null}
          </>
        )} />
      </QlSection>

      {/* 5. Dimensions */}
      <QlSection title="평가 차원" eyebrow="DIMENSIONS">
        <QlAvailability value={detail.dimensions} render={() => (
          <div className="ql-dim-grid">
            {(detail.dimensions ?? []).map((dim, i) => (
              <article key={dim.criterion_key ?? i} className="ql-dim">
                <div className="ql-dim__head">
                  <strong>{dim.criterion_label ?? dim.criterion_key ?? "기준"}</strong>
                  <span className="ql-chip">{dim.level_1_to_5 != null ? `L${dim.level_1_to_5}/5` : "수준 —"}</span>
                </div>
                <p className="ql-dim__meta">
                  {dim.origin ? `출처 ${dim.origin}` : "출처 —"}
                  {dim.official_weight_percent != null ? ` · 가중치 ${dim.official_weight_percent}%` : ""}
                </p>
                {dim.explanation ? <p>{dim.explanation}</p> : <QlUnavailable label="설명 없음" />}
                {dim.uncertainty_note ? <p className="ql-note">불확실성: {dim.uncertainty_note}</p> : null}
              </article>
            ))}
          </div>
        )} />
      </QlSection>

      {/* 6. CORE improvements */}
      <QlSection title="CORE 개선 (핵심)" eyebrow="CORE IMPROVEMENTS" tone="core">
        <QlAvailability
          value={detail.improvements}
          emptyLabel="개선 항목이 비어 있습니다."
          render={() => (core.length === 0
            ? <p className="ql-state ql-state--empty" data-availability="empty">CORE 항목이 없습니다 (유효한 상태).</p>
            : <ImprovementList items={core} />)}
        />
        {availabilityOf(detail.core_improvement_keys) === "present" ? (
          <p className="ql-note">core_improvement_keys: {(detail.core_improvement_keys ?? []).join(", ")}</p>
        ) : null}
      </QlSection>

      {/* 7. NON-CORE improvements (lower hierarchy, collapsible) */}
      <QlSection title="NON-CORE 개선" eyebrow="NON-CORE IMPROVEMENTS">
        <QlAvailability value={detail.improvements} render={() => (nonCore.length === 0
          ? <p className="ql-state ql-state--empty" data-availability="empty">NON-CORE 항목이 없습니다.</p>
          : <details className="ql-collapse"><summary>{nonCore.length}개 항목 보기</summary><ImprovementList items={nonCore} /></details>)}
        />
      </QlSection>

      {/* 8. Sentence feedback */}
      <QlSection title="문장 단위 피드백" eyebrow="SENTENCE FEEDBACK">
        <QlAvailability
          value={detail.sentence_feedback}
          unavailableLabel="문장 단위 피드백이 제공되지 않았습니다 (해당 contract에서 미제공)."
          render={() => <QlStructuredValue value={detail.sentence_feedback} />}
        />
      </QlSection>

      {/* 10. Student subsequent attempts / rewrite context */}
      <QlSection title="학생 재작성 · 후속 시도" eyebrow="STUDENT ATTEMPTS">
        <QlAvailability value={detail.student_attempts} render={() => (
          <ul className="ql-attempts">
            {(detail.student_attempts ?? []).map((attempt, i) => (
              <li key={attempt.attempt_id ?? i}>
                <span className="ql-chip">{attempt.is_rewrite ? "재작성" : "원답안"}</span>
                <span>시도 {qlScalar(attempt.attempt_no)} · {qlScalar(attempt.submitted_at)} · {qlScalar(attempt.character_count)}자</span>
              </li>
            ))}
          </ul>
        )} />
        <p className="ql-note">
          학생 재작성 {studentRewrites.length}건. 학생 재작성은 후속 학생 제출이며, 아래 AI 생성 재작성과 다른 개념입니다.
        </p>
      </QlSection>

      {/* 11. Generated rewrite — clearly distinct (AI artifact) */}
      <QlSection title="AI 생성 재작성 (학생 답안과 구별)" eyebrow="GENERATED REWRITE" tone="ai">
        <QlAvailability
          value={detail.generated_rewrite}
          unavailableLabel="AI 생성 재작성이 없습니다."
          render={() => (
            <article className="ql-generated" data-testid="ql-generated-rewrite">
              <dl className="ql-field-list">
                <QlFieldRow label="상태" value={qlScalar(detail.generated_rewrite?.status)} />
                <QlFieldRow label="출처" value={qlScalar(detail.generated_rewrite?.origin)} />
                <QlFieldRow label="완료 시각" value={qlScalar(detail.generated_rewrite?.completed_at)} />
              </dl>
              {availabilityOf(detail.generated_rewrite?.body) === "present"
                ? <pre className="ql-answer__body ql-answer__body--ai">{detail.generated_rewrite?.body}</pre>
                : <QlUnavailable label="생성 본문이 없습니다." />}
            </article>
          )}
        />
      </QlSection>

      {/* 12. Progress / history context */}
      <QlSection title="진행 · 이력 맥락" eyebrow="HISTORY CONTEXT">
        <div className="ql-history">
          <div>
            <p className="eyebrow">history_context</p>
            <QlStructuredValue value={detail.history_context} />
          </div>
          <div>
            <p className="eyebrow">previous_review_representation</p>
            <QlStructuredValue value={detail.previous_review_representation} />
          </div>
          <div>
            <p className="eyebrow">session_evaluations</p>
            <QlAvailability value={detail.session_evaluations} render={() => (
              <ul className="ql-attempts">
                {(detail.session_evaluations ?? []).map((se, i) => (
                  <li key={se.evaluation_id ?? i}><span className="ql-chip">{se.status ?? "—"}</span><span>{qlScalar(se.requested_at)}</span></li>
                ))}
              </ul>
            )} />
            {detail.session_evaluations_truncated ? <p className="ql-note">세션 평가 목록이 일부 생략되었습니다.</p> : null}
          </div>
        </div>
      </QlSection>

      {/* 13. Official evidence references / metadata */}
      <QlSection title="공식 근거 · 참조 메타데이터" eyebrow="EVIDENCE">
        <div className="ql-history">
          <div><p className="eyebrow">official_evidence</p><QlStructuredValue value={detail.official_evidence} /></div>
          <div><p className="eyebrow">evaluation_evidence_links</p><QlStructuredValue value={detail.evaluation_evidence_links} /></div>
          <div><p className="eyebrow">frozen_evidence_bindings</p><QlStructuredValue value={detail.frozen_evidence_bindings} /></div>
          <div><p className="eyebrow">frozen_criterion_bindings</p><QlStructuredValue value={detail.frozen_criterion_bindings} /></div>
          <div><p className="eyebrow">reference_metadata_scope</p><QlStructuredValue value={detail.reference_metadata_scope} /></div>
          <div><p className="eyebrow">scaffolding_availability</p><QlStructuredValue value={detail.scaffolding_availability} /></div>
        </div>
      </QlSection>

      {/* 14. Provenance */}
      <QlSection title="출처 · 프로비넌스" eyebrow="PROVENANCE">
        <QlAvailability value={prov} render={() => (
          <dl className="ql-field-list">
            <QlFieldRow label="모델 제공자" value={qlScalar(prov?.model_provider)} />
            <QlFieldRow label="모델" value={qlScalar(prov?.model_name)} />
            <QlFieldRow label="모델 버전" value={qlScalar(prov?.model_version)} />
            <QlFieldRow label="prompt_version" value={qlScalar(prov?.prompt_version)} />
            <QlFieldRow label="contract_version" value={qlScalar(prov?.contract_version)} />
            <QlFieldRow label="evaluation_version" value={qlScalar(prov?.evaluation_version)} />
            <QlFieldRow label="regime_key" value={qlScalar(prov?.regime_key)} />
            <QlFieldRow label="근거 완전성" value={qlScalar(prov?.evidence_completeness)} />
            <QlFieldRow label="evidence_manifest_sha256" value={<code className="ql-hash">{prov?.evidence_manifest_sha256 ?? "—"}</code>} />
            <QlFieldRow label="input_sha256" value={<code className="ql-hash">{prov?.input_sha256 ?? "—"}</code>} />
            <QlFieldRow label="output_sha256" value={<code className="ql-hash">{prov?.output_sha256 ?? "—"}</code>} />
          </dl>
        )} />
      </QlSection>

      {/* 15. Processing information */}
      <QlSection title="처리 정보" eyebrow="PROCESSING">
        <QlAvailability value={processing} render={() => (
          <dl className="ql-field-list">
            <QlFieldRow label="run_no" value={qlScalar(processing?.run_no)} />
            <QlFieldRow label="제공자" value={qlScalar(processing?.provider)} />
            <QlFieldRow label="모델" value={qlScalar(processing?.model_name)} />
            <QlFieldRow label="상태" value={qlScalar(processing?.status)} />
            <QlFieldRow label="지연(ms)" value={qlScalar(processing?.latency_ms)} />
            <QlFieldRow label="입력 토큰" value={qlScalar(processing?.input_tokens)} />
            <QlFieldRow label="출력 토큰" value={qlScalar(processing?.output_tokens)} />
            <QlFieldRow label="비용" value={processing?.cost_amount != null ? `${processing.cost_amount} ${processing.currency ?? ""}`.trim() : qlScalar(null)} />
            <QlFieldRow label="오류 코드" value={qlScalar(processing?.error_code)} />
            <QlFieldRow label="타임아웃 시각" value={qlScalar(processing?.timed_out_at)} />
          </dl>
        )} />
      </QlSection>
    </div>
  );
}

function ImprovementList({ items }: { items: QualityCaseDetail["improvements"] }) {
  return (
    <ul className="ql-improvements">
      {(items ?? []).map((item, i) => (
        <li key={item.progress_id ?? item.issue_key ?? i} className="ql-improvement">
          <div className="ql-improvement__head">
            <strong>{item.title ?? item.issue_key ?? "개선 항목"}</strong>
            <span className="ql-improvement__tags">
              {item.category ? <span className="ql-chip">{item.category}</span> : null}
              {item.status ? <span className="ql-chip">{item.status}</span> : null}
              {typeof item.priority === "number" ? <span className="ql-chip ql-chip--order">우선순위 {item.priority}</span> : null}
            </span>
          </div>
          {item.explanation ? <p>{item.explanation}</p> : null}
          {item.next_action ? <p className="ql-improvement__action">→ {item.next_action}</p> : null}
        </li>
      ))}
    </ul>
  );
}
