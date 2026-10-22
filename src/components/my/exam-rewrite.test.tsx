// @vitest-environment jsdom
import {render,screen,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import {ExamRewrite} from './exam-rewrite';
const state=vi.hoisted(()=>({load:vi.fn(),runs:vi.fn(),client:{auth:{getSession:vi.fn(async()=>({data:{session:{user:{id:'owner'},access_token:'synthetic'}}}))}},user:{id:'owner'}}));
vi.mock('../auth-context',()=>({useAuth:()=>state}));
vi.mock('@/lib/my/exam-history',()=>({readExamRuns:state.runs}));
vi.mock('@/lib/essay-runtime/registered-material-catalog',async original=>({...await original<typeof import('@/lib/essay-runtime/registered-material-catalog')>(),loadRegisteredMaterials:state.load}));
vi.mock('../source-exam-writer',()=>({SourceExamWriter:({question}:{question:{dbQuestionId:string}})=><p>{question.dbQuestionId}</p>}));
vi.mock('../essay-exam-submit',()=>({EssayExamSubmit:()=>null}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const exam={key:'registered:e',dbExamId:'e',sourceUniversityId:'konkuk',questions:[{key:'registered:q',dbQuestionId:'q'}]};
function setup(ids=['q']){state.runs.mockResolvedValue([{id:'run',exam_id:'e',university:'건국대학교',question_ids:ids,answers:[]}]);state.load.mockResolvedValue([exam]);vi.stubGlobal('fetch',vi.fn(async()=>Response.json({code:'REGISTRY_UNAVAILABLE'},{status:503})));}
it('reopens a completed registered exam missing from the old static registry',async()=>{setup();render(<ExamRewrite runId="run" additional={false}/>);expect(await screen.findByText('q')).toBeInTheDocument();expect(state.load).toHaveBeenCalledWith(state.client,'konkuk');expect(fetch).not.toHaveBeenCalled();});
it('rejects history question IDs absent from the canonical metadata',async()=>{setup(['foreign']);render(<ExamRewrite runId="run" additional={false}/>);expect(await screen.findByText(/기존 시험과 답안을 불러오지/)).toBeInTheDocument();});
