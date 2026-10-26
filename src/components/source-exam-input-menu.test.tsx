// @vitest-environment jsdom
import {cleanup,render,screen,waitFor} from '@testing-library/react';
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
it('per-question Math contract enables existing camera, image and typed answer inputs',async()=>{
 render(<SourceExamWriter exam={exam} question={{...q,key:'math-q',label:'문제 2'}} supportsImages owner="guest" onDirty={()=>{}}/>);
 expect(await screen.findByText('답안 사진 촬영')).toBeVisible();
 expect(screen.getByText('답안 이미지 첨부')).toBeVisible();
 expect(screen.getByLabelText('문제 2 수식·텍스트 답안')).toBeInTheDocument();
});
