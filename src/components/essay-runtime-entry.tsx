'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-context';
import { MathStudentRoute } from '@/components/math-release/student-route';
function Availability({workspace=false}:{workspace?:boolean}) {
 const auth=useAuth();
 const [state,setState]=useState<'loading'|'ready'|'closed'|'error'>('loading');
 useEffect(()=>{
  let active=true;const abort=new AbortController();
  async function load(){
   try{
    const session=await auth.client?.auth.getSession();
    const token=session?.data.session?.access_token;
    if(!token){if(active)setState('closed');return;}
    const response=await fetch('/api/essay/availability',{headers:{Authorization:`Bearer ${token}`},signal:abort.signal,cache:'no-store'});
    if(!response.ok)throw Error('unavailable');const result=await response.json();
    if(result?.version!=='essay-web-v1'||typeof result?.types?.math!=='boolean')throw Error('invalid');
    if(active)setState(result.types.math?'ready':'closed');
   }catch{if(active)setState('error');}
  }
  void load();return()=>{active=false;abort.abort();};
 },[auth.client]);
 if(state==='loading')return <p role="status">이용 가능한 문항을 확인하고 있습니다.</p>;
 if(state==='error')return <p role="alert">문항을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>;
 if(state==='closed')return <p>현재 이용 가능한 첨삭 문항이 없습니다.</p>;
 return workspace?<MathStudentRoute enabled/>:<Link className="button button--primary" href="/math/">수리 논술 작성</Link>;
}
export function EssayRuntimeEntry({workspace=false}:{workspace?:boolean}) {
 const auth=useAuth();
 if(auth.status==='loading')return <p role="status">로그인을 확인하고 있습니다.</p>;
 if(!auth.user||!auth.client)return <p><Link href={`/login/?next=${encodeURIComponent(workspace?'/math/':'/essay-lab/')}`}>로그인</Link> 후 내 답안과 이용 가능한 첨삭 문항을 확인하세요.</p>;
 return <Availability key={auth.user.id} workspace={workspace}/>;
}
