'use client';
import {useEffect,useState} from 'react';
import {useAuth} from './auth-context';
/** Question visibility is a public RLS read. Catalog presence never grants
 * evaluation readiness: that requires the existing per-question server admission. */
export function UniversityAvailability({id,later=false}:{id:string|null;later?:boolean}){
 const {client,user}=useAuth();
 const [state,setState]=useState<'checking'|'missing'|'questions'|'unknown'>(id?'checking':'missing');
 useEffect(()=>{
  let active=true;
  if(!id||!client){queueMicrotask(()=>{if(active)setState(id?'unknown':'missing');});return()=>{active=false;};}
  queueMicrotask(()=>{if(active)setState('checking');});
  void (async()=>{
   const {data,error}=await client.from('essay_questions').select('id,essay_exams!inner(university_id)').eq('is_published',true).eq('essay_exams.university_id',id).limit(1).abortSignal(AbortSignal.timeout(15000));
   if(active)setState(error?'unknown':data?.length?'questions':'missing');
  })().catch(()=>{if(active)setState('unknown');});
  return()=>{active=false;};
 },[client,id,user?.id]);
 const label=state==='checking'?'문항 확인 중':state==='unknown'?'문항 상태 확인 필요':later?'서비스 추후 제공':state==='questions'?'평가 준비 중':'자료 준비 중';
 return <span className="university-badge university-badge--status" role="status">{label}</span>;
}
