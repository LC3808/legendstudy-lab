import {beforeEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({subject:vi.fn(),rpcRaw:vi.fn(),math:vi.fn(),worker:vi.fn()}));
vi.mock('../math-release/server/transport',()=>({serverTransport:()=>m}));
vi.mock('./server/registry-credential',()=>({registryWorkerCredential:()=> 'worker-fixture'}));
vi.mock('../materials/student-asset',()=>({studentPdfForExam:()=>({})}));
vi.mock('../../data/essay-whole-exam-release-evidence.json',()=>({default:{exams:[{examId:'11111111-1111-4111-8111-111111111111',universityId:'33333333-3333-4333-8333-333333333333',questionIds:['22222222-2222-4222-8222-222222222222'],packageDigest:'digest'}]}}));
vi.mock('./public-discovery',()=>({publicCatalog:{universities:[{sourceUniversityId:'cau',universityId:'33333333-3333-4333-8333-333333333333'},{sourceUniversityId:'korea',universityId:'a93ec9df-2096-4550-801f-07a25b9a437b'}]}}));
import {onRequestGet} from '../../../functions/api/essay/public-service-status';
import {legendStudySupabaseUrl} from '../auth-config';
const exam='11111111-1111-4111-8111-111111111111',q='22222222-2222-4222-8222-222222222222',uni='33333333-3333-4333-8333-333333333333';
const env={MATH_ORIGIN:'https://lab.legendstudy.com',MATH_SUPABASE_URL:legendStudySupabaseUrl,ESSAY_EXAM_RUNTIME_ENABLED:'true',ESSAY_PUBLIC_EXAMS:exam,ESSAY_REVIEWED_WORKER:{fetch:m.worker}};
const send=(extra={})=>onRequestGet({env:{...env,...extra},request:new Request(env.MATH_ORIGIN+'/api/essay/public-service-status',{headers:{Authorization:'Bearer fixture'}})});
beforeEach(()=>{vi.resetAllMocks();m.subject.mockResolvedValue(uni);m.math.mockResolvedValue(Response.json({checked:true,mathQuestions:[]}));m.rpcRaw.mockImplementation(async(name)=>name==='essay_exam_session_ready'?'exam-session-v1':name==='essay_exam_preflight'?{package_digest:'digest'}:[{examId:exam,universityId:uni,questions:[{id:q}]}]);});
it('uses exact server scope and metadata without initializing Worker or reserving credit',async()=>{const r=await send();expect(r.status).toBe(200);expect(await r.json()).toMatchObject({checked:true,universityIds:[uni]});expect(m.rpcRaw).toHaveBeenCalledWith('essay_browse_catalog',{p_university:'cau'},'fixture');expect(m.rpcRaw).toHaveBeenCalledWith('essay_exam_preflight',{p_subject:uni,p_exam:exam},'worker-fixture');expect(m.worker).not.toHaveBeenCalled();});
it('empty valid policy is a verified absence',async()=>{expect(await(await send({ESSAY_PUBLIC_EXAMS:''})).json()).toMatchObject({checked:true,universityIds:[]});expect(m.rpcRaw).not.toHaveBeenCalled();});
it.each(['*',exam+','])('invalid policy %s is an error, never false absence',async scope=>{expect((await send({ESSAY_PUBLIC_EXAMS:scope})).status).toBe(503);});
it('RPC timeout or missing released exam is an error',async()=>{m.rpcRaw.mockRejectedValueOnce(Error('timeout'));expect((await send()).status).toBe(503);m.math.mockResolvedValue(Response.json({checked:true}));m.rpcRaw.mockResolvedValue([]);expect((await send()).status).toBe(503);});
it('auth failure cannot expose a configured release',async()=>{m.subject.mockRejectedValue(Error('unauthorized'));expect((await send()).status).toBe(503);expect(m.rpcRaw).not.toHaveBeenCalled();});

it('does not promote a partially connected public exam',async()=>{const other='44444444-4444-4444-8444-444444444444';expect(await(await send({ESSAY_PUBLIC_EXAMS:other})).json()).toMatchObject({checked:true,universityIds:[],exams:[]});});
it('changed package or complete question set fails with ERROR',async()=>{m.rpcRaw.mockImplementation(async name=>name==='essay_exam_session_ready'?'exam-session-v1':name==='essay_exam_preflight'?{package_digest:'changed'}:[{examId:exam,universityId:uni,questions:[{id:q}]}]);expect((await send()).status).toBe(503);});

it('exposes only the Owner-approved Korea question, never the whole exam',async()=>{
 const id='942c1c43-914f-5b99-9a30-e6474c363f6f',allowed='c1f90870-3ad9-59f8-afe3-c26d665f292f';
 m.rpcRaw.mockImplementation(async name=>name==='essay_exam_session_ready'?'exam-session-v1':name==='essay_exam_preflight'?{package_digest:'9afbeece5b9348c5402430f3bd215a9d8acf2c1ce0add6b38fffab78f7229ea4'}:[{examId:id,universityId:'a93ec9df-2096-4550-801f-07a25b9a437b',questions:[{id:allowed},{id:q}]}]);
 const response=await send({ESSAY_PUBLIC_EXAMS:id});expect(response.status).toBe(200);expect((await response.json()).exams).toEqual([{examId:id,universityId:'a93ec9df-2096-4550-801f-07a25b9a437b',questionIds:[allowed]}]);
 expect(m.worker).not.toHaveBeenCalled();
});
