import {afterEach,expect,it,vi} from 'vitest';
import {serverTransport} from './transport';
afterEach(()=>vi.unstubAllGlobals());
it('only configured worker secrets replace the apikey; students retain JWT identity',async()=>{
 const fetcher=vi.fn(async(_url:unknown,_init:RequestInit)=>Response.json({result:{}}));vi.stubGlobal('fetch',fetcher);
 const t=serverTransport({MATH_PROJECT_REF:'test',MATH_SUPABASE_URL:'https://test.supabase.co',MATH_SUPABASE_PUBLISHABLE_KEY:'publishable',MATH_EVALUATION_WORKER_JWT:'sb_secret_fixture'});
 await t.request('/rest/v1/rpc/math_evaluation','sb_secret_fixture');
 expect(fetcher.mock.calls[0][1].headers).toEqual({apikey:'sb_secret_fixture'});
 await t.request('/rest/v1/rpc/math_input','student-jwt');
 expect(fetcher.mock.calls[1][1].headers).toEqual({apikey:'publishable',Authorization:'Bearer student-jwt'});
 await t.request('/rest/v1/rpc/math_input','sb_secret_unconfigured');
 expect(fetcher.mock.calls[2][1].headers).toEqual({apikey:'publishable',Authorization:'Bearer sb_secret_unconfigured'});
});
