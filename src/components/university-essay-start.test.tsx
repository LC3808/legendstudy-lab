// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
vi.mock('@/lib/essay-runtime/registered-material-catalog',()=>({loadRegisteredMaterials:vi.fn().mockResolvedValue([])}));
import {loadRegisteredMaterials} from '@/lib/essay-runtime/registered-material-catalog';
import {UniversityEssayStart} from './university-essay-start';
vi.mock('@/lib/essay-runtime/source-registry',()=>({sourceExams:()=>[]}));
const f=vi.hoisted(()=>({user:{id:'owner'} as {id:string}|null,client:{},exams:vi.fn(),questions:vi.fn()}));
vi.mock('./auth-context',()=>({useAuth:()=>({client:f.client,user:f.user,status:f.user?'authenticated':'anonymous'})}));
vi.mock('@/lib/essay-runtime/catalog',async original=>({...await original<typeof import('@/lib/essay-runtime/catalog')>(),loadExams:f.exams,loadQuestions:f.questions}));
vi.mock('./essay-service-workspace',()=>({EssayQuestionDraft:({questionId}:{questionId:string})=><textarea aria-label={`답안 ${questionId}`}/>}));
const base={id:'exam1',university_id:'u',admission_year:2025,exam_name:'언어형 1교시',field_or_division:'언어형',campus:null,official_source_url:'https://admission.skku.edu/question'};
beforeEach(()=>{f.user={id:'owner'};f.exams.mockReset().mockResolvedValue([base,{...base,id:'empty',admission_year:2027},{...base,id:'other',university_id:'other'}]);f.questions.mockReset().mockImplementation(async(_client:unknown,id:string)=>id==='exam1'?[{id:'q1',label:'문항 1'},{id:'q2',label:'문항 2'}]:[]);});
it('offers only registered nonempty years and keeps per-question answers while switching',async()=>{
 render(<UniversityEssayStart universityId="u" sourceId="skku"/>);
 await screen.findByRole('option',{name:'2025학년도'});expect(screen.queryByRole('option',{name:'2027학년도'})).toBeNull();
 expect(f.questions).not.toHaveBeenCalledWith(f.client,'other');
 fireEvent.change(screen.getByLabelText('학년도'),{target:{value:'2025'}});
 fireEvent.change(screen.getByLabelText('계열'),{target:{value:'언어형'}});
 fireEvent.change(screen.getByLabelText('문항'),{target:{value:'q1'}});
 fireEvent.change(screen.getByLabelText('답안 q1'),{target:{value:'내 최초 답안'}});
 fireEvent.click(screen.getByLabelText('문항 1 제출에 포함'));expect(screen.getByText('선택한 문항 1 / 2')).toBeVisible();
 fireEvent.change(screen.getByLabelText('문항'),{target:{value:'q2'}});
 expect(screen.getByLabelText('답안 q1')).not.toBeVisible();
 fireEvent.click(screen.getByText('전체 문항 선택'));expect(screen.getByText('선택한 문항 2 / 2')).toBeVisible();
 fireEvent.change(screen.getByLabelText('문항'),{target:{value:'q1'}});expect(screen.getByLabelText('답안 q1')).toHaveValue('내 최초 답안');
 expect(screen.getByText(/문항과 평가자료의 연결/)).toBeVisible();
 expect(screen.getByText(/같은 문항 집합/)).toBeVisible();
});
it('distinguishes guest access, load errors and empty catalog',async()=>{
 f.user=null;const v=render(<UniversityEssayStart universityId="u" sourceId="skku"/>);
 expect(screen.getByRole('link',{name:'로그인'})).toBeVisible();expect(f.exams).not.toHaveBeenCalled();
 f.user={id:'other'};f.exams.mockRejectedValueOnce(Error());v.rerender(<UniversityEssayStart universityId="u" sourceId="skku"/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('불러오지 못했습니다');
 f.user={id:'third'};f.exams.mockResolvedValue([]);v.rerender(<UniversityEssayStart universityId="u" sourceId="skku"/>);
 expect(await screen.findByText('기출문제를 준비하고 있어요.')).toBeVisible();
});
it('does not merge campuses or independent exams in the same track',async()=>{
 f.exams.mockResolvedValue([{...base,campus:'서울'}, {...base,id:'exam2',exam_name:'언어형 2교시',campus:'서울'}, {...base,id:'exam3',campus:'수원'}]);
 f.questions.mockResolvedValue([{id:'q1',label:'문항 1'}]);render(<UniversityEssayStart universityId="u" sourceId="skku"/>);
 await screen.findByRole('option',{name:'2025학년도'});fireEvent.change(screen.getByLabelText('학년도'),{target:{value:'2025'}});
 expect(screen.queryByRole('option',{name:'언어형'})).toBeNull();
 fireEvent.change(screen.getByLabelText('캠퍼스'),{target:{value:'서울'}});fireEvent.change(screen.getByLabelText('계열'),{target:{value:'언어형'}});
 expect(screen.getByLabelText('문항')).toBeDisabled();fireEvent.change(screen.getByLabelText('시험 회차'),{target:{value:'exam2'}});
 await waitFor(()=>expect(screen.getByLabelText('문항')).toBeEnabled());
});
it('selects a sole question without a second choice and permits explicit exclusion',async()=>{
 f.questions.mockResolvedValue([{id:'q1',label:'문항 1'}]);
 render(<UniversityEssayStart universityId="u" sourceId="skku"/>);
 await screen.findByRole('option',{name:'2025학년도'});
 fireEvent.change(screen.getByLabelText('학년도'),{target:{value:'2025'}});
 fireEvent.change(screen.getByLabelText('계열'),{target:{value:'언어형'}});
 expect(screen.getByLabelText('문항')).toHaveValue('q1');
 expect(screen.getByLabelText('답안 q1')).toBeVisible();
 expect(screen.getByLabelText('문항 1 제출에 포함')).toBeChecked();
 fireEvent.click(screen.getByLabelText('문항 1 제출에 포함'));
 expect(screen.getByText('선택한 문항 0 / 1')).toBeVisible();
});

it('merges newly registered metadata beside published exams without authorizing submission',async()=>{
 vi.mocked(loadRegisteredMaterials).mockResolvedValueOnce([{key:'registered:new',dbExamId:'new',universityId:'u',sourceUniversityId:'skku',year:2026,kind:'mock',track:'수리',session:'모의 수리',campus:null,verification:'REVIEW_REQUIRED',sourceHashes:[],evaluationReady:false,questions:[{key:'registered:newq',dbQuestionId:'newq',label:'신규 문항',sourceLocator:null,lengthLabel:null,accountDraftReady:false}]}]);
 render(<UniversityEssayStart universityId="u" sourceId="skku"/>);
 await screen.findByRole('option',{name:'2026학년도'});
 expect(screen.getByRole('option',{name:'2025학년도'})).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('학년도'),{target:{value:'2026'}});
 fireEvent.change(screen.getByLabelText('계열'),{target:{value:'수리'}});
 expect(screen.getByRole('option',{name:'신규 문항'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'첨삭 준비 중'})).toBeDisabled();
 expect(screen.queryByRole('textbox')).toBeNull();
});


it('separates admission and mock in the same year and clears the prior question on type change',async()=>{
 f.exams.mockResolvedValue([{...base,exam_kind:'admission'},{...base,id:'mock',exam_kind:'mock',exam_name:'모의 언어형'}]);
 f.questions.mockImplementation(async(_client:unknown,id:string)=>[{id:id==='mock'?'mockq':'admissionq',label:'문항 1'}]);
 render(<UniversityEssayStart universityId="u" sourceId="skku"/>);
 await screen.findByRole('option',{name:'2025학년도'});
 fireEvent.change(screen.getByLabelText('학년도'),{target:{value:'2025'}});
 expect(screen.getByLabelText('계열')).toBeDisabled();
 fireEvent.change(screen.getByLabelText('시험 유형'),{target:{value:'admission'}});
 fireEvent.change(screen.getByLabelText('계열'),{target:{value:'언어형'}});
 expect(screen.getByLabelText('문항')).toHaveValue('admissionq');
 fireEvent.change(screen.getByLabelText('시험 유형'),{target:{value:'mock'}});
 expect(screen.queryByLabelText('답안 admissionq')).toBeNull();
 expect(screen.getByLabelText('계열')).toHaveValue('언어형');
 expect(screen.getByLabelText('문항')).toHaveValue('mockq');
 expect(screen.queryByLabelText('시험 회차')).toBeNull();
});
