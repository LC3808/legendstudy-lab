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
