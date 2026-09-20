import Link from "next/link";

import { MockNotice } from "@/components/trust-label";
import { buildMetadata } from "@/lib/brand";

export const metadata = buildMetadata("My Essay Pattern", "LegendStudy Account와 연결될 개인 논술 패턴 분석 영역의 준비 상태를 안내합니다.");

export default function PatternPage() {
  return (
    <div className="placeholder-page content-wrap">
      <div className="placeholder-page__icon" aria-hidden="true">✦</div>
      <p className="eyebrow eyebrow--accent">MY / ESSAY PATTERN</p>
      <h1>나의 논술 패턴은<br />준비 중입니다.</h1>
      <p>반복되는 강점과 개선 포인트는 실제 답안·평가 이력, 근거, 버전 정보를 함께 보관할 수 있을 때만 개인 분석으로 보여줄 수 있습니다. 현재는 합성 신호나 진척도를 실제 결과처럼 표시하지 않습니다.</p>
      <MockNotice compact />
      <div className="button-row"><Link className="button button--primary" href="/account/">내 계정 보기 <span aria-hidden="true">→</span></Link><Link className="button button--outline" href="/">서비스 안내 보기</Link></div>
      <small>개인 답안, 패턴 분석, AI 평가 데이터는 아직 저장·연결되지 않았습니다.</small>
    </div>
  );
}
