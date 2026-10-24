'use client';
import {useEffect,useState} from 'react';
import {useAuth} from './auth-context';
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function useEssayServiceStatus(){
 const {client,user}=useAuth();
 const owner=user?.id;
 const [result,setResult]=useState<{owner:string;universities:Set<string>}|null>(null);
 useEffect(()=>{let active=true;const abort=new AbortController();
  const load=async()=>{
   if(!client||!owner)return;
   const session=(await client.auth.getSession()).data.session;
   if(!active||session?.user.id!==owner)return;
   try{
    const response=await fetch('/api/essay/service-status',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store',signal:abort.signal});
    const data=response.ok?await response.json():null;
    const ids=new Set<string>();
    if(data?.version==='essay-service-status-v1'&&data.checked===true&&Array.isArray(data.exams))for(const e of data.exams){if(uuid(e.universityId)&&uuid(e.examId)&&Array.isArray(e.questionIds)&&e.questionIds.length&&e.questionIds.every(uuid))ids.add(e.universityId);}
    if(active)setResult({owner,universities:ids});
   }catch{if(active)setResult({owner,universities:new Set()});}
  };
  void load();const refresh=()=>{if(document.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);
  return()=>{active=false;abort.abort();window.removeEventListener('focus',refresh);};
 },[client,owner]);
 return result&&result.owner===owner?result.universities:new Set<string>();
}
