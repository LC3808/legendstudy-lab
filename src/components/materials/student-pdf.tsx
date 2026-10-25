'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useAuth} from '@/components/auth-context';
import {hashPdf} from '@/lib/materials/pdf';
import {type StudentPdf} from '@/lib/materials/student-asset';
import {MaterialPdfViewer} from './pdf-viewer';
import './materials.css';
export function StudentQuestionPdf({asset,owner,label='문제 보기 ↗'}:{asset:StudentPdf;owner:string;label?:string}){
 const auth=useAuth();
 const [target,setTarget]=useState<HTMLElement|null>(null),[mobile,setMobile]=useState(false);
 const popup=useRef<Window|null>(null),trigger=useRef<HTMLButtonElement>(null);
 const close=useCallback(()=>{popup.current?.close();popup.current=null;setTarget(null);setMobile(false);trigger.current?.focus();},[]);
 useEffect(()=>{const timer=window.setInterval(()=>{if(popup.current?.closed){popup.current=null;setTarget(null);trigger.current?.focus();}},300);return()=>{window.clearInterval(timer);popup.current?.close();};},[]);
 useEffect(()=>{if(!mobile)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[mobile]);
 function open(){
  if(window.matchMedia('(max-width: 767px)').matches){setMobile(true);return;}
  if(popup.current&&!popup.current.closed){popup.current.focus();return;}
  const w=window.open('','essay-question-viewer','popup,width=900,height=900')??window.open('','_blank');
  if(!w){setMobile(true);return;}
  popup.current=w;w.document.title='논술 문제 보기';
  w.document.body.replaceChildren();
  document.querySelectorAll('link[rel="stylesheet"],style').forEach(el=>w.document.head.appendChild(el.cloneNode(true)));
  const root=w.document.createElement('main');w.document.body.appendChild(root);setTarget(root);w.focus();
 }

 const load=useCallback(async()=>{if(!auth.client||auth.user?.id!==owner)throw Error('LOGIN_REQUIRED');const {data,error}=await auth.client.storage.from(asset.bucket??'essay-student-questions').download(asset.assetId+'.pdf');if(error||!data)throw Error('PDF_UNAVAILABLE');const bytes=new Uint8Array(await data.arrayBuffer());if(await hashPdf(bytes)!==asset.sha256)throw Error('ASSET_CHANGED');return bytes;},[auth.client,auth.user?.id,asset,owner]);
 const viewer=<section className="student-pdf-window" role="dialog" aria-modal="true" aria-label="문제 보기" onKeyDown={e=>{if(e.key==='Escape')close();}}><header><strong>문제 보기</strong><button autoFocus onClick={close}>닫기</button></header><MaterialPdfViewer load={load} positionKey={`essay-pdf:${owner}:${asset.questionId}:${asset.assetId}:${asset.sha256}`} jumpPage={asset.startPage}/></section>;
 return <><button ref={trigger} className="button button--outline" onClick={open}>{label}</button>{target&&createPortal(viewer,target)}{mobile&&createPortal(<div className="student-pdf-overlay">{viewer}</div>,document.body)}</>;
}
