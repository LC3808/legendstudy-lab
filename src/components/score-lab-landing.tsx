import { PersonalEntry } from "@/components/personal-entry";

/** Copy follows the APP final RC LAB cards; this page offers no data-entry action. */
export function ScoreLabLanding({ exam = false }: { exam?: boolean }) {
  return <section className="score-lab page-section content-wrap">
    <div className="score-lab__surface"><p className="eyebrow eyebrow--accent">LegendStudy LAB</p>
    <h1>{exam ? "모의·수능 LAB" : "내신 LAB"}</h1>
    <p className="score-lab__value">{exam ? "모의고사·수능 성적 기반 영역별 분석" : "내신 성적 기반 강점·보완 분석"}</p>
    <p>관심 대학을 기준으로 나의 성적을 살펴보세요.</p>
    <div className="button-row"><PersonalEntry className="button button--primary">내 계정 보기 <span aria-hidden="true">→</span></PersonalEntry></div>
    </div>
  </section>;
}
