// @vitest-environment jsdom
import {cleanup,render,screen,waitFor,fireEvent} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {SourceExamWriter} from './source-exam-writer';
import type {SourceExam,SourceQuestion} from '@/lib/essay-runtime/source-registry';
vi.mock('client-only',()=>({}));
vi.mock('./auth-context',()=>({useAuth:()=>({})}));
vi.mock('@/lib/source-image-draft',()=>({sourceImageDraft:async()=>null}));
vi.mock('./question-material-access',()=>({QuestionMaterialAccess:()=>null}));
const exam={sourceUniversityId:'hanyang',year:2027,track:'상경',kind:'mock'} as SourceExam;
const q={key:'text-q',label:'문제 1',inputMode:'text'} as SourceQuestion;
afterEach(()=>{cleanup();localStorage.clear();});
it('TEXT never exposes camera or attachment even in a commerce exam',async()=>{
 render(<SourceExamWriter exam={exam} question={q} owner="guest" onDirty={()=>{}}/>);
 await waitFor(()=>expect(screen.getByLabelText('문제 1 답안')).toBeEnabled());
 expect(screen.queryByText('답안 사진 촬영')).toBeNull();expect(screen.queryByText('답안 이미지 첨부')).toBeNull();
});
it('per-question Math contract enables image and typed answer inputs',async()=>{
 render(<SourceExamWriter exam={exam} question={{...q,key:'math-q',label:'문제 2'}} supportsImages owner="guest" onDirty={()=>{}}/>);
 expect(await screen.findByText('답안 이미지 첨부')).toBeVisible();
 expect(screen.queryByText('답안 사진 촬영')).toBeNull();
 expect(screen.getByLabelText('문제 2 수식·텍스트 답안')).toBeInTheDocument();
});

it('rewrite is blank; import confirms overwrite; saved per-question draft survives remount',async()=>{
 const props={exam,question:q,owner:'guest',onDirty:()=>{},rewrite:{id:'parent',previousAnswer:'원본 답안'}};
 const view=render(<SourceExamWriter {...props}/>);
 const editor=await screen.findByLabelText('문제 1 답안');
 await waitFor(()=>expect(editor).toBeEnabled());expect(editor).toHaveValue('');
 fireEvent.click(screen.getByText('이전 답안 불러오기'));expect(editor).toHaveValue('원본 답안');
 fireEvent.change(editor,{target:{value:'수정 답안'}});
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
 fireEvent.click(screen.getByText('이전 답안 불러오기'));expect(confirm).toHaveBeenCalledOnce();expect(editor).toHaveValue('수정 답안');
 view.unmount();render(<SourceExamWriter {...props}/>);
 await waitFor(()=>expect(screen.getByLabelText('문제 1 답안')).toHaveValue('수정 답안'));
 cleanup();render(<SourceExamWriter {...props} question={{...q,key:'other',label:'문제 2'}} rewrite={{id:'parent',previousAnswer:'다른 문항 원본'}}/>);
 await waitFor(()=>expect(screen.getByLabelText('문제 2 답안')).toBeEnabled());
 expect(screen.getByLabelText('문제 2 답안')).toHaveValue('');
 fireEvent.click(screen.getByText('이전 답안 불러오기'));expect(screen.getByLabelText('문제 2 답안')).toHaveValue('다른 문항 원본');
 confirm.mockRestore();
});
