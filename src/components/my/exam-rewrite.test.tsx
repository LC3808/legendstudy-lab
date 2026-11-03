// @vitest-environment jsdom
import {render,screen,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import {ExamRewrite} from './exam-rewrite';
const state=vi.hoisted(()=>({load:vi.fn(),runs:vi.fn(),mathRun:vi.fn(),mathInput:vi.fn(),client:{auth:{getSession:vi.fn(async()=>({data:{session:{user:{id:'owner'},access_token:'synthetic'}}}))}},user:{id:'owner'}}));
vi.mock('../auth-context',()=>({useAuth:()=>state}));
vi.mock('@/lib/my/exam-history',()=>({readExamRuns:state.runs}));
vi.mock('@/lib/my/essay-dashboard',async original=>({...await original<typeof import('@/lib/my/essay-dashboard')>(),readMathSession:state.mathRun,mathRead:state.mathInput}));
vi.mock('@/lib/essay-runtime/registered-material-catalog',async original=>({...await original<typeof import('@/lib/essay-runtime/registered-material-catalog')>(),loadRegisteredMaterials:state.load}));
vi.mock('../source-exam-writer',()=>({SourceExamWriter:({question,rewrite}:{question:{dbQuestionId:string};rewrite?:{previousAnswer:string}})=><><p>{question.dbQuestionId}</p><pre>{rewrite?.previousAnswer}</pre></>}));
vi.mock('../scoped-exam-submit',()=>({ScopedExamSubmit:()=>null}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const exam={key:'registered:e',dbExamId:'e',sourceUniversityId:'konkuk',questions:[{key:'registered:q',dbQuestionId:'q'}]};
function setup(ids=['q']){state.runs.mockResolvedValue([{id:'run',exam_id:'e',university:'건국대학교',question_ids:ids,answers:[]}]);state.load.mockResolvedValue([exam]);vi.stubGlobal('fetch',vi.fn(async()=>Response.json({code:'REGISTRY_UNAVAILABLE'},{status:503})));}
it('reopens a completed registered exam missing from the old static registry',async()=>{setup();render(<ExamRewrite runId="run" additional={false}/>);expect(await screen.findByText('q')).toBeInTheDocument();expect(state.load).toHaveBeenCalledWith(state.client,'konkuk');expect(fetch).not.toHaveBeenCalled();});
it('rejects history question IDs absent from the canonical metadata',async()=>{setup(['foreign']);render(<ExamRewrite runId="run" additional={false}/>);expect(await screen.findByText(/기존 시험과 답안을 불러오지/)).toBeInTheDocument();});
it('shows both submitted question editors without a hidden tab',async()=>{setup(['q','q2']);state.load.mockResolvedValue([{...exam,questions:[...exam.questions,{key:'registered:q2',dbQuestionId:'q2'}]}]);render(<ExamRewrite runId="run" additional={false}/>);expect(await screen.findByText('q')).toBeVisible();expect(screen.getByText('q2')).toBeVisible();});

it('reopens the exact Inha Math session and confirmed photo transcript for its free rewrite',async()=>{
 const examId='70b0ddd5-0816-5395-8ac5-6a4e3664a282',questionId='e62ef7df-f6d2-5a98-a586-b3b1ac69a9bd';
 state.mathRun.mockResolvedValue({run_id:'math-round',exam_id:examId,parent_id:null,questions:[{question_id:questionId,attempt_id:'photo-attempt'}]});
 const confirmed=[{reading_order:2,raw_text:'S(√[4]{u})',normalized_math:'do not replace confirmed raw source'},{reading_order:1,raw_text:'u=t^4',normalized_math:'u=t^4'}];
 state.mathInput.mockResolvedValue({attempt:{typed_answer:''},confirmed_regions:confirmed});
 state.load.mockResolvedValue([{...exam,dbExamId:examId,sourceUniversityId:'inha',questions:[{key:'registered:'+questionId,dbQuestionId:questionId}]}]);
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({}, {status:503})));
 render(<ExamRewrite runId="math-round" additional={false} mathSession/>);
 expect(await screen.findByText(questionId)).toBeVisible();
 expect(screen.getByText('u=t^4 S(√[4]{u})')).toBeVisible();
 expect(state.load).toHaveBeenLastCalledWith(state.client,'inha');expect(fetch).not.toHaveBeenCalled();
 expect(state.mathRun).toHaveBeenLastCalledWith(state.client,'owner','math-round');
 expect(confirmed.map(r=>r.reading_order)).toEqual([2,1]);
});
