'use client';
import type {LearningAnalytics} from '@/lib/admin/learning-analytics';
import {formatStudyTime} from '@/lib/admin/study-time';
import {AdminPanel} from './admin-surface';
import {KpiTile} from './kpi-tile';
import {AdmissionsSections,type Admissions,type Outcomes} from './admin-admissions-sections';
import {useReadReport} from './admin-dashboard-view';

export function LearningAdmissions({range,refresh}:{range:{p_from:string;p_to:string};refresh:number}){
 const admissions=useReadReport<Admissions>('admin_admissions_analytics',range,refresh);
 const outcomes=useReadReport<Outcomes>('admin_admission_outcomes',range,refresh);
 return <><p className="learning-section-note">희망 대학·실제 지원은 등록 시각 기준, 희망 전공·지원 대상은 현재 프로필 기준입니다. 학생이 직접 입력한 결과이며 공식 검증 결과가 아닙니다.</p><AdmissionsSections admissions={admissions} outcomes={outcomes}/></>;
}
export function LearningSummary({data}:{data:LearningAnalytics}){
 const m=data.metrics;const number=(n:number|null|undefined)=>n==null?'미확인':`${n.toLocaleString()}명`;
 const match=data.interest_application;
 const max=Math.max(1,...(data.study_daily??[]).map(d=>d.ms));
 return <>
 <div className="learning-kpi-groups">{[
  {title:'활동',tiles:[<KpiTile key="active" label="활동 학생" value={number(m.active_users)} note="저장·최근 열람·공부 기록자의 합집합 · 학생 중복 제외"/>,<KpiTile key="study" label="공부 시간" value={m.study_ms==null?'미확인':formatStudyTime(m.study_ms)} note="완료·동기화된 실제 구간 · 겹친 시간 제외"/>]},
  {title:'자료 이용',tiles:[<KpiTile key="saved" label="자료 저장 학생" value={number(m.saved_users)} note="기간 내 저장하여 현재 남은 기록의 고유 학생"/>,<KpiTile key="recent" label="자료 열람 학생" value={number(m.recent_users)} note="기간 내 최근 열람 기록의 고유 학생 · 총 조회수 아님"/>]},
  {title:'입시 준비',tiles:[<KpiTile key="target" label="희망 대학 등록 학생" value={number(m.targets)} note="기간 내 등록하여 현재 남은 기록의 고유 학생"/>,<KpiTile key="application" label="실제 지원 입력 학생" value={number(m.application_users)} note="기간 내 생성되어 남은 지원 기록의 고유 학생"/>]},
 ].map(g=><section className="learning-kpi-group" key={g.title}><h2>{g.title}</h2><div>{g.tiles}</div></section>)}</div>
 <AdminPanel title="일별 공부 시간 (KST)">{data.study_daily?<><p className="learning-section-note">동일 학생의 겹친 구간을 제외한 실제 공부 시간입니다. 선택 기간 경계는 잘라 집계하며, 0은 저장된 합산 대상 구간이 없다는 뜻입니다.</p><details open={data.study_daily.length<=7}><summary>일별 기록 {data.study_daily.length}일 보기</summary><div className="learning-ranking"><table><thead><tr><th scope="col">날짜</th><th scope="col">공부 시간</th><th scope="col" className="learning-ranking__number">기록 학생</th></tr></thead><tbody>{data.study_daily.map(d=><tr key={d.date}><td>{d.date}</td><td>{formatStudyTime(d.ms)}<div className="learning-ranking__bar" aria-hidden="true"><i style={{width:`${d.ms/max*100}%`}}/></div></td><td className="learning-ranking__number">{d.users}명</td></tr>)}</tbody></table></div></details></>:<p>일별 집계 미연결 · 과거 추이를 임의로 표시하지 않습니다.</p>}</AdminPanel>
 <AdminPanel title="현재 관심 대학과 실제 지원의 일치">{match?<><div className="focus-metrics"><KpiTile label="관심 대학과 일치한 지원" value={`${match.matching_records}건`} note={`고유 학생 ${match.matching_students}명`}/><KpiTile label="현재 관심 목록에 없는 지원" value={`${m.applications!-match.matching_records}건`}/></div><p className="learning-section-note">선택 기간에 생성된 지원과 현재 관심 대학을 같은 학생 UUID·대학 ID·학년도로 비교합니다. 관심 등록 후 지원했는지 또는 과거 관심 대학이었는지는 확인하지 않습니다. 전환율이 아닙니다.</p></>:<p>관심·지원 교차 집계 미연결</p>}</AdminPanel>
 </>;
}
