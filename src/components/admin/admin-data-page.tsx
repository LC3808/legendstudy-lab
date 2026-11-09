'use client';
import Link from 'next/link';
import {formatStudyTime} from '@/lib/admin/study-time';
import {AdminLearningHub} from './admin-learning-hub';
import {AdminDataTable} from './admin-data-table';
import {useEffect,useMemo,useState} from 'react';
import {useAuth} from '@/components/auth-context';
import {AdminAnalytics} from './admin-analytics';
import {AdminPanel,AdminLoading,AdminErrorPanel} from './admin-surface';
import {adminErrorKind,mapRpcError,type AdminErrorKind} from '@/lib/admin/errors';
import {analyticsWindow} from '@/lib/admin/analytics';
import type {AdminPeriod} from '@/lib/admin/period';
import {parseLearningAnalytics,learningMetrics,learningDefinitions,type LearningAnalytics} from '@/lib/admin/learning-analytics';
import {AdminSchoolName} from './admin-school-name';

const studyGradeNames:Record<string,string>={'1':'고1','2':'고2','3':'고3',retaker:'N수·검정고시 등',unknown:'미입력'};
type StudyData={total:{users:number;ms:number};grades:{grade:string;users:number;ms:number}[]};
type SchoolRow={office_code:string;school_code:string;registered_users:number;active_users:number;ms:number;avg_ms:number};
type SchoolStudyData={grade:string;min_users:number;total:{users:number;ms:number};unregistered:{registered_users:number;active_users:number;ms:number};schools:SchoolRow[]};

/**
 * 학교별 공부 시간 — admin_study_by_school RPC (관리자 전용, 집계 기준은
 * admin_dashboard_study와 동일). RPC가 아직 운영에 없으면 "준비 중"으로 가드한다.
 * registered_users(유효 가입자)와 active_users(기간 내 기록자)를 구분해 표시한다.
 */
function SchoolRankTable({rows}:{rows:SchoolRow[]}){
 if(!rows.length)return <p className="admin-muted">선택 기간·조건에 해당하는 학교가 없습니다.</p>;
 return <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th scope="col">순위</th><th scope="col">학교</th><th scope="col">가입</th><th scope="col">기록자</th><th scope="col">공부 시간</th><th scope="col">1인당 평균</th></tr></thead><tbody>
  {rows.map((s,i)=><tr key={s.office_code+':'+s.school_code}><td>{i+1}</td><td><AdminSchoolName office={s.office_code} school={s.school_code}/></td><td>{s.registered_users}명</td><td>{s.active_users}명</td><td>{formatStudyTime(s.ms)}</td><td>{formatStudyTime(s.avg_ms)}</td></tr>)}
 </tbody></table></div>;
}
function SchoolStudy({window,grade}:{window:{p_from:string;p_to:string}|null;grade:string}){
 const {client,user}=useAuth();
 const [minUsers,setMinUsers]=useState(5);
 const key=JSON.stringify([user?.id,window,grade]);
 const [result,setResult]=useState<{key:string;data?:SchoolStudyData;error?:boolean}|null>(null);
 useEffect(()=>{let active=true;if(!client||!user||!window)return;void Promise.resolve(client.rpc('admin_study_by_school',{p_from:window.p_from,p_to:window.p_to,p_grade:grade==='all'?null:grade,p_min_users:5})).then(({data,error})=>{if(error)throw error;if(active)setResult({key,data:data as SchoolStudyData});}).catch(()=>{if(active)setResult({key,error:true});});return()=>{active=false;};},[client,user,key,grade,window]);
 const current=result?.key===key?result:null;
 if(!window)return null;
 if(!current)return <AdminPanel title="학교별 공부 시간"><AdminLoading/></AdminPanel>;
 if(current.error||!current.data)return <AdminPanel title="학교별 공부 시간 · TOP 학교 (준비 중)"><p>학교별 합산 공부 시간과 TOP 학교 랭킹은 서버 집계(<code>admin_study_by_school</code> RPC)가 운영에 배포되면 자동으로 표시됩니다. 설계·격리 검증은 완료되었고 운영 적용 승인 대기 중입니다.</p></AdminPanel>;
 const d=current.data;
 const byMs=[...d.schools].sort((a,b)=>b.ms-a.ms).slice(0,10);
 const byAvg=[...d.schools].filter(s=>s.active_users>=minUsers).sort((a,b)=>b.avg_ms-a.avg_ms).slice(0,10);
 const byReg=[...d.schools].sort((a,b)=>b.registered_users-a.registered_users).slice(0,10);
 const u=d.unregistered;
 return <>
  <AdminPanel title="총공부시간 TOP 학교"><p className="admin-muted">학교 소속 학생들의 선택 기간 공부시간 합계 기준 · 상위 10 (가입 학생이 많은 학교가 유리)</p><SchoolRankTable rows={byMs}/></AdminPanel>
  <AdminPanel title="1인당 평균 공부시간 TOP 학교"><p className="admin-muted">기록자 1인당 평균 기준 · 최소 기록자 수 이상만 집계</p><label>최소 기록자 수 <input type="number" min={1} value={minUsers} onChange={e=>setMinUsers(Math.max(1,Number(e.target.value)||1))} style={{width:'5rem'}}/>명 이상</label><SchoolRankTable rows={byAvg}/></AdminPanel>
  <AdminPanel title="참여 학생 수 TOP 학교"><p className="admin-muted">학교별 유효 가입 학생 수 기준 · 상위 10 (가입 학생 수 ≠ 공부 기록자 수)</p><SchoolRankTable rows={byReg}/></AdminPanel>
  <AdminPanel title="학교 미등록 학생"><div className="admin-metrics"><div className="admin-metric"><p className="admin-metric__label">가입 학생</p><p className="admin-metric__value">{u.registered_users}명</p></div><div className="admin-metric"><p className="admin-metric__label">공부 기록자</p><p className="admin-metric__value">{u.active_users}명</p></div><div className="admin-metric"><p className="admin-metric__label">공부 시간</p><p className="admin-metric__value">{formatStudyTime(u.ms)}</p></div></div><p className="admin-muted">학교 정보를 등록하지 않은 학생 그룹입니다. 학교별 랭킹과 분리해 집계합니다.</p></AdminPanel>
 </>;
}

/**
 * 공부 시간 분석 — core study-time surface. Uses the existing admin_dashboard_study
 * RPC (total + per-grade) so the page shows the 학년별 breakdown, not just two
 * totals. 학교별/성적대별 need their own server aggregates (see the roadmap
 * panels); they are not faked here.
 */
function StudyAnalysis(){
 const {client,user}=useAuth();
 const [period,setPeriod]=useState<AdminPeriod>('d30');const [from,setFrom]=useState('');const [to,setTo]=useState('');const [now,setNow]=useState(()=>new Date());const [grade,setGrade]=useState('all');
 const window=useMemo(()=>analyticsWindow(period,from,to,now),[period,from,to,now]);
 const key=JSON.stringify([user?.id,window,now]);
 const [result,setResult]=useState<{key:string;data?:StudyData;error?:AdminErrorKind}|null>(null);
 useEffect(()=>{let active=true;if(!client||!user||!window)return;void Promise.resolve(client.rpc('admin_dashboard_study',window)).then(({data,error})=>{if(error)throw mapRpcError(error);if(active)setResult({key,data:data as StudyData});}).catch(error=>{if(active)setResult({key,error:adminErrorKind(error)});});return()=>{active=false;};},[client,user,key,window]);
 const current=result?.key===key?result:null;
 const data=current?.data;
 const selected=data?(grade==='all'?data.total:data.grades.find(g=>g.grade===grade)):undefined;
 return <div className="admin-stack">
  <form onSubmit={e=>{e.preventDefault();setNow(new Date());}} className="analytics-filter"><label>집계 기간 (KST)<select value={period} onChange={e=>setPeriod(e.target.value as AdminPeriod)}><option value="today">오늘</option><option value="d7">최근 7일</option><option value="d30">최근 30일</option><option value="custom">사용자 지정 (최대 400일)</option></select></label>{period==='custom'&&<><label>시작일<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>종료일<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></>}<label>학년<select value={grade} onChange={e=>setGrade(e.target.value)}><option value="all">전체 기록자</option>{data?.grades.map(g=><option key={g.grade} value={g.grade}>{studyGradeNames[g.grade]??g.grade}</option>)}</select></label><button type="submit">조회</button></form>
  {!window?<AdminPanel title="올바른 기간을 선택해 주세요"/>:!current?<AdminLoading/>:current.error?<AdminErrorPanel kind={current.error}/>:data?<>
   <p className="admin-muted">출처: Supabase 학습 원장 · 앱 공부 타이머 + 학습 합산 · 한국 날짜 기준</p>
   <div className="admin-metrics">
    <div className="admin-metric"><p className="admin-metric__label">{grade==='all'?'전체 공부 시간':`${studyGradeNames[grade]??grade} 공부 시간`}</p><p className="admin-metric__value">{formatStudyTime(selected?.ms)}</p></div>
    <div className="admin-metric"><p className="admin-metric__label">기록자 1인당 평균</p><p className="admin-metric__value">{formatStudyTime(selected?selected.users?selected.ms/selected.users:0:null)}</p></div>
    <div className="admin-metric"><p className="admin-metric__label">공부 기록자</p><p className="admin-metric__value">{selected?.users??0}명</p></div>
   </div>
   <AdminPanel title="학년별 공부 시간"><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th scope="col">학년</th><th scope="col">기록자</th><th scope="col">공부 시간</th><th scope="col">1인당 평균</th></tr></thead><tbody>{[...data.grades].sort((a,b)=>['1','2','3','retaker','unknown'].indexOf(a.grade)-['1','2','3','retaker','unknown'].indexOf(b.grade)).map(g=><tr key={g.grade}><td>{studyGradeNames[g.grade]??g.grade}</td><td>{g.users}명</td><td>{formatStudyTime(g.ms)}</td><td>{formatStudyTime(g.users?g.ms/g.users:0)}</td></tr>)}</tbody></table></div><p className="admin-muted">완료·동기화된 실제 활동 구간만 합산합니다. 일시정지 등 중복 시간은 제외하며, 학년은 현재 프로필 기준입니다. 미기록 공부는 포함하지 않습니다.</p></AdminPanel>
  </>:null}
  <SchoolStudy window={window} grade={grade}/>
  <AdminPanel title="성적대별 공부 시간 — 내신·모의고사 (데이터 연동 후)"><p>내신 등급대별·모의고사 등급대별 평균 공부 시간은 성적 데이터가 연동되면 제공합니다. 현재 성적 데이터는 미연동 상태입니다(<Link href="/admin/data/scores/">성적·학습 분석 — NOT_IMPLEMENTED</Link>). 연동 후 「내신 N등급대 주당 평균 공부시간」 같은 통계와, 학생 자극용 메시지(배지·주간 목표) 기준값으로 사용할 수 있습니다.</p></AdminPanel>
  <AdminPanel title="집계 해석"><p>동기화 완료·학습 합산 대상 구간만 집계합니다. 동일 학생의 겹치는 시간은 합치고 선택 기간 경계에서 자릅니다. 미기록은 공부하지 않았다는 뜻이 아닙니다. 개인별 기록은 권한이 확인된 회원 상세에서 확인하세요.</p><Link href="/admin/members/">회원 상세 / Student 360</Link></AdminPanel>
 </div>;
}
function Learning({section}:{section:string}){
 const {client,user}=useAuth();const [period,setPeriod]=useState<AdminPeriod>('d30');const [from,setFrom]=useState('');const [to,setTo]=useState('');const [now,setNow]=useState(()=>new Date());
 const window=useMemo(()=>analyticsWindow(period,from,to,now),[period,from,to,now]);
 const key=JSON.stringify([user?.id,window,now]);
 const [result,setResult]=useState<{key:string;data?:LearningAnalytics;error?:AdminErrorKind}|null>(null);
 useEffect(()=>{let active=true;if(!client||!user||!window)return;void Promise.resolve(client.rpc('admin_learning_analytics',window)).then(({data,error})=>{if(error)throw mapRpcError(error);const parsed=parseLearningAnalytics(data);if(active)setResult({key,data:parsed});}).catch(error=>{if(active)setResult({key,error:adminErrorKind(error)});});return()=>{active=false;};},[client,user,key,window]);
 const current=result?.key===key?result:null;
 const kinds=section==='study'?[]:section==='universities'?['targets']:section==='materials-data'?['saved','recent']:section==='applications'?['applications']:['targets','saved','recent','applications'];
 return <div className="admin-stack">
 <form onSubmit={e=>{e.preventDefault();setNow(new Date());}} className="analytics-filter"><label>집계 기간 (KST)<select value={period} onChange={e=>setPeriod(e.target.value as AdminPeriod)}><option value="today">오늘</option><option value="d7">최근 7일</option><option value="d30">최근 30일</option><option value="custom">사용자 지정 (최대 400일)</option></select></label>{period==='custom'&&<><label>시작일<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>종료일<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></>}<button type="submit">조회</button></form>
 {!window?<AdminPanel title="올바른 기간을 선택해 주세요"/>:!current?<AdminLoading/>:current.error?<AdminErrorPanel kind={current.error}/>:current.data?<>
 <p>출처: Supabase 학습 원장 · 조회 시각 {new Date(current.data.as_of).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} KST · {current.data.state}</p>
 <p>기록이 있는 모든 학생을 집계합니다. 0은 기록 없음, 미확인은 조회값 없음입니다.</p>
 <div className="admin-metrics">{Object.entries(learningMetrics).filter(([k])=>section!=='study'||k.startsWith('study_')).map(([k,label])=><div className="admin-metric" key={k}><p>{label}</p><strong>{k==='study_ms'?formatStudyTime(current.data!.metrics.study_ms):current.data!.metrics[k as keyof typeof learningMetrics]?.toLocaleString()??'미확인'}</strong></div>)}</div>
 {kinds.map(kind=><AdminPanel key={kind} title={learningDefinitions[kind as keyof typeof learningDefinitions]}>{current.data!.rows.filter(r=>r.kind===kind).length?<AdminDataTable id={'learning-'+kind} rows={current.data!.rows.filter(r=>r.kind===kind)} rowKey={r=>r.label} scope="서버에서 반환한 집계 행만 검색·정렬합니다. 기록이 있는 모든 집단을 표시합니다." columns={[{key:'label',label:'대상',value:r=>r.label},{key:'users',label:'고유 학생 수',value:r=>r.users},{key:'records',label:'기록 수',value:r=>r.records}]}/>:<p>선택 기간에 기록이 없습니다.</p>}</AdminPanel>)}
 {section==='insights'&&<AdminPanel title="인사이트 DRAFT 미리보기"><p>자동 노출 OFF · 저장·승인 원장 연결 전에는 미리보기만 제공합니다.</p>{current.data.rows.filter(r=>r.kind==='saved').slice(0,1).map(r=><p key={r.label}>선택 기간에 현재 남아 있는 저장 기록 기준, {r.users}명의 학생이 「{r.label}」 자료를 저장했습니다.</p>)}<p>기간: {current.data.from} ~ {current.data.to} · 전체 기록 집계 · 조회 시각과 출처는 위와 동일합니다.</p></AdminPanel>}
 </>:null}
 <AdminPanel title="집계 해석"><p>{learningDefinitions.study}</p><p>성적 분포·인과 분석·희망 대학 변경 추이·검색 횟수는 기존 데이터만으로 복원하지 않습니다. 개인별 기록은 권한이 확인된 회원 상세에서 확인하세요.</p><Link href="/admin/members/">회원 상세 / Student 360</Link></AdminPanel>
 </div>;
}
function MergedEntry({href,label}:{href:string;label:string}){return <AdminPanel title="통합된 분석 화면"><p>기존 주소를 유지합니다. 같은 조회 기능은 아래 화면에서 확인하세요.</p><a href={href} onClick={e=>{e.preventDefault();window.location.assign(href+window.location.search);}}>{label} →</a></AdminPanel>;}
export function AdminDataPage({section}:{section:string}){
 if(section==='overview')return <MergedEntry href="/admin/" label="서비스 현황"/>;
 if(section==='installs')return <MergedEntry href="/admin/data/visitors/" label="방문자·유입 (설치 클릭과 설치 완료 구분)"/>;
 if(section==='students')return <MergedEntry href="/admin/members/" label="회원 / Student 360"/>;
 if(section==='satisfaction')return <MergedEntry href="/admin/essay-feedback/" label="만족도·신고"/>;

 if(section==='essay-usage')return <AdminLearningHub/>;
 if(['overview','conversion','essay-usage','visitors','installs'].includes(section))return <AdminAnalytics focus={['visitors','installs'].includes(section)?'ga4':section==='conversion'?'conversion':section==='essay-usage'?'essay':'all'}/>;


 if(section==='samples')return <AdminPanel title="기존 첨삭 품질 검수"><p>원본 답안과 평가 결과는 기존 검수 전용 권한으로 조회합니다. 일반 운영자 권한을 품질 열람 권한으로 확대하지 않습니다.</p><Link href="/ql/">실제 답안·재첨삭 비교 검수 →</Link><p><Link href="/ql/">품질 판정 기록 →</Link></p></AdminPanel>;
 if(section==='scores')return <AdminPanel title="성적·학습 분석 — NOT_IMPLEMENTED"><p>Student 360의 academic_performance는 현재 null 계약입니다. 개인 연습 점수를 공식 성적으로 환산하지 않습니다. 비교 가능한 성적 집계와 별도 권한·조회 감사 계약이 필요합니다.</p></AdminPanel>;
 if(section==='verification')return <AdminPanel title="베타 검증 — NOT_TESTED"><p>자동 테스트 결과와 실제 사용자 평가 E2E는 다릅니다. TEST Gateway·Provider 승인·실기기 검수를 완료하기 전에는 출시 PASS로 표시하지 않습니다.</p><Link href="/admin/beta/">베타 설정 확인</Link><p><Link href="/admin/beta/failures/">실패·복구 기록 확인</Link></p></AdminPanel>;
 if(section==='study')return <StudyAnalysis/>;
 return <Learning section={section}/>;
}
