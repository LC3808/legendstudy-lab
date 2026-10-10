import { PersonalEntry } from "@/components/personal-entry";

/**
 * LegendStudy LAB landing — Axis Data Tracks.
 *
 * The landing states what the service gives a student, not how it is built. It
 * carries the Hero, the three service axes and one value statement, and nothing
 * else: no implementation status, no policy wording and no repeated explanation.
 * The track diagrams are conceptual only and render no student score, date,
 * prediction or live-product data.
 */

const labs = [
  {
    no: "01",
    title: "내신 LAB",
    copy: "과목별 성적과 변화에서 강점과 보완점을 확인합니다.",
  },
  {
    no: "02",
    title: "수능 LAB",
    copy: "성적의 변화와 현재 위치를 확인합니다.",
  },
  {
    no: "03",
    title: "논술 LAB",
    copy: "대학별 평가 기준에 맞춰 내 답안을 점검하고 다시 써봅니다.",
  },
] as const;

const dataTracks = [
  ["내신", "과목별 성취도 · 변화"],
  ["모의고사 · 수능", "시험별 성적 · 강점과 약점"],
  ["논술", "작성 · 첨삭 · 재작성"],
] as const;

function DataTrackGraphic() {
  return (
    <figure className="ll-data-tracks">
      <figcaption className="sr-only">
        내신, 모의고사·수능, 논술의 기록이 하나로 연결되는 개념도입니다.
      </figcaption>
      <div className="ll-data-tracks__list">
        {dataTracks.map(([label, detail]) => (
          <div className="ll-data-track" key={label}>
            <strong>{label}</strong>
            <span className="ll-data-track__line" aria-hidden="true">
              <span className="ll-data-track__point" />
              <span className="ll-data-track__rule" />
              <span className="ll-data-track__point ll-data-track__point--orange" />
              <span className="ll-data-track__rule" />
              <span className="ll-data-track__point" />
            </span>
            <p>{detail}</p>
          </div>
        ))}
      </div>
      <p className="ll-data-tracks__note">하나의 기록으로 연결됩니다.</p>
    </figure>
  );
}

export function LabLanding() {
  return (
    <div className="lab-landing">
      <section className="ll-hero ll-wrap" aria-labelledby="lab-hero-title">
        <div className="ll-hero__copy">
          <p className="ll-eyebrow">레전드스터디+ · LegendStudy LAB</p>
          <h1 className="ll-hero__title" id="lab-hero-title">
            <span>데이터가 쌓일수록,</span>
            <span>나의 가능성은 선명해집니다.</span>
          </h1>
          <div className="ll-hero__support">
            <p>점수 하나만으로 학생의 가능성을 설명할 수는 없습니다.</p>
            <p>
              내신과 모의고사·수능, 그리고 논술까지. 흩어진 입시 데이터를 연결해 지금의 위치를
              이해하고 다음 선택을 더 명확하게 만듭니다.
            </p>
          </div>
        </div>
        <DataTrackGraphic />
      </section>

      <section className="ll-labs ll-wrap" id="three-labs" aria-labelledby="three-labs-title">
        <div className="ll-section-heading">
          <p className="ll-eyebrow">Three LABs</p>
          <h2 className="ll-section-title" id="three-labs-title">내신부터 수시모집과 수능까지, 학생의 대입 성공을 이해하는 세 가지 축</h2>
        </div>
        <div className="ll-labs__grid" aria-label="LegendStudy LAB의 세 가지 분석 축">
          {labs.map((lab) => (
            <article key={lab.no} className="ll-lab">
              <span className="ll-lab__no">{lab.no}</span>
              <h3>{lab.title}</h3>
              <p className="ll-lab__copy">{lab.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ll-connect ll-wrap" aria-labelledby="connect-title">
        <div className="ll-connect__intro">
          <p className="ll-eyebrow">Connected Data</p>
          <h2 className="ll-section-title" id="connect-title">연결된 데이터가 합격 가능성을 높입니다.</h2>
          <p className="ll-connect__copy">
            내신, 모의고사·수능, 논술을 따로 보지 않습니다. 기록이 쌓일수록 현재 위치와 다음에
            보완할 것이 더 선명해집니다.
          </p>
        </div>
      </section>

      <section className="ll-cta ll-wrap" aria-labelledby="cta-title">
        <h2 className="ll-section-title" id="cta-title">이제, 나의 기록을 쌓아보세요.</h2>
        <div className="ll-cta__actions">
          <PersonalEntry className="ll-btn ll-btn--navy">레전드스터디 계정으로 시작하기 <span aria-hidden="true">→</span></PersonalEntry>
        </div>
      </section>
    </div>
  );
}
