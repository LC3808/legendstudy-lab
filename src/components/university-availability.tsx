'use client';
import {useEffect,useState} from 'react';
import {useAuth} from './auth-context';
/** Question visibility is a public RLS read. Catalog presence never grants
 * evaluation readiness: that requires the existing per-question server admission. */
export function UniversityAvailability({id}:{id:string|null}){
 const {client}=useAuth();
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
 },[client,id]);
 return <div className="university-availability" role="status">
  <p>{state==='checking'?'자료 상태 확인 중':state==='missing'?'자료 준비 중':state==='questions'?'문항 제공':'자료 상태 확인 필요'}</p>
  <p>{state==='questions'?'AI 첨삭 가능 여부는 문항에서 확인해 주세요.':'AI 첨삭 준비 중'}</p>
 </div>;
}
