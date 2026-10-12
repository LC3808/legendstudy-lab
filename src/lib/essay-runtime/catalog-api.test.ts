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
