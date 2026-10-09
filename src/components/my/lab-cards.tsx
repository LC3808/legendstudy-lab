'use client';
import Link from 'next/link';
import {useRef} from 'react';
export function LabCards(){
 const dialog=useRef<HTMLDialogElement>(null);
 const trigger=useRef<HTMLButtonElement|null>(null);
 const open=(button:HTMLButtonElement)=>{trigger.current=button;dialog.current?.showModal();};
 return <><nav className="my-nav-grid my-lab-grid" aria-label="나의 LAB">
  <Link className="my-nav-card" href="/account/essay/"><strong>논술 LAB</strong><span>내 논술 첨삭과 재작성 기록을 확인하세요.</span></Link>
  {['내신 LAB','모의/수능 LAB'].map(label=><button className="my-nav-card" key={label} type="button" onClick={e=>open(e.currentTarget)}><strong>{label}</strong><span>서비스 준비 중입니다.</span></button>)}
 </nav><dialog ref={dialog} className="my-lab-dialog" aria-labelledby="lab-coming-title" onClose={()=>trigger.current?.focus()}><h2 id="lab-coming-title">서비스 준비 중입니다.</h2><form method="dialog"><button autoFocus className="button button--primary">확인</button></form></dialog></>;
}
