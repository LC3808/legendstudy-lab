import Link from "next/link";

/**
 * LegendStudy LAB landing — editorial visual direction.
 *
 * LAB is a comprehensive per-student admissions analysis and learning platform,
 * not an essay-feedback service. Its three axes (내신, 모의고사·수능, 논술) carry
 * equal brand weight; only build status differs, and status is stated honestly
 * per axis rather than letting the currently-prioritised Essay work dominate.
 *
 * Visual language: white/neutral canvas, near-black editorial typography, large
 * whitespace, hairline dividers instead of SaaS cards/shadows, orange as a tiny
 * accent only, and a single near-black band for rhythm. The page introduces the
 * value and current boundary only; it does not represent unbuilt features as
 * live, and does not sync app sessions or personal data.
 */

const labs = [
  {
    no: "01",
    title: "내신 분석",
    copy: "학교 성적의 변화와 과목별 흐름을 읽어, 지금의 위치를 스스로 이해하도록 돕습니다.",
    status: "설계 단계",
  },
  {
    no: "02",
    title: "모의고사 · 수능 분석",
    copy: "시험마다 달라지는 성적과 강점·약점을 연결해, 흩어진 결과를 하나의 흐름으로 봅니다.",
    status: "설계 단계",
  },
  {
    no: "03",
    title: "논술 첨삭",
    copy: "실제 대학 자료를 바탕으로 쓰고, 고치고, 변화를 확인하는 깊은 작업을 이어갑니다.",
    status: "준비 단계",
  },
] as const;

const sources = [
  ["내신", "학교 성적의 변화"],
  ["모의고사 · 수능", "시험마다 달라지는 강점·약점"],
  ["논술", "쓰고 고친 기록"],
] as const;

const loop = [
  ["기록", "일상의 학습과 시험 결과를 흩어지지 않게 남깁니다."],
  ["분석", "기간·과목·목표의 넓은 맥락에서 데이터를 검토합니다."],
  ["이해", "지금 나의 위치와 흐름을 더 정확하게 파악합니다."],
  ["다음 선택", "이해를 바탕으로 다음 학습과 준비를 결정합니다."],
] as const;

export function LabLanding() {
  return (
    <div className="lab-landing">
      <section className="ll-hero ll-wrap">
        <p className="ll-eyebrow">레전드스터디+ · LegendStudy LAB</p>
        <h1 className="ll-hero__title">
          데이터가 쌓일수록,<br />
          나의 가능성은<br />
          선명해집니다.
        </h1>
        <div className="ll-hero__support">
          <p>점수 하나만으로 학생의 가능성을 설명할 수는 없습니다.</p>
          <p>
            내신과 모의고사·수능, 그리고 논술까지. 흩어진 입시 데이터를 연결해 지금의 위치를
            이해하고 다음 선택을 더 명확하게 만듭니다.
          </p>
          <div className="ll-hero__actions">
            <a className="ll-link" href="#three-labs">세 개의 LAB 보기 <span aria-hidden="true">↓</span></a>
            <Link className="ll-link" href="/lab/how-it-works/">이용 안내</Link>
          </div>
        </div>
      </section>

      <section className="ll-labs ll-wrap" id="three-labs" aria-labelledby="three-labs-title">
        <p className="ll-eyebrow">Three Labs</p>
        <h2 className="ll-section-title" id="three-labs-title">내신부터 논술까지, 같은 무게로 봅니다.</h2>
        <div className="ll-labs__grid" aria-label="LegendStudy LAB의 세 가지 분석 축">
          {labs.map((lab) => (
            <article key={lab.no} className="ll-lab">
              <span className="ll-lab__no">{lab.no}</span>
              <h3>{lab.title}</h3>
              <p className="ll-lab__copy">{lab.copy}</p>
              <span className="ll-lab__status">{lab.status}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="ll-connect ll-wrap" aria-labelledby="connect-title">
        <div>
          <p className="ll-eyebrow">Connected Data</p>
          <h2 className="ll-section-title" id="connect-title">기능이 아니라, 데이터가 이어집니다.</h2>
          <p className="ll-connect__copy">
            각 분석이 서로 다른 계정·프로필·데이터 섬으로 나뉘지 않습니다. 세 축의 기록은 같은
            학생의 하나의 입시 데이터로 모여, 지금의 상태를 더 정확하게 설명합니다.
          </p>
        </div>
        <div className="ll-map" role="img" aria-label="내신, 모의고사·수능, 논술 데이터가 하나의 입시 데이터로 연결됩니다.">
          {sources.map(([label, detail]) => (
            <div key={label} className="ll-map__source">
              <strong>{label}</strong>
              <span>{detail}</span>
            </div>
          ))}
          <div className="ll-map__core">
            <span className="ll-map__arrow" aria-hidden="true">→</span>
            <strong>나의 입시 데이터</strong>
          </div>
        </div>
      </section>

      <section className="ll-loop" aria-labelledby="loop-title">
        <div className="ll-wrap">
          <p className="ll-eyebrow">How LAB Helps</p>
          <h2 className="ll-section-title" id="loop-title">기록하고, 분석하고, 이해하고, 결정합니다.</h2>
          <ol className="ll-loop__list">
            {loop.map(([title, copy], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{title}</strong>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ll-cta ll-wrap" aria-labelledby="cta-title">
        <p className="ll-eyebrow">Start</p>
        <h2 className="ll-section-title" id="cta-title">지금의 위치를 이해하는 것부터.</h2>
        <p className="ll-cta__copy">
          LegendStudy 계정으로 LAB을 시작하세요. 하나의 계정이 앞으로 내신·모의고사·수능·논술
          데이터를 연결하는 기반이 됩니다.
        </p>
        <div className="ll-cta__actions">
          <Link className="ll-btn ll-btn--accent" href="/login/">LegendStudy 계정으로 시작하기</Link>
          <Link className="ll-link" href="/lab/coverage/">공개 범위 보기</Link>
        </div>
      </section>

      <section className="ll-note ll-wrap">
        <p>
          <strong>계정과 개인 기록은 분리해 다룹니다.</strong> 같은 LegendStudy 계정은 향후 개인 입시
          데이터를 연결하기 위한 identity 기반입니다. 데이터 저장, 분석, AI 첨삭, 결제는 각각의
          정책·보안·품질 기준이 확정된 뒤 순차적으로 안내합니다. 이 설명은 제품 방향이며,
          구현되지 않은 기능의 사용 가능 여부를 뜻하지 않습니다.
        </p>
      </section>
    </div>
  );
}
