import {describe,it,expect,vi} from 'vitest';
import {onRequestPost} from '../../../../functions/api/essay/connection';
vi.mock('../../math-release/server/transport',()=>({serverTransport:()=>({subject:vi.fn(async()=>{throw Error('denied');})})}));
describe('connection probe boundary',()=>{
 it('does not run when evaluation is enabled',async()=>{const r=await onRequestPost({request:new Request('https://lab.legendstudy.com/api/essay/connection',{method:'POST'}),env:{ESSAY_EXAM_RUNTIME_ENABLED:'true'}});expect(r.status).toBe(409);});
 it('requires a bearer and rejects foreign origins',async()=>{for(const [headers,status] of [[{},401],[{Origin:'https://other.example'},403]] as const){const r=await onRequestPost({request:new Request('https://lab.legendstudy.com/api/essay/connection',{method:'POST',headers}),env:{MATH_ORIGIN:'https://lab.legendstudy.com'}});expect(r.status).toBe(status);}});
 it('rejects unauthorised users before reading registry or dispatching queue',async()=>{const r=await onRequestPost({request:new Request('https://lab.legendstudy.com/api/essay/connection',{method:'POST',headers:{Authorization:'Bearer invalid'}}),env:{}});expect(r.status).toBe(403);});
});
