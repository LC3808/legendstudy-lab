import { beforeEach, expect, it, vi } from 'vitest';
import { onRequestPost } from '../../../../functions/api/math/artifact';
import { sha256 } from './request';
const mocks = vi.hoisted(() => ({subject:vi.fn(),rpcRaw:vi.fn(),request:vi.fn(),rpc:vi.fn()}));
vi.mock('./transport', () => ({serverTransport:()=>({...mocks,rpc:()=>({rpc:mocks.rpc})}),publicMathLeaves:(env:{MATH_PUBLIC_LEAVES?:string})=>env.MATH_PUBLIC_LEAVES?.split(',')??[]}));
const id='00000000-0000-4000-8000-000000000001';
const bytes=new Uint8Array([137,80,78,71,13,10,26,10,0]);
const env={MATH_ENABLED:'true',MATH_ORIGIN:'https://test.example',MATH_EXTRACTION_WORKER_JWT:'synthetic-worker'};
const invoke=(body:unknown={artifact_id:id},options={})=>onRequestPost({request:new Request('https://test.example/api/math/artifact',{method:'POST',headers:{origin:env.MATH_ORIGIN,authorization:'Bearer synthetic'},body:JSON.stringify(body)}),env:{...env,...options}});
beforeEach(async()=>{vi.resetAllMocks();mocks.subject.mockResolvedValue('owner');mocks.rpcRaw.mockResolvedValue({artifact_id:id,attempt_id:'attempt',bucket:'math-private',object_key:'private/image.png',byte_size:bytes.length,content_sha256:await sha256(bytes),media_type:'image/png',storage_state:'PRESENT'});mocks.request.mockImplementation(async()=>new Response(bytes));});
it('returns verified original only after active owner check, without exposing storage credentials',async()=>{
 const response=await invoke();expect(response.status).toBe(200);expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);expect(response.headers.get('cache-control')).toBe('no-store');
 expect(mocks.rpcRaw).toHaveBeenCalledWith('math_artifact_storage',{p_subject:'owner',p_artifact:id,p_action:'describe'},'synthetic-worker');
 expect(mocks.request).toHaveBeenCalledWith('/storage/v1/object/authenticated/math-private/private/image.png','synthetic-worker');
});
it('foreign artifact denies before storage; error does not disclose private details',async()=>{
 mocks.rpcRaw.mockRejectedValue(Error('private ownership detail'));const response=await invoke();expect(response.status).toBe(404);expect(mocks.request).not.toHaveBeenCalled();expect(await response.text()).not.toContain('private ownership');
});
it('unreleased leaf cannot read original',async()=>{
 mocks.rpc.mockResolvedValue({result:{attempt:{leaf_id:'other'}}});expect((await invoke(undefined,{MATH_PUBLIC_LEAVES:id})).status).toBe(404);expect(mocks.request).not.toHaveBeenCalled();
});
it.each(['hash','size','mime','state'])('rejects invalid original %s',async kind=>{
 const row=await mocks.rpcRaw();if(kind==='hash')row.content_sha256='0'.repeat(64);if(kind==='size')row.byte_size--;if(kind==='mime')row.media_type='image/jpeg';if(kind==='state')row.storage_state='REGISTERED';
 expect((await invoke()).status).toBe(404);
});
it('client cannot choose subject or storage path',async()=>{
 expect((await invoke({artifact_id:id,p_subject:'other'})).status).toBe(404);expect(mocks.subject).not.toHaveBeenCalled();expect(mocks.request).not.toHaveBeenCalled();
});
