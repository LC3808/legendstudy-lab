import Link from "next/link";

import { ReleaseNotice, ReleaseStatusLabel } from "@/components/release-status";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata = buildPublicMetadata(
  "LS LAB | LegendStudy+ 논술 서비스",
  "LegendStudy+의 논술 서비스 LS LAB을 소개합니다. 현재는 서비스 공개 준비 단계이며, AI 첨삭·결제·계정 연동은 아직 운영하지 않습니다.",
  "/lab",
);

const steps = [
  ["01", "논술 서비스의 방향을 확인합니다.", "대학별 논술 준비에 필요한 정보 구조와 학습 흐름을 서비스 공개 전에 정리하고 있습니다."],
  ["02", "공개 범위를 투명하게 안내합니다.", "현재 제공되는 정보와 향후 준비 기능을 구분합니다. 실제 AI 첨삭이나 결제 기능처럼 보이게 하지 않습니다."],
  ["03", "준비가 확인된 기능부터 엽니다.", "계정, 결제, AI 피드백, 대학별 콘텐츠는 권리·보안·운영 기준이 준비된 범위에서만 순차적으로 공개합니다."],
] as const;

export default function LabHomePage() {
  return (
    <div className="release-page">
      <section className="release-hero content-wrap">
        <div>
          <p className="eyebrow eyebrow--accent">LEGENDSTUDY+ / LS LAB</p>
          <div className="release-status-row"><ReleaseStatusLabel status="SERVICE_PREPARING" /></div>
          <h1>논술 준비의 다음 단계를<br /><em>차분하게</em> 준비합니다.</h1>
          <p className="release-hero__lead">LS LAB은 LegendStudy의 논술 서비스입니다. 대학별 논술 정보, 작성 경험, 피드백을 신뢰할 수 있는 방식으로 연결하기 위해 서비스 기반을 준비하고 있습니다.</p>
          <div className="button-row">
            <Link className="button button--primary" href="/lab/how-it-works">LS LAB 이용 방법 보기 <span aria-hidden="true">→</span></Link>
            <Link className="button button--outline" href="/lab/coverage">현재 준비 범위 보기</Link>
          </div>
        </div>
        <aside className="release-hero__card">
          <p className="eyebrow">CURRENT STATUS</p>
          <h2>지금은 소개와 준비 단계입니다.</h2>
          <ul>
            <li>AI 첨삭은 아직 운영하지 않습니다.</li>
            <li>결제, 구독, credit은 아직 제공하지 않습니다.</li>
            <li>LegendStudy+ 앱 계정과의 자동 연동은 아직 제공하지 않습니다.</li>
            <li>대학별 공식 문제 전문과 해설은 이 웹사이트에 복제하지 않습니다.</li>
          </ul>
        </aside>
      </section>
      <section className="content-wrap"><ReleaseNotice><strong>정확한 공개 상태.</strong> 이 페이지는 LS LAB의 안정적인 웹 진입점입니다. 실제 사용 가능한 기능이 준비되기 전에는 가입·결제·AI 평가를 요청하거나 완료된 것처럼 표시하지 않습니다.</ReleaseNotice></section>
      <section className="release-steps content-wrap">
        <div><p className="eyebrow">SERVICE FOUNDATION</p><h2>서비스보다 먼저,<br />신뢰 기준을 세웁니다.</h2></div>
        <div className="release-steps__grid">{steps.map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>
    </div>
  );
}
