"use client";
import {useEffect,useRef} from 'react';
import {validSourceBox} from '@/lib/math-input/recognition-safety';
import type {VisionRegion} from '@/lib/math-input/types';
export function SourceRegion({file,region}:{file?:File;region:VisionRegion}){
 const image=useRef<HTMLImageElement>(null),link=useRef<HTMLAnchorElement>(null);
 useEffect(()=>{if(!file||!URL.createObjectURL)return;const next=URL.createObjectURL(file);if(image.current)image.current.src=next;if(link.current)link.current.href=next+'#page='+(region.pageIndex+1);return ()=>URL.revokeObjectURL(next);},[file,region.pageIndex]);
 if(!file)return <p>원본 이미지를 다시 선택해 해당 영역을 대조해 주세요.</p>;
 const b=region.boundingBox, valid=validSourceBox({x:b.x0,y:b.y0,width:b.x1-b.x0,height:b.y1-b.y0});
 if(!file.type.startsWith('image/'))return <a ref={link} target="_blank" rel="noreferrer">원본 PDF 해당 페이지 확인</a>;
 return <figure><div style={{position:'relative',maxWidth:720}}>
 {/* Private local preview; never uploaded by this component. */}
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img ref={image} alt={`학생 원본 답안 · 페이지 ${region.pageIndex+1}`} style={{width:'100%',display:'block'}}/>
 {valid&&<span aria-label="인식 원본 영역" style={{position:'absolute',pointerEvents:'none',border:'3px solid #c2410c',left:`${b.x0*100}%`,top:`${b.y0*100}%`,width:`${(b.x1-b.x0)*100}%`,height:`${(b.y1-b.y0)*100}%`}}/>}
 </div><figcaption>{valid?'강조 영역과 전사본을 비교해 주세요.':'영역 좌표가 유효하지 않습니다. 전체 원본을 대조하세요. 좌표를 추측하지 않습니다.'}</figcaption></figure>;
}
