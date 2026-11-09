'use client';
import {useEffect,useState} from 'react';
import {resolveSchoolName} from '@/lib/admin/school-resolution';

/**
 * Resolves a NEIS office/school code pair to a display name via the public
 * school-name proxy (no account data). Shows a neutral placeholder while loading
 * and a code-based fallback if the name cannot be resolved — never a fake name.
 */
export function SchoolName({office,school,className}:{office:string;school:string;className?:string}){
  const key=JSON.stringify([office,school]);
  const [result,setResult]=useState<{key:string;name:string|null}|null>(null);
  useEffect(()=>{
    let active=true;
    void resolveSchoolName(office,school).then(name=>{if(active)setResult({key,name});});
    return()=>{active=false;};
  },[office,school,key]);
  if(result?.key!==key)return <span className={className} aria-busy="true">학교명 조회 중…</span>;
  if(result.name===null)return <span className={className}>학교 ({office}-{school})</span>;
  return <span className={className}>{result.name}</span>;
}
