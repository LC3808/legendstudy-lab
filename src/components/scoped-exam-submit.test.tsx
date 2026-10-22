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
it('admits only server approved question and closes on question or account change',async()=>{
 const v=render(<ScopedExamSubmit exam={exam} questionKey="q2" drafts={{}}/>);
 await screen.findByText('approved:q2');
 v.rerender(<ScopedExamSubmit exam={exam} questionKey="q1" drafts={{}}/>);
 expect(screen.getByRole('button')).toBeDisabled();
 auth.user={id:'owner-b'};v.rerender(<ScopedExamSubmit exam={exam} questionKey="q2" drafts={{}}/>);
 expect(screen.getByRole('button')).toBeDisabled();
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
