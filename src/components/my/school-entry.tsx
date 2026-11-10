import Link from 'next/link';

/**
 * Mypage entry point into the student school-competition page (/school).
 * Presentational only — no data access. Reusable so a secondary entry (e.g. the
 * study timer / stats screen) can drop the same card later. The /school page
 * itself handles the login guard and the school-not-registered guidance.
 */
export function SchoolStudyEntry({compact=false}:{compact?:boolean}){
  return <section className="my-section my-school-entry" aria-labelledby="my-school-entry-title">
    <h2 id="my-school-entry-title">우리 학교 공부 순위</h2>
    <p className="my-school-entry__desc">우리 학교 친구들과 공부시간을 비교하고 학교별 랭킹에 참여해 보세요.</p>
    <div className="my-links"><Link className={`button button--primary${compact?' button--small':''}`} href="/school/">우리 학교 랭킹 보기 →</Link></div>
  </section>;
}
