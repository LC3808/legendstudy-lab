import Link from "next/link";

import { ReleaseNotice, ReleaseStatusLabel } from "@/components/release-status";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata = buildPublicMetadata(
  "LegendStudy LAB 이용 방법",
  "레전드스터디+ LegendStudy LAB의 현재 공개 범위와 향후 논술 서비스 흐름을 안내합니다.",
  "/lab/how-it-works",
);

export default function HowItWorksPage() {
  return (
    <div className="policy-page content-wrap content-wrap--detail">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY LAB / HOW IT WORKS</p>
      <div className="policy-page__heading"><h1>현재 공개 범위를<br />먼저 안내합니다.</h1><ReleaseStatusLabel status="SERVICE_PREPARING" /></div>
      <p className="policy-page__lead">LegendStudy LAB은 완성된 유료 서비스가 아닙니다. 아래 흐름은 논술 서비스가 준비될 때의 방향을 설명하며, 현재 자동으로 실행되거나 제공되는 기능을 뜻하지 않습니다.</p>
      <section className="policy-section"><h2>향후 서비스 흐름</h2><ol className="process-list"><li><strong>대학별 논술 정보 확인</strong><span>지원 전형과 공개 안내는 출처와 확인일을 함께 표시합니다. 최종 확인은 해당 대학 입학처의 최신 공지를 기준으로 합니다.</span></li><li><strong>답안 작성과 보관</strong><span>계정, 보관기간, 삭제, 접근권한이 승인된 뒤에만 사용자 답안을 다루는 기능을 연결합니다.</span></li><li><strong>피드백과 다음 연습</strong><span>AI 또는 사람 검토가 도입되더라도 근거, 품질 관리, 이의제기, 개인정보 처리 범위를 먼저 고지합니다.</span></li></ol></section>
      <section className="policy-section"><h2>현재 사용할 수 없는 기능</h2><p>현재 LegendStudy LAB은 실제 로그인, 공유 계정, 결제, 구독, credit, 대학별 공식 문제 전문, 자동 AI 첨삭, 점수 결과 저장을 제공하지 않습니다. 준비되지 않은 기능은 신청이나 결제 화면으로 연결하지 않습니다.</p></section>
      <ReleaseNotice><strong>LegendStudy+ 앱과의 연결.</strong> 초기 연결은 앱에서 이 웹사이트의 HTTPS URL을 외부 브라우저로 여는 방식만을 전제로 합니다. 앱 세션, 결제 토큰, 학습 기록은 전달하거나 동기화하지 않습니다.</ReleaseNotice>
      <div className="policy-actions"><Link className="button button--outline" href="/lab/">LegendStudy LAB 소개로 돌아가기</Link><Link className="button button--primary" href="/support/">지원 상태 확인하기</Link></div>
    </div>
  );
}
