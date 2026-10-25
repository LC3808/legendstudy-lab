// @vitest-environment jsdom
import {render,screen,waitFor} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import {ScopedExamSubmit} from './scoped-exam-submit';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
const auth=vi.hoisted(()=>({user:{id:'owner'},client:{auth:{getSession:async()=>({data:{session:{user:{id:'owner'},access_token:'fixture'}}})}}}));
vi.mock('./auth-context',()=>({useAuth:()=>auth}));
vi.mock('./essay-exam-submit',()=>({EssayExamSubmit:()=> <div>human submission</div>}));
const exam={key:'exam',dbExamId:'exam',questions:[{key:'q1',dbQuestionId:'question'},{key:'q2',dbQuestionId:'other'}]} as SourceExam;
afterEach(()=>vi.unstubAllGlobals());
it('shows one round submission surface for the selected server-mapped Math question',async()=>{
 const leaf='3bab07d3-c047-53c2-89ad-9fa20ec7b3f3';
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>Response.json(url.endsWith('/exam')?{ready:false}:{types:{math:true},mathQuestions:[{examId:'exam',questionId:'question',leafId:leaf}]})));
 const view=render(<ScopedExamSubmit exam={exam} questionKey="q1" drafts={{}}/>);
 expect(await screen.findByRole('region',{name:'수리논술 회차 첨삭'})).toBeInTheDocument();
 expect(screen.queryByRole('link',{name:'수리논술 첨삭하기'})).toBeNull();
 view.rerender(<ScopedExamSubmit exam={exam} questionKey="q2" drafts={{}}/>);
 expect(screen.queryByRole('link')).toBeNull();
 expect(screen.getByRole('button',{name:'첨삭 서비스 준비 중'})).toBeDisabled();
});
it('closed Math runtime cannot be activated by a mapping alone',async()=>{
 const fetcher=vi.fn(async(url:string)=>Response.json(url.endsWith('/exam')?{ready:false}:{types:{math:false},mathQuestions:[{examId:'exam',questionId:'question',leafId:'3bab07d3-c047-53c2-89ad-9fa20ec7b3f3'}]}));vi.stubGlobal('fetch',fetcher);
 render(<ScopedExamSubmit exam={exam} questionKey="q1" drafts={{}}/>);
 await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));
 expect(screen.queryByRole('link')).toBeNull();
});
