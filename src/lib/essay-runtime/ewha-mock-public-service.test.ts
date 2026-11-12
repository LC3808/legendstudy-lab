import {beforeEach,expect,it,vi} from 'vitest';
import scope from '../../../scripts/deployment/ewha-mock-public-scope.json';
const m=vi.hoisted(()=>({subject:vi.fn(),rpcRaw:vi.fn(),math:vi.fn()}));
vi.mock('../../../functions/api/essay/availability',()=>({onRequestGet:m.math}));
vi.mock('../math-release/server/transport',()=>({serverTransport:()=>m}));
vi.mock('./server/registry-credential',()=>({registryWorkerCredential:()=> 'worker-contract-fixture'}));
import {onRequestGet} from '../../../functions/api/essay/public-service-status';
const origin='https://lab.legendstudy.com';
const env={MATH_ORIGIN:origin,MATH_PROJECT_REF:'stlhijzpjfgwwdgunlsd',MATH_SUPABASE_URL:'https://stlhijzpjfgwwdgunlsd.supabase.co',ESSAY_EXAM_RUNTIME_ENABLED:'true',ESSAY_PUBLIC_EXAMS:scope.exams.map(e=>e.examId).join(','),ESSAY_BETA_EXPANSION_EXAMS:scope.exams.map(e=>e.examId).join(',')};
const catalog=scope.exams.map(e=>({examId:e.examId,universityId:e.universityId,questions:e.questionIds.map(id=>({id}))}));
const preflight=(args:{p_exam:string})=>({package_digest:scope.exams.find(e=>e.examId===args.p_exam)?.packageDigest});
const send=(auth=true)=>onRequestGet({env,request:new Request(origin+'/api/essay/public-service-status',{headers:auth?{Authorization:'Bearer local-contract-fixture'}:{}})});
beforeEach(()=>{
 vi.resetAllMocks();m.subject.mockResolvedValue('00000000-0000-4000-8000-000000000001');
 m.math.mockImplementation(async()=>Response.json({checked:true,types:{math:true},mathQuestions:scope.exams.flatMap(e=>Object.entries(e.mathQuestions).map(([questionId,leafId])=>({examId:e.examId,questionId,leafId})))}));
 m.rpcRaw.mockImplementation(async(name,args)=>name==='essay_exam_session_ready'?'exam-session-v1':name==='essay_exam_preflight'?preflight(args):catalog);
});
it('exposes exactly the 8 complete Ewha mock exams / 24 question IDs to shared WEB and APP discovery without a Provider',async()=>{
 const response=await send();expect(response.status).toBe(200);const data=await response.json();expect(data.checked).toBe(true);expect(data.exams).toHaveLength(8);expect(data.exams.flatMap((e:{questionIds:string[]})=>e.questionIds)).toHaveLength(24);
 for(const exam of scope.exams)expect(data.exams).toContainEqual({examId:exam.examId,universityId:exam.universityId,questionIds:exam.questionIds});
 const policies=m.rpcRaw.mock.calls.filter(([name])=>name==='essay_exam_preflight');expect(policies).toHaveLength(4);expect(policies.map(([,args])=>args.p_exam).sort()).toEqual(scope.exams.filter(e=>e.mode==='essay').map(e=>e.examId).sort());
 expect(m.rpcRaw.mock.calls.every(([name])=>['essay_exam_session_ready','essay_exam_preflight','essay_browse_catalog'].includes(name))).toBe(true);
});
it('fails closed if the official Essay package digest changes',async()=>{
 const changed=scope.exams.find(e=>e.mode==='essay')!.examId;
 m.rpcRaw.mockImplementation(async(name,args)=>name==='essay_exam_session_ready'?'exam-session-v1':name==='essay_exam_preflight'?(args.p_exam===changed?{package_digest:'changed'}:preflight(args)):catalog);
 const response=await send();expect(response.status).toBe(503);expect((await response.json()).checked).toBe(false);
});
it('does not resolve private Registry or Math contracts without an authenticated subject',async()=>{
 expect((await send(false)).status).toBe(401);expect(m.subject).not.toHaveBeenCalled();expect(m.rpcRaw).not.toHaveBeenCalled();expect(m.math).not.toHaveBeenCalled();
});
