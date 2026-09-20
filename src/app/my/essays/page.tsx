import Link from "next/link";

import { MockNotice, OriginLabel } from "@/components/trust-label";
import { buildMetadata } from "@/lib/brand";
import { mockAttempts } from "@/fixtures/public-metadata";

export const metadata = buildMetadata("나의 답안", "LS LAB의 user-owned attempt history를 위한 mock information architecture입니다.");

export default function MyEssaysPage() {
  return <div className="page-section content-wrap content-wrap--detail"><div className="page-intro"><p className="eyebrow eyebrow--accent">MY / ESSAYS</p><h1>나의 답안</h1><p>답안·수정본·평가 package를 질문 단위로 남기는 미래의 user-owned history UX입니다. 현재 로그인, 동기화, 학생 데이터 저장은 연결되어 있지 않습니다.</p></div><MockNotice compact /><section className="attempt-list">{mockAttempts.map((attempt) => <article key={attempt.id}><div className="attempt-list__icon" aria-hidden="true">▤</div><div><div className="trust-row"><OriginLabel origin="SYNTHETIC_CONTENT" /><span className="tag">{attempt.status === "DRAFT" ? "임시 초안" : "예시 결과"}</span></div><h2>{attempt.questionTitle}</h2><p>{attempt.universityLabel} · {attempt.yearLabel} {attempt.evaluationDateLabel ? `· ${attempt.evaluationDateLabel}` : "· 현재 브라우저 mock"}</p></div><Link className="button button--outline button--small" href={attempt.status === "DRAFT" ? `/essay-lab/write/${attempt.questionId}` : "/essay-lab/evaluation/mock-attempt-001"}>다시 보기</Link></article>)}</section><Link className="button button--primary" href="/essay-lab/write/synthetic-q-01">합성 답안 작성하기 <span aria-hidden="true">→</span></Link></div>;
}
