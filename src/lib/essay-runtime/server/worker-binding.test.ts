import {it,expect,vi,afterEach} from 'vitest';
import {reviewedWorkerBinding} from './worker-binding';
afterEach(()=>vi.unstubAllGlobals());
it('absent host stays closed and forbids insecure or credentialed origins',()=>{expect(reviewedWorkerBinding({})).toBeUndefined();for(const origin of ['http://private.example','https://u:p@private.example','https://private.example/path'])expect(()=>reviewedWorkerBinding({ESSAY_WORKER_ORIGIN:origin,ESSAY_WORKER_SERVICE_TOKEN:'x'.repeat(32)})).toThrow();});
it('preserves caller token and separate service credential only for fixed worker paths',async()=>{const f=vi.fn<typeof fetch>(async()=>Response.json({}));vi.stubGlobal('fetch',f);const w=reviewedWorkerBinding({ESSAY_WORKER_ORIGIN:'https://private.example',ESSAY_WORKER_SERVICE_TOKEN:'x'.repeat(32)})!;await w.fetch(new Request('https://essay-worker.internal/evaluate',{method:'POST',headers:{Authorization:'Bearer test-owner'},body:'{}'}));expect(f.mock.calls[0][0]).toBe('https://private.example/evaluate');expect(f.mock.calls[0][1]).toMatchObject({redirect:'manual',headers:{Authorization:'Bearer test-owner','X-Essay-Service-Token':'x'.repeat(32)}});await expect(w.fetch(new Request('https://evil.example/evaluate',{method:'POST'}))).rejects.toThrow();expect(f).toHaveBeenCalledTimes(1);});
it('does not forward credentials across redirects',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response(null,{status:302,headers:{Location:'https://other.example'}})));const w=reviewedWorkerBinding({ESSAY_WORKER_ORIGIN:'https://private.example',ESSAY_WORKER_SERVICE_TOKEN:'x'.repeat(32)})!;await expect(w.fetch(new Request('https://essay-worker.internal/admission',{method:'POST',body:'{}'}))).rejects.toThrow('WORKER_REDIRECT_DENIED');});

it('authenticates the Cloudflare binding and rejects redirects before returning to Pages',async()=>{
 const bound=vi.fn(async(request:Request)=>{expect(request.headers.get('Authorization')).toBe('Bearer caller');expect(request.headers.get('X-Essay-Service-Token')).toBe('s'.repeat(32));return Response.json({ready:true});});
 expect(reviewedWorkerBinding({ESSAY_REVIEWED_WORKER:{fetch:bound}})).toBeUndefined();
 const worker=reviewedWorkerBinding({ESSAY_REVIEWED_WORKER:{fetch:bound},ESSAY_WORKER_SERVICE_TOKEN:'s'.repeat(32)})!;
 const request=()=>new Request('https://essay-worker.internal/exam-admission',{method:'POST',headers:{Authorization:'Bearer caller'},body:'{}'});
 expect((await worker.fetch(request())).status).toBe(200);
 bound.mockImplementationOnce(async()=>new Response(null,{status:302}));
 await expect(worker.fetch(request())).rejects.toThrow('WORKER_REDIRECT_DENIED');
 await expect(worker.fetch(new Request('https://other.example/exam-admission',{method:'POST'}))).rejects.toThrow('INVALID_WORKER_REQUEST');
 expect(bound).toHaveBeenCalledTimes(2);
});
