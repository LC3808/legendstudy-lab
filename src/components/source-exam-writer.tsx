'use client';
import {essayExamLabel} from './essay-exam-label';
import {EssayResponseEditor} from './essay-response-editor';
import {isUniversityServicePreparing} from '@/lib/essay-runtime/catalog-policy';
import {useEffect,useState,useRef} from 'react';
import {QuestionMaterialAccess} from './question-material-access';
import {StudentQuestionPdf} from './materials/student-pdf';
import {studentPdf,studentPdfForExam} from '@/lib/materials/student-asset';
import {useAuth} from './auth-context';
import {EssayRuntimeClient} from '@/lib/essay-runtime/client';
import {essaySupabaseTransport} from '@/lib/essay-runtime/supabase-transport';
import {SourceDraftSync} from '@/lib/essay-runtime/draft-sync';
import {AnswerImagesInput} from './answer-image-input';
import {sourceImageDraft} from '@/lib/source-image-draft';
import {temporaryDraftStore} from '@/lib/temporary-draft-store';
import type {SourceExam,SourceQuestion} from '@/lib/essay-runtime/source-registry';
/** Source-keyed draft until canonical question registration; never passed to a billing RPC. */
export function SourceExamWriter({exam,question,owner,onDirty,onDraft,rewrite,supportsImages=question.inputMode==='image',onSaved}:{supportsImages?:boolean;onSaved?:()=>void;rewrite?:{id:string;previousAnswer:string;additional?:boolean};exam:SourceExam;question:SourceQuestion;owner:string;onDirty:(key:string,value:boolean)=>void;onDraft?:(key:string,body:string,images:boolean,saved:boolean)=>void}){
 const auth=useAuth();
 const asset=studentPdf(question.studentPdf,question.dbQuestionId??'')
  ?? (exam.dbExamId&&question.dbQuestionId?studentPdfForExam(exam.dbExamId,question.dbQuestionId):null);
 const sync=useRef<SourceDraftSync|null>(null);
 const [syncNotice,setSyncNotice]=useState(''),[serverBody,setServerBody]=useState<string|null>(null),[syncBusy,setSyncBusy]=useState(false);
 const [photo,setPhoto]=useState<File[]>([]),[photoBusy,setPhotoBusy]=useState(false),[imageReady,setImageReady]=useState(false),[photoNotice,setPhotoNotice]=useState(''),[photoDirty,setPhotoDirty]=useState(false);
 const previousAnswer=rewrite?.previousAnswer;const rewriting=!!rewrite;
 const key=`legendstudy:essay-source-draft:v1:${owner}:${question.key}${rewrite?`:${rewrite.additional?"additional":"rewrite"}:${rewrite.id}`:""}`;
 const [body,setBody]=useState(''),[stored,setStored]=useState(''),[ready,setReady]=useState(false),[notice,setNotice]=useState(''),[panel,setPanel]=useState('question');
 useEffect(()=>{if(ready&&imageReady)onDraft?.(question.key,body,photo.length>0,body===stored&&!photoDirty&&!photoBusy);},[ready,imageReady,question.key,body,stored,photo.length,photoDirty,photoBusy,onDraft]);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;try{let value=temporaryDraftStore.read(key);if(rewriting&&!temporaryDraftStore.read(key+':initialized')){const old=temporaryDraftStore.read(`legendstudy:essay-source-draft:v1:${owner}:${question.key}`);if(!value&&old&&old!==previousAnswer){value=old;temporaryDraftStore.write(key,value);}temporaryDraftStore.write(key+':initialized','1');}setBody(value);setStored(value);setNotice('이 브라우저에 자동 저장됩니다.');setReady(true);}catch{setNotice('브라우저 저장을 사용할 수 없습니다. 답안을 복사해 보관해 주세요.');setReady(true);}});return()=>{active=false;};},[key,owner,question.key,rewriting,previousAnswer]);
 useEffect(()=>{
  if(rewrite||!auth.client||!question.dbQuestionId||question.accountDraftReady===false||owner==='guest'||auth.user?.id!==owner)return;
  let active=true;
  const client=new EssayRuntimeClient(essaySupabaseTransport(auth.client,()=>active?owner:null),question.dbQuestionId,true);
  sync.current=new SourceDraftSync(client);
  return()=>{active=false;client.revoke();sync.current=null;};
 },[auth.client,auth.user?.id,owner,question.dbQuestionId,question.accountDraftReady,rewrite]);
 async function syncDraft(){
  if(!sync.current||syncBusy)return;
  setSyncBusy(true);
  try {
   const local=temporaryDraftStore.read(key);
   if(local!==stored)throw Error('LOCAL_CONFLICT');
   const value=await sync.current.open(body);
   if(value.conflict){setServerBody(sync.current.remoteBody);setSyncNotice('계정에 다른 답안이 있습니다. 이 브라우저의 답안은 보존했습니다.');return;}
   if(value.body!==body){temporaryDraftStore.write(key,value.body);setBody(value.body);setStored(value.body);}
   await sync.current.save(value.body);
   setServerBody(null);setSyncNotice('계정에 저장했습니다. 다른 기기에서 이어 쓸 수 있습니다.');
  }catch{setSyncNotice('계정 저장을 확인하지 못했어요. 브라우저의 답안은 유지됩니다.');}
  finally{setSyncBusy(false);}
 }
 useEffect(()=>{let active=true;sourceImageDraft(key).then(async value=>{if(rewriting&&!temporaryDraftStore.read(key+':images-initialized')){if(!value){value=await sourceImageDraft(`legendstudy:essay-source-draft:v1:${owner}:${question.key}`);if(value)await sourceImageDraft(key,Array.isArray(value)?value:[value]);}temporaryDraftStore.write(key+':images-initialized','1');}if(active){setPhoto(Array.isArray(value)?value:value?[value]:[]);setImageReady(true);if(value)setPhotoNotice('사진을 이 브라우저에서 복원했습니다.');}}).catch(()=>{if(active){setPhotoNotice('사진 저장소를 열지 못했어요.');setImageReady(true);}});return()=>{active=false;};},[key,owner,question.key,rewriting]);
 async function changePhoto(value:File[]){setPhoto(value);setPhotoBusy(true);setPhotoDirty(true);onDirty(key+':image',true);try{await sourceImageDraft(key,value);setPhotoDirty(false);onDirty(key+':image',false);setPhotoNotice('사진을 이 브라우저에 저장했습니다. 다른 기기와 동기화되지 않습니다.');return true;}catch{setPhotoNotice('사진을 저장하지 못했어요. 원본 사진을 보관해 주세요.');return false;}finally{setPhotoBusy(false);}}
 function edit(value:string){setBody(value);onDirty(key,true);try{if(temporaryDraftStore.read(key)!==stored){setNotice('다른 창에서 답안이 변경되었습니다. 작성 내용을 복사한 뒤 새로고침해 주세요.');return;}temporaryDraftStore.write(key,value);setStored(value);onDirty(key,false);setNotice('이 브라우저에 저장했습니다.');}catch{setNotice('저장하지 못했습니다. 답안을 복사해 보관해 주세요.');}}
 useEffect(()=>{const before=(event:BeforeUnloadEvent)=>{if(body!==stored||photoDirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);},[body,stored,photoDirty]);
 if(isUniversityServicePreparing(exam.sourceUniversityId))return <section><h3>{question.label}</h3>{asset?<StudentQuestionPdf asset={asset} owner={owner}/>:<QuestionMaterialAccess sourceId={exam.sourceUniversityId} year={exam.year} kind={exam.kind} track={exam.track} label={question.label}/>}{question.sourceLocator&&<p>{question.sourceLocator}</p>}</section>;
 return <section className="essay-service essay-inline-draft essay-answer-card" aria-label={`${question.label} 답안 작성`}>
  {!asset&&<div className="essay-writing-tabs" role="tablist" aria-label="문제와 답안"><button role="tab" aria-selected={panel==='question'} onClick={()=>setPanel('question')}>문제 보기</button><button role="tab" aria-selected={panel==='answer'} onClick={()=>setPanel('answer')}>답안 작성</button></div>}
  {asset&&exam.sourceUniversityId==='skku'&&<div className="essay-question-access"><StudentQuestionPdf asset={asset} owner={owner} label="문제 확인 ↗"/></div>}
  <div className="essay-writing-grid" data-panel={panel} style={asset?{display:'block'}:undefined}><aside className="essay-reading-pane" style={asset?{display:'block'}:undefined}><div className="essay-question-heading"><h3>{question.label}</h3><span className="essay-input-badge">{supportsImages?'사진·수식 입력':'텍스트 답안'}</span></div><p>{essayExamLabel(exam)}</p>{asset?(exam.sourceUniversityId==='skku'?null:<StudentQuestionPdf asset={asset} owner={owner}/>):<QuestionMaterialAccess sourceId={exam.sourceUniversityId} year={exam.year} kind={exam.kind} track={exam.track} label={question.label}/>}{question.sourceLocator&&<p>{question.sourceLocator}</p>}{question.lengthLabel&&<p>답안 분량: {question.lengthLabel}</p>}</aside>
   <div className="essay-answer-pane" style={asset?{display:'block'}:undefined}>{supportsImages&&<><AnswerImagesInput files={photo} onChange={f=>void changePhoto(f)} disabled={!ready||!imageReady||photoBusy}/><p role="status">{photoNotice}</p>{photoDirty&&!photoBusy&&<button className="button button--outline" onClick={()=>void changePhoto(photo)}>사진 저장 다시 시도</button>}</>}{!supportsImages&&photo.length>0&&<p>이전 첨부 사진은 보관되어 있습니다. 이 문항은 텍스트 입력을 사용합니다. <button type="button" onClick={()=>void changePhoto([])}>이전 사진 삭제</button></p>}<>{rewrite&&<><details><summary>이전 답안 보기</summary><p className="essay-answer">{rewrite.previousAnswer}</p></details><button className="button button--outline" onClick={()=>{if(!body||window.confirm("작성 중인 글을 이전 답안으로 교체할까요? 첨부 사진은 유지됩니다."))edit(rewrite.previousAnswer);}}>이전 답안 불러오기</button></>}</><EssayResponseEditor questionId={question.dbQuestionId} id={`answer-${question.key}`} label={supportsImages?`${question.label} 수식·텍스트 답안`:`${question.label} 답안`} value={body} disabled={!ready||syncBusy} onChange={edit} rows={supportsImages?8:14}/><p>{Array.from(body).length.toLocaleString('ko-KR')}자 · 공백 포함 참고 수치</p><button className="button button--outline" disabled={!ready||!imageReady||photoBusy||syncBusy} onClick={()=>{edit(body);void (photo.length||photoDirty?changePhoto(photo):Promise.resolve(true)).then(saved=>{if(saved&&(body.trim()||photo.length)&&temporaryDraftStore.read(key)===body)onSaved?.();});if(sync.current)void syncDraft();}}>답안 저장</button><p role="status">{notice}</p>{!rewrite&&question.dbQuestionId&&question.accountDraftReady!==false&&owner!=='guest'&&<button className="button button--outline" disabled={!ready||syncBusy} onClick={()=>void syncDraft()}>계정 답안 확인·저장</button>}<p role="status">{syncNotice}</p>{serverBody!==null&&<details><summary>계정에 저장된 답안</summary><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{serverBody}</p></details>}</div>
  </div>
 </section>;
}
