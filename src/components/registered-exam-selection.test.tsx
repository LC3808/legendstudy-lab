// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {SourceExamSelection} from './source-exam-selection';
vi.mock('client-only',()=>({}));
vi.mock('@/lib/my/essay-dashboard',()=>({readEssayDashboard:vi.fn(async()=>[]),readMathDashboard:vi.fn(async()=>[])}));
const state=vi.hoisted(()=>({user:{id:'operator'} as {id:string}|null,load:vi.fn(),client:{auth:{getSession:vi.fn()}}}));
vi.mock('./auth-context',()=>({useAuth:()=>state}));
vi.mock('@/lib/essay-runtime/registered-material-catalog',async importOriginal=>({...await importOriginal<typeof import('@/lib/essay-runtime/registered-material-catalog')>(),loadRegisteredMaterials:state.load}));
const id='00000000-0000-4000-8000-000000000001';
const exam={key:`registered:${id}`,dbExamId:id,universityId:id,sourceUniversityId:'gachon',year:2027,kind:'mock',track:'의예',session:'모의 의예',campus:null,verification:'REVIEW_REQUIRED',sourceHashes:[],evaluationReady:false,questions:[{key:`registered:${id}`,dbQuestionId:id,label:'문제 1',inputMode:'image',sourceLocator:null,lengthLabel:null,accountDraftReady:false}]};
beforeEach(()=>{state.user={id:'operator'};state.client.auth.getSession.mockResolvedValue({data:{session:{user:{id:'operator'},access_token:'fixture'}}});state.load.mockReset().mockResolvedValue([exam]);vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>Response.json({version:'essay-source-registry-v1',exams:[],ready:false})));});
afterEach(()=>vi.unstubAllGlobals());
it('selects the registered mock exam, saves a local draft and blocks unreviewed submission',async()=>{
 render(<SourceExamSelection sourceId="gachon" registeredOnly/>);
 const input=await screen.findByLabelText('문제 1 수식·텍스트 답안');await waitFor(()=>expect(input).toBeEnabled());
 expect(screen.getByLabelText('학년도·시험')).toHaveValue('2027:mock');
 expect(screen.queryByRole('tablist',{name:'문항 선택'})).toBeNull();
 fireEvent.change(input,{target:{value:'합성 테스트 답안'}});
 expect(input).toHaveValue('합성 테스트 답안');expect(await screen.findByRole('button',{name:'첨삭 서비스 제공 예정'})).toBeDisabled();
 expect(screen.queryByRole('button',{name:'계정 답안 확인·저장'})).toBeNull();
 expect(vi.mocked(fetch).mock.calls.every(([url,init])=>url==='/api/essay/availability'||(url==='/api/essay/exam'&&JSON.parse(String(init?.body)).action==='availability'))).toBe(true);
 expect(screen.queryByRole('link',{name:/자료 검수/})).toBeNull();
 expect(screen.getByText(/문제 원문은 상단 공식 논술 자료/)).toBeInTheDocument();
});
it('clears old account view and reloads public metadata on logout',async()=>{
 const view=render(<SourceExamSelection sourceId="gachon" registeredOnly/>);
 await screen.findByLabelText('문제 1 수식·텍스트 답안');state.user=null;state.client.auth.getSession.mockResolvedValue({data:{session:null}});
 view.rerender(<SourceExamSelection sourceId="gachon" registeredOnly/>);
 expect(screen.queryByLabelText('문제 1 수식·텍스트 답안')).toBeNull();expect(screen.queryByRole('option',{name:'2027학년도 모의논술'})).toBeNull();
 await waitFor(()=>expect(state.load).toHaveBeenCalledTimes(2));
 expect(await screen.findByText('로그인 후 첨삭 가능 여부를 확인할 수 있습니다.')).toBeVisible();
});
it('does not invent years/questions for Kookmin without registered records',async()=>{
 state.load.mockResolvedValue([]);render(<SourceExamSelection sourceId="kookmin" registeredOnly/>);
 await waitFor(()=>expect(fetch).toHaveBeenCalled());expect(screen.getAllByRole('option')).toHaveLength(2);
 expect(screen.queryByRole('textbox')).toBeNull();
});

it('TASK16-J preserves registered exams and does not admit unrelated static source metadata',async()=>{
 vi.stubGlobal('location',{origin:'https://legendstudy-task16b.pages.dev'});
 vi.mocked(fetch).mockImplementation(async()=>Response.json({version:'essay-source-registry-v1',exams:[{...exam,year:2024,kind:'admission',track:'자연계열',verification:'VERIFIED'}],ready:false}));
 render(<SourceExamSelection sourceId="gachon" registeredOnly/>);
 await screen.findByRole('option',{name:'2027학년도 모의논술'});
 expect(screen.queryByRole('option',{name:'2024학년도 수시논술'})).toBeNull();
 expect(state.load).toHaveBeenCalled();
 expect(fetch).toHaveBeenCalledWith('/api/essay/catalog',expect.objectContaining({method:'POST',headers:{Authorization:'Bearer fixture'}}));
 expect(await screen.findByRole('button',{name:'첨삭 서비스 제공 예정'})).toBeDisabled();
});

it('TASK16-J exposes Q1/Q2 photo input for the exact TEST natural exam while submission remains server-gated',async()=>{
 const {task16gExam}=await import('@/lib/essay-runtime/task16g-test-catalog');
 state.load.mockResolvedValue([]);
 vi.stubGlobal('location',{origin:'https://legendstudy-task16b.pages.dev'});
 vi.mocked(fetch).mockImplementation(async url=>Response.json(url==='/api/essay/catalog'?{version:'essay-source-registry-v1',exams:[task16gExam]}:{ready:false,types:{math:false}}));
 render(<SourceExamSelection sourceId="hanyang" registeredOnly/>);
 await screen.findByLabelText('문제 1 수식·텍스트 답안');
 expect(screen.getByLabelText('학년도·시험')).toHaveValue('2024:admission');
 expect(screen.queryByText('문항 입력 유형을 확인 중입니다. 기존 답안은 보존됩니다.')).toBeNull();
 expect(screen.queryByRole('button',{name:'수리논술 첨삭 서비스 준비 중'})).toBeNull();
 expect(screen.getAllByText('답안 이미지 첨부').length).toBeGreaterThan(0);
 expect(await screen.findByRole('button',{name:'첨삭 서비스 제공 예정'})).toBeDisabled();
});

it('TASK16-J keeps registered 2026 Commerce beside reviewed 2024 natural input metadata',async()=>{
 const {task16gExam}=await import('@/lib/essay-runtime/task16g-test-catalog');
 vi.stubGlobal('location',{origin:'https://legendstudy-task16b.pages.dev'});
 state.load.mockResolvedValue([{...exam,sourceUniversityId:'hanyang',year:2026,kind:'admission',track:'상경계열'}]);
 vi.mocked(fetch).mockImplementation(async url=>Response.json(url==='/api/essay/catalog'?{version:'essay-source-registry-v1',exams:[task16gExam]}:{ready:false}));
 render(<SourceExamSelection sourceId="hanyang" registeredOnly/>);
 await screen.findByRole('option',{name:'2026학년도 수시논술'});
 expect(screen.getByRole('option',{name:'2024학년도 수시논술'})).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('학년도·시험'),{target:{value:'2026:admission'}});
 expect(await screen.findByRole('option',{name:'상경계열'})).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('학년도·시험'),{target:{value:'2024:admission'}});
 expect(await screen.findByText('공식 문제 PDF 2쪽')).toBeInTheDocument();
});
