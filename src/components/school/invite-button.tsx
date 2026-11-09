'use client';
import {useState,useCallback} from 'react';

/**
 * Friend-invite / share action, kept modular so a future invite token or tracking
 * link can be injected without touching callers. It shares the public landing URL
 * plus an encouragement message via the OS share sheet (navigator.share), falling
 * back to clipboard copy. It never shows invite counts or any fabricated stats —
 * when real invite tracking exists, pass `buildUrl`/`onShared` to extend it.
 */
export type InviteContext = {
  schoolName?:string|null;
  /** Future: return a tokenized invite URL. Default = public landing. */
  buildUrl?:()=>string;
  /** Future: report a successful share for tracking. */
  onShared?:(channel:'share'|'clipboard')=>void;
  label?:string;
  className?:string;
};

const LANDING_URL='https://lab.legendstudy.com/';

export function buildInviteMessage(schoolName?:string|null):string{
  const base='📚 우리 학교 공부시간 랭킹에 참여해 봐!\n레전드스터디+에서 함께 공부시간을 기록하고 학교 순위를 올려보자.';
  return schoolName?`${base}\n우리 학교: ${schoolName}`:base;
}

export function SchoolInviteButton({schoolName,buildUrl,onShared,label='친구 초대하기',className}:InviteContext){
  const [copied,setCopied]=useState(false);
  const share=useCallback(async()=>{
    const url=buildUrl?buildUrl():LANDING_URL;
    const text=buildInviteMessage(schoolName);
    const nav=typeof navigator!=='undefined'?navigator:undefined;
    if(nav&&typeof nav.share==='function'){
      try{ await nav.share({title:'레전드스터디+',text,url}); onShared?.('share'); return; }
      catch{ /* 사용자가 공유를 취소했을 수 있음 — 조용히 무시 */ }
    }
    if(nav&&nav.clipboard&&typeof nav.clipboard.writeText==='function'){
      try{ await nav.clipboard.writeText(`${text}\n${url}`); setCopied(true); setTimeout(()=>setCopied(false),2000); onShared?.('clipboard'); }
      catch{ /* 클립보드 접근 실패 — 아무 것도 꾸며내지 않음 */ }
    }
  },[schoolName,buildUrl,onShared]);
  return <button type="button" className={className??'button button--primary'} onClick={()=>void share()} aria-live="polite">
    {copied?'초대 문구가 복사됐어요':label}
  </button>;
}
