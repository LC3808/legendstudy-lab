import {beforeEach,expect,it,vi} from 'vitest';
import {onRequestGet} from '../../../functions/api/essay/service-status';
import {legendStudySupabaseUrl} from '../auth-config';
const f=vi.hoisted(()=>({admission:vi.fn(),math:vi.fn()}));
vi.mock('../../../functions/api/essay/exam',()=>({onRequestPost:f.admission}));
vi.mock('../../../functions/api/essay/availability',()=>({onRequestGet:f.math}));
const exam='11111111-1111-4111-8111-111111111111',question='22222222-2222-4222-8222-222222222222';
const env={MATH_ORIGIN:'https://lab.legendstudy.com',MATH_SUPABASE_URL:legendStudySupabaseUrl,ESSAY_PUBLIC_EXAMS:exam};
const request=()=>new Request(env.MATH_ORIGIN+'/api/essay/service-status',{headers:{Authorization:'Bearer existing-session'}});
beforeEach(()=>{vi.resetAllMocks();f.admission.mockImplementation(async({request}:{request:Request})=>{expect(await request.json()).toEqual({action:'availability',examId:exam});return Response.json({ready:true,questionIds:[question]});});f.math.mockImplementation(async()=>Response.json({types:{math:false}}));});
it('returns admitted exam/question identities without a direct table read',async()=>{
 const r=await onRequestGet({request:request(),env});expect(r.headers.get('Cache-Control')).toBe('private, no-store');
 expect(await r.json()).toMatchObject({checked:true,exams:[{examId:exam,questionIds:[question]}]});
});
it('does not activate from the configured exam list when worker admission denies',async()=>{f.admission.mockResolvedValue(Response.json({ready:false,questionIds:[]}));expect((await (await onRequestGet({request:request(),env})).json()).exams).toEqual([]);});
it('fails closed for missing identity, cross-origin host, and lookup failures',async()=>{
 for(const r of [new Request(env.MATH_ORIGIN+'/api/essay/service-status'),new Request('https://other.example/api/essay/service-status',{headers:{Authorization:'Bearer token'}})])expect((await (await onRequestGet({request:r,env})).json()).exams).toEqual([]);
 expect(f.admission).not.toHaveBeenCalled();f.admission.mockRejectedValue(Error('offline'));expect((await (await onRequestGet({request:request(),env})).json()).checked).toBe(false);
});
it('merges existing math admission without inventing university metadata',async()=>{f.admission.mockResolvedValue(Response.json({ready:false}));f.math.mockResolvedValue(Response.json({types:{math:true},mathQuestions:[{examId:exam,questionId:question}]}));expect((await (await onRequestGet({request:request(),env})).json()).exams).toEqual([{examId:exam,questionIds:[question]}]);});

it('does not report zero when admission lookup fails',async()=>{f.admission.mockResolvedValue(Response.json({ready:false},{status:503}));expect((await (await onRequestGet({request:request(),env})).json()).checked).toBe(false);});
it('does not report a partial total when math lookup is unverified',async()=>{f.math.mockResolvedValue(Response.json({checked:false,types:{math:false}}));expect((await (await onRequestGet({request:request(),env})).json()).checked).toBe(false);});
