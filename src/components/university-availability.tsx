'use client';
import {useEffect,useState} from 'react';
import {useAuth} from './auth-context';
/** Public question visibility is separate from paid evaluation admission. */
export function UniversityAvailability({id}:{id:string|null}){
 const {client}=useAuth();const [state,setState]=useState<'checking'|'missing'|'questions'|'unknown'>(id?'checking':'missing');
 useEffect(()=>{let active=true;if(!id)return;if(!client){queueMicrotask(()=>{if(active)setState('unknown');});return;}
 void (async()=>{const {data,error}=await client.from('essay_questions').select('id,essay_exams!inner(university_id)').eq('is_published',true).eq('essay_exams.university_id',id).limit(1).abortSignal(AbortSignal.timeout(15000));if(active)setState(error?'unknown':data?.length?'questions':'missing');})().catch(()=>{if(active)setState('unknown');});return()=>{active=false;};},[client,id]);
 return <p role="status">{state==='checking'?'자료 상태 확인 중':state==='missing'?'자료 준비 중':state==='questions'?'문항 제공 · 평가 준비 중':'자료 상태 확인 필요'}</p>;
}
