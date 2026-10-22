'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useAuth} from './auth-context';
import {temporaryDraftStore} from '@/lib/temporary-draft-store';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
import {RecordDetail} from './my/essay-dashboard';
import {readExamRuns,readExamDashboard} from '@/lib/my/exam-history';
import type {RecordItem} from '@/lib/my/essay-dashboard';
export type SubmissionDraft={body:string;revision:number;images:boolean;saved?:boolean};
export function EssayExamSubmit({exam,included,drafts,cycle}:{cycle?:{parentId?:string;previousPaidRunId?:string};exam:SourceExam;included:string[];drafts:Record<string,SubmissionDraft>}){
 const auth=useAuth();const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[record,setRecord]=useState<RecordItem|null>(null);
 const [parentId,setParentId]=useState(cycle?.parentId??''),[rewrites,setRewrites]=useState<Record<string,unknown>[]>([]);
 const pending=useRef<{fingerprint:string;key:string;answers:{questionId:string;body:string;revision:number}[]}|null>(null);
 const owner=auth.user?.id;
 const [accepted,setAccepted]=useState<{id:string;owner:string;examId:string;started:number}|null>(null);
 const acceptedHere=!!accepted&&accepted.owner===owner&&accepted.examId===exam.dbExamId;
 const [waitMessage,setWaitMessage]=useState('');
 const [watching,setWatching]=useState(false);
 useEffect(()=>{if(!busy&&!watching)return;const messages=['오늘도 수고했어요.','잠깐 어깨를 펴고 쉬어가세요.','물 한 모금 마시고 오셔도 좋아요.'];let index=0;
  const timer=setInterval(()=>setWaitMessage(messages[++index%messages.length]),15000);
  return()=>{clearInterval(timer);};
 },[busy,watching]);
 useEffect(()=>{
  if(!accepted||!acceptedHere||!auth.client)return;
  const client=auth.client;let active=true,timer:ReturnType<typeof setTimeout>|undefined;
  async function poll(){
   try{const rows=await readExamDashboard(client,accepted!.owner);if(!active)return;
    const row=rows.find(r=>r.id===accepted!.id);setRecord(row??null);
    const status=row?.evaluations[0]?.status;
    if(status==='completed'||status==='failed'){setWatching(false);
     setNotice(status==='completed'?'첨삭이 완료됐어요. 저장된 결과를 확인하세요.':'첨삭을 완료하지 못했어요. 기록에서 처리 상태를 확인해 주세요.');return;
    }
    setNotice(row?'첨삭 중입니다. 화면을 닫아도 제출 기록은 유지됩니다.':'제출 기록을 확인하고 있어요. 평가를 다시 요청하지 않습니다.');
   }catch{if(!active)return;setNotice('처리 상태를 확인하지 못했어요. 제출 기록은 보존됩니다.');}
   if(Date.now()-accepted!.started>=100000){setWatching(false);setNotice('평가 완료를 아직 확인하지 못했어요. 다시 제출하지 말고 나의 첨삭 기록에서 상태를 확인해 주세요.');return;}
   timer=setTimeout(()=>void poll(),3000);
  }
  void poll();return()=>{active=false;if(timer)clearTimeout(timer);};
 },[accepted,acceptedHere,auth.client]);
 const requestStorage=`legendstudy:essay-exam-request:v1:${owner??'guest'}:${exam.key}:${cycle?.previousPaidRunId?`additional:${cycle.previousPaidRunId}`:parentId||'initial'}`;
 async function credential(){const s=(await auth.client?.auth.getSession())?.data.session;if(!s||s.user.id!==owner)throw Error('LOGIN_REQUIRED');return s.access_token;}
 useEffect(()=>{let active=true;void(async()=>{setReady(false);setRecord(null);if(!auth.client||!owner||!exam.dbExamId)return;
  const s=(await auth.client.auth.getSession()).data.session;if(!s||s.user.id!==owner)return;
  const response=await fetch('/api/essay/exam',{method:'POST',headers:{Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'availability',examId:exam.dbExamId}),cache:'no-store'});
  if(active&&response.ok)setReady((await response.json()).ready===true);
  const history=await readExamRuns(auth.client,owner);if(active)setRewrites(history.filter(r=>r.exam_id===exam.dbExamId&&r.free_rewrite_available===true));
 })().catch(()=>{});return()=>{active=false;};},[auth.client,owner,exam.dbExamId]);
 async function submit(){if(busy||!ready||acceptedHere)return;setWaitMessage('오늘도 수고했어요.');setBusy(true);setNotice('답안을 제출하고 있어요.');
  try{const selected=exam.questions.filter(q=>included.includes(q.key));
   if(!selected.length||selected.some(q=>drafts[q.key]?.saved===false||!q.dbQuestionId||!drafts[q.key]?.body.trim()||drafts[q.key]?.images||q.inputMode==='image'))throw Error('ANSWER_REQUIRED');
   const answers=selected.map(q=>({questionId:q.dbQuestionId!,body:drafts[q.key].body,revision:drafts[q.key].revision}));
   const fingerprint=JSON.stringify({owner,examId:exam.dbExamId,parentId,previousPaidRunId:cycle?.previousPaidRunId,answers:answers.map(({questionId,body})=>({questionId,body}))});
   // Keep the same key after ambiguous transport; changing answers requires resolution first.
   if(!pending.current){const saved=temporaryDraftStore.read(requestStorage);if(saved)pending.current=JSON.parse(saved);}
   if(pending.current&&pending.current.fingerprint!==fingerprint)throw Error('PENDING_CHANGED');
   if(!pending.current){
   const quoteResponse=await fetch('/api/essay/exam',{method:'POST',headers:{Authorization:`Bearer ${await credential()}`,'Content-Type':'application/json'},body:JSON.stringify({action:'quote',examId:exam.dbExamId,questionIds:answers.map(a=>a.questionId),parentId:parentId||null,previousPaidRunId:cycle?.previousPaidRunId}),cache:'no-store'});
   if(!quoteResponse.ok)throw Error('QUOTE_UNAVAILABLE');
   const quote=await quoteResponse.json();if(quote.version!=='essay-exam-quote-v1'||quote.credits!==(parentId?0:1))throw Error('QUOTE_UNAVAILABLE');
   if(!window.confirm(`제출 문항 ${answers.length}개 · 사용 Credit ${quote.credits}개${parentId?' · 무료 재첨삭':''}\n첨삭을 요청할까요?`))return;
   }
   pending.current??={fingerprint,key:crypto.randomUUID(),answers};
   temporaryDraftStore.write(requestStorage,JSON.stringify(pending.current));
   const started=Date.now();
   const response=await fetch('/api/essay/exam',{method:'POST',headers:{Authorization:`Bearer ${await credential()}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(100000),body:JSON.stringify({action:'submit',examId:exam.dbExamId,key:pending.current.key,answers:pending.current.answers,parentId:parentId||null,previousPaidRunId:cycle?.previousPaidRunId}),cache:'no-store'});
   const data=await response.json();
   if(!response.ok){if(response.status===402||response.status===422){pending.current=null;temporaryDraftStore.write(requestStorage,'');}throw Error(data.code);}
   if(typeof data.runId!=='string'||!data.runId)throw Error('STATUS_UNKNOWN');
   setWatching(true);setAccepted({id:data.runId,owner:owner!,examId:exam.dbExamId!,started});
   setNotice('평가 상태를 확인하고 있어요.');
  }catch(error){const code=error instanceof Error?error.message:'';setNotice(code==='INSUFFICIENT_CREDIT'?'첨삭권이 부족합니다.':code==='ANSWER_REQUIRED'?'선택한 문항의 텍스트 답안을 확인해 주세요. 사진 포함 답안은 아직 이 시험에서 제출할 수 없습니다.':code==='PENDING_CHANGED'?'이전 제출의 처리 상태를 첨삭 기록에서 먼저 확인해 주세요.':'처리 상태를 확인하지 못했습니다. 답안은 유지됩니다. 같은 답안으로 다시 확인해 주세요.');}
  finally{setBusy(false);}
 }
 return <div className="essay-submit-gate">{!cycle&&rewrites.length>0&&<label>제출 방식<select disabled={busy||acceptedHere} value={parentId} onChange={e=>{setParentId(e.target.value);pending.current=null;setRecord(null);setNotice('');}}><option value="">새 첨삭 · 1 Credit</option>{rewrites.map(r=><option key={String(r.id)} value={String(r.id)}>무료 재첨삭 · {String(r.created_at).slice(0,10)}</option>)}</select></label>}{parentId&&<p>최초 제출과 동일한 문항을 선택하고 답안을 수정해 주세요. 재첨삭 가능 여부는 서버에서 확인합니다.</p>}<button className="button button--primary" disabled={!ready||busy||acceptedHere||!included.length||included.some(key=>drafts[key]?.saved===false)} onClick={()=>void submit()}>{busy?'처리 중…':ready?(parentId?(rewrites.some(r=>r.id===parentId)?'무료 재첨삭 요청':'재첨삭 자격 확인'):cycle?.previousPaidRunId?'추가 첨삭 · 1 Credit':'첨삭 요청 · 1 Credit'):'첨삭 준비 중'}</button><p role="status">{notice||'작성 중인 답안은 그대로 보존됩니다.'}</p>{(busy||watching&&acceptedHere)&&<p>{waitMessage}</p>}{record&&<RecordDetail row={record}/>}<Link href="/my/essays/">나의 첨삭 기록 →</Link></div>;
}
