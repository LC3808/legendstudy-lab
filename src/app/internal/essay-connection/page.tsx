"use client";
import {useState} from 'react';
import {getBrowserAuthClient} from '@/lib/browser-auth-client';
export default function Page(){
 const [result,setResult]=useState('Provider·크레딧을 실행하지 않는 허용 계정 전용 연결 점검입니다.');
 const [busy,setBusy]=useState(false);
 async function check(){setBusy(true);try{
 const session=await getBrowserAuthClient()?.auth.getSession();
 const token=session?.data.session?.access_token;
 if(!token){setResult('LOGIN_REQUIRED');return;}
 const response=await fetch('/api/essay/connection',{method:'POST',headers:{Authorization:`Bearer ${token}`}});
 setResult(JSON.stringify(await response.json(),null,2));
 }catch{setResult('CONNECTION_FAILED');}finally{setBusy(false);}}
 return <main style={{padding:32}}><h1>논술 운영 연결 점검</h1><button disabled={busy} onClick={check}>{busy?'확인 중…':'연결 확인'}</button><pre style={{whiteSpace:'pre-wrap'}}>{result}</pre></main>;
}
