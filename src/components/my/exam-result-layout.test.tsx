// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {ExamResultLayout} from './exam-result-layout';
import type {Report} from '@/lib/my/evaluation-report';
import type {RecordItem} from '@/lib/my/essay-dashboard';
vi.mock('../auth-context',()=>({useAuth:()=>({client:null})}));
afterEach(cleanup);
const row:RecordItem={id:'run',source:'exam',question:'2026학년도 수시논술 인문계열 오전',university:'고려대학교',at:'2026-10-26T01:00:00Z',rewrite:false,evaluations:[]};
const report=(id:string):Report=>({id,answer:'저장된 답안',question:'시험',summary:'저장된 평가',rubric:[],strengths:[],weaknesses:[],actions:[],nextSteps:[],pins:[],priorId:null});
it('keeps every submitted result and opens only the first accordion by default',()=>{
 render(<ExamResultLayout row={row} run={{free_rewrite_available:true}} reports={[report('run/a'),report('run/b')]} previous={[]} onRewrite={vi.fn()} onAdditional={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'문항별 첨삭 (2)'}));
 expect(screen.getByRole('button',{name:'접기'}).getAttribute('aria-expanded')).toBe('true');
 const second=screen.getByRole('button',{name:'펼치기'});expect(second.getAttribute('aria-expanded')).toBe('false');fireEvent.click(second);
 expect(screen.getAllByRole('button',{name:'접기'})).toHaveLength(2);
});
it('does not offer free rewrite without explicit server eligibility',()=>{
 const rewrite=vi.fn();render(<ExamResultLayout row={row} run={{free_rewrite_available:false}} reports={[report('run/a')]} previous={[]} onRewrite={rewrite} onAdditional={vi.fn()}/>);
 const button=screen.getByRole('button',{name:'이 결과를 바탕으로 재작성하기 →'}) as HTMLButtonElement;
 expect(button.disabled).toBe(true);fireEvent.click(button);expect(rewrite).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'제출 답안'}));expect(screen.getByText('저장된 답안')).toBeTruthy();
});
it('final rewrite CTA uses server entitlement and never submits an evaluation',()=>{
 const rewrite=vi.fn(),additional=vi.fn();
 const {rerender}=render(<ExamResultLayout row={row} run={{free_rewrite_available:false,continuous_cycles_supported:true}} reports={[report('run/a')]} previous={[]} onRewrite={rewrite} onAdditional={additional}/>);
 const final=screen.getByRole('button',{name:'답안 다시 작성하기 · 무료 재첨삭'});
 expect(final).toBeDisabled();fireEvent.click(final);expect(rewrite).not.toHaveBeenCalled();
 rerender(<ExamResultLayout row={row} run={{free_rewrite_available:true}} reports={[report('run/a')]} previous={[]} onRewrite={rewrite} onAdditional={additional}/>);
 fireEvent.click(screen.getByRole('button',{name:'답안 다시 작성하기 · 무료 재첨삭'}));
 expect(rewrite).toHaveBeenCalledTimes(1);expect(additional).not.toHaveBeenCalled();
});

it('never labels unknown exam coverage as full completion',()=>{
 render(<ExamResultLayout row={row} run={{}} reports={[report('run/a')]} previous={[]} onRewrite={vi.fn()} onAdditional={vi.fn()}/>);
 expect(screen.getByText(/제출 문항 첨삭 완료 · 전체 문항 여부 미확인/)).toBeTruthy();
 expect(screen.queryByText(/^전체 문항 첨삭 완료$/)).toBeNull();
});
it('shows Math reasoning separately from final answer within the shared result UI',()=>{
 const math={...report('run/math'),math:{answerVerdict:'정답',reviewRequired:true,steps:[{position:1,status:'근거 부족',representation:'x=2',explanation:'도출 과정이 필요해요.'}]}};
 render(<ExamResultLayout row={row} run={{}} reports={[math]} previous={[]} onRewrite={vi.fn()} onAdditional={vi.fn()}/>);
 expect(screen.getByRole('heading',{name:'최종 답안 판정'})).toBeTruthy();
 expect(screen.getByRole('heading',{name:'풀이 과정 평가'})).toBeTruthy();
 expect(screen.getByText('도출 과정이 필요해요.')).toBeTruthy();
 expect(screen.queryByText('음성으로 듣기')).toBeNull();
});

it('distinguishes a partial registered exam from the entire two-question exam',()=>{
 const examRow={...row,examId:'de46f947-c033-5ec8-82ef-963f1742879e'};
 const q1=report('run/dd53705e-1dec-52b1-bef0-710891ce5fb3'),q2=report('run/84b62658-4994-5c50-8b2b-3592666d66a7');
 const props={row:examRow,run:{},reports:[q1],previous:[],onRewrite:vi.fn(),onAdditional:vi.fn()};
 const {rerender}=render(<ExamResultLayout {...props}/>);
 expect(screen.getByText(/전체 2문항 중 1문항 첨삭 완료/)).toBeTruthy();
 rerender(<ExamResultLayout {...props} reports={[q1,q2]}/>);
 expect(screen.getByText(/전체 문항 첨삭 완료/)).toBeTruthy();
 rerender(<ExamResultLayout {...props} reports={[q1,q1]}/>);
 expect(screen.queryByText(/· 전체 문항 첨삭 완료/)).toBeNull();
});
