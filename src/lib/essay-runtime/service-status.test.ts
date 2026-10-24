import {beforeEach,expect,it,vi} from 'vitest';
import {onRequestGet} from '../../../functions/api/essay/service-status';
import {legendStudySupabaseUrl} from '../auth-config';
const f=vi.hoisted(()=>({admission:vi.fn(),math:vi.fn(),request:vi.fn()}));
vi.mock('../../../functions/api/essay/exam',()=>({onRequestPost:f.admission}));
vi.mock('../../../functions/api/essay/availability',()=>({onRequestGet:f.math}));
vi.mock('../math-release/server/transport',()=>({serverTransport:()=>({request:f.request})}));
const exam='11111111-1111-4111-8111-111111111111',question='22222222-2222-4222-8222-222222222222',university='33333333-3333-4333-8333-333333333333';
const env={MATH_ORIGIN:'https://lab.legendstudy.com',MATH_SUPABASE_URL:legendStudySupabaseUrl,ESSAY_PUBLIC_EXAMS:exam};
const request=()=>new Request(env.MATH_ORIGIN+'/api/essay/service-status',{headers:{Authorization:'Bearer existing-session'}});
beforeEach(()=>{vi.resetAllMocks();f.admission.mockImplementation(async({request}:{request:Request})=>{expect(await request.json()).toEqual({action:'availability',examId:exam});return Response.json({ready:true,questionIds:[question]});});f.math.mockImplementation(async()=>Response.json({types:{math:false}}));f.request.mockImplementation(async()=>Response.json([{id:exam,university_id:university}]));});
it('projects only actual admitted questions joined to canonical university identity',async()=>{
 const r=await onRequestGet({request:request(),env});expect(r.headers.get('Cache-Control')).toBe('private, no-store');
 expect(await r.json()).toMatchObject({checked:true,exams:[{examId:exam,universityId:university,questionIds:[question]}]});expect(f.request.mock.calls[0][0]).toContain('/rest/v1/essay_exams?');
});
it('does not activate from the configured exam list when worker admission denies',async()=>{f.admission.mockResolvedValue(Response.json({ready:false,questionIds:[]}));expect((await (await onRequestGet({request:request(),env})).json()).exams).toEqual([]);expect(f.request).not.toHaveBeenCalled();});
it('fails closed for missing identity, cross-origin host, and lookup failures',async()=>{
 for(const r of [new Request(env.MATH_ORIGIN+'/api/essay/service-status'),new Request('https://other.example/api/essay/service-status',{headers:{Authorization:'Bearer token'}})])expect((await (await onRequestGet({request:r,env})).json()).exams).toEqual([]);
 expect(f.admission).not.toHaveBeenCalled();f.request.mockRejectedValue(Error('offline'));expect((await (await onRequestGet({request:request(),env})).json()).checked).toBe(false);
});
it('does not infer a university when the canonical lookup cannot resolve the admitted exam',async()=>{f.request.mockResolvedValue(Response.json([]));expect((await (await onRequestGet({request:request(),env})).json()).exams).toEqual([]);});
