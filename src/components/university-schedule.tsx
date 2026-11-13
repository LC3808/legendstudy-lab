import {scheduleAcademicYear,scheduleDateLabel,universitySchedules,type UniversitySchedule} from '@/lib/essay-runtime/university-schedules';
import type {CatalogUniversity} from '@/lib/essay-runtime/public-discovery';
function ScheduleRows({rows}:{rows:UniversitySchedule[]}){
 return <div className="university-info-grid">{rows.map(row=><article className="university-panel" key={row.id}>
  <h3>{row.track}</h3><dl className="university-facts">
   <div><dt>캠퍼스</dt><dd>{row.campus}</dd></div>
   <div><dt>시험 날짜</dt><dd>{row.date?<>{scheduleDateLabel(row.date)}{row.endDate&&` ~ ${scheduleDateLabel(row.endDate)}`}</>:'확인 중'}</dd></div>
   <div><dt>시험 시간 (한국시간)</dt><dd>{row.time??'공식 입학처 안내를 확인해 주세요.'}</dd></div>
   {row.duration&&<div><dt>시험 소요시간</dt><dd>{row.duration}</dd></div>}
   <div><dt>원서접수</dt><dd>{row.applicationPeriod??'공식 자료 확인'}</dd></div>
  </dl>{row.note&&<p>{row.note}</p>}
  <p className="university-source-note">{row.basis} · 확인일 {row.verifiedAt.slice(0,10)}</p>
  <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">공식 일정 자료 확인 ↗</a>
 </article>)}</div>;
}
export function UniversitySchedulePanel({university}:{university:CatalogUniversity}){
 const rows=universitySchedules(university),current=rows.filter(r=>r.academicYear===scheduleAcademicYear);
 return <details className="essay-schedule"><summary>{scheduleAcademicYear}학년도 논술 일정</summary>
  {!current.some(r=>r.date)&&<p>{scheduleAcademicYear}학년도 논술 일정이 아직 확인되지 않았습니다.</p>}
  {!!current.length&&<ScheduleRows rows={current}/>}
 </details>;
}
