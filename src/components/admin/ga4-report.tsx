"use client";
import {useEffect,useState} from 'react';
import {useAuth} from '@/components/auth-context';
import {AdminPanel} from './admin-surface';
import {gaDates,gaErrorMessage,promoEvents,type GaReport,type GaTable} from '@/lib/admin/ga4-report';
const names:Record<string,string>={activeUsers:'활성 사용자',newUsers:'신규 사용자',sessions:'세션',screenPageViews:'페이지뷰',totalUsers:'사용자',eventCount:'발생 건수'};
function Table({title,data}:{title:string;data:GaTable}){
 return <div className="analytics-table"><table><caption>{title}{data.limited?` · 상위 ${data.rows.length}개 / 전체 ${data.totalRows}행`:''}</caption><thead><tr><th scope="col">구분</th>{data.columns.map(c=><th key={c} scope="col">{names[c]||c}</th>)}</tr></thead><tbody>{data.rows.map((r,i)=><tr key={i}><th scope="row">{r.label}</th>{r.values.map((v,j)=><td key={j}>{v.toLocaleString('ko-KR')}</td>)}</tr>)}</tbody></table>{!data.rows.length&&<p>데이터 없음 · 해당 기간의 보고서 행이 없습니다.</p>}</div>;
}
export function Ga4Report({window,refresh}:{window:{p_from:string;p_to:string};refresh:string}){
 const {client,user}=useAuth();const dates=gaDates(window);const key=JSON.stringify([user?.id,dates,refresh]);
 const [result,setResult]=useState<{key:string;report?:GaReport;error?:string}|null>(null);
 useEffect(()=>{let alive=true;const controller=new AbortController();
 void(async()=>{try{
 if(!client||!user)throw new Error('LOGIN_REQUIRED');
 const {data}=await client.auth.getSession();const token=data.session?.access_token;
 if(!token)throw new Error('LOGIN_REQUIRED');
 const response=await fetch(`/api/admin/ga4?from=${dates.from}&to=${dates.to}`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal,cache:'no-store'});
 const payload=await response.json();if(!response.ok)throw new Error(typeof payload?.code==='string'?payload.code:'READ_UNAVAILABLE');
 if(payload?.version!=='ga4-report-v1'||payload?.source!=='GA4'||['summary','returning','daily','channels','pages','events'].some(t=>!Array.isArray(payload[t]?.rows)||!Array.isArray(payload[t]?.columns)))throw new Error('INVALID_RESPONSE');
 if(alive)setResult({key,report:payload});
 }catch(e){if(alive)setResult({key,error:gaErrorMessage(e instanceof Error?e.message:null)});}})();
 return()=>{alive=false;controller.abort();};},[client,user,key,dates.from,dates.to]);
 const current=result?.key===key?result:null;const r=current?.report;
 return <AdminPanel title="레전드스터디닷컴 GA4 보고서">
 {!current?<p role="status">GA4 보고서 조회 중…</p>:current.error?<p role="alert">{current.error}</p>:r?<>
 <p>CONNECTED · Google Analytics Data API · 속성 {r.propertyId} · 스트림 {r.streamId}</p>
 <p>기간 {r.startDate} ~ {r.endDate} (GA4 속성 시간대: {r.timeZone}) · 조회 {new Date(r.fetchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} KST</p>
 {r.timeZone!=='Asia/Seoul'&&<p role="status">선택한 날짜는 GA4 속성 시간대로 조회됩니다. 기존 서버 원장의 KST 일자와 다를 수 있습니다.</p>}
 {(r.thresholded||r.sampled||r.dataLoss)&&<p role="status">GA4 보고서 제한: {r.thresholded?'개인정보 임계값 적용 ':''}{r.sampled?'표본 집계 ':''}{r.dataLoss?'기타 행으로 집계된 데이터 있음':''}. 수치를 전체 원장으로 해석하지 마세요.</p>}
 <dl className="analytics-metrics">{r.summary.columns.map((c,i)=><div key={c}><dt>{names[c]}</dt><dd>{r.summary.rows[0]?.values[i]?.toLocaleString('ko-KR')??'데이터 없음'}</dd></div>)}<div><dt>재방문 사용자</dt><dd>{r.returning.rows[0]?.values[0]?.toLocaleString('ko-KR')??'데이터 없음'}</dd></div></dl>
 <p>기존 사이트의 웹 스트림·호스트만 집계합니다. 방문·가입·설치는 서로 다른 지표입니다. 신규·재방문 사용자는 기간 내 겹칠 수 있으며 합산하지 않습니다. 당일 데이터는 반영 지연으로 달라질 수 있습니다.</p>
 <Table title="날짜별 추이" data={r.daily}/><Table title="유입 채널 (세션 기준)" data={r.channels}/><Table title="인기 페이지 (페이지뷰 기준)" data={r.pages}/>
 <Table title="앱 홍보 모달 이벤트 (클릭은 설치가 아님)" data={r.events}/>
 <ul>{promoEvents.filter(e=>!r.events.rows.some(row=>row.label===e)).map(e=><li key={e}>{e}: NOT_COLLECTED · 선택 기간 수신 미확인 (보고서 지연 가능)</li>)}</ul>
 <p>스토어 클릭의 iOS/Android 세부 구분은 store 매개변수의 보고서 등록·수신 검증 후 연결합니다. 실제 설치 완료: NOT_AVAILABLE.</p>
 </>:null}
 </AdminPanel>;
}
