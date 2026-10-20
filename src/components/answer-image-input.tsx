'use client';
/* eslint-disable @next/next/no-img-element -- private blob previews cannot use image optimization */
import {useEffect,useRef,useState} from 'react';
/** Local preview only. Existing Math upload/extract services own remote submission. */
export function AnswerImageInput({file,onChange,disabled=false}:{file:File|null;onChange:(file:File|null)=>void;disabled?:boolean}){
 const [error,setError]=useState('');const preview=useRef<HTMLImageElement>(null);
 useEffect(()=>{if(!file||!URL.createObjectURL)return;const url=URL.createObjectURL(file);if(preview.current)preview.current.src=url;return()=>URL.revokeObjectURL(url);},[file]);
 function choose(file:File|undefined){if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size===0||file.size>20971520){setError('20MB 이하 JPG, PNG, WebP 사진을 선택해 주세요.');return;}setError('');onChange(file);}
 return <div className="answer-image-input">
  {file&&<div className="answer-image-input__selected"><img ref={preview} alt="선택한 답안 사진" className="answer-image-input__preview"/><p className="answer-image-input__name">{file.name}</p><button type="button" className="button button--outline button--small" disabled={disabled} onClick={()=>onChange(null)}>사진 삭제</button></div>}
  <div className="answer-image-input__sources">
   <label className="answer-image-input__source">답안 사진 촬영<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={disabled} onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/></label>
   <label className="answer-image-input__source">답안 이미지 첨부<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/></label>
  </div>
  {error&&<p role="alert" className="answer-image-input__error">{error}</p>}
 </div>;
}

/** Ordered pages reuse the existing camera, validation and private preview input. */
export function AnswerImagesInput({files,onChange,disabled=false}:{files:File[];onChange:(files:File[])=>void;disabled?:boolean}){
 function move(index:number,delta:number){if(disabled)return;const target=index+delta;if(target<0||target>=files.length)return;const next=[...files];[next[index],next[target]]=[next[target],next[index]];onChange(next);}
 return <div className="answer-images">
  <div className="answer-images__grid">
   {files.map((file,index)=><fieldset key={index} className="answer-image-card">
    <legend>답안 사진 {index+1}</legend>
    <AnswerImageInput file={file} disabled={disabled} onChange={next=>onChange(next?files.map((f,i)=>i===index?next:f):files.filter((_,i)=>i!==index))}/>
    <div className="answer-image-card__move">
     <button type="button" className="button button--outline button--small" disabled={disabled||index===0} onClick={()=>move(index,-1)}>사진 {index+1} 앞으로</button>
     <button type="button" className="button button--outline button--small" disabled={disabled||index===files.length-1} onClick={()=>move(index,1)}>사진 {index+1} 뒤로</button>
    </div>
   </fieldset>)}
   {files.length<6&&<div className="answer-image-card answer-image-card--add"><AnswerImageInput file={null} disabled={disabled} onChange={next=>{if(next)onChange([...files,next]);}}/></div>}
  </div>
  <p className="answer-images__status">사진 {files.length}/6장 · 첨부한 순서로 저장됩니다.</p>
 </div>;
}
