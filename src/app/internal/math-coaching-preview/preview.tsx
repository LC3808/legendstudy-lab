'use client';
import '@/components/math-release/student-route.css';
import {useState} from 'react';
import {MathText} from '@/components/math-display/math-text';
import {DataFigure} from '@/components/math-display/data-figure';
import {LearningGuidance} from '@/components/math-learning/learning-guidance';
import {MathInputFlow} from '@/components/math-input/math-input-flow';
import type {HintLevel} from '@/lib/math-learning/types';
import type {VisionRegion} from '@/lib/math-input/types';
const region:VisionRegion={regionId:'preview-formula',pageIndex:0,readingOrder:1,regionType:'MATH',role:'EXPONENT',boundingBox:{x0:0,y0:0,x1:1,y1:1},rawText:'x^3',normalizedMath:'x^3',structuralHints:[],confidence:'AMBIGUOUS',uncertaintyReason:'SYMBOL_AMBIGUITY',evidenceRef:null,subproblemCandidate:null};
export function MathCoachingPreview(){
 const [hints,setHints]=useState<Partial<Record<HintLevel,string>>>({}),[solution,setSolution]=useState(''),[answer,setAnswer]=useState(''),[confirmed,setConfirmed]=useState('');
 return <main className="math-student" style={{maxWidth:860,margin:'auto',padding:24,lineHeight:1.8}}>
  <h1>수학 인식·단계별 학습 검수</h1><p>화면 동작용 합성 예제입니다. 실제 사진 인식·평가·History 저장 결과가 아닙니다.</p>
  <h2>인식 결과 확인과 수정</h2><MathInputFlow readiness={{status:'NEEDS_CONFIRMATION',failureStates:['CONFIRMATION_REQUIRED'],confirmationRequired:[region],readyInput:null}} onConfirm={i=>setConfirmed(i.confirmedRawText)} onInvalidate={()=>setConfirmed('')}/><p>확인한 내용: {confirmed||'확인 대기'}</p>
  <h2>수식 표시</h2><MathText text={String.raw`분수·지수·첨자 \(\frac{x_1^2}{2}\), 적분 \(\int_0^1 x^2\,dx\), 행렬 \(\begin{pmatrix}1&2\\3&4\end{pmatrix}\)`}/>
  <h2>오류에서 수정으로</h2><LearningGuidance coreView={{primary:{coreId:'preview',errorId:'preview',stepId:'preview',title:'마지막 합산 단계',diagnosis:'합산을 다시 확인합니다.',why:'두 자산의 합을 구하는 단계입니다.',nextAction:'자릿수를 맞추어 다시 계산하세요.'},secondary:[],propagatedSummary:[]}} l0Body="과정 전체를 다시 풀기 전에 마지막 덧셈을 확인해 보세요." revealedHints={hints} onRevealHint={level=>setHints(v=>({...v,[level]:level===1?'계산 과정과 최종 합산을 구분해 보세요.':'각 자리의 수를 맞추고 합을 다시 계산해 보세요.'}))} onRevealSolution={()=>setSolution('검수 예제의 합: 1,197,900 + 196,000 = 1,393,900원.')} solutionAvailable solutionBody={solution} solutionProvenance="VERIFIED_INTERNAL_SOLUTION" onResolve={()=>document.getElementById('rewrite-preview')?.focus()}/>
  <label htmlFor="rewrite-preview">직접 수정한 풀이 (이 화면에서만 유지)</label><textarea id="rewrite-preview" value={answer} onChange={e=>setAnswer(e.target.value)} style={{width:'100%'}}/><MathText text={answer}/>
  <h2>표와 수치 그래프</h2><DataFigure title="구슬 시세 검수 예제" source="한양2026 Q2 샘플의 검산 값 · 실제 원문 연결은 시험 화면에서 확인" unit="원" points={[50000,49000,48000,51000,50000,49000].map((y,i)=>({label:String(2021+i),x:2021+i,y,sourceValue:String(y)}))}/>
  <p>미확인 값은 보간하지 않습니다. AI 생성 이미지를 정답 근거로 사용하지 않습니다.</p>
 </main>;
}
