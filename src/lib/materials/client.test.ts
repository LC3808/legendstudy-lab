import {it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {materialsClient} from './client';
vi.mock('./pdf',()=>({hashPdf:vi.fn(async(bytes:Uint8Array)=>bytes[0]===37?'a'.repeat(64):'b'.repeat(64)),openPdf:vi.fn(async()=>({numPages:2,destroy:vi.fn()}))}));
function fixture(recovered:number){
 const rpc=vi.fn(async(name:string)=>({data:name==='essay_material_documents'?[]:{sha256:'a'.repeat(64)},error:null}));
 const download=vi.fn(async()=>({data:{arrayBuffer:async()=>new Uint8Array([recovered]).buffer},error:null}));
 const client={rpc,storage:{from:()=>({upload:async()=>({error:{message:'conflict'}}),download})}} as unknown as SupabaseClient;
 const file={name:'question.pdf',arrayBuffer:async()=>new Uint8Array([37]).buffer} as File;
 return {rpc,file,service:materialsClient(client)};
}
it('recovers an uploaded immutable object when metadata registration previously failed',async()=>{const f=fixture(37);await f.service.upload(f.file);expect(f.rpc).toHaveBeenCalledWith('essay_material_register',expect.objectContaining({p_pages:2}));});
it('does not register a different object after an upload error',async()=>{const f=fixture(0);await expect(f.service.upload(f.file)).rejects.toThrow('UPLOAD_FAILED');expect(f.rpc).not.toHaveBeenCalledWith('essay_material_register',expect.anything());});
