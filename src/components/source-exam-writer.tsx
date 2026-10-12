'use client';
import {useEffect,useState} from 'react';
import {temporaryDraftStore} from '@/lib/temporary-draft-store';
import type {SourceExam,SourceQuestion} from '@/lib/essay-runtime/source-registry';
/** Source-keyed draft until canonical question registration; never passed to a billing RPC. */
export function SourceExamWriter({exam,question,owner,onDirty}:{exam:SourceExam;question:SourceQuestion;owner:string;onDirty:(key:string,value:boolean)=>void}){
 const key=`legendstudy:essay-source-draft:v1:${owner}:${question.key}`;
 const [body,setBody]=useState(''),[stored,setStored]=useState(''),[ready,setReady]=useState(false),[notice,setNotice]=useState(''),[panel,setPanel]=useState('answer');
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;try{const value=temporaryDraftStore.read(key);setBody(value);setStored(value);setNotice('이 브라우저에 자동 저장됩니다.');setReady(true);}catch{setNotice('브라우저 저장을 사용할 수 없습니다. 답안을 복사해 보관해 주세요.');setReady(true);}});return()=>{active=false;};},[key]);
 function edit(value:string){setBody(value);onDirty(key,true);try{if(temporaryDraftStore.read(key)!==stored){setNotice('다른 창에서 답안이 변경되었습니다. 작성 내용을 복사한 뒤 새로고침해 주세요.');return;}temporaryDraftStore.write(key,value);setStored(value);onDirty(key,false);setNotice('이 브라우저에 저장했습니다.');}catch{setNotice('저장하지 못했습니다. 답안을 복사해 보관해 주세요.');}}
 useEffect(()=>{const before=(event:BeforeUnloadEvent)=>{if(body!==stored){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);},[body,stored]);
 return <section className="essay-service essay-inline-draft" aria-label={`${question.label} 답안 작성`}>
  <div className="essay-writing-tabs" role="tablist" aria-label="문제와 답안"><button role="tab" aria-selected={panel==='question'} onClick={()=>setPanel('question')}>문제 보기</button><button role="tab" aria-selected={panel==='answer'} onClick={()=>setPanel('answer')}>답안 작성</button></div>
  <div className="essay-writing-grid" data-panel={panel}><aside className="essay-reading-pane"><h3>{question.label}</h3><p>{exam.year}학년도 · {exam.kind==='mock'?'모의논술':'수시 논술'} · {exam.track}{exam.session?` · ${exam.session}`:''}</p><p>상단 공식 자료 링크에서 문제와 제시문을 확인하세요.</p>{question.sourceLocator&&<p>{question.sourceLocator}</p>}{question.lengthLabel&&<p>답안 분량: {question.lengthLabel}</p>}</aside>
   <div className="essay-answer-pane"><label htmlFor={`answer-${question.key}`}>{question.label} 답안</label><textarea id={`answer-${question.key}`} value={body} disabled={!ready} onChange={e=>edit(e.target.value)} maxLength={30000} rows={14}/><p>{Array.from(body).length.toLocaleString('ko-KR')}자 · 공백 포함 참고 수치</p><p role="status">{notice}</p></div>
  </div>
 </section>;
}
