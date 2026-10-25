'use client';
import {useCallback,useEffect,useState} from 'react';
import {useAuth} from './auth-context';
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function useEssayServiceStatus(){
 const {client,user,status:authStatus}=useAuth(),owner=user?.id;
 const [attempt,setAttempt]=useState(0);
 const [result,setResult]=useState<{owner:string;status:'ready'|'error';universities:Set<string>}|null>(null);
 const retry=useCallback(()=>setAttempt(n=>n+1),[]);
 useEffect(()=>{
  let active=true;const abort=new AbortController();
  const timeout=setTimeout(()=>abort.abort(),20000);
  void(async()=>{
   if(!client||!owner)return;
   try{
    const session=(await client.auth.getSession()).data.session;
    if(session?.user.id!==owner)throw Error('SESSION_CHANGED');
    const response=await fetch('/api/essay/public-service-status',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store',signal:abort.signal});
    const data=response.ok?await response.json():null;
    if(data?.version!=='essay-public-service-v1'||data.checked!==true||!Array.isArray(data.universityIds)||!data.universityIds.every(uuid))throw Error('STATUS_UNVERIFIED');
    if(active)setResult({owner,status:'ready',universities:new Set(data.universityIds)});
   }catch{if(active)setResult({owner,status:'error',universities:new Set()});}
   finally{clearTimeout(timeout);}
  })();
  return()=>{active=false;clearTimeout(timeout);abort.abort();};
 },[client,owner,attempt]);
 // No focus-triggered overlap. Each retry cancels the preceding generation.
 const status=!owner?(authStatus==='loading'?'loading':'error'):result&&result.owner===owner?result.status:'loading';
 return {status,universities:result&&result.owner===owner?result.universities:new Set<string>(),retry:()=>{setResult(null);retry();}};
}
