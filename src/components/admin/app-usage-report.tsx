'use client';
import './admin-analytics.css';
import {useEffect,useState,useMemo} from 'react';
import {useAuth} from '@/components/auth-context';
import {gaDates,gaErrorMessage,type GaTable} from '@/lib/admin/ga4-report';
import {featureNames,type AppPlatform,type AppUsageReport as Report} from '@/lib/admin/app-usage-report';
function Ranking({title,table,countLabel='실행 수'}:{title:string;table:GaTable|null;countLabel?:string}){
 return <section><h3>{title}</h3>{!table?<p>미연결 · 이벤트 보고서 차원 등록이 필요합니다.</p>:!table.rows.length?<p>수집 대기 · 선택 기간의 이벤트 수신이 아직 확인되지 않았습니다.</p>:<div className="analytics-table"><table><thead><tr><th scope="col">순위</th><th scope="col">메뉴·자료</th>{table.columns.map(c=><th scope="col" key={c}>{c==='totalUsers'?'고유 이용자':countLabel}</th>)}</tr></thead><tbody>{table.rows.map((r,i)=><tr key={i}><td>{i+1}</td><th scope="row">{r.label}</th>{r.values.map((n,j)=><td key={j}>{n.toLocaleString('ko-KR')}</td>)}</tr>)}</tbody></table></div>}</section>;
}
export function AppUsageReport({window,refresh}:{window:{p_from:string;p_to:string};refresh:string}){
 const [platform,setPlatform]=useState<AppPlatform>('all');
 const {client,user}=useAuth();const {from,to}=gaDates(window);const key=JSON.stringify([user?.id,from,to,refresh,platform]);
 const [result,setResult]=useState<{key:string;report?:Report;error?:string}>();
 useEffect(()=>{let alive=true;const controller=new AbortController();
 void(async()=>{try{
  if(!client||!user)throw new Error('LOGIN_REQUIRED');
  const {data}=await client.auth.getSession();const token=data.session?.access_token;if(!token)throw new Error('LOGIN_REQUIRED');
  const response=await fetch(`/api/admin/ga4?from=${from}&to=${to}&surface=app&platform=${platform}`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal,cache:'no-store'});
  const body=await response.json();if(!response.ok)throw new Error(body?.code??'READ_UNAVAILABLE');
  if(body?.version!=='ga4-app-usage-v1'||!['CONNECTED','UNCONNECTED'].includes(body.state))throw new Error('INVALID_RESPONSE');
  if(body.state==='CONNECTED'&&(!Array.isArray(body.active)||!Array.isArray(body.missingDimensions)))throw new Error('INVALID_RESPONSE');
  if(alive)setResult({key,report:body});
 }catch(e){if(alive)setResult({key,error:gaErrorMessage(e instanceof Error?e.message:null)});}})();
 return()=>{alive=false;controller.abort();};},[client,user,from,to,key,platform]);
 const current=result?.key===key?result:null,r=current?.report;
 return <div className="app-usage-report"><label>플랫폼 <select value={platform} onChange={e=>setPlatform(e.target.value as AppPlatform)}><option value="all">iOS + Android</option><option value="ios">iOS</option><option value="android">Android</option></select></label>
 {!current?<p role="status">앱 이용 분석 조회 중…</p>:current.error?<p role="alert">{current.error}</p>:r?.state==='UNCONNECTED'?<p role="status"><strong>미연결 · 앱 Analytics 스트림 연결이 필요합니다.</strong> 앱 활성 이용자·메뉴 TOP 10·자료 TOP 20은 수집 연결 후 표시됩니다.</p>:r?.state==='CONNECTED'?<>
 <p className="focus-note">앱 GA4 · {r.from} ~ {r.to} · {r.timeZone} · 조회 {new Date(r.fetchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} KST</p>
 {r.timeZone!=='Asia/Seoul'&&<p role="status">GA4 속성 시간대가 KST와 다릅니다. 기간 수치는 표시된 속성 시간대를 기준으로 합니다.</p>}
 <p className="focus-note">{r.observationFrom??'수집 기록 조회 범위 미확인'} 이후 보고서에서 확인한 최초 수신일: {r.firstObserved??'확인 불가'} · 최근 수신일: {r.lastObserved??'확인 불가'}. 실제 설치·수집 시작일과 다를 수 있습니다. 신규 기능 이벤트는 업데이트된 앱 이후에만 수집됩니다.</p>
 <div className="focus-kpis">{[
 ['이벤트 발생 수',r.summary?.rows[0]?.values[0]],['화면 조회 수',r.events?.rows.find(e=>e.label==='screen_view')?.values[0]],['메뉴 클릭 수',r.events?.rows.find(e=>e.label==='menu_click')?.values[0]],['기능 실행 수',r.events?.rows.some(e=>e.label in featureNames)?r.events.rows.filter(e=>e.label in featureNames).reduce((n,e)=>n+e.values[0],0):undefined],['고유 이용자 수',r.summary?.rows[0]?.values[1]],
 ].map(([label,value])=><div className="focus-kpi" key={label}><p className="focus-kpi__l">{label}</p><p className="focus-kpi__v">{typeof value==='number'?value.toLocaleString():'수신 미확인'}</p></div>)}</div>
 <p className="focus-note">선택 기간 · 등록된 행동 이벤트 범위. 이벤트가 없는 항목은 미수집·반영 지연과 0회 이용을 구분할 수 없어 수신 미확인으로 표시합니다. 메뉴 클릭은 하단 5개 탐색 메뉴의 실제 선택이며 화면 이동과 별도입니다.</p>
 <Ranking title="인기 화면 TOP 10" table={r.screens??null} countLabel="화면 조회"/>
 <Ranking title="인기 메뉴 TOP 10 · 클릭" table={r.menuClicks??null} countLabel="클릭 수"/>
 <Ranking title="인기 기능 TOP 10" table={r.events?{...r.events,rows:r.events.rows.filter(e=>e.label in featureNames).slice(0,10).map(e=>({...e,label:featureNames[e.label]}))}:null}/>
 <dl className="focus-metrics">{r.active.map(w=><div className="focus-metric" key={w.days}><dt>{w.days===1?'DAU':w.days===7?'WAU':'MAU'} · {w.days}일 활성 이용자</dt><dd>{w.users===null?'수집 대기':`${w.users.toLocaleString('ko-KR')}명`}</dd><small>{w.from} ~ {w.to}</small></div>)}</dl>
 <p className="focus-note">종료일 기준 1·7·30일의 GA4 활성 이용자입니다. 고유 이용자는 GA4 식별 기준으로 비회원도 포함하며, 가입 회원 수와 다릅니다. 기간별·메뉴별 이용자는 합산하지 않습니다. 당일 수치는 반영 지연이 있습니다.</p>
 {(r.thresholded||r.sampled||r.dataLoss)&&<p role="status">GA4 집계 제한 적용: {r.thresholded?'개인정보 임계값 ':''}{r.sampled?'표본 집계 ':''}{r.dataLoss?'기타 행 통합 ':''}. 전체 원장 수치가 아닙니다.</p>}
 <div className="usage-rankings"><Ranking title="메뉴 이동 TOP 10 · 고유 이용자" table={r.menusByUsers}/><Ranking title="메뉴 이동 TOP 10 · 진입 수" table={r.menusByViews} countLabel="진입 수"/></div>
 <Ranking title="자료실 인기 자료 TOP 20 · 상세 열림" table={r.materials} countLabel="상세 열림"/>
 {r.titlesUnavailable&&<p role="status">자료명 연결 실패 · 수신 횟수는 유지하며 원본 Registry ID를 표시합니다.</p>}
 <details><summary>앱 이용 집계 기준</summary><p>메뉴는 등록된 화면으로 이동한 횟수이며 단순 버튼 클릭 수가 아닙니다. 자료는 자료실에서 진입하여 상세 내용이 정상적으로 열린 횟수입니다. 동일 자료를 나중에 다시 열면 추가 집계하고, 화면 재렌더링·새로고침은 제외합니다. 앱 수집이 포함된 버전 이후의 기록만 집계하며 과거 기록을 소급 생성하지 않습니다.</p><p>속성 {r.propertyId} · 앱 스트림 {r.streamIds.join(', ')}. WEB 스트림은 제외합니다.</p></details>
 </>:null}
 </div>;
}

export function AppUsagePage(){
 const [days,setDays]=useState(7);const [now,setNow]=useState(()=>new Date());
 const range=useMemo(()=>{const today=new Date(now.getTime()+9*3600000).toISOString().slice(0,10);const end=Date.parse(today+'T00:00:00+09:00')+86400000;return {p_from:new Date(end-days*86400000).toISOString(),p_to:new Date(end).toISOString()};},[days,now]);
 return <div className="admin-stack"><form className="analytics-filter" onSubmit={e=>{e.preventDefault();setNow(new Date());}}><label>집계 기간 (KST)<select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={1}>오늘</option><option value={7}>최근 7일</option><option value={30}>최근 30일</option></select></label><button>조회</button></form><AppUsageReport window={range} refresh={now.toISOString()}/></div>;
}
