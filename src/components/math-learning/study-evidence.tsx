'use client';
import {useEffect,useState} from 'react';
import {array,object,text} from '@/lib/my/evaluation-report';
import {validSourceBox,hasUnresolvedRecognition} from '@/lib/math-input/recognition-safety';
import {StudyMath} from './study-math';
export type Row=Record<string,unknown>;
export function StudyEvidence({input,task,loadImage}:{input:Row|null;task:Row;loadImage:(id:string,signal:AbortSignal)=>Promise<Blob>}){
 const artifacts=array(input?.artifacts).map(object).sort((a,b)=>Number(a.position)-Number(b.position));
 const regions=array(task.source_regions).map(object);
 const first=text(regions[0]?.artifact_id)||text(artifacts[0]?.artifact_id);
 const [selected,setSelected]=useState(first),[zoom,setZoom]=useState(1),[angle,setAngle]=useState(0);
 const [image,setImage]=useState<{id:string;url:string}|null>(null),[failed,setFailed]=useState(false);
 const current=artifacts.find(a=>a.artifact_id===selected)??artifacts[0];
 const id=text(current?.artifact_id);
 useEffect(()=>{if(!id)return;let live=true;let url:string|undefined;const abort=new AbortController();
  loadImage(id,abort.signal).then(blob=>{if(!live)return;url=URL.createObjectURL(blob);setImage({id,url});setFailed(false);}).catch(()=>{if(live)setFailed(true);});
  return()=>{live=false;abort.abort();if(url)URL.revokeObjectURL(url);};
 },[id,loadImage]);
 const confirmed=array(input?.confirmed_regions).map(object),candidate=array(input?.candidate_regions).map(object);
 const source=confirmed.length?confirmed:candidate;
 const focused=regions.filter(r=>r.artifact_id===id);
 return <section className="math-study-panel math-study-source" aria-label="학생 원본 답안"><h2>학생 원본 답안</h2>
 {!input?<p>원본과 전사본을 확인하고 있어요.</p>:<>
 {!!artifacts.length&&<><div className="math-study-tools"><label>페이지 <select value={id} onChange={e=>{setSelected(e.target.value);setZoom(1);setAngle(0);}}>{artifacts.map((a,i)=><option key={text(a.artifact_id)} value={text(a.artifact_id)}>{i+1} / {artifacts.length}</option>)}</select></label><button onClick={()=>setZoom(z=>Math.max(.5,z-.25))} aria-label="원본 축소">−</button><output>{Math.round(zoom*100)}%</output><button onClick={()=>setZoom(z=>Math.min(3,z+.25))} aria-label="원본 확대">＋</button><button onClick={()=>setAngle(a=>(a+90)%360)}>90° 정렬</button><button onClick={()=>{setZoom(1);setAngle(0);}}>보기 초기화</button></div>
 <p className="math-study-note">정렬과 확대는 보기만 변경하며 원본은 보존합니다.</p>
 <div className="math-study-image-scroll">{failed?<p role="alert">원본을 불러오지 못했어요. 화면을 다시 열어 주세요.</p>:image?.id===id?<div className="math-study-image" style={{width:`${zoom*100}%`,transform:`rotate(${angle}deg)`,margin:angle%180?'35% 0':undefined}}>
 {/* Authenticated private blob, never a public storage URL. */}
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={image.url} alt={`학생 원본 답안 ${artifacts.indexOf(current)+1}페이지`}/>
 {focused.filter(r=>validSourceBox(r as {x:number;y:number;width:number;height:number})).map((r,i)=><span key={i} className="math-study-highlight" aria-label="개선 과제 원본 영역" style={{left:`${Number(r.x)*100}%`,top:`${Number(r.y)*100}%`,width:`${Number(r.width)*100}%`,height:`${Number(r.height)*100}%`}}/>)}</div>:<p>원본 이미지 읽는 중…</p>}</div></>}
 {!artifacts.length&&<p>이 답안은 사진이 없는 텍스트 제출입니다.</p>}
 {text(task.id)&&!focused.some(r=>validSourceBox(r as {x:number;y:number;width:number;height:number}))&&<p className="math-study-note">이 과제의 원본 위치는 미확정입니다. 전체 답안을 대조해 주세요.</p>}
 <h3>{confirmed.length?'확정된 전사본':'제출 답안'}</h3>
 <div className="math-study-transcript">{source.map((r,i)=>{const original=candidate.find(c=>c.artifact_id===r.artifact_id&&c.reading_order===r.reading_order);const value=text(r.normalized_math)||text(r.raw_text);const before=original&&(text(original.normalized_math)||text(original.raw_text));const changed=!!before&&before!==value;return <details key={text(r.id)||i} open={source.length===1}><summary>영역 {Number(r.reading_order)||i+1} {changed?'· 학생 수정본':''} {r.uncertain===true||hasUnresolvedRecognition(value)?'· 인식 확인 필요':''}</summary><StudyMath value={value}/>{changed&&<details><summary>수정 전 인식 원문</summary><StudyMath value={before}/></details>}</details>;})}
 {!source.length&&<StudyMath value={object(input.attempt).typed_answer||'표시 가능한 전사본이 없습니다.'}/>}</div>
 <p className="math-study-note">인식 신뢰도는 원문 일치를 보장하지 않습니다. 확정본과 최초 인식 결과를 구분해 보세요.</p>
 </>}
 </section>;
}
