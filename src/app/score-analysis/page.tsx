import Link from "next/link";

import { ReleaseNotice } from "@/components/release-status";
import { buildMetadata } from "@/lib/brand";

export const metadata = buildMetadata("Academic Analytics", "LegendStudy LAB의 장기 Academic Analytics 모듈 범위와 현재 미구현 상태를 안내합니다.");

export default function ScoreAnalysisPage() {
  return (
    <div className="placeholder-page content-wrap">
      <div className="placeholder-page__icon" aria-hidden="true">▦</div>
      <p className="eyebrow eyebrow--accent">ACADEMIC ANALYTICS / PREPARING</p>
      <h1>성적 분석은<br />깊은 검토부터 시작합니다.</h1>
      <p>기간·과목·시험·학습 기록을 함께 이해하는 Academic Analytics는 LegendStudy LAB의 장기 Web module입니다. 현재는 성적 데이터를 수집하거나 분석 결과·입시 가능성을 제공하지 않습니다.</p>
      <ReleaseNotice><strong>정확성과 권한이 먼저입니다.</strong> 개인 성적·학습 데이터, 비교 기준, 권한, 보관·삭제 정책이 확인된 뒤에만 개인 분석으로 확장합니다.</ReleaseNotice>
      <div className="button-row"><Link className="button button--primary" href="/account/">내 계정 보기 <span aria-hidden="true">→</span></Link><Link className="button button--outline" href="/">서비스 안내 보기</Link></div>
      <small>실제 Academic Analytics 기능과 개인 데이터 연동은 아직 구현되지 않았습니다.</small>
    </div>
  );
}
