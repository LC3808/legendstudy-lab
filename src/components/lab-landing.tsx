import Link from "next/link";

import { ReleaseNotice, ReleaseStatusLabel } from "@/components/release-status";

const modules = [
  ["01", "Academic Analytics", "성적과 학습 기록을 기간·과목·목표 관점에서 깊게 이해하도록 돕는 분석 영역입니다.", "설계 단계"],
  ["02", "Essay Lab", "대학별 논술 정보, 기출 맥락, 답안 작성과 피드백 흐름을 연결하는 Web-primary 모듈입니다.", "준비 단계"],
  ["03", "Activity Portfolio", "학생이 남긴 학습·활동 근거를 정리하고 돌아보는 장기 기록 영역입니다.", "계획 단계"],
  ["04", "Future School Tools", "교사와 학교의 역할·권한·근거가 확정된 뒤 검토할 별도 B2B 영역입니다.", "향후 검토"],
] as const;

const learningFlow = [
  ["학습 기록", "일상의 학습과 결과를 스스로 확인합니다."],
  ["깊은 분석", "기간·과목·목표를 넓은 맥락에서 검토합니다."],
  ["작성과 피드백", "논술처럼 집중이 필요한 작업을 Web에서 이어갑니다."],
  ["다음 학습", "기록과 분석을 다음 준비의 근거로 연결합니다."],
] as const;

export function LabLanding() {
  return (
    <div className="release-page">
      <section className="release-hero content-wrap">
        <div>
          <p className="eyebrow eyebrow--accent">레전드스터디+ / LEGENDSTUDY LAB</p>
          <h1>학습의 깊은 분석과 기록을,<br /><em>한곳에서.</em></h1>
          <p className="release-hero__lead">LegendStudy LAB은 LegendStudy+의 Web Intelligence / Deep Work Platform입니다. 학습 분석, 논술 작성과 피드백, 활동 기록처럼 더 넓은 화면과 깊은 검토가 필요한 학습 경험을 하나의 흐름으로 설계합니다.</p>
          <div className="button-row">
            <a className="button button--primary" href="#service-modules">서비스 구조 보기 <span aria-hidden="true">→</span></a>
            <Link className="button button--outline" href="/lab/how-it-works/">이용 안내</Link>
          </div>
        </div>
        <aside className="release-hero__card" aria-label="현재 공개 범위">
          <p className="eyebrow">CURRENT AVAILABILITY</p>
          <ReleaseStatusLabel status="FOUNDATION_ONLY" />
          <h2>현재는 서비스 안내와 기반을 제공합니다.</h2>
          <p className="release-hero__card-copy">제품 구조, 공개 범위, 계정 기반을 먼저 정리하고 있습니다. 실제 기능은 권리·보안·운영 기준이 확인된 범위에서만 순차적으로 열립니다.</p>
          <ul>
            <li>AI 첨삭, 결제, credit, 개인 학습 데이터는 아직 제공하지 않습니다.</li>
            <li>계정 로그인은 배포 환경 설정과 이메일·redirect 검증 후에만 활성화합니다.</li>
            <li>대학별 공식 문제 원문과 해설을 이 웹사이트에 복제하거나 재배포하지 않습니다.</li>
          </ul>
        </aside>
      </section>

      <section className="content-wrap">
        <ReleaseNotice><strong>LegendStudy LAB의 역할.</strong> 모바일 앱의 빠른 실행·습관·알림 경험과 구분해, Web에서는 깊은 분석·작성·기록·관리 경험을 담당합니다. 이 설명은 제품 방향이며, 구현되지 않은 기능의 사용 가능 여부를 뜻하지 않습니다.</ReleaseNotice>
      </section>

      <section className="release-steps content-wrap" id="service-modules">
        <div>
          <p className="eyebrow">SERVICE MODULES / LONG-TERM DIRECTION</p>
          <h2>하나의 계정, 서로 다른<br />학습의 깊이.</h2>
        </div>
        <div className="release-steps__grid" aria-label="LegendStudy LAB 서비스 모듈">
          {modules.map(([number, title, copy, state]) => (
            <article key={number}>
              <span>{number}</span>
              <p className="release-steps__status">{state}</p>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-wrap platform-flow" aria-labelledby="platform-flow-title">
        <div className="platform-flow__heading"><p className="eyebrow eyebrow--accent">LEGENDSTUDY / LEARNING LOOP</p><h2 id="platform-flow-title">기록에서 분석으로,<br />다음 학습으로.</h2></div>
        <ol className="platform-flow__list">
          {learningFlow.map(([title, copy], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><strong>{title}</strong><p>{copy}</p></li>)}
        </ol>
      </section>

      <section className="content-wrap release-page__closing-note">
        <ReleaseNotice><strong>계정과 개인 기록은 분리해 다룹니다.</strong> 같은 LegendStudy Account는 향후 개인 영역을 연결하기 위한 identity 기반입니다. 데이터 저장, AI 평가, 권한, 결제와 학교 기능은 각각의 정책·보안·품질 기준이 확정된 뒤 별도로 안내합니다.</ReleaseNotice>
      </section>
    </div>
  );
}
