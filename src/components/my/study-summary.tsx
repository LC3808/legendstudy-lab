'use client';
import {DataStatus,useOwnerData} from './owner-data';
import {readStudy,studyMinutes} from '@/lib/my/foundation';
export function StudySummaryPanel(){
 const result=useOwnerData(readStudy);
 if(!result.data)return <DataStatus error={result.error} reload={result.reload}/>;
 const d=result.data;
 return <div className="my-panel">
  <dl><dt>오늘</dt><dd>{studyMinutes(d.today_ms)}분</dd><dt>이번 주</dt><dd>{studyMinutes(d.week_ms)}분</dd><dt>최근 30일</dt><dd>{studyMinutes(d.last30_ms)}분</dd></dl>
  {d.last30_ms===0&&<p className="my-empty">아직 완료된 학습 기록이 없습니다.</p>}
  <details><summary>최근 7일</summary><ul>{d.daily7.map(day=><li key={day.date}>{day.date} · {studyMinutes(day.milliseconds)}분</li>)}</ul></details>
  <p>한국 시간 기준 · 앱에서 완료하고 동기화한 기록</p>
  <button className="text-link" onClick={result.reload}>새로고침</button>
 </div>;
}
