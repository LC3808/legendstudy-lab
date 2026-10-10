'use client';
import { useEffect, useRef, useState } from 'react';
import { array, object, text } from '@/lib/my/evaluation-report';
import { HQ_MATH_DIMENSIONS } from '@/lib/math-quality/types';
import type { StoredMathDetail, StoredMathQualityReader } from '@/lib/math-quality/runtime/quality-client';
const labels:Record<string,string>={diagnosis:'평가 정확성',core_priority:'핵심 보완점 우선순위',actionability:'개선 조언의 구체성·유용성',evidence_adherence:'Rubric·답안 근거 일치',valid_path_preservation:'타당한 풀이 보존',hallucination_absence:'근거 없는 판단 여부',extraction_fidelity:'이미지 추출 충실성',step_reasoning:'풀이 단계 평가',hint_quality:'힌트 적절성',progression:'재첨삭 일관성·수정 방향',generated_solution:'생성 풀이 품질'};
export function MathReviewHistory({reader,detail}:{reader:StoredMathQualityReader;detail:StoredMathDetail}){
 const [history,setHistory]=useState<Record<string,unknown>[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [cursor,setCursor]=useState<{created_at:string;judgment_id:string}|null>(null);
 const [ratings,setRatings]=useState<Record<string,string>>({}),[note,setNote]=useState(''),[confirmed,setConfirmed]=useState(false),[disposition,setDisposition]=useState('NEEDS_REVIEW');
 const [pending,setPending]=useState<Record<string,unknown>|null>(null);
 const generation=useRef(0);
 useEffect(()=>{const generations=generation;const g=++generations.current;reader.history(detail.evaluation_id).then(v=>{if(g!==generation.current)return;setHistory(array(v.judgments).map(object));setCursor(v.next_cursor as typeof cursor);setLoaded(true)}).catch(()=>{if(g===generation.current)setError('검수 이력을 불러오지 못했습니다.')});return()=>{generations.current++}},[reader,detail.evaluation_id]);
 const out=object(detail.output),profile=object(detail.profile);
 const conditional:Record<string,boolean>={extraction_fidelity:detail.input_kind!=='TYPED',step_reasoning:profile.reasoning_required===true,hint_quality:array(out.hints).length>0,progression:!!text(detail.prior_evaluation_id),generated_solution:out.generated_solution!=null};
 const absent=(k:string)=>k in conditional&&!conditional[k];
 const complete=HQ_MATH_DIMENSIONS.every(k=>absent(k)||ratings[k]);
 const eligible=detail.state==='COMPLETED'&&!!text(detail.output_sha256)&&array(detail.sources).length>0;
 async function save(){
  if(busy||!loaded||!eligible||!complete||!confirmed)return;
  const g=generation.current;setBusy(true);setError('');
  const payload=pending??{dto_version:'hq-math-write-v1',math_evaluation_id:detail.evaluation_id,expected_output_sha256:detail.output_sha256,client_submission_id:crypto.randomUUID(),rubric_version:'hq-math-rubric-v1',overall_disposition:disposition,rubric_result:Object.fromEntries(HQ_MATH_DIMENSIONS.map(k=>[k,absent(k)?'NA':ratings[k]])),findings:[],reference_context_reviewed:true,selection_reason:'OPERATOR_SELECTED',recommended_action:disposition==='NEEDS_REVIEW'?'REVIEW_EVALUATION':'NONE',summary_note:note};
  setPending(payload);
  try{await reader.submit(payload);if(g!==generation.current)return;setPending(null);setConfirmed(false);const v=await reader.history(detail.evaluation_id);if(g!==generation.current)return;setHistory(array(v.judgments).map(object));setCursor(v.next_cursor as typeof cursor);setConfirmed(false);setRatings({});setNote('');}
  catch{if(g===generation.current)setError('검수 저장을 확인하지 못했습니다. 같은 내용으로 다시 시도해 주세요.');}
  finally{if(g===generation.current)setBusy(false);}
 }
 return <section className="ql-section"><h3>관리자 품질 검수</h3>{error&&<p role="alert">{error}</p>}<p>학생 만족도: 확인되지 않음. 아래 판단은 관리자 검수 의견입니다.</p>
 <h4>기존 검수 이력</h4>{loaded&&!history.length&&<p>저장된 검수 이력이 없습니다.</p>}{history.map(j=><article key={text(j.id)}><p>{text(j.created_at)} · {text(j.overall_disposition)} · {j.is_active?'현재 기록':'이전 기록'}</p><p>{text(j.summary_note)}</p>{Object.entries(object(j.rubric_result)).map(([k,v])=><p key={k}>{labels[k]??k}: {text(v)}</p>)}</article>)}
 {cursor&&<button className="button button--outline" onClick={async()=>{const g=generation.current;try{const v=await reader.history(detail.evaluation_id,cursor);if(g!==generation.current)return;setHistory(h=>[...h,...array(v.judgments).map(object)]);setCursor(v.next_cursor as typeof cursor)}catch{if(g===generation.current)setError('추가 이력을 불러오지 못했습니다.')}}}>이력 더 보기</button>}
 {!eligible?<p>평가 원본 해시·근거 연결이 부족해 검수 저장을 제공하지 않습니다.</p>:<fieldset disabled={busy||!!pending}><legend>AI 평가 품질 기록</legend>{HQ_MATH_DIMENSIONS.map(k=><label key={k} style={{display:'block'}}>{labels[k]} {absent(k)?<span>해당 없음</span>:<select aria-label={labels[k]} value={ratings[k]??''} onChange={e=>setRatings(v=>({...v,[k]:e.target.value}))}><option value="">선택</option><option value="OK">적절</option><option value="CONCERN">우려</option><option value="FAIL">부적절</option></select>}</label>)}<label>종합 판단<select value={disposition} onChange={e=>setDisposition(e.target.value)}><option value="NEEDS_REVIEW">추가 검토 필요</option><option value="PASS">적절</option><option value="PASS_WITH_NOTES">의견 포함 적절</option><option value="FAIL">부적절</option></select></label><label>조언의 유용성·검수 의견<textarea maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>답안·평가 기준·원본 근거를 확인했습니다.</label></fieldset>}
 {eligible&&<button className="button button--outline" disabled={busy||!loaded||!complete||!confirmed} onClick={()=>void save()}>{pending?'같은 검수 다시 저장':'검수 기록 저장'}</button>}
 </section>;
}
