'use client';

export type MaterialRanking = {kind:string;label:string;users:number;records:number};

/** Existing recent_views is a current per-member projection, never a click log. */
export function DashboardUsageRankings({rows,error,loading}:{rows?:MaterialRanking[];error?:boolean;loading:boolean}) {
 const materials=rows?.filter(row=>row.kind==='recent').slice(0,10)??[];
 return <div className="usage-rankings">
  <section aria-labelledby="app-menu-ranking-title">
   <h3 id="app-menu-ranking-title">앱 메뉴 이용 TOP 3</h3>
   <p className="usage-rankings__notice"><strong>집계 준비 중 · 메뉴 이용 기록 미수집</strong></p>
   <p className="focus-note">홈·자료·학습·LAB·MY 메뉴를 누른 횟수는 현재 저장되지 않습니다. 앱 기록 수집을 연결한 이후부터 순위와 이용 횟수를 표시할 수 있습니다.</p>
  </section>
  <section aria-labelledby="material-ranking-title">
   <h3 id="material-ranking-title">자료 열람 TOP 10</h3>
   <p className="focus-note">선택 기간 내 최근 열람 기록이 남아 있는 회원 수 기준</p>
   {error?<p role="alert">자료 순위를 불러오지 못했습니다. 새로고침해 주세요.</p>:loading?<p role="status">자료 순위 집계 중…</p>:materials.length?
    <table><thead><tr><th scope="col">순위</th><th scope="col">자료명</th><th scope="col">열람 회원</th></tr></thead>
     <tbody>{materials.map((row,index)=><tr key={index+row.label}><td>{index+1}</td><td className="usage-rankings__title">{row.label}</td><td>{row.users.toLocaleString()}명</td></tr>)}</tbody>
    </table>:<p>선택 기간에 남아 있는 자료 열람 기록이 없습니다.</p>}
   <details><summary>순위 집계 기준</summary><p className="focus-note">같은 회원이 같은 자료를 여러 번 봐도 1명으로 집계합니다. 최근 열람 시각이 선택 기간에 포함된 현재 기록만 사용하므로, 과거 기간의 전체 열람 이력을 복원한 순위는 아닙니다. 삭제된 기록·비회원 열람은 제외됩니다. 앱·웹 구분과 자료실 탭 유입 경로가 기록되어 있지 않아 앱 자료실 클릭 횟수로 해석할 수 없습니다. 동률은 서버의 자료 식별자 순서로 표시합니다.</p></details>
  </section>
 </div>;
}
