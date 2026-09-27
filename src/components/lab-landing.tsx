import Link from "next/link";

import { ReleaseNotice } from "@/components/release-status";

/**
 * LegendStudy LAB landing.
 *
 * LAB is a comprehensive admissions analysis and learning platform for the
 * individual student — not an essay-feedback service. Its three axes (내신,
 * 모의고사·수능, 논술) carry equal brand weight; only their build status
 * differs, and that status is stated honestly per axis rather than letting the
 * currently-prioritised Essay work dominate the brand. The page introduces the
 * value and current boundary only; it does not represent unbuilt features as
 * live, and does not sync app sessions or personal data.
 */

const labs = [
  {
    index: "01",
    title: "내신 분석",
    en: "Academic Record",
    copy: "학교 성적의 변화와 과목별 흐름을 읽어, 지금의 위치를 스스로 이해하도록 돕습니다.",
    status: "설계 단계",
  },
  {
    index: "02",
    title: "모의고사 · 수능 분석",
    en: "Exam Analytics",
    copy: "시험마다 달라지는 성적과 강·약점을 연결해, 흩어진 결과를 하나의 흐름으로 봅니다.",
    status: "설계 단계",
  },
  {
    index: "03",
    title: "논술 첨삭",
    en: "Essay LAB",
    copy: "실제 대학 자료를 바탕으로 쓰고, 고치고, 변화를 확인하는 깊은 작업을 이어갑니다.",
    status: "준비 단계",
  },
] as const;

const connections = [
  ["내신", "학교 성적의 변화"],
  ["모의 · 수능", "시험별 강·약점"],
  ["논술", "쓰고 고친 기록"],
] as const;

const helpsLoop = [
  ["기록", "일상의 학습과 시험 결과를 흩어지지 않게 남깁니다."],
  ["분석", "기간·과목·목표의 넓은 맥락에서 데이터를 검토합니다."],
  ["이해", "지금 나의 위치와 흐름을 더 정확하게 파악합니다."],
  ["다음 선택", "이해를 바탕으로 다음 학습과 준비를 결정합니다."],
] as const;

export function LabLanding() {
  return (
    <div className="release-page">
      <section className="release-hero content-wrap">
        <div>
          <p className="eyebrow eyebrow--accent">레전드스터디+ / LEGENDSTUDY LAB</p>
          <h1>데이터가 쌓일수록,<br /><em>나의 가능성은 선명해집니다.</em></h1>
          <p className="release-hero__lead">
            시험의 결과만으로는 학생의 가능성을 모두 설명할 수 없습니다. 내신과 모의고사·수능,
            그리고 논술까지 — 흩어져 있던 입시 데이터를 연결해 지금의 위치를 이해하고 다음
            선택을 더 명확하게 만듭니다.
          </p>
          <div className="button-row">
            <a className="button button--primary" href="#three-labs">세 개의 LAB 보기 <span aria-hidden="true">→</span></a>
            <Link className="button button--outline" href="/lab/how-it-works/">이용 안내</Link>
          </div>
        </div>
        <aside className="release-hero__card" aria-label="LegendStudy LAB의 방향">
          <p className="eyebrow">나의 입시 데이터가 쌓이는 곳</p>
          <h2>흩어진 기록을 하나로 연결합니다.</h2>
          <p className="release-hero__card-copy">
            LegendStudy LAB은 개인 학생을 위한 종합 입시 분석·학습 플랫폼입니다. 서로 다른 시험과
            기록을 같은 계정 위에서 연결해, 결과를 넘어 흐름을 봅니다.
          </p>
          <ul>
            <li>내신 · 모의고사 · 수능 · 논술을 하나의 데이터로 연결합니다.</li>
            <li>결과가 아니라 변화와 가능성을 중심으로 이해합니다.</li>
            <li>기능은 권리·보안·운영 기준이 확인된 범위에서 순차적으로 열립니다.</li>
          </ul>
        </aside>
      </section>

      <section className="lab-axes content-wrap" id="three-labs" aria-labelledby="three-labs-title">
        <div className="lab-axes__heading">
          <p className="eyebrow">THREE LABS / 하나의 학생, 세 개의 관점</p>
          <h2 id="three-labs-title">내신부터 논술까지,<br />같은 무게로 봅니다.</h2>
          <p className="lab-axes__lead">
            세 축은 서로 다른 도구가 아니라, 한 학생을 이해하기 위한 세 개의 관점입니다. 현재는
            논술 영역을 먼저 준비하고 있지만, 세 축의 브랜드 위계는 동등합니다.
          </p>
        </div>
        <div className="lab-axes__grid" aria-label="LegendStudy LAB의 세 가지 분석 축">
          {labs.map((lab) => (
            <article key={lab.index} className="lab-axis">
              <div className="lab-axis__top">
                <span className="lab-axis__index">{lab.index}</span>
                <span className="lab-axis__status">{lab.status}</span>
              </div>
              <p className="lab-axis__en">{lab.en}</p>
              <h3>{lab.title}</h3>
              <p className="lab-axis__copy">{lab.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lab-connect content-wrap" aria-labelledby="connect-title">
        <div className="lab-connect__intro">
          <p className="eyebrow eyebrow--accent">CONNECTED DATA / 하나의 입시 데이터</p>
          <h2 id="connect-title">기능이 아니라,<br />데이터가 이어집니다.</h2>
          <p>
            각 분석이 서로 다른 계정·프로필·데이터 섬으로 나뉘지 않습니다. 세 축의 기록은 같은
            학생의 하나의 입시 데이터로 모여, 지금의 상태를 더 정확하게 설명합니다.
          </p>
        </div>
        <div className="lab-hub" role="img" aria-label="내신, 모의·수능, 논술 데이터가 하나의 입시 데이터로 연결됩니다.">
          <ul className="lab-hub__sources">
            {connections.map(([label, detail]) => (
              <li key={label}>
                <strong>{label}</strong>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
          <div className="lab-hub__core">
            <span className="lab-hub__core-eyebrow" aria-hidden="true">LEGENDSTUDY LAB</span>
            <strong>나의 입시 데이터</strong>
            <span className="lab-hub__core-copy">현재의 위치 · 변화 · 다음 선택</span>
          </div>
        </div>
      </section>

      <section className="content-wrap platform-flow" aria-labelledby="helps-title">
        <div className="platform-flow__heading">
          <p className="eyebrow eyebrow--accent">HOW LAB HELPS / 기록에서 다음 선택으로</p>
          <h2 id="helps-title">기록하고, 분석하고,<br />이해하고, 결정합니다.</h2>
        </div>
        <ol className="platform-flow__list">
          {helpsLoop.map(([title, copy], index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{title}</strong>
              <p>{copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="lab-cta content-wrap" aria-labelledby="cta-title">
        <div className="lab-cta__inner">
          <p className="eyebrow eyebrow--accent">START</p>
          <h2 id="cta-title">지금의 위치를 이해하는 것부터.</h2>
          <p className="lab-cta__copy">
            LegendStudy 계정으로 LAB을 시작하세요. 하나의 계정이 앞으로 내신·모의고사·수능·논술
            데이터를 연결하는 기반이 됩니다.
          </p>
          <div className="button-row">
            <Link className="button button--accent" href="/login/">LegendStudy 계정으로 시작하기</Link>
            <Link className="button button--outline" href="/lab/coverage/">공개 범위 보기</Link>
          </div>
        </div>
      </section>

      <section className="content-wrap release-page__closing-note">
        <ReleaseNotice>
          <strong>계정과 개인 기록은 분리해 다룹니다.</strong> 같은 LegendStudy 계정은 향후 개인 입시
          데이터를 연결하기 위한 identity 기반입니다. 데이터 저장, 분석, AI 첨삭, 결제는 각각의
          정책·보안·품질 기준이 확정된 뒤 순차적으로 안내합니다. 이 설명은 제품 방향이며,
          구현되지 않은 기능의 사용 가능 여부를 뜻하지 않습니다.
        </ReleaseNotice>
      </section>
    </div>
  );
}
