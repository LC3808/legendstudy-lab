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
  return questionId === syntheticQuestion.id ? buildMetadata("합성 논술 작성", "desktop-first split-pane essay workspace mock foundation입니다.") : buildMetadata("작성 문제를 찾을 수 없음", "요청한 합성 question fixture를 찾을 수 없습니다.");
}

export default async function EssayWorkspacePage({ params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  if (questionId !== syntheticQuestion.id) notFound();
  return <><div className="workspace-topline"><div className="content-wrap content-wrap--wide"><Link className="back-link" href={`/essay-lab/questions/${syntheticQuestion.id}`}>← 문제 개요</Link><p>합성 fixture · 현재 local draft adapter만 사용</p></div></div><EssayEditor question={syntheticQuestion} /></>;
}
