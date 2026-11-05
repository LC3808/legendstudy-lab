// @vitest-environment jsdom
import {render,screen,cleanup,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
const auth=vi.hoisted(()=>({user:{id:'owner-a'} as {id:string}|null,client:{auth:{getSession:vi.fn()}}}));
vi.mock('./auth-context',()=>({useAuth:()=>auth}));
vi.mock('./math-release/exam-session-submit',()=>({MathExamSessionSubmit:({rewrite}:{rewrite?:{id:string}})=><div>math-round:{rewrite?.id??'initial'}</div>}));
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
 expect(screen.getByRole('status')).toHaveTextContent('로그인 후');expect(fetch).not.toHaveBeenCalled();
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
it.each(['MIXED_QA_PENDING','RELEASE_SCOPE_CHANGED'])('does not fall back to legacy Math when session is held: %s',async code=>{
 vi.mocked(fetch).mockResolvedValue(Response.json({ready:false,code}));
 render(<ScopedExamSubmit exam={exam} questionKey="q1" drafts={{}}/>);
 expect(await screen.findByRole('button',{name:'첨삭 서비스 제공 예정'})).toBeDisabled();
 expect(fetch).toHaveBeenCalledTimes(1);
});

it('uses separately enabled Math for all selected leaves when Essay runtime is disabled',async()=>{
 const leaf='00000000-0000-4000-8000-000000000001';
 vi.mocked(fetch).mockResolvedValueOnce(Response.json({code:'EVALUATION_UNAVAILABLE'},{status:503})).mockResolvedValueOnce(Response.json({types:{math:true},mathQuestions:[{examId:'exam-id',questionId:'id1',leafId:leaf}]}));
 render(<ScopedExamSubmit exam={exam} includedKeys={['q1']} cycle={{previousPaidRunId:'previous-round'}} drafts={{q1:{body:'수정 답안',revision:1,images:false}}}/>);
 expect(await screen.findByText('math-round:previous-round')).toBeVisible();
});

it('all-Math admission stays on the existing Math session path and clears the UI-only hold',async()=>{
 const q1='11111111-1111-4111-8111-111111111111',q2='22222222-2222-4222-8222-222222222222';
 const e={...exam,questions:[{key:'q1',dbQuestionId:q1},{key:'q2',dbQuestionId:q2}]} as SourceExam;
 vi.mocked(fetch).mockResolvedValue(Response.json({ready:true,questionIds:[q1,q2],mathQuestions:{[q1]:q1,[q2]:q2}}));
 const admission=vi.fn();render(<ScopedExamSubmit exam={e} questionKey="q1" drafts={{q1:{body:'풀이',revision:1,images:false}}} onAdmissionChange={admission}/>);
 expect(await screen.findByText('math-round:initial')).toBeVisible();
 expect(admission).toHaveBeenCalledWith(true);
});

it('reports a backend failure as ERROR rather than service preparation',async()=>{
 vi.mocked(fetch).mockRejectedValue(Error('network'));
 render(<ScopedExamSubmit exam={exam} drafts={{}}/>);
 expect(await screen.findByRole('status')).toHaveAttribute('data-availability','ERROR');
 expect(screen.queryByText('첨삭 서비스 제공 예정')).toBeNull();
});
it('reports an explicit release hold as BLOCKED with an explanation',async()=>{
 vi.mocked(fetch).mockResolvedValueOnce(Response.json({ready:false,code:'NATURAL_MATH_HOLD'})).mockResolvedValueOnce(Response.json({checked:true,types:{math:false},mathQuestions:[]}));
 const {container}=render(<ScopedExamSubmit exam={exam} drafts={{}}/>);
 await screen.findByText(/현재 공개 범위에 포함되지/);
 expect(container.querySelector('[data-availability="BLOCKED"]')).not.toBeNull();
 expect(fetch).toHaveBeenCalledTimes(2);
});

it('explains a server authorization restriction when no separately released Math exists',async()=>{
 vi.mocked(fetch).mockResolvedValueOnce(Response.json({code:'ACCESS_DENIED'},{status:403})).mockResolvedValueOnce(Response.json({checked:true,types:{math:false},mathQuestions:[]}));
 const {container}=render(<ScopedExamSubmit exam={exam} drafts={{}}/>);
 await screen.findByText(/현재 공개 범위에 포함되지/);
 expect(container.querySelector('[data-availability="BLOCKED"]')).not.toBeNull();
 expect(fetch).toHaveBeenCalledTimes(2);
});

it('retains an already released standalone Math leaf without opening other exam questions',async()=>{
 const leaf='00000000-0000-4000-8000-000000000001';
 vi.mocked(fetch).mockResolvedValueOnce(Response.json({code:'ACCESS_DENIED'},{status:403})).mockResolvedValueOnce(Response.json({checked:true,types:{math:true},mathQuestions:[{examId:exam.dbExamId,questionId:'id1',leafId:leaf}]}));
 const e={...exam,questions:exam.questions.map((q,i)=>({...q,label:`문제 ${i+1}`}))};
 render(<ScopedExamSubmit exam={e} questionKey="q1" drafts={{q1:{body:'풀이',revision:1,images:false}}}/>);
 expect(await screen.findByText('math-round:initial')).toBeVisible();
 expect(screen.getByRole('status')).toHaveTextContent('현재 문제 1만 첨삭할 수 있습니다');
 expect(screen.getByRole('status')).toHaveTextContent('시험 전체가 공개된 것은 아닙니다');
});
