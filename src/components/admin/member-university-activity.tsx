'use client';
import {useReadReport} from './admin-dashboard-view';
type Activity={university:string|null;runs:number;first_runs:number;rewrites:number;completed:number;latest:string};
export function MemberUniversityActivity({accountId}:{accountId:string}){
 const r=useReadReport<Activity[]>('admin_member_university_activity',{p_account_id:accountId});
 return <><h4 className="admin-subhead">대학별 논술 학습 행동</h4>{r.error?<p role="alert">대학별 기록을 불러오지 못했습니다.</p>:!r.data?<p>조회 중…</p>:!r.data.length?<p>제출한 논술 회차가 없습니다.</p>:<table><thead><tr><th>대학</th><th>최초 풀이</th><th>재작성</th><th>첨삭 완료</th></tr></thead><tbody>{r.data.map((a,i)=><tr key={i}><td>{a.university??'대학 미확인'}</td><td>{a.first_runs}회</td><td>{a.rewrites}회</td><td>{a.completed}회</td></tr>)}</tbody></table>}<p className="focus-note">회차 제출 원본 기준 · 이전 문항별 연습과 별도 집계</p></>;
}
