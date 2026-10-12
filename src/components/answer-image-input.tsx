'use client';
/* eslint-disable @next/next/no-img-element -- private blob previews cannot use image optimization */
import {useEffect,useRef,useState} from 'react';
/** Local preview only. Existing Math upload/extract services own remote submission. */
export function AnswerImageInput({file,onChange,disabled=false}:{file:File|null;onChange:(file:File|null)=>void;disabled?:boolean}){
 const [error,setError]=useState('');const preview=useRef<HTMLImageElement>(null);
 useEffect(()=>{if(!file||!URL.createObjectURL)return;const url=URL.createObjectURL(file);if(preview.current)preview.current.src=url;return()=>URL.revokeObjectURL(url);},[file]);
 function choose(file:File|undefined){if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size===0||file.size>20971520){setError('20MB 이하 JPG, PNG, WebP 사진을 선택해 주세요.');return;}setError('');onChange(file);}
 return <div className="answer-image-input"><label>답안 사진 촬영<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={disabled} onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/></label><label>답안 이미지 첨부<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/></label>{error&&<p role="alert">{error}</p>}{file&&<><p>{file.name}</p><img ref={preview} alt="선택한 답안 사진" style={{maxWidth:'100%',maxHeight:360,objectFit:'contain'}}/><button type="button" className="button button--outline" disabled={disabled} onClick={()=>onChange(null)}>사진 삭제</button></>}</div>;
}
