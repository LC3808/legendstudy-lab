// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import {SourceExamSelection} from './source-exam-selection';
vi.mock('client-only',()=>({}));
vi.mock('@/lib/source-image-draft',()=>({sourceImageDraft:vi.fn(async()=>null)}));
const identity=vi.hoisted(()=>({user:null as {id:string}|null}));
vi.mock('./auth-context',()=>({useAuth:()=>({user:identity.user})}));
beforeEach(()=>{cleanup();localStorage.clear();identity.user=null;});
it('real Sookmyung four subquestions write/restore without a Provider or DB write',async()=>{
 const view=render(<SourceExamSelection sourceId="sookmyung"/>);
 expect(screen.getByLabelText('학년도·시험')).toHaveValue('2025:mock');
 await waitFor(()=>expect(screen.getByLabelText('문제 1-1 답안')).toBeEnabled());
 fireEvent.change(screen.getByLabelText('문제 1-1 답안'),{target:{value:'학생이 직접 쓴 답안'}});
 expect(screen.getByLabelText('문제 2-2 답안')).not.toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'펼치기 · 문제 2-2'}));
 expect(screen.getByLabelText('문제 1-1 답안')).toBeVisible(); // Manually opening another card preserves the first.
 fireEvent.click(screen.getByRole('button',{name:'접기 · 문제 2-2'}));
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
 expect(screen.getByRole('button',{name:'접기 · 문제 1'})).toBeVisible();
 fireEvent.change(screen.getByLabelText('학년도·시험'),{target:{value:''}});
 expect(screen.queryByRole('button',{name:'접기 · 문제 1'})).toBeNull();
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

it('manual save opens the next unwritten card until the student chooses a panel',async()=>{
 render(<SourceExamSelection sourceId="sookmyung"/>);
 const first=screen.getByLabelText('문제 1-1 답안');await waitFor(()=>expect(first).toBeEnabled());
 fireEvent.change(first,{target:{value:'저장할 답안'}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'답안 저장'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'답안 저장'}));
 await waitFor(()=>expect(screen.getByLabelText('문제 1-2 답안')).toBeVisible());
 expect(first).not.toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'펼치기 · 문제 1-1'}));
 fireEvent.change(first,{target:{value:'다시 저장'}});
 const card=first.closest('section')!;
 fireEvent.click(Array.from(card.querySelectorAll('button')).find(b=>b.textContent==='답안 저장')!);
 await waitFor(()=>expect(first).toBeVisible());
 expect(screen.queryByText('답안 이미지 첨부')).toBeNull();
});

it('keeps registered natural exams discoverable across years without enabling grading',async()=>{
 const exam={key:'registered:76b32d03-e941-51e0-9355-46c139a0617a',dbExamId:'76b32d03-e941-51e0-9355-46c139a0617a',sourceUniversityId:'kwangwoon',year:2022,kind:'mock',track:'자연계열',session:null,verification:'VERIFIED',evaluationReady:false,questions:[{key:'natural-q1',dbQuestionId:'49a092ef-9d72-5cbc-8079-45fba6009481',label:'문제 1'}]};
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({version:'essay-source-registry-v1',exams:[exam,{...exam,key:'humanities',dbExamId:'humanities',year:2027,track:'인문계열'}]})}));
 try{
  render(<SourceExamSelection sourceId="kwangwoon" registeredOnly/>);
  await screen.findByRole('button',{name:'자연계열 · 1회차'});
  fireEvent.click(screen.getByRole('button',{name:'자연계열 · 1회차'}));
  expect(screen.getByLabelText('학년도·시험')).toHaveValue('2022:mock');
  expect(screen.getByLabelText('계열')).toHaveValue('자연계열');
  await waitFor(()=>expect(screen.getByRole('button',{name:'첨삭 서비스 준비 중'})).toBeDisabled());
  expect(screen.queryByRole('button',{name:'첨삭 가능 여부 확인 중'})).toBeNull();
  expect(screen.getByRole('button',{name:'인문계열 · 1회차'})).toBeEnabled();
 }finally{vi.unstubAllGlobals();}
});
