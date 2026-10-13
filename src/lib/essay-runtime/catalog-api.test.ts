import {it,expect,vi,afterEach} from 'vitest';
import {legendStudySupabaseUrl} from '../auth-config';
import {onRequestGet} from '../../../functions/api/essay/catalog';
import source from '@/data/essay-source-registry.json';
it('APP and WEB receive the same existing source keys and question metadata',async()=>{
 const response=await onRequestGet();const data=await response.json();
 expect(data.exams).toEqual(source.exams);expect(data.universities).toHaveLength(21);
 expect(data.exams.flatMap((e:{questions:unknown[]})=>e.questions)).toHaveLength(237);
 expect(data.exams.every((e:{evaluationReady:boolean})=>!e.evaluationReady)).toBe(true);
});

afterEach(()=>vi.unstubAllGlobals());
it('uses only anonymous publishable credentials and fails closed on catalog errors',async()=>{
 const request=vi.fn().mockResolvedValue(new Response('denied',{status:403}));vi.stubGlobal('fetch',request);
 const response=await onRequestGet({env:{MATH_SUPABASE_URL:legendStudySupabaseUrl,MATH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',MATH_EVALUATION_WORKER_JWT:'must-not-be-used'}});
 expect((await response.json()).exams).toEqual(source.exams);
 expect(request).toHaveBeenCalledTimes(1);
 const [url,init]=request.mock.calls[0];expect(url).toContain('is_published=eq.true');
 expect(init.headers).toEqual({apikey:'sb_publishable_test'});expect(init.redirect).toBe('error');
});
it('never requests another Supabase project',async()=>{
 const request=vi.fn();vi.stubGlobal('fetch',request);
 await onRequestGet({env:{MATH_SUPABASE_URL:'https://other.supabase.co',MATH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'}});
 expect(request).not.toHaveBeenCalled();
});

import {onRequestPost} from '../../../functions/api/essay/catalog';
const subject='00000000-0000-4000-8000-000000000001';
// Deliberately invalid signature: transport is mocked; never an operational token.
const workerFixture=[btoa(JSON.stringify({alg:'ES256'})).replace(/=/g,''),btoa(JSON.stringify({role:'essay_worker',exp:Math.floor(Date.now()/1000)+3600})).replace(/=/g,''),'fixture'].join('.');
const privateEnv={MATH_SUPABASE_URL:legendStudySupabaseUrl,MATH_PROJECT_REF:'stlhijzpjfgwwdgunlsd',MATH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',MATH_ALLOWED_SUBJECTS:subject,MATH_ORIGIN:'https://lab.legendstudy.com',ESSAY_REGISTRY_WORKER_JWT:workerFixture};
it('private registry authenticates the existing allowlist and never enables drafting or evaluation',async()=>{
 const exam=source.exams[0];
 const row={id:subject,essay_exam_id:subject,question_key:exam.questions[0].key,metadata_version:'source-registration-v1',is_published:false,essay_exams:{university_id:exam.universityId,admission_year:exam.year,exam_kind:exam.kind}};
 const request=vi.fn().mockResolvedValueOnce(Response.json({id:subject})).mockResolvedValueOnce(Response.json([row]));vi.stubGlobal('fetch',request);
 const r=await onRequestPost({request:new Request('https://lab.legendstudy.com/api/essay/catalog',{method:'POST',headers:{Authorization:'Bearer student'}}),env:privateEnv});
 expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toContain('no-store');
 const data=await r.json();expect(data.exams[0].questions[0]).toMatchObject({dbQuestionId:subject,accountDraftReady:false});expect(data.exams[0].evaluationReady).toBe(false);
 expect(request.mock.calls[0][1].headers.Authorization).toBe('Bearer student');
 expect(request.mock.calls[1][1].headers.Authorization).toBe(`Bearer ${workerFixture}`);
 expect(JSON.parse(request.mock.calls[1][1].body)).toEqual({p_subject:subject});
 expect(JSON.stringify(data)).not.toContain(workerFixture);
});
it('denies foreign origins, missing auth/configuration and unallowlisted subjects before RPC',async()=>{
 const request=vi.fn().mockResolvedValue(Response.json({id:'00000000-0000-4000-8000-000000000002'}));vi.stubGlobal('fetch',request);
 for(const headers of [{Origin:'https://evil.example',Authorization:'Bearer student'},{}] as Record<string,string>[]){
  const r=await onRequestPost({request:new Request('https://lab.legendstudy.com/api/essay/catalog',{method:'POST',headers}),env:privateEnv});expect([401,403]).toContain(r.status);
 }
 expect(request).not.toHaveBeenCalled();
 const r=await onRequestPost({request:new Request('https://lab.legendstudy.com/api/essay/catalog',{method:'POST',headers:{Authorization:'Bearer student'}}),env:privateEnv});expect(r.status).toBe(503);expect(request).toHaveBeenCalledTimes(1);
});
