import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({publicStatus:vi.fn()}));
vi.mock('../../../functions/api/essay/public-service-status',()=>({onRequestGet:mocks.publicStatus}));
import {onRequestGet} from '../../../functions/api/essay/service-status';
const context={env:{},request:new Request('https://lab.legendstudy.com/api/essay/service-status')};
beforeEach(()=>vi.resetAllMocks());
it('projects the exact WEB public sessions for Native without adding leaf-only exams',async()=>{
 mocks.publicStatus.mockResolvedValue(Response.json({checked:true,exams:[{examId:'exam',universityId:'university',questionIds:['q1','q2']}]}));
 const result=await onRequestGet(context);
 expect(await result.json()).toEqual({version:'essay-service-status-v1',checked:true,exams:[{examId:'exam',questionIds:['q1','q2']}]});
 expect(mocks.publicStatus).toHaveBeenCalledExactlyOnceWith(context);
 expect(result.headers.get('Cache-Control')).toBe('private, no-store');
});
it.each([401,503])('preserves authentication/lookup failure %s rather than claiming no service',async status=>{
 mocks.publicStatus.mockResolvedValue(Response.json({checked:false,exams:[{examId:'untrusted'}]},{status}));
 const result=await onRequestGet(context);expect(result.status).toBe(status);expect(await result.json()).toMatchObject({checked:false,exams:[]});
});
it('preserves verified absence',async()=>{
 mocks.publicStatus.mockResolvedValue(Response.json({checked:true,exams:[]}));
 expect(await(await onRequestGet(context)).json()).toMatchObject({checked:true,exams:[]});
});
