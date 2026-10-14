'use client';
import {useEffect,useRef,useState} from 'react';
import type {PDFDocumentProxy} from 'pdfjs-dist';
import {openPdf} from '@/lib/materials/pdf';
/** load must return ONLY the authorized asset, never an original masked by page UI. */
export function MaterialPdfViewer({load,positionKey,jumpPage=1}:{load:()=>Promise<Uint8Array>;positionKey:string;jumpPage?:number}){
 const [doc,setDoc]=useState<PDFDocumentProxy|null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[page,setPage]=useState(1),[zoom,setZoom]=useState(1);
 const previousJump=useRef(jumpPage);
 const [width,setWidth]=useState(600);
 const canvas=useRef<HTMLCanvasElement>(null),viewport=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=viewport.current;if(!el)return;const observer=new ResizeObserver(()=>setWidth(el.clientWidth));observer.observe(el);return()=>observer.disconnect();},[]);
 useEffect(()=>{let active=true;let loaded:PDFDocumentProxy|undefined;
  load().then(bytes=>openPdf(bytes,canvas.current?.ownerDocument)).then(d=>{loaded=d;if(!active){void d.destroy();return;}let p=previousJump.current;try{p=Number(sessionStorage.getItem(positionKey))||p;}catch{}setPage(Math.min(d.numPages,Math.max(1,p)));setDoc(d);setError(false);}).catch(()=>{if(active)setError(true);});
  return()=>{active=false;setDoc(null);void loaded?.destroy();};
 },[load,positionKey,attempt]); // position is deliberately independent of a question jump
 useEffect(()=>{if(doc&&previousJump.current!==jumpPage){previousJump.current=jumpPage;queueMicrotask(()=>setPage(Math.max(1,Math.min(doc.numPages,jumpPage))));}},[jumpPage,doc]);
 useEffect(()=>{if(!doc||!canvas.current)return;let active=true;let cancel:(()=>void)|undefined;
  const render=async()=>{try{const p=await doc.getPage(page);if(!active||!canvas.current)return;const natural=p.getViewport({scale:1});const view=p.getViewport({scale:Math.min(2,(width-16)/natural.width)*zoom});const el=canvas.current;el.width=view.width*2;el.height=view.height*2;el.style.width=`${view.width}px`;el.style.height=`${view.height}px`;const task=p.render({canvas:el,viewport:view,transform:[2,0,0,2,0,0]});cancel=()=>task.cancel();await task.promise;if(active){try{sessionStorage.setItem(positionKey,String(page));}catch{}}}catch(e){if(active&&!(e instanceof Error&&e.name==='RenderingCancelledException'))setError(true);}};void render();return()=>{active=false;cancel?.();};
 },[doc,page,zoom,positionKey,width]);
 return <section className="material-pdf" aria-label="PDF 문제 뷰어"><div className="material-toolbar">
 <button disabled={!doc||page<=1} onClick={()=>setPage(p=>p-1)} aria-label="이전 페이지">←</button><label>페이지 <input type="number" min={1} max={doc?.numPages??1} value={page} onChange={e=>setPage(Math.max(1,Math.min(doc?.numPages??1,Number(e.target.value)||1)))}/></label><span>/ {doc?.numPages??'—'}</span><button disabled={!doc||page>=doc.numPages} onClick={()=>setPage(p=>p+1)} aria-label="다음 페이지">→</button><button onClick={()=>setZoom(z=>Math.max(.5,z-.25))} aria-label="축소">−</button><button onClick={()=>setZoom(z=>Math.min(3,z+.25))} aria-label="확대">＋</button>
 </div>{error?<div role="alert">PDF를 열지 못했어요. <button onClick={()=>{setError(false);setAttempt(x=>x+1);}}>다시 시도</button></div>:!doc?<p role="status">PDF를 불러오고 있어요.</p>:null}<div className="material-pdf-scroll" ref={viewport}><canvas ref={canvas} aria-label={`PDF ${page}페이지`} role="img"/></div></section>;
}
