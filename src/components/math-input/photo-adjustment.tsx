'use client';
import {useEffect,useState} from 'react';
const originals=new WeakMap<File,File>();
export type PhotoFrame={turns:number;left:number;top:number;width:number;height:number};
export function validFrame(f:PhotoFrame){return Number.isInteger(f.turns)&&[f.left,f.top,f.width,f.height].every(Number.isFinite)&&f.left>=0&&f.top>=0&&f.width>0&&f.height>0&&f.left+f.width<=100&&f.top+f.height<=100;}
/** Explicit geometric transform only. Original bytes remain untouched; no generative reconstruction. */
export async function adjustPhoto(original:File,frame:PhotoFrame):Promise<File>{
 if(!validFrame(frame))throw Error('INVALID_FRAME');
 const bitmap=await createImageBitmap(original);
 try{
  if(bitmap.width*bitmap.height>40000000)throw Error('IMAGE_TOO_LARGE');
  const turns=((frame.turns%4)+4)%4;
  const rotated=document.createElement('canvas');rotated.width=turns%2?bitmap.height:bitmap.width;rotated.height=turns%2?bitmap.width:bitmap.height;
  const ctx=rotated.getContext('2d');if(!ctx)throw Error('CANVAS_UNAVAILABLE');
  ctx.translate(rotated.width/2,rotated.height/2);ctx.rotate(turns*Math.PI/2);ctx.drawImage(bitmap,-bitmap.width/2,-bitmap.height/2);
  const out=document.createElement('canvas');out.width=Math.max(1,Math.round(rotated.width*frame.width/100));out.height=Math.max(1,Math.round(rotated.height*frame.height/100));
  const target=out.getContext('2d');if(!target)throw Error('CANVAS_UNAVAILABLE');
  target.drawImage(rotated,rotated.width*frame.left/100,rotated.height*frame.top/100,rotated.width*frame.width/100,rotated.height*frame.height/100,0,0,out.width,out.height);
  const blob=await new Promise<Blob>((resolve,reject)=>out.toBlob(v=>v?resolve(v):reject(Error('ENCODING_FAILED')),'image/png'));
  if(blob.size>20971520)throw Error('IMAGE_TOO_LARGE');
  const file=new File([blob],original.name.replace(/\.[^.]+$/,'')+'-adjusted.png',{type:'image/png'});originals.set(file,original);return file;
 }finally{bitmap.close();}
}
export function PhotoAdjustment({file,onChange,disabled}:{file:File;onChange:(file:File)=>void;disabled:boolean}){
 const original=originals.get(file)??file;
 const [open,setOpen]=useState(false),[frame,setFrame]=useState<PhotoFrame>({turns:0,left:0,top:0,width:100,height:100});
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!open)return;let live=true,u:string|undefined;void adjustPhoto(original,{turns:frame.turns,left:0,top:0,width:100,height:100}).then(f=>{if(live){u=URL.createObjectURL(f);setUrl(u);}}).catch(()=>{if(live)setError('보정 미리보기를 불러오지 못했습니다.');});return()=>{live=false;if(u)URL.revokeObjectURL(u);};},[open,original,frame.turns]);
 return <><button type="button" disabled={disabled} onClick={()=>setOpen(true)}>사진 보정·정렬</button>{file!==original&&<button type="button" disabled={disabled} onClick={()=>onChange(original)}>보정 전 원본 복원</button>}
 {open&&<section role="dialog" aria-modal="true" aria-label="답안 사진 보정" style={{background:'#F5F2FF',border:'1px solid #6340C8',padding:16}}>
 <p>90° 회전 후 잘라낼 범위를 지정하세요. 원본 파일은 변경하지 않습니다. 보정 전 원본 복원은 현재 화면에서 사용할 수 있습니다.</p>
 <div style={{overflow:'auto',maxHeight:400}}>{url&&<div style={{position:'relative'}}>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={url} alt="회전된 원본과 선택 범위" style={{width:'100%',display:'block'}}/>
 {validFrame(frame)&&<span aria-label="잘라낼 영역" style={{position:'absolute',left:`${frame.left}%`,top:`${frame.top}%`,width:`${frame.width}%`,height:`${frame.height}%`,border:'3px solid #6340C8',boxSizing:'border-box',pointerEvents:'none'}}/>}</div>}</div>
 <button type="button" disabled={busy} onClick={()=>setFrame({turns:(frame.turns+1)%4,left:0,top:0,width:100,height:100})}>오른쪽으로 90° 회전</button>
 <p>회전된 사진 기준 영역(%) · 0, 0, 100, 100은 전체 사진입니다.</p>
 {(['left','top','width','height'] as const).map((k,i)=><label key={k} style={{display:'inline-block',margin:8}}>{['왼쪽','위쪽','너비','높이'][i]}<input type="number" min={k==='left'||k==='top'?0:1} max={100} value={frame[k]} disabled={busy} onChange={e=>setFrame({...frame,[k]:Number(e.target.value)})} style={{width:70}}/></label>)}
 {!validFrame(frame)&&<p role="alert">잘라낼 영역이 사진 범위를 벗어났습니다.</p>}{error&&<p role="alert">{error}</p>}
 <button type="button" disabled={busy||!validFrame(frame)} onClick={()=>{setBusy(true);setError('');void adjustPhoto(original,frame).then(f=>{onChange(f);setOpen(false);}).catch(()=>setError('사진을 보정하지 못했습니다. 원본을 보존했습니다.')).finally(()=>setBusy(false));}}>보정 적용</button>
 <button type="button" disabled={busy} onClick={()=>setOpen(false)}>취소</button></section>}</>;
}
