import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({subject:vi.fn(),request:vi.fn(),dispatch:vi.fn()}));
vi.mock('../../math-release/server/transport',()=>({serverTransport:()=>m}));
vi.mock('./worker-binding',()=>({reviewedWorkerBinding:()=>({fetch:m.dispatch})}));
vi.mock('./registry-credential',()=>({registryWorkerCredential:()=> 'fixture-worker-only'}));
import {onRequestPost} from '../../../../functions/api/essay/exam';
const id='11111111-1111-4111-8111-111111111111';
const env={ESSAY_EXAM_RUNTIME_ENABLED:'true',MATH_ORIGIN:'https://lab.legendstudy.com'};
const body={action:'submit',examId:id,key:id,answers:[{questionId:id,body:'Synthetic answer',revision:1}]};
const send=(payload:unknown=body,extra={})=>onRequestPost({env:{...env,...extra},request:new Request('https://lab.legendstudy.com/api/essay/exam',{method:'POST',headers:{Authorization:'Bearer fixture-user','Content-Type':'application/json'},body:JSON.stringify(payload)})});
beforeEach(()=>{vi.clearAllMocks();m.subject.mockResolvedValue(id);m.request.mockResolvedValue(Response.json(id));m.dispatch.mockImplementation(async(r:Request)=>r.url.endsWith('/exam-admission')?Response.json({ready:true}):Response.json({state:'completed'}));});
it('default HOLD performs no auth, reservation or Provider dispatch',async()=>{expect((await send(body,{ESSAY_EXAM_RUNTIME_ENABLED:undefined})).status).toBe(503);expect(m.subject).not.toHaveBeenCalled();expect(m.request).not.toHaveBeenCalled();});
it('online Auth/allowlist failure performs no reservation or worker call',async()=>{m.subject.mockRejectedValue(Error('ACCESS_DENIED'));await send();expect(m.request).not.toHaveBeenCalled();expect(m.dispatch).not.toHaveBeenCalled();});
it('runtime readiness is checked before any Credit request',async()=>{m.dispatch.mockResolvedValue(Response.json({ready:false}));expect((await send()).status).toBe(503);expect(m.request).not.toHaveBeenCalled();});
it('passes verified subject and same request key to one reservation then runs existing host',async()=>{expect((await send()).status).toBe(202);const [path,credential,init]=m.request.mock.calls[0];expect(path).toBe('/rest/v1/rpc/essay_exam_submit');expect(credential).toBe('fixture-worker-only');expect(JSON.parse(init.body)).toMatchObject({p_subject:id,p_key:id,p_answers:body.answers,p_parent:null});expect(m.dispatch.mock.calls[1][0].url.endsWith('/exam-evaluate')).toBe(true);});
it('ambiguous dispatch preserves reserved identity and never refunds or reserves again',async()=>{m.dispatch.mockImplementation(async(r:Request)=>{if(r.url.endsWith('/exam-admission'))return Response.json({ready:true});throw Error('network');});const r=await send();expect(r.status).toBe(202);expect(await r.json()).toEqual({runId:id,code:'STATUS_CHECK_REQUIRED'});expect(m.request).toHaveBeenCalledTimes(1);});
it('rejects image/unknown fields rather than silently dropping them',async()=>{const r=await send({...body,answers:[{...body.answers[0],images:['x']}] });expect(r.status).toBe(422);expect(m.request).not.toHaveBeenCalled();});
it('keeps insufficient balance distinct from validation failure',async()=>{m.request.mockResolvedValue(Response.json({message:'INSUFFICIENT_CREDIT'},{status:400}));expect((await send()).status).toBe(402);expect(m.dispatch).toHaveBeenCalledTimes(1);});

it('E2E scope rejects another account/exam or rewrite before reservation',async()=>{
 const scope={subject:id,exam:id,requestKey:id};
 for(const payload of [{...body,examId:'22222222-2222-4222-8222-222222222222'},{...body,parentId:id}]){
  expect((await send(payload,{ESSAY_E2E_SCOPE:JSON.stringify(scope)})).status).toBe(403);
 }
 m.subject.mockResolvedValue('22222222-2222-4222-8222-222222222222');
 expect((await send(body,{ESSAY_E2E_SCOPE:JSON.stringify(scope)})).status).toBe(403);expect(m.request).not.toHaveBeenCalled();
});
it('E2E scope pins server idempotency to the single approved submission',async()=>{
 const key='22222222-2222-4222-8222-222222222222';
 expect((await send(body,{ESSAY_E2E_SCOPE:JSON.stringify({subject:id,exam:id,requestKey:key})})).status).toBe(202);
 expect(JSON.parse(m.request.mock.calls[0][2].body).p_key).toBe(key);
});

it('rewrite E2E scope admits only its pinned parent and request, preserving readiness',async()=>{
 const parent='33333333-3333-4333-8333-333333333333';
 const key='22222222-2222-4222-8222-222222222222';
 const extra={ESSAY_E2E_SCOPE:JSON.stringify({subject:id,exam:id,requestKey:key,parentId:parent})};
 expect((await send({action:'availability',examId:id},extra)).status).toBe(200);
 for(const parentId of [undefined,id])expect((await send({...body,parentId},extra)).status).toBe(403);
 expect(m.request).not.toHaveBeenCalled();
 expect((await send({...body,parentId:parent},extra)).status).toBe(202);
 expect(JSON.parse(m.request.mock.calls[0][2].body)).toMatchObject({p_key:key,p_parent:parent});
});
it('malformed parent scope fails closed before reservation',async()=>{
 expect((await send(body,{ESSAY_E2E_SCOPE:JSON.stringify({subject:id,exam:id,requestKey:id,parentId:'invalid'})})).status).toBe(403);
 expect(m.request).not.toHaveBeenCalled();
});
