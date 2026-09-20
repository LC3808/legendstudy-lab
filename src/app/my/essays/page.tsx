import Link from "next/link";

import { MockNotice } from "@/components/trust-label";
import { buildMetadata } from "@/lib/brand";

export const metadata = buildMetadata("나의 논술", "LegendStudy Account와 연결될 개인 논술 기록 영역의 준비 상태를 안내합니다.");

export default function MyEssaysPage() {
  return (
    <div className="placeholder-page content-wrap">
      <div className="placeholder-page__icon" aria-hidden="true">▤</div>
      <p className="eyebrow eyebrow--accent">MY / ESSAY HISTORY</p>
      <h1>나의 논술 기록은<br />준비 중입니다.</h1>
      <p>답안, 수정본, 피드백 결과는 같은 LegendStudy Account에 귀속되는 개인 기록으로 다뤄야 합니다. 현재 LAB은 이 데이터를 저장하거나 목록으로 보여주지 않습니다.</p>
      <MockNotice compact />
      <div className="button-row"><Link className="button button--primary" href="/account/">내 계정 보기 <span aria-hidden="true">→</span></Link><Link className="button button--outline" href="/">서비스 안내 보기</Link></div>
      <small>표시할 실제 답안·평가 이력은 아직 없습니다.</small>
    </div>
  );
}
