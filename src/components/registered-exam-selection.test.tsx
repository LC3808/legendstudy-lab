// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {SourceExamSelection} from './source-exam-selection';
vi.mock('client-only',()=>({}));
const state=vi.hoisted(()=>({user:{id:'operator'} as {id:string}|null,load:vi.fn(),client:{auth:{getSession:vi.fn()}}}));
vi.mock('./auth-context',()=>({useAuth:()=>state}));
vi.mock('@/lib/essay-runtime/registered-material-catalog',()=>({loadRegisteredMaterials:state.load}));
const id='00000000-0000-4000-8000-000000000001';
const exam={key:`registered:${id}`,dbExamId:id,universityId:id,sourceUniversityId:'gachon',year:2027,kind:'mock',track:'의예',session:'모의 의예',campus:null,verification:'REVIEW_REQUIRED',sourceHashes:[],evaluationReady:false,questions:[{key:`registered:${id}`,dbQuestionId:id,label:'문제 1',sourceLocator:null,lengthLabel:null,accountDraftReady:false}]};
beforeEach(()=>{state.user={id:'operator'};state.client.auth.getSession.mockResolvedValue({data:{session:{user:{id:'operator'},access_token:'fixture'}}});state.load.mockReset().mockResolvedValue([exam]);vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({version:'essay-source-registry-v1',exams:[]})));});
afterEach(()=>vi.unstubAllGlobals());
it('selects the registered mock exam, saves a local draft and blocks unreviewed submission',async()=>{
 render(<SourceExamSelection sourceId="gachon" registeredOnly/>);
 const input=await screen.findByLabelText('문제 1 답안');await waitFor(()=>expect(input).toBeEnabled());
 expect(screen.getByLabelText('학년도')).toHaveValue('2027');expect(screen.getByLabelText('시험 유형')).toHaveValue('mock');
 expect(screen.queryByRole('tablist',{name:'문항 선택'})).toBeNull();
 fireEvent.change(input,{target:{value:'합성 테스트 답안'}});
 expect(input).toHaveValue('합성 테스트 답안');expect(screen.getByRole('button',{name:'첨삭 준비 중'})).toBeDisabled();
 expect(screen.queryByRole('button',{name:'계정 답안 확인·저장'})).toBeNull();
 expect(fetch).not.toHaveBeenCalled();
});
it('clears old account view and reloads public metadata on logout',async()=>{
 const view=render(<SourceExamSelection sourceId="gachon" registeredOnly/>);
 await screen.findByLabelText('문제 1 답안');state.user=null;state.client.auth.getSession.mockResolvedValue({data:{session:null}});
 view.rerender(<SourceExamSelection sourceId="gachon" registeredOnly/>);
 expect(screen.queryByLabelText('문제 1 답안')).toBeNull();expect(screen.queryByRole('option',{name:'2027학년도'})).toBeNull();
 await waitFor(()=>expect(state.load).toHaveBeenCalledTimes(2));
 expect(screen.getByRole('button',{name:'첨삭 준비 중'})).toBeDisabled();
});
it('does not invent years/questions for Kookmin without registered records',async()=>{
 state.load.mockResolvedValue([]);render(<SourceExamSelection sourceId="kookmin" registeredOnly/>);
 await waitFor(()=>expect(fetch).toHaveBeenCalled());expect(screen.getAllByRole('option')).toHaveLength(3);
 expect(screen.queryByRole('textbox')).toBeNull();
});
