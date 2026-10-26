// @vitest-environment jsdom
import {render,screen,cleanup,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
const auth=vi.hoisted(()=>({user:{id:'owner-a'} as {id:string}|null,client:{auth:{getSession:vi.fn()}}}));
vi.mock('./auth-context',()=>({useAuth:()=>auth}));
vi.mock('./essay-exam-submit',()=>({EssayExamSubmit:({included}:{included:string[]})=><div>approved:{included.join(',')}</div>}));
import {ScopedExamSubmit} from './scoped-exam-submit';
const exam={key:'exam',dbExamId:'exam-id',questions:[{key:'q1',dbQuestionId:'id1'},{key:'q2',dbQuestionId:'id2'}]} as SourceExam;
beforeEach(()=>{cleanup();vi.restoreAllMocks();auth.user={id:'owner-a'};auth.client.auth.getSession.mockResolvedValue({data:{session:{user:{id:'owner-a'},access_token:'fixture'}}});vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({ready:true,questionIds:['id2']})));});
it('collects written answers independently of the active tab and never silently drops unsupported answers',async()=>{
 const drafts={q2:{body:'작성한 답안',revision:1,images:false}};
 const v=render(<ScopedExamSubmit exam={exam} questionKey="q1" drafts={drafts}/>);
 await screen.findByText('approved:q2');
 v.rerender(<ScopedExamSubmit exam={exam} questionKey="q2" drafts={{...drafts,q1:{body:'다른 답안',revision:1,images:false}}}/>);
 expect(screen.getByRole('status')).toHaveTextContent('아직 첨삭 준비 중');
 auth.user={id:'owner-b'};v.rerender(<ScopedExamSubmit exam={exam} questionKey="q2" drafts={drafts}/>);
 expect(screen.getByRole('button')).toBeDisabled();
});
it('includes every written admitted question in one submission',async()=>{
 vi.mocked(fetch).mockResolvedValue(Response.json({ready:true,questionIds:['id1','id2']}));
 render(<ScopedExamSubmit exam={exam} questionKey="q1" drafts={{q1:{body:'답안1',revision:1,images:false},q2:{body:'답안2',revision:1,images:false}}}/>);
 await screen.findByText('approved:q1,q2');
});
it('ready without question scope does not activate a reviewed question',async()=>{
 vi.mocked(fetch).mockResolvedValue(Response.json({ready:true}));
 render(<ScopedExamSubmit exam={exam} questionKey="q2" drafts={{}}/>);
 await waitFor(()=>expect(fetch).toHaveBeenCalled());expect(screen.getByRole('button')).toBeDisabled();
});
it('anonymous visitor never requests admission',async()=>{
 auth.user=null;render(<ScopedExamSubmit exam={exam} questionKey="q2" drafts={{}}/>);
 expect(screen.getByRole('button')).toBeDisabled();expect(fetch).not.toHaveBeenCalled();
});
it('explains missing original questions before a free rewrite quote',async()=>{
 vi.mocked(fetch).mockResolvedValue(Response.json({ready:true,questionIds:['id1','id2']}));
 const e={...exam,questions:exam.questions.map((q,i)=>({...q,label:`문제 ${i+1}`}))};
 const v=render(<ScopedExamSubmit exam={e} includedKeys={['q1','q2']} cycle={{parentId:'original'}} drafts={{q1:{body:'새 답안',revision:1,images:false}}}/>);
 expect(await screen.findByRole('status')).toHaveTextContent('문제 2 답안을 작성하거나 이전 답안을');
 expect(screen.getByRole('button',{name:'무료 재첨삭 요청 · 답안 준비 필요'})).toBeDisabled();
 v.rerender(<ScopedExamSubmit exam={e} includedKeys={['q1','q2']} cycle={{parentId:'original'}} drafts={{q1:{body:'새 답안',revision:1,images:false},q2:{body:'이전 답안',revision:1,images:false}}}/>);
 expect(screen.getByText('approved:q1,q2')).toBeVisible();
});
