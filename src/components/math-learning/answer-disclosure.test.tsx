// @vitest-environment jsdom
import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect} from 'vitest';
import {AnswerDisclosure} from './answer-disclosure';
import {LearningGuidance} from './learning-guidance';
import {EvaluationReport} from '../my/evaluation-report';
import {mathReport} from '@/lib/my/evaluation-report';
import {buildCoreView} from '@/lib/math-learning/core';
import fixture from '@/lib/math-input/hanyang2024-replay.json';
import type {MathEvalOutput} from '@/lib/math-eval/types';
it('does not mount any hidden fields and resets across evaluations',()=>{
 const {container,rerender}=render(<AnswerDisclosure key="a"><div data-secret="answer">26 ≤ n ≤ 99</div></AnswerDisclosure>);
 expect(container.innerHTML).not.toContain('26');expect(container.querySelector('[data-secret]')).toBeNull();
 fireEvent.click(screen.getByText('정답 포함 상세 평가 공개'));expect(screen.getByText('26 ≤ n ≤ 99')).toBeVisible();
 rerender(<AnswerDisclosure key="b"><div>OTHER ANSWER</div></AnswerDisclosure>);expect(screen.queryByText('OTHER ANSWER')).toBeNull();
});
it('replays actual Q2 boundary leakage: title/why/L0/L1/L2 hidden until explicit disclosure',()=>{
 const core=buildCoreView(fixture.boundary as unknown as MathEvalOutput);
 const {container}=render(<LearningGuidance coreView={core} l0Body="FINAL_ANSWER_L0" revealedHints={{1:'FINAL_ANSWER_L1',2:'FINAL_ANSWER_L2'}} onRevealHint={()=>{}} onRevealSolution={()=>{}} onResolve={()=>{}}/>);
 expect(container.textContent).not.toContain('FINAL_ANSWER');expect(container.textContent).not.toContain('n<100');
 fireEvent.click(screen.getByText('정답 포함 상세 평가 공개'));expect(screen.getByText('FINAL_ANSWER_L1')).toBeVisible();
});
it('denies summary/steps/criteria/strengths/weaknesses/rewrite/sentences and voice together',()=>{
 const report=mathReport({output:{overall:{explanation:'SECRET_SUMMARY'},steps:[{position:1,representation:'SECRET_FORMULA',explanation:'SECRET_STEP'}]}});
 report.actions=['SECRET_REWRITE'];report.nextSteps=['SECRET_NEXT'];report.strengths=[{title:'SECRET_TITLE',explanation:'SECRET_STRENGTH',evidence:'',action:''}];report.weaknesses=[{title:'SECRET_WEAK',explanation:'SECRET_ERROR',evidence:'',action:'SECRET_ACTION'}];
 const {container}=render(<EvaluationReport report={report} title="수학" voiceType="business_economics"/>);
 expect(container.innerHTML).not.toContain('SECRET');
 fireEvent.click(screen.getByText('정답 포함 상세 평가 공개'));expect(container.textContent).toContain('SECRET_SUMMARY');expect(container.textContent).toContain('SECRET_REWRITE');
});
