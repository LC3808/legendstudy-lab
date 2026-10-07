import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EssayEditor } from "@/components/essay-editor";
import { buildMetadata } from "@/lib/brand";
import { syntheticQuestion } from "@/fixtures/public-metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ questionId: syntheticQuestion.id }];
}

export async function generateMetadata({ params }: { params: Promise<{ questionId: string }> }): Promise<Metadata> {
  const { questionId } = await params;
  return questionId === syntheticQuestion.id ? buildMetadata("논술 연습", "예시 문제로 답안 작성을 연습하세요.") : buildMetadata("작성 문제를 찾을 수 없음", "요청한 연습 문제를 찾을 수 없습니다.");
}

export default async function EssayWorkspacePage({ params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  if (questionId !== syntheticQuestion.id) notFound();
  return <><div className="workspace-topline"><div className="content-wrap content-wrap--wide"><Link className="back-link" href={`/essay-lab/questions/${syntheticQuestion.id}`}>← 문제 개요</Link><p>연습 예시 · 작성 내용은 이 브라우저에만 임시 저장됩니다.</p></div></div><EssayEditor question={syntheticQuestion} /></>;
}
