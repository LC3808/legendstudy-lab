'use client';
import {useState,useMemo,useEffect} from 'react';
import Link from 'next/link';
import {useAuth} from '@/components/auth-context';
import {analyticsWindow} from '@/lib/admin/analytics';
import {AdminPeriodFilter} from './admin-period-filter';
import type {AdminPeriod} from '@/lib/admin/period';
import {formatStudyTime} from '@/lib/admin/study-time';
import {formatDateTime,accountStateLabel,formatCount} from '@/lib/admin/format';
import {useAdminQuery,useSupportRefresh,AdminErrorPanel} from './admin-surface';
import type {AdminSupportMetrics,AdminDashboard} from '@/lib/admin/contract';
import {defaultMemberFilters,directorySchoolLabel,type MemberDirectory} from '@/lib/admin/members';
import {AdminSchoolName} from './admin-school-name';
import './member-dashboard.css';
import {SchoolDistribution} from './school-distribution';
import {DashboardUsageRankings} from './dashboard-usage-rankings';
export function useReadReport<T>(name:string,args:Record<string,unknown>,refresh=0){
 const {client,user}=useAuth();const key=JSON.stringify([name,args,user?.id,refresh]);const [result,setResult]=useState<{key:string;data?:T;error?:boolean}>();
 useEffect(()=>{let active=true;if(!client||!user)return;const params=JSON.parse(key)[1];void Promise.resolve(client.rpc(name,params)).then(({data,error})=>{if(active)setResult(error?{key,error:true}:{key,data:data as T});}).catch(()=>{if(active)setResult({key,error:true});});return()=>{active=false;};},[client,user,key,name]);
 return result?.key===key?result:{key};
}
export function CompactMetric({label,value,note}:{label:string;value:React.ReactNode;note?:string}){return <div className="focus-metric"><dt>{label}</dt><dd>{value}</dd>{note&&<small>{note}</small>}</div>;}
export function FocusSection({title,href,children}:{title:string;href?:string;children:React.ReactNode}){return <section className="focus-section"><header><h2>{title}</h2>{href&&<Link href={href}>상세 보기 →</Link>}</header><div className="focus-body">{children}</div></section>;}
function Bars({rows}:{rows:{label:string;count:number}[]}){const max=Math.max(1,...rows.map(r=>r.count));return <ul className="focus-bars">{rows.map((r,i)=><li key={r.label+i}><span>{r.label}</span><span className="focus-track"><i style={{width:`${r.count/max*100}%`}}/></span><strong>{r.count}명</strong></li>)}</ul>;}
type Composition={accounts:number;profiles:number;school_members:number;active:number;grades:{label:string;count:number}[];schools:{label:string;count:number;office_code:string;school_code:string}[]};
type Study={total:{users:number;ms:number};grades:{grade:string;users:number;ms:number}[]};
type Learning={metrics:{targets:number;target_records:number;saved:number;recent:number;applications:number;study_users:number;study_ms:number};rows:{kind:string;label:string;users:number;records:number}[]};
const gradeNames:Record<string,string>={'1':'고1','2':'고2','3':'고3',retaker:'N수·검정고시 등',unknown:'미입력'};

// Headline KPI tile. Values are passed in from the dashboard's existing reads
// (admin_member_composition / admin_dashboard_study / admin_learning_analytics /
// supportMetrics) — this component never fetches or fabricates a metric.
function KpiTile({label,value,note,tone,href}:{label:string;value:React.ReactNode;note?:string;tone?:'ok'|'warn'|'danger'|'info';href?:string}){
 const cls=`focus-kpi${tone?` focus-kpi--${tone}`:''}${href?' focus-kpi--link':''}`;
 const body=<>
  <p className="focus-kpi__l">{label}{href?<span className="focus-kpi__go" aria-hidden="true">→</span>:null}</p>
  <p className="focus-kpi__v">{value}</p>
  {note?<p className="focus-kpi__n">{note}</p>:null}
 </>;
 return href?<Link className={cls} href={href}>{body}</Link>:<div className={cls}>{body}</div>;
}
const kpiNum=(n:number|null|undefined)=>n===null||n===undefined?<span className="focus-kpi__wait">집계 중</span>:n.toLocaleString('ko-KR');

const recentStatusLabels:Record<string,string>={student:'재학생',retaker:'N수·검정고시 등',other:'기타'};
const RECENT_PAGE_SIZE=5;
/**
 * Recent signups shown under the member composition section. Reuses the same
 * `listMembers` directory RPC as the 회원 tab (newest-first, 5 per page), so it
 * reads real data only and adds no new query or contract.
 */
function RecentSignups(){
 const [offset,setOffset]=useState(0);
 const {state}=useAdminQuery<MemberDirectory>(
  c=>c.listMembers({...defaultMemberFilters,sort:'newest'},{limit:RECENT_PAGE_SIZE,offset}),
  `dashboard-recent-signups:${offset}`,
 );
 const columns=['이메일','계정 상태','학교','학년','현재 상태','희망 전공','닉네임','가입일','상세'];
 return <div className="dash-recent">
  <div className="dash-recent__head"><h3>최근 가입 회원</h3>
   {state.status==='ready'?<span className="focus-note">전체 {state.data.total.toLocaleString('ko-KR')}명 · 최근 가입순 · {RECENT_PAGE_SIZE}명씩</span>:null}</div>
  {state.status==='loading'?<p className="focus-note" role="status">최근 가입 회원을 불러오는 중…</p>
   :state.status==='error'?<p className="focus-note" role="alert">최근 가입 회원 조회 실패 · 새로고침해 주세요.</p>
   :state.data.items.length===0?<p className="focus-note">표시할 회원이 없습니다.</p>
   :<>
    <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="최근 가입 회원 목록">
     <table className="dash-recent__table"><thead><tr>{columns.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>
      {state.data.items.map(m=>{const s=accountStateLabel(m.accountState);return <tr key={m.accountId}>
       <td className="admin-cell-email">{m.email??'이메일 미등록'}</td>
       <td><span className={`admin-chip admin-chip--${s.tone}`}>{s.label}</span></td>
       <td>{m.schoolState==='unresolved'&&m.schoolOfficeCode&&m.schoolCode?<AdminSchoolName office={m.schoolOfficeCode} school={m.schoolCode}/>:directorySchoolLabel(m)||'—'}</td>
       <td>{m.grade?`${m.grade}학년`:'—'}</td>
       <td>{m.academicStatus?recentStatusLabels[m.academicStatus]:'—'}</td>
       <td>{m.major??'—'}</td>
       <td>{m.displayName??'—'}</td>
       <td>{formatDateTime(m.createdAt)}</td>
       <td><Link className="button button--outline button--small" href="/admin/members/">상세</Link></td>
      </tr>;})}
     </tbody></table>
    </div>
    <nav className="dash-recent__pager" aria-label="최근 가입 회원 페이지">
     <button type="button" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-RECENT_PAGE_SIZE))}>이전</button>
     <span>{Math.floor(offset/RECENT_PAGE_SIZE)+1} / {Math.max(1,Math.ceil(state.data.filteredTotal/RECENT_PAGE_SIZE))} 페이지</span>
     <button type="button" disabled={offset+RECENT_PAGE_SIZE>=state.data.filteredTotal} onClick={()=>setOffset(offset+RECENT_PAGE_SIZE)}>다음</button>
    </nav>
   </>}
 </div>;
}

export function AdminDashboardView(){
 const [memberPeriod,setMemberPeriod]=useState<AdminPeriod>('all'),[mf,setMf]=useState(''),[mt,setMt]=useState('');
 const [period,setPeriod]=useState<AdminPeriod>('d30'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[refresh,setRefresh]=useState(0),[grade,setGrade]=useState('all');
 const now=useMemo(()=>{void refresh;return new Date();},[refresh]);const range=useMemo(()=>analyticsWindow(period,from,to,now),[period,from,to,now]);const membersRange=useMemo(()=>memberPeriod==='all'?{p_from:null,p_to:null}:analyticsWindow(memberPeriod,mf,mt,now),[memberPeriod,mf,mt,now]);
 const members=useReadReport<Composition>('admin_member_composition',membersRange??{p_from:'invalid',p_to:'invalid'},refresh);
 const study=useReadReport<Study>('admin_dashboard_study',range??{p_from:'invalid',p_to:'invalid'},refresh);
 const learning=useReadReport<Learning>('admin_learning_analytics',range??{p_from:'invalid',p_to:'invalid'},refresh);
 // Period-scoped reads for the headline KPI row (own 기간 selector). Same RPCs as
 // the sections below, just at the KPI period, so the top numbers sort by 기간.
 const [kpiPeriod,setKpiPeriod]=useState<AdminPeriod>('d30'),[kpf,setKpf]=useState(''),[kpt,setKpt]=useState('');
 const kpiRange=useMemo(()=>kpiPeriod==='all'?{p_from:null,p_to:null}:analyticsWindow(kpiPeriod,kpf,kpt,now),[kpiPeriod,kpf,kpt,now]);
 const kMembers=useReadReport<Composition>('admin_member_composition',kpiRange??{p_from:'invalid',p_to:'invalid'},refresh);
 const kStudy=useReadReport<Study>('admin_dashboard_study',kpiRange??{p_from:'invalid',p_to:'invalid'},refresh);
 const kLearning=useReadReport<Learning>('admin_learning_analytics',kpiRange??{p_from:'invalid',p_to:'invalid'},refresh);
 const support=useAdminQuery<AdminSupportMetrics>(c=>c.supportMetrics(),'dashboard-support');useSupportRefresh(support.reload);
 const overview=useAdminQuery<AdminDashboard>(c=>c.dashboard(),'dashboard-overview');
 const selected=grade==='all'?study.data?.total:study.data?.grades.find(g=>g.grade===grade);
 const state=(r:{error?:boolean;data?:unknown})=>r.error?<p role="alert">조회 실패 · 새로고침해 주세요.</p>:!r.data?<p role="status">집계 중…</p>:null;
 const sup=support.state.status==='ready'?support.state.data:null;
 const ov=overview.state.status==='ready'?overview.state.data:null;
 const wait=<span className="focus-kpi__wait">집계 중</span>;
 const kpiLabel=kpiPeriod==='all'?'전체 기간':'선택 기간';
 return <div className="focused-admin">
 <section className="focus-kpis-wrap" aria-label="핵심 지표 요약">
  <div className="focus-kpis-head">
   <span className="focus-kpis-head__t">상단 지표 기간</span>
   <AdminPeriodFilter period={kpiPeriod} from={kpf} to={kpt} onChange={(p,f,t)=>{setKpiPeriod(p);setKpf(f);setKpt(t);}}/>
   <span className="focus-note">가입·공부시간·희망대학은 선택 기간 기준 · 첨삭권·결제는 누적, 문의는 현재</span>
  </div>
  {!kpiRange?<p className="focus-note" role="alert">전체 대신 400일 이내 기간을 선택해 주세요.</p>:null}
  <div className="focus-kpis">
   <KpiTile label="전체 가입 수" value={kpiNum(kMembers.data?.accounts)} href="/admin/members/" note={`${kpiLabel} 가입 · 회원 현황`}/>
   <KpiTile label="총 공부 시간" value={kStudy.data?formatStudyTime(kStudy.data.total.ms):wait} href="/admin/data/study/" note={`${kpiLabel} · 시간/분 · 공부 현황`}/>
   <KpiTile label="첨삭권 사용" value={ov?kpiNum(ov.credit.consumedTotal):wait} href="/admin/credit/" note="누적(전체) · 첨삭권 Credit"/>
   <KpiTile label="희망 대학 등록 학생" value={kpiNum(kLearning.data?.metrics.targets)} tone="info" href="/admin/data/learning/" note={`${kpiLabel} · 입시 분석`}/>
   <KpiTile label="결제 주문 수" value={ov?formatCount(ov.payment.orders):wait} href="/admin/payment/" note={ov&&!ov.payment.installed?'결제 모듈 미설치':'누적(전체) · 결제'}/>
   <KpiTile label="미처리 문의" value={sup?kpiNum(sup.open):wait} tone={sup&&sup.open>0?'warn':undefined} href="/admin/inquiries/" note="현재 대기"/>
  </div>
 </section>
 {sup&&(sup.open>0||sup.failedDeliveries>0)?<div className="focus-alert" role="status">
  <strong>운영 주의</strong>
  {sup.open>0?<span className="focus-alert__pill">미처리 문의 {sup.open.toLocaleString('ko-KR')}</span>:null}
  {sup.failedDeliveries>0?<span className="focus-alert__pill focus-alert__pill--danger">알림 발송 실패 {sup.failedDeliveries.toLocaleString('ko-KR')}</span>:null}
  {sup.oldestOpenAt?<span className="focus-alert__meta">가장 오래된 미처리 {formatDateTime(sup.oldestOpenAt)}</span>:null}
 </div>:null}
 <FocusSection title="회원과 학생 구성" href="/admin/members/"><AdminPeriodFilter period={memberPeriod} from={mf} to={mt} onChange={(p,f,t)=>{setMemberPeriod(p);setMf(f);setMt(t);}}/><p className="focus-note">{memberPeriod==='all'?'전체 가입 회원의 현재 프로필 · 활동 회원은 최근 30일':'선택 기간 가입 회원의 현재 프로필 · 활동 회원은 이 가입자 중 선택 기간 공부 기록 보유자'} · 한국 날짜 기준</p>
 {!membersRange?<p role="alert">400일 이내의 올바른 기간을 선택하세요.</p>:state(members)}{membersRange&&members.data&&<><dl className="focus-metrics"><CompactMetric label={memberPeriod==='all'?'전체 가입 계정':'기간 내 가입 계정'} value={members.data.accounts}/><CompactMetric label="공부 기록 회원" value={members.data.active}/><CompactMetric label="프로필 보유" value={members.data.profiles} note={`미작성 ${members.data.accounts-members.data.profiles}명`}/><CompactMetric label="학교 입력 회원" value={members.data.school_members} note={`프로필 중 미입력 ${members.data.profiles-members.data.school_members}명`}/></dl><div className="focus-split"><div><h3>학년 분포</h3><Bars rows={[...members.data.grades].sort((a,b)=>["고1","고2","고3","N수·검정고시 등","미입력"].indexOf(a.label)-["고1","고2","고3","N수·검정고시 등","미입력"].indexOf(b.label))}/></div><div><h3>학교 분포 · 상위 20</h3><SchoolDistribution rows={members.data.schools.map(s=>({key:s.school_code,officeCode:s.office_code,count:s.count}))} unsetCount={null}/></div></div></>}
 <RecentSignups/>
 </FocusSection>
 <div className="focus-toolbar"><div><strong>학습·입시·운영 집계 기간</strong><small>기록 시각 기준 · KST</small></div><AdminPeriodFilter allowAll={false} period={period} from={from} to={to} onChange={(p,f,t)=>{setPeriod(p);setFrom(f);setTo(t);setGrade('all');}}/><button onClick={()=>{setRefresh(n=>n+1);support.reload();}}>새로고침</button></div>
 {!range?<p role="alert">전체 대신 400일 이내 기간을 선택해 주세요.</p>:<>
 <FocusSection title="기록된 공부 시간" href="/admin/data/study/"><div className="focus-toolbar"><p>앱 공부 타이머 + 학습 합산을 선택한 모의고사 풀이 시간</p><label>학년 <select value={grade} onChange={e=>setGrade(e.target.value)}><option value="all">전체 기록자</option>{study.data?.grades.map(g=><option key={g.grade} value={g.grade}>{gradeNames[g.grade]??g.grade}</option>)}</select></label></div>{state(study)}{study.data&&<><dl className="focus-metrics"><CompactMetric label="전체 공부 시간" value={formatStudyTime(selected?.ms)}/><CompactMetric label="기록자 1인당 평균" value={formatStudyTime(selected?selected.users?selected.ms/selected.users:0:null)}/><CompactMetric label="공부 기록자" value={`${selected?.users??0}명`}/></dl><details><summary>학년별 공부 시간 · 집계 기준</summary><table><thead><tr><th>학년</th><th>기록자</th><th>공부 시간</th><th>1인당 평균</th></tr></thead><tbody>{study.data.grades.map(g=><tr key={g.grade}><td>{gradeNames[g.grade]??g.grade}</td><td>{g.users}명</td><td>{formatStudyTime(g.ms)}</td><td>{formatStudyTime(g.ms/g.users)}</td></tr>)}</tbody></table><p className="focus-note">완료·동기화된 실제 활동 구간만 합산합니다. 일시정지와 같은 회원의 중복 시간은 제외합니다. 학년은 현재 프로필 기준이며 미기록 공부는 포함하지 않습니다.</p></details></>}</FocusSection>
 <FocusSection title="학습·입시 종합 현황" href="/admin/data/learning/">{state(learning)}{learning.data&&<><dl className="focus-metrics"><CompactMetric label="희망 대학 기록" value={learning.data.metrics.target_records}/><CompactMetric label="희망 대학 등록 학생" value={learning.data.metrics.targets}/><CompactMetric label="실제 지원 기록" value={learning.data.metrics.applications}/><CompactMetric label="저장한 자료" value={learning.data.metrics.saved}/></dl><table><thead><tr><th>희망 대학 · 상위 10</th><th>학생 수</th><th>기록 수</th></tr></thead><tbody>{learning.data.rows.filter(r=>r.kind==='targets').map(r=><tr key={r.label}><td>{r.label}</td><td>{r.users}명</td><td>{r.records}건</td></tr>)}</tbody></table><p className="focus-note">선택 기간에 등록되어 현재 남아 있는 기록입니다. 희망 대학과 실제 지원을 구분하며, 1명부터 표시합니다.</p></>}</FocusSection>
 <FocusSection title="앱 이용·인기 자료" href="/admin/data/materials-data/"><DashboardUsageRankings rows={learning.data?.rows} error={learning.error} loading={!learning.data}/></FocusSection>
 </>}
 <FocusSection title="문의와 서비스 운영" href="/admin/inquiries/">{support.state.status==='error'?<AdminErrorPanel kind={support.state.kind} onRetry={support.reload}/>:support.state.status==='ready'?<dl className="focus-metrics"><CompactMetric label="미처리 문의" value={support.state.data.open}/><CompactMetric label="오늘 접수" value={support.state.data.newToday}/><CompactMetric label="답변 완료 · 누적" value={support.state.data.answered}/><CompactMetric label="알림 발송 실패" value={support.state.data.failedDeliveries}/></dl>:<p>조회 중…</p>}<nav className="focus-links"><Link href="/admin/credit/">이용권 원장</Link><Link href="/admin/payment/">결제 내역</Link><Link href="/ql/">평가 품질 검수</Link><Link href="/admin/materials/">논술 자료 검수</Link></nav></FocusSection>
 </div>;
}
