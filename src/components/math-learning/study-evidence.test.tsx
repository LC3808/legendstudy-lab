// @vitest-environment jsdom
import {render,screen,waitFor,cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {StudyEvidence} from './study-evidence';
import {StudyMath} from './study-math';
beforeEach(()=>{URL.createObjectURL=vi.fn(()=>'blob:private-test');URL.revokeObjectURL=vi.fn();});
afterEach(cleanup);
const input={attempt:{},artifacts:[{artifact_id:'photo',position:1}],candidate_regions:[{id:'old',artifact_id:'photo',reading_order:1,raw_text:'x=-1',uncertain:true}],confirmed_regions:[{id:'new',artifact_id:'photo',reading_order:1,raw_text:'x=1',uncertain:false}]};
it('loads private original, distinguishes correction, highlights only validated coordinates and revokes blob',async()=>{
 const load=vi.fn(async()=>new Blob(['photo'],{type:'image/png'}));const view=render(<StudyEvidence input={input} task={{id:'task',source_regions:[{artifact_id:'photo',x:.1,y:.2,width:.3,height:.4}]}} loadImage={load}/>);
 await screen.findByAltText('학생 원본 답안 1페이지');expect(load).toHaveBeenCalledTimes(1);expect(screen.getByLabelText('개선 과제 원본 영역')).toHaveStyle({left:'10%',top:'20%'});
 expect(screen.getByText(/학생 수정본/)).toBeTruthy();await userEvent.click(screen.getByText('수정 전 인식 원문'));expect(screen.getByText('수정 전 인식 원문')).toBeTruthy();
 await userEvent.click(screen.getByLabelText('원본 확대'));expect(screen.getByText('125%')).toBeTruthy();view.unmount();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-test');
});
it('does not invent coordinates, preserves typed originals without making image calls',async()=>{
 const load=vi.fn(async()=>new Blob());render(<StudyEvidence input={{attempt:{typed_answer:'학생이 직접 수정한 답안'},artifacts:[]}} task={{id:'task',source_regions:[{artifact_id:'missing',x:0,y:0,width:2,height:1}]}} loadImage={load}/>);
 expect(screen.queryByLabelText('개선 과제 원본 영역')).toBeNull();expect(screen.getByText(/원본 위치는 미확정/)).toBeTruthy();expect(screen.getByText('학생이 직접 수정한 답안')).toBeTruthy();expect(load).not.toHaveBeenCalled();
});
it('renders explicit and isolated formula families while preserving malformed original',()=>{
 const source=String.raw`\begin{aligned}f(x)&=\frac{x_1^2}{2}\\g(x)&=\int_0^1 x\,dx+\lim_{n\to\infty}\frac1n\end{aligned}`;
 const {container}=render(<><StudyMath value={source} formula/><StudyMath value={String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}`}/><StudyMath value={String.raw`\begin{cases}x+y=2\\x-y=0\end{cases}`} formula/><StudyMath value={String.raw`\frac{broken`} formula/></>);
 expect(container.querySelectorAll('.katex')).toHaveLength(3);expect(screen.getByText(String.raw`\frac{broken`)).toBeTruthy();expect(container.querySelector('.math-source-fallback')).toBeTruthy();
});
it('stale image request is aborted on unmount',async()=>{
 let signal:AbortSignal|undefined;const load=vi.fn((_id:string,s:AbortSignal)=>{signal=s;return new Promise<Blob>(()=>{});});const view=render(<StudyEvidence input={input} task={{}} loadImage={load}/>);await waitFor(()=>expect(load).toHaveBeenCalled());view.unmount();expect(signal?.aborted).toBe(true);
});
