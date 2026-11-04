"use client";
import {useState} from 'react';
import {MathInputFlow} from '@/components/math-input/math-input-flow';
import {LearningGuidance} from '@/components/math-learning/learning-guidance';
import {EvaluationReport} from '@/components/my/evaluation-report';
import {fromWireCandidateRegion} from '@/lib/math-input/runtime/mapping';
import {buildCoreView} from '@/lib/math-learning/core';
import {mathReport} from '@/lib/my/evaluation-report';
import {assertRecognizedInputConfirmed} from '@/lib/math-input/recognition-safety';
import fixture from '@/lib/math-input/hanyang2024-replay.json';
import type {MathEvalOutput} from '@/lib/math-eval/types';
export function RecognitionReplay(){
 const [question,setQuestion]=useState<'q1'|'q2'>('q1');
 const [hints,setHints]=useState<Partial<Record<0|1|2,string>>>({});
 return <main style={{maxWidth:900,margin:'auto',padding:24,lineHeight:1.8}}><h1>TASK16-E 손글씨 검수</h1><p>한양대 2024 자연 오전의 저장된 API 결과 재생입니다. 새 AI 호출·DB 저장·이용권 차감은 없습니다. 원본 사진은 로컬에서 선택하며 업로드하지 않습니다.</p><label>대표 답안 <select value={question} onChange={e=>setQuestion(e.target.value as 'q1'|'q2')}><option value="q1">Q1 · 지수·부호 인식 오류</option><option value="q2">Q2 · 정상 인식</option></select></label><ReplayInput key={question} question={question}/><h2>정답 공개 회귀 검수 · Q2 경계 오류 결과</h2><p>정답 범위가 단계 설명에 포함되었던 기존 결과를 재사용합니다.</p><LearningGuidance coreView={buildCoreView(fixture.boundary as unknown as MathEvalOutput)} stepPosition={11} l0Body={fixture.boundary.hints[0]?.body??''} revealedHints={hints} onRevealHint={level=>setHints(v=>({...v,[level]:fixture.boundary.hints.find(h=>h.level===level)?.body??''}))} onRevealSolution={()=>{}} onResolve={()=>document.querySelector('textarea')?.focus()} availableHintLevels={[1,2]}/><EvaluationReport report={mathReport({output:fixture.boundary})} title="저장된 상세 평가"/></main>;
}
function ReplayInput({question}:{question:'q1'|'q2'}){
 const [file,setFile]=useState<File>(),[edits,setEdits]=useState<Record<string,string>>({}),[status,setStatus]=useState('확인 대기');
 const regions=fixture[question].map(r=>({...r,region_id:question+'-'+r.reading_order}));
 return <><p>원본과 다르면 수정하세요. 판독할 수 없으면 UNCERTAIN을 유지하세요. Q1의 높은 신뢰도 영역도 확인이 필요합니다.</p><label>원본 사진·PDF 선택 <input type="file" accept="image/*,application/pdf" onChange={e=>{setFile(e.target.files?.[0]);setEdits({});setStatus('확인 대기');}}/></label><MathInputFlow key={file?.name??'none'} sourceFile={()=>file} readiness={{status:'NEEDS_CONFIRMATION',failureStates:['CONFIRMATION_REQUIRED'],readyInput:null,confirmationRequired:regions.map(fromWireCandidateRegion)}} onInvalidate={id=>{setEdits(v=>{const n={...v};delete n[id];return n;});setStatus('확인 대기');}} onConfirm={intent=>setEdits(v=>({...v,[intent.regionId]:intent.confirmedRawText}))}/><button disabled={!file||regions.some(r=>edits[r.region_id]===undefined)} onClick={()=>{try{assertRecognizedInputConfirmed({attempt:{input_kind:'EVIDENCE'},extraction:regions.map(r=>({...r,raw_text:edits[r.region_id],normalized_math:edits[r.region_id],uncertain:false}))},'replay-student-confirmed');setStatus('학생 확인 후 평가 진입 검사 통과 · 실제 평가 호출 없음');}catch{setStatus('UNCERTAIN이 남아 평가 진입 차단');}}}>전사본 확정 검사</button><p role="status">{status}</p></>;
}
