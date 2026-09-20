import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MockNotice, OriginLabel } from "@/components/trust-label";
import { buildMetadata } from "@/lib/brand";
import { syntheticQuestion } from "@/fixtures/public-metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ questionId: syntheticQuestion.id }];
}

function getQuestion(questionId: string) {
  return questionId === syntheticQuestion.id ? syntheticQuestion : undefined;
}

export async function generateMetadata({ params }: { params: Promise<{ questionId: string }> }): Promise<Metadata> {
  const { questionId } = await params;
  const question = getQuestion(questionId);
  return question ? buildMetadata(question.title, "합성 논술 연습 package의 공개 mock overview입니다.") : buildMetadata("연습 문제를 찾을 수 없음", "요청한 합성 question fixture를 찾을 수 없습니다.");
}

export default async function QuestionPage({ params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  const question = getQuestion(questionId);
  if (!question) notFound();
  return <div className="page-section content-wrap content-wrap--detail"><Link className="back-link" href="/essay-lab">← Essay Lab</Link><section className="question-overview"><article><div className="trust-row"><OriginLabel origin={question.origin} /><span className="tag">{question.timeLimitLabel}</span></div><p className="eyebrow eyebrow--accent">SYNTHETIC PRACTICE PACKAGE</p><h1>{question.title}</h1><p className="question-overview__meta">{question.universityLabel} · {question.yearLabel} · {question.trackLabel}</p><article className="question-prompt"><span>QUESTION</span><p>{question.questionPrompt}</p></article></article><aside className="question-aside"><h2>시작 전 확인</h2><p>이 package는 editor·feedback 흐름을 검증하기 위한 합성 자료입니다. 실제 대학 문제, 지문, 공식 답안, 채점 기준을 포함하지 않습니다.</p><dl><div><dt>권장 시간</dt><dd>{question.timeLimitLabel}</dd></div><div><dt>답안 형식</dt><dd>서술형 연습</dd></div><div><dt>자료 origin</dt><dd>합성 fixture</dd></div></dl><Link className="button button--accent" href={`/essay-lab/write/${question.id}`}>작성 시작 <span aria-hidden="true">→</span></Link></aside></section><MockNotice /></div>;
}
