'use client';
import {useEffect,useState} from 'react';
import {useAuth} from '../auth-context';
import {AdminLoading,AdminErrorPanel,useAdminQuery} from './admin-surface';
import type {LearningSummary} from '@/lib/admin/learning-summary';
export function AdminLearningSummary({subject}:{subject?:string}){
 const {state,reload}=useAdminQuery<LearningSummary>(c=>c.learningSummary(subject),'learning:'+subject);
 return <section className="admin-section"><h3>{subject?'회원 첨삭 회차':'회원·첨삭 회차 통계'}</h3>{state.status==='loading'?<AdminLoading/>:state.status==='error'?<AdminErrorPanel kind={state.kind} onRetry={reload}/>:<>
 {state.data.members&&<div className="admin-metrics"><Metric title="전체 가입 계정" value={state.data.members.accounts}/><Metric title="프로필 보유" value={state.data.members.profiles}/><Metric title="프로필 없는 계정" value={state.data.members.without_profile}/></div>}
 <div className="admin-metrics">{(['essay','math'] as const).map(kind=><div className="admin-metric" key={kind}><p className="admin-metric__label">{kind==='essay'?'인문·경제경영':'수리'} 논술 회차 제출</p><p className="admin-metric__value">{state.data[kind].total}회</p><p>최초 {state.data[kind].initial} · 재첨삭 {state.data[kind].rewrites}</p><p>완료 {state.data[kind].completed} · 진행 {state.data[kind].pending} · 실패 {state.data[kind].failed}</p></div>)}</div>
 <p className="admin-muted">동일 계정의 회차 저장 기록입니다. 이전 단일 문항 기록과 단위가 달라 합산하지 않습니다.</p>
 {state.data.registry&&<div className="admin-metrics"><Metric title="DB 등록 문항" value={state.data.registry.questions}/></div>}
 </>}</section>;
}
function Metric({title,value}:{title:string;value:number}){return <div className="admin-metric"><p className="admin-metric__label">{title}</p><p className="admin-metric__value">{value.toLocaleString()}</p></div>;}
/** Reuse real admission checks; DB publication flag and registered metadata are not execution permission. */
export function AdminPublicAvailability(){
 const {client,user}=useAuth();const [counts,setCounts]=useState<{exams:number;questions:number;owner:string}|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;void(async()=>{if(!client||!user)return;const s=(await client.auth.getSession()).data.session;if(s?.user.id!==user.id)return;
 const r=await fetch('/api/essay/service-status',{headers:{Authorization:`Bearer ${s.access_token}`},cache:'no-store'});const data=await r.json();
 if(!r.ok||data.version!=='essay-service-status-v1'||data.checked!==true||!Array.isArray(data.exams))throw Error('NOT_VERIFIED');
 const ids=new Set<string>();for(const e of data.exams){if(!Array.isArray(e.questionIds))throw Error('INVALID_RESPONSE');for(const q of e.questionIds)ids.add(q);}
 if(active)setCounts({exams:new Set(data.exams.map((e:{examId:string})=>e.examId)).size,questions:ids.size,owner:user.id});
 })().catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[client,user]);
 return <section className="admin-section"><h3>실제 일반 사용자 첨삭 가능 범위</h3>{counts?.owner===user?.id&&counts?<div className="admin-metrics"><Metric title="실행 승인 시험" value={counts.exams}/><Metric title="실행 승인 문항" value={counts.questions}/></div>:<p>{failed?'공개 상태를 확인하지 못했습니다.':'공개 실행 정책을 확인하고 있습니다.'}</p>}<p className="admin-muted">운영 공개 허용 목록과 기존 실행 가능 여부 조회의 교집합입니다. 등록 수·게시 플래그와 구분하며 평가를 실행하지 않습니다.</p></section>;
}
