'use client';
import {useEffect,useState,useRef} from 'react';
/** Only local Korean voices; never opts into remote speech services. */
export function VoiceFeedback({text}:{text:string}){
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]),[status,setStatus]=useState('idle'),[speed,setSpeed]=useState(1);
 const utterance=useRef<SpeechSynthesisUtterance|null>(null);
 useEffect(()=>{
  if(!('speechSynthesis' in window))return;
  const synth=window.speechSynthesis;
  const refresh=()=>setVoices(synth.getVoices().filter(v=>v.localService&&v.lang.toLowerCase().startsWith('ko')));
  refresh();synth.addEventListener('voiceschanged',refresh);
  return()=>{synth.removeEventListener('voiceschanged',refresh);if(utterance.current){utterance.current.onend=null;utterance.current.onerror=null;synth.cancel();utterance.current=null;}};
 },[text]);
 function play(){
  const synth=window.speechSynthesis;
  if(utterance.current){utterance.current.onend=null;utterance.current.onerror=null;}synth.cancel();
  const u=new SpeechSynthesisUtterance(text);u.voice=voices[0];u.lang='ko-KR';u.rate=speed;
  u.onend=()=>{if(utterance.current===u)setStatus('done');};u.onerror=()=>{if(utterance.current===u)setStatus('error');};
  utterance.current=u;setStatus('playing');synth.speak(u);
 }
 if(!text.trim())return null;
 return <div className="report-controls voice-feedback"><h3>음성 피드백</h3>{!voices.length?<p className="my-note">이 기기에 한국어 오프라인 음성이 없어 음성 재생을 사용할 수 없습니다.</p>:<><div className="my-actions"><button className="button button--outline" onClick={play}>{status==='idle'?'음성으로 듣기':'다시 듣기'}</button><button className="button button--outline" disabled={!['playing','paused'].includes(status)} onClick={()=>{if(status==='paused'){window.speechSynthesis.resume();setStatus('playing');}else{window.speechSynthesis.pause();setStatus('paused');}}}>{status==='paused'?'계속 듣기':'일시정지'}</button><label>재생 속도<select value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[.8,1,1.2].map(v=><option key={v} value={v}>{v}배</option>)}</select></label></div><p role="status">{({idle:'버튼을 누르면 저장된 평가를 읽어드립니다.',playing:'재생 중',paused:'일시정지',done:'재생 완료',error:'음성을 재생하지 못했습니다. 다시 시도해 주세요.'} as Record<string,string>)[status]}</p><p className="my-note">기기 내 음성만 사용하며 첨삭권은 차감하지 않습니다. 속도 변경은 다음 재생부터 적용됩니다.</p></>}</div>;
}
