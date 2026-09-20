import Link from "next/link";

import { MockNotice, OriginLabel } from "@/components/trust-label";
import { buildMetadata } from "@/lib/brand";
import { mockPatternSignals } from "@/fixtures/public-metadata";

export const metadata = buildMetadata("My Essay Pattern", "LS LAB의 evidence-linked pattern UX를 위한 합성 mock foundation입니다.");

export default function PatternPage() {
  return <div className="page-section content-wrap content-wrap--detail"><div className="page-intro"><p className="eyebrow eyebrow--accent">MY / PATTERN</p><h1>My Essay Pattern</h1><p>반복되는 강점과 개선 포인트를 user-owned evaluation history에서 발견하는 장기 UX입니다. 이 화면의 signal과 progress는 synthetic fixture입니다.</p></div><MockNotice compact /><section className="pattern-grid"><aside className="pattern-summary"><OriginLabel origin="SYNTHETIC_CONTENT" /><p className="eyebrow">MOCK PROGRESS</p><h2>관점 비교</h2><p>두 근거를 병렬로 놓는 문장 구조가 최근 두 답안에서 개선되는 흐름을 예시로 표시합니다.</p><div className="bar-chart" aria-label="합성 progress chart">{[25, 36, 42, 54, 68].map((height, index) => <span key={height} style={{ height: `${height}%`, opacity: 0.45 + index * 0.12 }} />)}</div><small>실제 누적 답안·평가 기록은 존재하지 않습니다.</small></aside><div className="pattern-list">{mockPatternSignals.map((signal) => <article key={signal.id}><div><span className="pattern-list__icon" aria-hidden="true">✦</span><span className="pattern-list__label">{signal.signalLabel}</span></div><h2>{signal.studentLabel}</h2><p>{signal.description}</p><small>합성 기반 횟수: {signal.contributingAttemptCount}회</small></article>)}</div></section><Link className="button button--primary" href="/essay-lab">Essay Lab으로 돌아가기 <span aria-hidden="true">→</span></Link></div>;
}
