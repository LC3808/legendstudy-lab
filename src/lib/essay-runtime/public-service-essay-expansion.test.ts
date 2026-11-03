import {beforeEach,expect,it,vi} from 'vitest';
const fixture=vi.hoisted(()=>({
 examId:'11111111-1111-4111-8111-111111111111',
 universityId:'33333333-3333-4333-8333-333333333333',
 questionIds:['22222222-2222-4222-8222-222222222222'],
 packageDigest:'a'.repeat(64),label:'Verified social essay fixture',mode:'essay',mathQuestions:{},
}));
const m=vi.hoisted(()=>({subject:vi.fn(),rpcRaw:vi.fn(),math:vi.fn()}));
vi.mock('../../../functions/api/essay/availability',()=>({onRequestGet:m.math}));
vi.mock('../math-release/server/transport',()=>({serverTransport:()=>m}));
vi.mock('./server/registry-credential',()=>({registryWorkerCredential:()=> 'worker-fixture'}));
vi.mock('../materials/student-asset',()=>({studentPdfForExam:()=>({})}));
vi.mock('../../data/essay-beta-expansion.json',()=>({default:{exams:[fixture]}}));
vi.mock('../../data/essay-whole-exam-release-evidence.json',()=>({default:{exams:[]}}));
vi.mock('../../data/essay-partial-exam-release-evidence.json',()=>({default:{exams:[]}}));
vi.mock('./public-discovery',()=>({publicCatalog:{universities:[{sourceUniversityId:'social-fixture',universityId:fixture.universityId}]}}));
import {onRequestGet} from '../../../functions/api/essay/public-service-status';
const origin='https://lab.legendstudy.com';
const env={MATH_ORIGIN:origin,MATH_PROJECT_REF:'stlhijzpjfgwwdgunlsd',MATH_SUPABASE_URL:'https://stlhijzpjfgwwdgunlsd.supabase.co',ESSAY_EXAM_RUNTIME_ENABLED:'true',ESSAY_PUBLIC_EXAMS:fixture.examId,ESSAY_BETA_EXPANSION_EXAMS:fixture.examId};
const send=()=>onRequestGet({env,request:new Request(origin+'/api/essay/public-service-status',{headers:{Authorization:'Bearer fixture'}})});
beforeEach(()=>{
 vi.resetAllMocks();m.subject.mockResolvedValue(fixture.universityId);
 m.math.mockRejectedValue(new Error('MATH_UNAVAILABLE'));
 m.rpcRaw.mockImplementation(async name=>name==='essay_exam_session_ready'?'exam-session-v1':name==='essay_exam_preflight'?{package_digest:fixture.packageDigest}:[{examId:fixture.examId,universityId:fixture.universityId,questions:fixture.questionIds.map(id=>({id}))}]);
});
it('admits an approved Essay-only social exam without a Math Provider dependency',async()=>{
 const response=await send();expect(response.status).toBe(200);
 expect((await response.json()).exams).toEqual([{examId:fixture.examId,universityId:fixture.universityId,questionIds:fixture.questionIds}]);
 expect(m.math).not.toHaveBeenCalled();
 expect(m.rpcRaw).toHaveBeenCalledWith('essay_exam_preflight',{p_subject:fixture.universityId,p_exam:fixture.examId},'worker-fixture');
});
it('still rejects changed official evidence and incomplete question linkage',async()=>{
 m.rpcRaw.mockImplementation(async name=>name==='essay_exam_session_ready'?'exam-session-v1':name==='essay_exam_preflight'?{package_digest:'changed'}:[{examId:fixture.examId,universityId:fixture.universityId,questions:fixture.questionIds.map(id=>({id}))}]);
 expect((await send()).status).toBe(503);
 m.rpcRaw.mockImplementation(async name=>name==='essay_exam_session_ready'?'exam-session-v1':[{examId:fixture.examId,universityId:fixture.universityId,questions:[]}]);
 expect((await send()).status).toBe(503);expect(m.math).not.toHaveBeenCalled();
});
