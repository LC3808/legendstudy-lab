'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import './essay-studio.css';
// Reuse the existing wait messages; animation conveys activity, never a fake percentage.
export const essayRestMessages=['오늘도 수고했어요.','잠깐 어깨를 펴고 쉬어가세요.','물 한 모금 마시고 오셔도 좋아요.'];
export function EssayProgressDialog({state,questions=[],children,onClose,onResult,error=false}:{state:string;questions?:{id:string;label:string;state:string}[];children?:ReactNode;onClose:()=>void;onResult?:()=>void;error?:boolean}){
 const dialog=useRef<HTMLDialogElement>(null),[message,setMessage]=useState(0);
 const completed=questions.filter(q=>q.state.toLowerCase()==='completed').length;
 const done=state==='completed'&&(!questions.length||completed===questions.length);
 const failed=['failed','cancelled'].includes(state)||questions.some(q=>q.state.toLowerCase()==='failed');
 const active=!done&&!failed&&!error;
 useEffect(()=>{const el=dialog.current;if(!el)return;const previous=document.activeElement as HTMLElement|null;if(el.showModal)el.showModal();else el.setAttribute('open','');return()=>{el.close?.();previous?.focus?.();};},[]);
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>setMessage(i=>(i+1)%essayRestMessages.length),10000);return()=>clearInterval(timer);},[active]);
 const title=error?'처리 상태를 확인하고 있어요':done?'첨삭이 완료됐어요!':failed?'재처리가 필요해요':'논술 첨삭 진행 중';
 return <dialog ref={dialog} className="essay-progress-dialog" aria-labelledby="essay-progress-title" onCancel={e=>{e.preventDefault();onClose();}}>
  <button className="essay-progress-close" type="button" onClick={onClose} aria-label="진행 화면 닫기">×</button>
  <span className="essay-progress-eyebrow">{done?'첨삭 완료':failed?'재처리 필요':'접수 완료'}</span>
  <h2 id="essay-progress-title">{title}</h2>
  <p>{done?'저장된 결과를 확인하고 다음 답안을 준비해 보세요.':failed?'완료된 문항의 결과와 기존 제출 기록은 보존됩니다.':error?'새로 제출하지 않아도 됩니다. 기존 요청의 상태를 다시 확인해 주세요.':'작성한 답안을 꼼꼼하게 살펴보고 있어요.'}</p>
  {active&&<><div className="essay-progress-track" role="progressbar" aria-label="첨삭 진행 중"><span/></div><p className="essay-rest-message" key={message}>{essayRestMessages[message]}</p></>}
  {questions.length>0&&<div className="essay-progress-questions"><p><strong>{completed} / {questions.length}</strong> 문항 완료</p><ul>{questions.map(q=><li key={q.id}><span>{q.label}</span><strong>{({completed:'첨삭 완료',failed:'재처리 필요',processing:'첨삭 진행 중',waiting:'접수 완료',requested:'접수 완료',reconciling:'상태 확인 중'} as Record<string,string>)[q.state.toLowerCase()]??'상태 확인 중'}</strong></li>)}</ul></div>}
  <div className="essay-progress-actions">{done&&onResult&&<button type="button" className="button button--primary" onClick={onResult}>첨삭 결과 확인하기</button>}{children}<button type="button" className="button button--outline" onClick={onClose}>작성 화면으로 돌아가기</button></div>
  <p className="essay-progress-footnote">화면을 이동해도 접수된 요청은 유지됩니다. 나의 첨삭 기록에서도 확인할 수 있어요.</p>
 </dialog>;
}
