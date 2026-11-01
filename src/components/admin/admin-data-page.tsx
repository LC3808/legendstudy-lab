'use client';
import Link from 'next/link';
import {AdminDataTable} from './admin-data-table';
import {useEffect,useMemo,useState} from 'react';
import {useAuth} from '@/components/auth-context';
import {AdminAnalytics} from './admin-analytics';
import {AdminMembersView} from './admin-members-view';
import {AdminEssayFeedback} from './admin-essay-feedback';
import {AdminPanel,AdminLoading,AdminErrorPanel} from './admin-surface';
import {adminErrorKind,mapRpcError,type AdminErrorKind} from '@/lib/admin/errors';
import {analyticsWindow} from '@/lib/admin/analytics';
import type {AdminPeriod} from '@/lib/admin/period';
import {parseLearningAnalytics,learningMetrics,learningDefinitions,type LearningAnalytics} from '@/lib/admin/learning-analytics';

function Learning({section}:{section:string}){
 const {client,user}=useAuth();const [period,setPeriod]=useState<AdminPeriod>('d30');const [from,setFrom]=useState('');const [to,setTo]=useState('');const [now,setNow]=useState(()=>new Date());
 const window=useMemo(()=>analyticsWindow(period,from,to,now),[period,from,to,now]);
 const key=JSON.stringify([user?.id,window,now]);
 const [result,setResult]=useState<{key:string;data?:LearningAnalytics;error?:AdminErrorKind}|null>(null);
 useEffect(()=>{let active=true;if(!client||!user||!window)return;void Promise.resolve(client.rpc('admin_learning_analytics',window)).then(({data,error})=>{if(error)throw mapRpcError(error);const parsed=parseLearningAnalytics(data);if(active)setResult({key,data:parsed});}).catch(error=>{if(active)setResult({key,error:adminErrorKind(error)});});return()=>{active=false;};},[client,user,key,window]);
 const current=result?.key===key?result:null;
 const kinds=section==='universities'?['targets']:section==='materials-data'?['saved','recent']:section==='applications'?['applications']:['targets','saved','recent','applications'];
 return <div className="admin-stack">
 <form onSubmit={e=>{e.preventDefault();setNow(new Date());}} className="analytics-filter"><label>집계 기간 (KST)<select value={period} onChange={e=>setPeriod(e.target.value as AdminPeriod)}><option value="today">오늘</option><option value="d7">최근 7일</option><option value="d30">최근 30일</option><option value="custom">사용자 지정 (최대 400일)</option></select></label>{period==='custom'&&<><label>시작일<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>종료일<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></>}<button type="submit">조회</button></form>
 {!window?<AdminPanel title="올바른 기간을 선택해 주세요"/>:!current?<AdminLoading/>:current.error?<AdminErrorPanel kind={current.error}/>:current.data?<>
 <p>출처: Supabase 학습 원장 · 조회 시각 {new Date(current.data.as_of).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} KST · {current.data.state}</p>
 <p>5명 미만 또는 기록이 없는 지표는 수치를 제공하지 않습니다. 이 제한은 내부 검수용이며 공개 통계 승인 기준이 아닙니다.</p>
 <div className="admin-metrics">{Object.entries(learningMetrics).filter(([k])=>section!=='study'||k.startsWith('study_')).map(([k,label])=><div className="admin-metric" key={k}><p>{label}</p><strong>{current.data!.metrics[k as keyof typeof learningMetrics]?.toLocaleString()??'미집계 / 표본 부족'}</strong></div>)}</div>
 {kinds.map(kind=><AdminPanel key={kind} title={learningDefinitions[kind as keyof typeof learningDefinitions]}>{current.data!.rows.filter(r=>r.kind===kind).length?<AdminDataTable id={'learning-'+kind} rows={current.data!.rows.filter(r=>r.kind===kind)} rowKey={r=>r.label} scope="서버에서 반환한 집계 행만 검색·정렬합니다. 최소 표본 정책은 유지합니다." columns={[{key:'label',label:'대상',value:r=>r.label},{key:'users',label:'고유 학생 수',value:r=>r.users},{key:'records',label:'기록 수',value:r=>r.records}]}/>:<p>EMPTY 또는 표본 부족 — 순위를 제공하지 않습니다.</p>}</AdminPanel>)}
 {section==='insights'&&<AdminPanel title="인사이트 DRAFT 미리보기"><p>자동 노출 OFF · 저장·승인 원장 연결 전에는 미리보기만 제공합니다.</p>{current.data.rows.filter(r=>r.kind==='saved').slice(0,1).map(r=><p key={r.label}>선택 기간에 현재 남아 있는 저장 기록 기준, {r.users}명의 학생이 「{r.label}」 자료를 저장했습니다.</p>)}<p>기간: {current.data.from} ~ {current.data.to} · 최소 표본 5 · 조회 시각과 출처는 위와 동일합니다.</p></AdminPanel>}
 </>:null}
 <AdminPanel title="집계 해석"><p>{learningDefinitions.study}</p><p>성적 분포·인과 분석·희망 대학 변경 추이·검색 횟수는 기존 데이터만으로 복원하지 않습니다. 개인별 기록은 권한이 확인된 회원 상세에서 확인하세요.</p><Link href="/admin/members/">회원 상세 / Student 360</Link></AdminPanel>
 </div>;
}
export function AdminDataPage({section}:{section:string}){
 if(['overview','conversion','essay-usage','visitors','installs'].includes(section))return <AdminAnalytics focus={['visitors','installs'].includes(section)?'ga4':section==='conversion'?'conversion':section==='essay-usage'?'essay':'all'}/>;
 if(section==='students')return <AdminMembersView/>;
 if(section==='satisfaction')return <AdminEssayFeedback/>;
 if(section==='samples')return <AdminPanel title="기존 첨삭 품질 검수"><p>원본 답안과 평가 결과는 기존 검수 전용 권한으로 조회합니다. 일반 운영자 권한을 품질 열람 권한으로 확대하지 않습니다.</p><Link href="/owner-review/essay/">실제 답안·재첨삭 비교 검수 →</Link><p><Link href="/ql/">품질 판정 기록 →</Link></p></AdminPanel>;
 if(section==='scores')return <AdminPanel title="성적·학습 분석 — NOT_IMPLEMENTED"><p>Student 360의 academic_performance는 현재 null 계약입니다. 개인 연습 점수를 공식 성적으로 환산하지 않습니다. 비교 가능한 성적 집계와 별도 권한·조회 감사 계약이 필요합니다.</p></AdminPanel>;
 if(section==='verification')return <AdminPanel title="베타 검증 — NOT_TESTED"><p>자동 테스트 결과와 실제 사용자 평가 E2E는 다릅니다. TEST Gateway·Provider 승인·실기기 검수를 완료하기 전에는 출시 PASS로 표시하지 않습니다.</p><Link href="/admin/beta/">베타 설정 확인</Link><p><Link href="/admin/beta/failures/">실패·복구 기록 확인</Link></p></AdminPanel>;
 return <Learning section={section}/>;
}
