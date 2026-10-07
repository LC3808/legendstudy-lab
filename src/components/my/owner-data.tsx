'use client';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/components/auth-context';
import { assertOwner } from '@/lib/my/data';
export function OwnerArea({children,path='/account/'}:{children:ReactNode;path?:string}){
 const auth=useAuth();
 if(auth.status==='loading')return <p role="status">계정을 확인하고 있습니다.</p>;
 if(auth.status!=='authenticated'||!auth.user)return <div className="my-surface"><h2>로그인하고 내 기록을 확인하세요.</h2><Link className="button button--primary" href={`/login/?next=${encodeURIComponent(path)}`}>로그인</Link></div>;
 return <div key={auth.user.id}>{children}</div>;
}
export function useOwnerData<T>(load:(client:SupabaseClient,owner:string)=>Promise<T>){
 const {client,user,status}=useAuth();const owner=status==='authenticated'?user?.id:null;
 const [version,setVersion]=useState(0);
 const [result,setResult]=useState<{owner:string;version:number;data?:T;error?:boolean}|null>(null);
 useEffect(()=>{
  if(!owner||!client)return;
  let active=true;
  void load(client,owner).then(async data=>{await assertOwner(client,owner);if(active)setResult({owner,version,data});}).catch(()=>{if(active)setResult({owner,version,error:true});});
  return()=>{active=false;};
 },[client,owner,version,load]);
 const current=result?.owner===owner&&result?.version===version?result:null;
 return {client,owner,data:current?.data,error:current?.error,loading:!current,reload:()=>setVersion(v=>v+1)};
}
export function DataStatus({error,reload}:{error?:boolean;reload:()=>void}){
 return error?<p role="alert">정보를 불러오지 못했습니다. <button className="text-link" onClick={reload}>다시 시도</button></p>:<p role="status">불러오는 중입니다.</p>;
}
export function dateLabel(value:string){return new Date(value).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'});}
