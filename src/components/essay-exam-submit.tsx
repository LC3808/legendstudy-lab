'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useAuth} from './auth-context';
import {temporaryDraftStore} from '@/lib/temporary-draft-store';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
import {RecordDetail} from './my/essay-dashboard';
import {readExamRuns,readExamDashboard} from '@/lib/my/exam-history';
import type {RecordItem} from '@/lib/my/essay-dashboard';
export type SubmissionDraft={body:string;revision:number;images:boolean};
export function EssayExamSubmit({exam,included,drafts,cycle}:{cycle?:{parentId?:string;previousPaidRunId?:string};exam:SourceExam;included:string[];drafts:Record<string,SubmissionDraft>}){
 const auth=useAuth();const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[record,setRecord]=useState<RecordItem|null>(null);
 const [parentId,setParentId]=useState(cycle?.parentId??''),[rewrites,setRewrites]=useState<Record<string,unknown>[]>([]);
 const pending=useRef<{fingerprint:string;key:string;answers:{questionId:string;body:string;revision:number}[]}|null>(null);
 const owner=auth.user?.id;
 const requestStorage=`legendstudy:essay-exam-request:v1:${owner??'guest'}:${exam.key}:${cycle?.previousPaidRunId?`additional:${cycle.previousPaidRunId}`:parentId||'initial'}`;
 async function credential(){const s=(await auth.client?.auth.getSession())?.data.session;if(!s||s.user.id!==owner)throw Error('LOGIN_REQUIRED');return s.access_token;}
 useEffect(()=>{let active=true;void(async()=>{setReady(false);setRecord(null);if(!auth.client||!owner||!exam.dbExamId)return;
  const s=(await auth.client.auth.getSession()).data.session;if(!s||s.user.id!==owner)return;
  const response=await fetch('/api/essay/exam',{method:'POST',headers:{Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'availability',examId:exam.dbExamId}),cache:'no-store'});
  if(active&&response.ok)setReady((await response.json()).ready===true);
  const history=await readExamRuns(auth.client,owner);if(active)setRewrites(history.filter(r=>r.exam_id===exam.dbExamId&&r.free_rewrite_available===true));
 })().catch(()=>{});return()=>{active=false;};},[auth.client,owner,exam.dbExamId]);
 async function submit(){if(busy||!ready)return;setBusy(true);setNotice('답안을 제출하고 있어요.');
  try{const selected=exam.questions.filter(q=>included.includes(q.key));
   if(!selected.length||selected.some(q=>!q.dbQuestionId||!drafts[q.key]?.body.trim()||drafts[q.key]?.images||q.inputMode==='image'))throw Error('ANSWER_REQUIRED');
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
   const response=await fetch('/api/essay/exam',{method:'POST',headers:{Authorization:`Bearer ${await credential()}`,'Content-Type':'application/json'},body:JSON.stringify({action:'submit',examId:exam.dbExamId,key:pending.current.key,answers:pending.current.answers,parentId:parentId||null,previousPaidRunId:cycle?.previousPaidRunId}),cache:'no-store'});
   const data=await response.json();
   if(!response.ok){if(response.status===402||response.status===422){pending.current=null;temporaryDraftStore.write(requestStorage,'');}throw Error(data.code);}
   setNotice('평가 상태를 확인하고 있어요.');
   if(auth.client){const rows=await readExamDashboard(auth.client,owner!);setRecord(rows.find(r=>r.id===data.runId)??null);}
   setNotice('제출된 답안과 평가 진행 상황은 나의 첨삭 기록에서도 확인할 수 있어요.');
  }catch(error){const code=error instanceof Error?error.message:'';setNotice(code==='INSUFFICIENT_CREDIT'?'첨삭권이 부족합니다.':code==='ANSWER_REQUIRED'?'선택한 문항의 텍스트 답안을 확인해 주세요. 사진 포함 답안은 아직 이 시험에서 제출할 수 없습니다.':code==='PENDING_CHANGED'?'이전 제출의 처리 상태를 첨삭 기록에서 먼저 확인해 주세요.':'처리 상태를 확인하지 못했습니다. 답안은 유지됩니다. 같은 답안으로 다시 확인해 주세요.');}
  finally{setBusy(false);}
 }
 return <div className="essay-submit-gate">{!cycle&&rewrites.length>0&&<label>제출 방식<select disabled={busy} value={parentId} onChange={e=>{setParentId(e.target.value);pending.current=null;setRecord(null);setNotice('');}}><option value="">새 첨삭 · 1 Credit</option>{rewrites.map(r=><option key={String(r.id)} value={String(r.id)}>무료 재첨삭 · {String(r.created_at).slice(0,10)}</option>)}</select></label>}{parentId&&<p>최초 제출과 동일한 문항을 선택하고 답안을 수정해 주세요. 재첨삭 가능 여부는 서버에서 확인합니다.</p>}<button className="button button--primary" disabled={!ready||busy} onClick={()=>void submit()}>{busy?'처리 중…':ready?(parentId?(rewrites.some(r=>r.id===parentId)?'무료 재첨삭 요청':'재첨삭 자격 확인'):cycle?.previousPaidRunId?'추가 첨삭 · 1 Credit':'첨삭 요청 · 1 Credit'):'첨삭 준비 중'}</button><p role="status">{notice||'작성 중인 답안은 그대로 보존됩니다.'}</p>{record&&<RecordDetail row={record}/>}<Link href="/my/essays/">나의 첨삭 기록 →</Link></div>;
}
