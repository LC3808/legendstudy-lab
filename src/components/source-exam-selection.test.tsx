// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import {SourceExamSelection} from './source-exam-selection';
vi.mock('client-only',()=>({}));
const identity=vi.hoisted(()=>({user:null as {id:string}|null}));
vi.mock('./auth-context',()=>({useAuth:()=>({user:identity.user})}));
beforeEach(()=>{cleanup();localStorage.clear();identity.user=null;});
it('real Sookmyung four subquestions write/restore without a Provider or DB write',async()=>{
 const view=render(<SourceExamSelection sourceId="sookmyung"/>);
 expect(screen.getByLabelText('학년도·시험')).toHaveValue('2025:mock');
 await waitFor(()=>expect(screen.getByLabelText('문제 1-1 답안')).toBeEnabled());
 fireEvent.change(screen.getByLabelText('문제 1-1 답안'),{target:{value:'학생이 직접 쓴 답안'}});
 fireEvent.click(screen.getByRole('tab',{name:'문제 2-2'}));
 expect(screen.getByLabelText('문제 1-1 답안')).toBeVisible(); // All question cards stay visible.
 fireEvent.click(screen.getByRole('tab',{name:'문제 1-1'}));
 expect(screen.getByLabelText('문제 1-1 답안')).toHaveValue('학생이 직접 쓴 답안');
 view.unmount();render(<SourceExamSelection sourceId="sookmyung"/>);
 await waitFor(()=>expect(screen.getByLabelText('문제 1-1 답안')).toBeEnabled());
 expect(screen.getByLabelText('문제 1-1 답안')).toHaveValue('학생이 직접 쓴 답안');
 expect(screen.getByRole('button',{name:'첨삭 가능 여부 확인 중'})).toBeDisabled();
});
it('account switch does not expose another draft and no implicit guest transfer',async()=>{
 const view=render(<SourceExamSelection sourceId="sookmyung"/>);
 await waitFor(()=>expect(screen.getByLabelText('문제 1-1 답안')).toBeEnabled());
 fireEvent.change(screen.getByLabelText('문제 1-1 답안'),{target:{value:'guest draft'}});
 identity.user={id:'account-a'};view.rerender(<SourceExamSelection sourceId="sookmyung"/>);
 expect(screen.getByLabelText('문제 1-1 답안')).toHaveValue('');
});
it('real catalog has separate admission/mock and resets dependent choices',()=>{
 render(<SourceExamSelection sourceId="cau"/>);
 fireEvent.change(screen.getByLabelText('학년도·시험'),{target:{value:'2025:admission'}});
 expect(screen.getByRole('option',{name:'2025학년도 수시논술'})).toBeVisible();expect(screen.getByRole('option',{name:'2025학년도 모의논술'})).toBeVisible();
 fireEvent.change(screen.getByLabelText('계열'),{target:{value:'인문사회'}});
 expect(screen.getByRole('tab',{name:'문제 1'})).toBeVisible();
 fireEvent.change(screen.getByLabelText('학년도·시험'),{target:{value:''}});
 expect(screen.queryByRole('tab',{name:'문제 1'})).toBeNull();
});
it('does not overwrite a newer draft saved in another tab',async()=>{
 render(<SourceExamSelection sourceId="sookmyung"/>);
 const input=screen.getByLabelText('문제 1-1 답안');await waitFor(()=>expect(input).toBeEnabled());
 fireEvent.change(input,{target:{value:'first'}});
 const key=Object.keys(localStorage)[0];localStorage.setItem(key,'another tab');
 fireEvent.change(input,{target:{value:'my changed answer'}});
 expect(localStorage.getItem(key)).toBe('another tab');expect(input).toHaveValue('my changed answer');
 expect(screen.getByText('다른 창에서 답안이 변경되었습니다. 작성 내용을 복사한 뒤 새로고침해 주세요.')).toBeVisible();
});
it('keeps an unsaved answer when changing selection is cancelled',async()=>{
 const fail=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('quota');});
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
 render(<SourceExamSelection sourceId="sookmyung"/>);
 const input=screen.getByLabelText('문제 1-1 답안');await waitFor(()=>expect(input).toBeEnabled());
 fireEvent.change(input,{target:{value:'not saved'}});
 fireEvent.change(screen.getByLabelText('학년도·시험'),{target:{value:''}});
 expect(confirm).toHaveBeenCalled();expect(input).toHaveValue('not saved');
 expect(screen.getByText('저장하지 못했습니다. 답안을 복사해 보관해 주세요.')).toBeVisible();fail.mockRestore();confirm.mockRestore();
});
