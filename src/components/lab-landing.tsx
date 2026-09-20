import Link from "next/link";

import { ReleaseNotice, ReleaseStatusLabel } from "@/components/release-status";

const learningFlow = [
  ["01", "대학별 논술 정보", "대학별 전형과 공식 안내를 한곳에서 확인할 수 있도록 정보의 기준과 출처를 정리합니다."],
  ["02", "기출 및 출제 경향", "기출을 단순히 모아두는 데 그치지 않고, 준비에 참고할 수 있는 출제 흐름을 연결하는 방향을 설계합니다."],
  ["03", "답안 작성", "문제와 핵심 질문을 바탕으로 자신의 답안을 작성하고 연습을 이어갈 수 있는 경험을 준비합니다."],
  ["04", "첨삭", "AI 또는 사람 피드백은 품질, 권리, 개인정보 처리 기준이 준비된 범위에서만 순차적으로 검토합니다."],
  ["05", "학습 기록과 개선", "연습 기록을 돌아보고 다음 준비로 이어지는 개인 학습 흐름을 장기적으로 설계합니다."],
] as const;

export function LabLanding() {
  return (
    <div className="release-page">
      <section className="release-hero content-wrap">
        <div>
          <p className="eyebrow eyebrow--accent">레전드스터디+ / LEGENDSTUDY LAB</p>
          <h1>대학별 논술 준비를<br /><em>더 체계적으로.</em></h1>
          <p className="release-hero__lead">대학별 논술 정보와 기출 분석, 답안 작성과 첨삭까지. LegendStudy LAB은 논술 준비의 전 과정을 하나의 학습 흐름으로 연결합니다.</p>
          <div className="button-row">
            <a className="button button--primary" href="#learning-flow">LAB 살펴보기 <span aria-hidden="true">→</span></a>
            <Link className="button button--outline" href="/lab/how-it-works/">이용 방법</Link>
          </div>
        </div>
        <aside className="release-hero__card" aria-label="현재 공개 범위">
          <p className="eyebrow">CURRENT AVAILABILITY</p>
          <ReleaseStatusLabel status="FOUNDATION_ONLY" />
          <h2>현재는 서비스 안내를 제공합니다.</h2>
          <p className="release-hero__card-copy">학습 흐름과 운영 기준을 먼저 공개하고 있습니다. 실제 기능은 준비가 확인된 범위에서만 순차적으로 열립니다.</p>
          <ul>
            <li>AI 첨삭과 계정 연동은 아직 제공하지 않습니다.</li>
            <li>결제, 구독, credit은 아직 제공하지 않습니다.</li>
            <li>대학별 공식 문제 원문과 해설을 이 웹사이트에 복제하거나 재배포하지 않습니다.</li>
          </ul>
        </aside>
      </section>

      <section className="content-wrap">
        <ReleaseNotice><strong>현재 공개 범위.</strong> LegendStudy LAB은 서비스의 방향과 이용 기준을 안내합니다. AI 첨삭, 결제, 계정 기능은 사용할 수 있는 것처럼 표시하지 않으며, 실제 제공 전까지 CTA로 유도하지 않습니다.</ReleaseNotice>
      </section>

      <section className="release-steps content-wrap" id="learning-flow">
        <div>
          <p className="eyebrow">LEARNING FLOW / PREPARING DIRECTION</p>
          <h2>논술 준비의 전 과정을,<br />하나의 학습 흐름으로.</h2>
        </div>
        <div className="release-steps__grid" aria-label="LegendStudy LAB이 준비하는 학습 흐름">
          {learningFlow.map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-wrap release-page__closing-note">
        <ReleaseNotice><strong>학습 흐름은 서비스 방향입니다.</strong> 대학별 콘텐츠, 답안 보관, 첨삭, 학습 기록은 권리·보안·운영 기준이 확정된 기능부터 별도로 안내합니다.</ReleaseNotice>
      </section>
    </div>
  );
}
