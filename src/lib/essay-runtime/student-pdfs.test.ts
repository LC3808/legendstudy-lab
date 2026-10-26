import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({subject:vi.fn()}));
vi.mock('../math-release/server/transport',()=>({serverTransport:()=>m}));
import {onRequestGet} from '../../../functions/api/essay/student-pdfs';
import {legendStudySupabaseUrl} from '../auth-config';
const env={MATH_ORIGIN:'https://lab.legendstudy.com',MATH_SUPABASE_URL:legendStudySupabaseUrl};
const request=(auth=true)=>new Request(env.MATH_ORIGIN+'/api/essay/student-pdfs',{headers:auth?{Authorization:'Bearer fixture'}:{}});
beforeEach(()=>{vi.resetAllMocks();m.subject.mockResolvedValue('subject');});
it('serves only approved question PDFs with canonical identities and no evidence body',async()=>{
 const response=await onRequestGet({request:request(),env});
 const data=await response.json();expect(data.version).toBe('essay-student-pdfs-v1');expect(data.questions.length).toBeGreaterThan(0);
 for(const q of data.questions){expect(q).toMatchObject({kind:'student_question',verification:'VERIFIED',studentDisplay:'APPROVED'});expect(q.examId).toMatch(/^[a-f0-9-]{36}$/);expect(q.sha256).toBe(q.assetId);expect(q).not.toHaveProperty('official_solution');}
 expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
it('requires an authenticated fixed-origin deployment',async()=>{
 expect((await onRequestGet({request:request(false),env})).status).toBe(401);
 expect((await onRequestGet({request:request(),env:{...env,MATH_ORIGIN:'https://other.example'}})).status).toBe(503);
 expect(m.subject).not.toHaveBeenCalled();
});
