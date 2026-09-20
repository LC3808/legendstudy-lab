import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MockNotice, OriginLabel } from "@/components/trust-label";
import { buildMetadata } from "@/lib/brand";
import { mockEvaluation, mockPatternSignals, syntheticQuestion } from "@/fixtures/public-metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ attemptId: mockEvaluation.attemptId }];
}

export async function generateMetadata({ params }: { params: Promise<{ attemptId: string }> }): Promise<Metadata> {
  const { attemptId } = await params;
  return attemptId === mockEvaluation.attemptId ? buildMetadata("합성 평가 결과", "구조화된 synthetic evaluation result mock입니다.") : buildMetadata("평가 결과를 찾을 수 없음", "요청한 mock evaluation fixture를 찾을 수 없습니다.");
}

export default async function EvaluationPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  if (attemptId !== mockEvaluation.attemptId) notFound();
  return <div className="page-section content-wrap content-wrap--detail"><div className="evaluation-heading"><div><div className="trust-row"><OriginLabel origin={mockEvaluation.origin} /><span className="tag">MOCK LEARNING SIGNAL</span></div><p className="eyebrow eyebrow--accent">STRUCTURED EVALUATION MOCK</p><h1>답안을 다시 읽는<br />구조적 피드백.</h1></div><Link className="button button--outline" href={`/essay-lab/write/${syntheticQuestion.id}`}>답안으로 돌아가기</Link></div><MockNotice /><section className="evaluation-summary"><p className="eyebrow">OVERALL SUMMARY</p><p>{mockEvaluation.overallSummary}</p><small>합성 fixture 예시 문구입니다. 실제 AI 출력이나 대학 공식 채점 결과가 아닙니다.</small></section><section className="criteria-grid">{mockEvaluation.criteria.map((criterion) => <article key={criterion.id}><div><h2>{criterion.label}</h2><span className={`criterion-state criterion-state--${criterion.status.replace(" ", "-")}`}>{criterion.status}</span></div><p>{criterion.detail}</p></article>)}</section><section className="evaluation-columns"><article className="surface-card"><p className="eyebrow">STRENGTHS & IMPROVEMENTS</p><h2>다음 초안에서 할 일</h2><div className="learning-list"><div><h3>강점</h3><ul>{mockEvaluation.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>개선</h3><ul>{mockEvaluation.improvements.map((item) => <li key={item}>{item}</li>)}</ul></div></div></article><aside className="review-card"><p className="eyebrow">MY ESSAY PATTERN</p><h2>합성 signal 연결</h2><p>이 결과는 Pattern UX의 정보 구조를 보이기 위한 mock입니다. 실제 누적 분석은 존재하지 않습니다.</p><ul>{mockPatternSignals.slice(0, 2).map((signal) => <li key={signal.id}><strong>{signal.studentLabel}</strong><span>{signal.signalLabel}</span></li>)}</ul><Link className="card-link" href="/my/pattern">My Essay Pattern 보기 →</Link></aside></section><section className="next-actions"><h2>다음 행동</h2><ol>{mockEvaluation.nextActions.map((action) => <li key={action}>{action}</li>)}</ol></section></div>;
}
