'use client';
import type {Student360} from '@/lib/admin/student360';
import {studyMinutes,eventLabels,type EventKind} from '@/lib/my/foundation';
import {AdminErrorPanel,AdminLoading,useAdminQuery} from './admin-surface';
export function Student360Panel({accountId}:{accountId:string}){
 const {state,reload}=useAdminQuery<Student360>(client=>client.student360(accountId),`student360:${accountId}`);
 if(state.status==='loading')return <AdminLoading label="학습·지원 기록을 불러오는 중입니다"/>;
 if(state.status==='error')return <AdminErrorPanel kind={state.kind} onRetry={reload}/>;
 const d=state.data;const labels:Record<string,string>={student:'재학생',retaker:'N수·검정고시 등',other:'기타'};
 return <section>
  <h4 className="admin-subhead">학습·지원 기록</h4>
  <dl className="admin-detail__grid"><div className="admin-detail__row"><dt>현재 상태</dt><dd>{d.status?labels[d.status]:'설정 안 함'}</dd></div>
  <div className="admin-detail__row"><dt>학습시간</dt><dd>오늘 {studyMinutes(d.study.today_ms)}분 · 이번 주 {studyMinutes(d.study.week_ms)}분 · 최근 30일 {studyMinutes(d.study.last30_ms)}분</dd></div></dl>
  <details><summary>최근 7일 학습시간</summary><ul>{d.study.daily7.map(day=><li key={day.date}>{day.date} · {studyMinutes(day.milliseconds)}분</li>)}</ul></details>
  <h4 className="admin-subhead">지원 내역</h4>
  {d.applications.items.length?<ul>{d.applications.items.map(a=><li key={a.id}>{a.admission_year}학년도 · {a.university_name_snapshot} · {a.intended_division} · {a.admission_name} · {a.latest_event?eventLabels[a.latest_event.kind as EventKind]??'결과 미입력':'결과 미입력'}</li>)}</ul>:<p>등록된 지원 내역이 없습니다.</p>}
  {d.applications.has_more&&<p>최근 25개 내역을 표시합니다.</p>}
  <h4 className="admin-subhead">최근 논술 기록</h4>
  {d.essay.sessions.length?<ul>{d.essay.sessions.map(s=><li key={s.id}>{s.universityName} · {s.admissionYear}학년도 · {s.questionLabel} · 제출 {s.attemptCount}회</li>)}</ul>:<p>등록된 논술 기록이 없습니다.</p>}
  {d.essay.hasMoreSessions&&<p>최근 50개 연습 기록을 표시합니다.</p>}
 </section>;
}
