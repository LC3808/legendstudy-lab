'use client';
import {useState,useEffect,useRef} from 'react';
import {useOwnerData} from './owner-data';
import {readEssayGrowth} from './essay-history-growth';
import {type RecordItem,summarizeRecords} from '@/lib/my/essay-dashboard';
import {growthImageData,saveGrowthImage} from '@/lib/my/growth-image';

/** Only the allowlisted projection reaches the local canvas; no result URL or upload. */
export function GrowthShare({rows,selected}:{rows:RecordItem[];selected:RecordItem|null}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!open)return;root.current?.querySelector<HTMLButtonElement>('[role="dialog"] button')?.focus();
 const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);button.current?.focus();}};
 const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
 document.addEventListener('keydown',close);document.addEventListener('pointerdown',outside);
 return()=>{document.removeEventListener('keydown',close);document.removeEventListener('pointerdown',outside);};},[open]);
 return <div className="growth-share-anchor" ref={root}><button ref={button} className="button button--outline" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(!open)}>공유</button>{open&&<ShareActions rows={rows} selected={selected} close={()=>{setOpen(false);button.current?.focus();}}/>}</div>;
}
function ShareActions({rows,selected,close}:{rows:RecordItem[];selected:RecordItem|null;close:()=>void}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const growth=useOwnerData(readEssayGrowth);
 const scope=selected?[selected]:rows;
 async function save(){setBusy(true);setMessage('');try{
  const series=(growth.data??[]).filter(s=>!selected||s.id.startsWith(selected.id+'/'));
  await saveGrowthImage(growthImageData(scope.map(r=>({university:r.university,exam:r.question})),summarizeRecords(scope).evaluated,series));
  setMessage('성장 이미지를 저장했습니다.');
 }catch{setMessage('이미지를 저장하지 못했습니다. 다시 시도해 주세요.');}finally{setBusy(false);}}
 return <div className="my-panel growth-share" role="dialog" aria-label="논술 성장 공유">
 <button className="button button--outline" onClick={async()=>{try{await navigator.clipboard.writeText('https://lab.legendstudy.com');setMessage('주소를 복사했어요.');}catch{setMessage('주소를 복사하지 못했습니다.');}}}>논술 LAB 주소 복사</button>
 <button className="button button--primary" disabled={busy||!growth.data} onClick={()=>void save()}>이미지 저장</button>
 {growth.error&&<button onClick={growth.reload}>성장 기록 다시 불러오기</button>}
 <button className="button button--outline" onClick={close}>닫기</button><p role="status">{message}</p></div>;
}
