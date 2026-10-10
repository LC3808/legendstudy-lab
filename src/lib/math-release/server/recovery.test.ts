import {describe,it,expect,vi} from 'vitest';
import {recoveryGateway} from './recovery';
const id='00000000-0000-4000-8000-000000000001';
const request=(body:unknown={evaluation_id:id},origin='https://test.example',auth=true)=>new Request('https://test.example/api/math/recover',{method:'POST',headers:{origin,...(auth?{authorization:'Bearer fixture'}:{})},body:JSON.stringify(body)});
function setup(state='PROCESSING',enabled=true){
 const recover=vi.fn(async()=>true),authenticate=vi.fn(async()=>true);
 const rpc=vi.fn(async()=>({result:{evaluation_id:id,evaluation_state:state}}));
 return {recover,authenticate,rpc,handler:recoveryGateway({enabled,origin:'https://test.example',authenticate,student:()=>({rpc}),recover})};
}
describe('recovery existing owner and SQL authority',()=>{
 it('disabled denies without auth or recovery',async()=>{const p=setup('PROCESSING',false);expect((await p.handler(request())).status).toBe(503);expect(p.authenticate).not.toHaveBeenCalled();});
 it('rejects origin and anonymous',async()=>{const p=setup();expect((await p.handler(request({},'https://foreign.example'))).status).toBe(403);expect((await p.handler(request({},undefined,false))).status).toBe(401);expect(p.recover).not.toHaveBeenCalled();});
 it('rejects extra fields and invalid ids',async()=>{for(const body of [{evaluation_id:id,student_id:id},{evaluation_id:1},{}]){const p=setup();expect((await p.handler(request(body))).status).toBe(400);expect(p.recover).not.toHaveBeenCalled();}});
 it('foreign owner denied before worker',async()=>{const p=setup();p.rpc.mockRejectedValue(Error('private'));expect((await p.handler(request())).status).toBe(409);expect(p.recover).not.toHaveBeenCalled();});
 it.each(['COMPLETED','FAILED','INVALIDATED'])('leaves terminal %s untouched',async state=>{const p=setup(state);expect((await p.handler(request())).status).toBe(200);expect(p.recover).not.toHaveBeenCalled();});
 it('rechecks owner state after canonical recovery',async()=>{const p=setup();p.rpc.mockResolvedValueOnce({result:{evaluation_id:id,evaluation_state:'PROCESSING'}}).mockResolvedValueOnce({result:{evaluation_id:id,evaluation_state:'FAILED'}});expect(await (await p.handler(request())).json()).toEqual({code:'RECOVERED'});expect(p.recover).toHaveBeenCalledExactlyOnceWith(id);expect(p.rpc).toHaveBeenCalledTimes(2);});
 it('unexpired lease remains unchanged',async()=>{const p=setup();p.recover.mockResolvedValue(false);expect(await (await p.handler(request())).json()).toEqual({code:'STATUS_UNCHANGED'});});
 it('unknown recovery result never claims release',async()=>{const p=setup();p.recover.mockRejectedValue(Error('private'));const r=await p.handler(request());expect(r.status).toBe(409);expect(await r.text()).not.toContain('private');});
});
