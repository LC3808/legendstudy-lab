import Link from "next/link";

import { MockNotice } from "@/components/trust-label";
import { buildMetadata } from "@/lib/brand";

export const metadata = buildMetadata("성적 분석", "Essay Lab 이후에 별도 설계할 Score Analysis future-scope shell입니다.");

export default function ScoreAnalysisPage() {
  return <div className="placeholder-page content-wrap"><div className="placeholder-page__icon" aria-hidden="true">▦</div><p className="eyebrow eyebrow--accent">LATER SCOPE</p><h1>성적 분석은<br />다음 단계입니다.</h1><p>Academic Profile과 Admission Simulator는 Essay Lab의 공식 source package, evaluation reliability, user-data boundary가 먼저 정리된 후 별도 설계합니다.</p><MockNotice compact /><Link className="button button--primary" href="/essay-lab">Essay Lab 보기 <span aria-hidden="true">→</span></Link><small>성적 데이터, 입학 가능성 추정, 실제 analysis 기능은 구현하지 않았습니다.</small></div>;
}
