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
beforeEach(()=>{vi.clearAllMocks();m.subject.mockResolvedValue(id);m.request.mockResolvedValue(Response.json(id));m.dispatch.mockImplementation(async(r:Request)=>r.url.endsWith('/exam-admission')?Response.json({ready:true,session_version:'exam-session-v1'}):Response.json({state:'completed'}));});
it('default HOLD performs no auth, reservation or Provider dispatch',async()=>{expect((await send(body,{ESSAY_EXAM_RUNTIME_ENABLED:undefined})).status).toBe(503);expect(m.subject).not.toHaveBeenCalled();expect(m.request).not.toHaveBeenCalled();});
it('online Auth/allowlist failure performs no reservation or worker call',async()=>{m.subject.mockRejectedValue(Error('ACCESS_DENIED'));await send();expect(m.request).not.toHaveBeenCalled();expect(m.dispatch).not.toHaveBeenCalled();});
it('runtime readiness is checked before any 크레딧 request',async()=>{m.dispatch.mockResolvedValue(Response.json({ready:false}));expect((await send()).status).toBe(409);expect(m.request).not.toHaveBeenCalled();});
it('passes verified subject and same request key to one reservation then runs existing host',async()=>{expect((await send()).status).toBe(202);const [path,credential,init]=m.request.mock.calls[0];expect(path).toBe('/rest/v1/rpc/essay_exam_submit');expect(credential).toBe('fixture-worker-only');expect(JSON.parse(init.body)).toMatchObject({p_subject:id,p_key:id,p_answers:body.answers,p_parent:null});expect(m.dispatch.mock.calls[1][0].url.endsWith('/exam-evaluate')).toBe(true);});
it('ambiguous dispatch preserves reserved identity and never refunds or reserves again',async()=>{m.dispatch.mockImplementation(async(r:Request)=>{if(r.url.endsWith('/exam-admission'))return Response.json({ready:true,session_version:'exam-session-v1'});throw Error('network');});const r=await send();expect(r.status).toBe(202);expect(await r.json()).toEqual({runId:id,code:'STATUS_CHECK_REQUIRED'});expect(m.request).toHaveBeenCalledTimes(1);});
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
it('continuous cycle is OFF by default and cannot escape pinned E2E',async()=>{
 expect((await send({...body,previousPaidRunId:id})).status).toBe(422);
 expect((await send({...body,previousPaidRunId:id},{ESSAY_CONTINUOUS_CYCLES_ENABLED:'true',ESSAY_E2E_SCOPE:JSON.stringify({subject:id,exam:id,requestKey:id})})).status).toBe(403);
 expect(m.request).not.toHaveBeenCalled();
});
it('additional cycle reuses the same gateway and routes only to the bounded cycle RPC',async()=>{
 expect((await send({...body,previousPaidRunId:id},{ESSAY_CONTINUOUS_CYCLES_ENABLED:'true'})).status).toBe(202);
 expect(m.request.mock.calls[0][0]).toBe('/rest/v1/rpc/essay_exam_submit_cycle');
 expect(JSON.parse(m.request.mock.calls[0][2].body).p_previous).toBe(id);
});
it('quote reads server eligibility without reserving 크레딧 or dispatching evaluation',async()=>{
 m.request.mockResolvedValue(Response.json({version:'essay-exam-quote-v1',credits:0,kind:'included'}));
 const response=await send({action:'quote',examId:id,questionIds:[id],parentId:id});
 expect(await response.json()).toMatchObject({credits:0});
 expect(m.request.mock.calls[0][0]).toBe('/rest/v1/rpc/essay_exam_quote');expect(m.dispatch).not.toHaveBeenCalled();
});

it('additional E2E pins predecessor and single request without opening other cycles',async()=>{
 const previous='33333333-3333-4333-8333-333333333333';
 const key='22222222-2222-4222-8222-222222222222';
 const extra={ESSAY_CONTINUOUS_CYCLES_ENABLED:'true',ESSAY_E2E_SCOPE:JSON.stringify({subject:id,exam:id,requestKey:key,previousPaidRunId:previous})};
 expect((await send({action:'availability',examId:id},extra)).status).toBe(200);
 for(const action of ['submit','quote'])for(const previousPaidRunId of [undefined,id]){
  expect((await send({...body,action,questionIds:[id],previousPaidRunId},extra)).status).toBe(403);
 }
 expect(m.request).not.toHaveBeenCalled();
 expect((await send({...body,previousPaidRunId:previous},extra)).status).toBe(202);
 expect(m.request.mock.calls[0][0]).toBe('/rest/v1/rpc/essay_exam_submit_cycle');
 expect(JSON.parse(m.request.mock.calls[0][2].body)).toMatchObject({p_key:key,p_previous:previous,p_parent:null});
});
it('malformed or mixed paid/free E2E scope fails before credit calls',async()=>{
 for(const detail of [{previousPaidRunId:'invalid'},{parentId:id,previousPaidRunId:id}]){
  expect((await send(body,{ESSAY_E2E_SCOPE:JSON.stringify({subject:id,exam:id,requestKey:id,...detail})})).status).toBe(403);
 }
 expect(m.request).not.toHaveBeenCalled();
});

it('image references and six-page drafts cannot bypass the text-only contract',async()=>{
 for(const extra of [{artifactIds:[id]},{images:Array(6).fill(id)},{input_kind:'EVIDENCE'},{confirmed_run_id:id}]){
  vi.clearAllMocks();
  const response=await send({...body,answers:[{...body.answers[0],...extra}]});
  expect(response.status).toBe(422);
  expect(m.request).not.toHaveBeenCalled();
  expect(m.dispatch).not.toHaveBeenCalled();
 }
});
it('foreign Origin cannot reach authentication, 크레딧 or worker admission',async()=>{
 const response=await onRequestPost({env,request:new Request('https://lab.legendstudy.com/api/essay/exam',{method:'POST',headers:{Origin:'https://other.invalid',Authorization:'Bearer fixture-user','Content-Type':'application/json'},body:JSON.stringify(body)})});
 expect(response.status).toBe(403);
 expect(m.subject).not.toHaveBeenCalled();expect(m.request).not.toHaveBeenCalled();expect(m.dispatch).not.toHaveBeenCalled();
});

it('availability exposes only admitted UUIDs without any 크레딧 reservation',async()=>{
 m.dispatch.mockResolvedValue(Response.json({ready:true,question_ids:[id,'invalid',null]}));
 expect(await (await send({action:'availability',examId:id})).json()).toEqual({ready:true,questionIds:[id],mathQuestions:{}});
 expect(m.request).not.toHaveBeenCalled();
 m.dispatch.mockResolvedValue(Response.json({ready:false,question_ids:[id]}));
 expect(await (await send({action:'availability',examId:id})).json()).toEqual({ready:false,questionIds:[],mathQuestions:{}});
});

it('public admission requires an exact server-owned exam scope, never a client flag',async()=>{
 await send(body,{ESSAY_PUBLIC_EXAMS:id});
 expect(m.subject).toHaveBeenLastCalledWith('fixture-user',true);
 for(const list of [undefined,'','*',id+',','22222222-2222-4222-8222-222222222222']){
  await send({...body,publicRelease:true},{ESSAY_PUBLIC_EXAMS:list});
  expect(m.subject).toHaveBeenLastCalledWith('fixture-user',false);
 }
});
it('public scope does not bypass E2E limits or DB/Worker readiness',async()=>{
 m.dispatch.mockResolvedValue(Response.json({ready:false}));
 expect((await send(body,{ESSAY_PUBLIC_EXAMS:id})).status).toBe(409);
 expect(m.request).not.toHaveBeenCalled();
 expect((await send(body,{ESSAY_PUBLIC_EXAMS:id,ESSAY_E2E_SCOPE:JSON.stringify({subject:id,exam:id,requestKey:id,parentId:id})})).status).toBe(403);
});

it('blocks old single-question Worker before any multi-question reservation',async()=>{
 m.dispatch.mockImplementation(async()=>Response.json({ready:true}));
 const other='22222222-2222-4222-8222-222222222222';
 for(const payload of [{action:'quote',examId:id,questionIds:[id,other]},{...body,answers:[...body.answers,{questionId:other,body:'Second',revision:1}]}]){
  const response=await send(payload);expect(response.status).toBe(409);expect(await response.json()).toEqual({code:'EXAM_SESSION_CONTRACT_PENDING'});
 }
 expect(m.request).not.toHaveBeenCalled();expect(m.dispatch).toHaveBeenCalledTimes(2);
});

it('submits all questions once after verified session capability',async()=>{
 const other='22222222-2222-4222-8222-222222222222';
 expect((await send({...body,answers:[...body.answers,{questionId:other,body:'Second',revision:1}]})).status).toBe(202);
 expect(m.request).toHaveBeenCalledTimes(1);
 expect(JSON.parse(m.request.mock.calls[0][2].body).p_answers).toHaveLength(2);
});
it('retry uses existing run and explicit idempotency key without reserve',async()=>{
 const response=await send({action:'retry',examId:id,runId:id,key:id});
 expect(response.status).toBe(202);expect(m.request).toHaveBeenCalledTimes(1);
 expect(m.request.mock.calls[0][0]).toBe('/rest/v1/rpc/essay_exam_retry');
 expect(JSON.parse(m.request.mock.calls[0][2].body)).toEqual({p_subject:id,p_run:id,p_key:id,p_exam:id});
});

it.each(['availability','quote','submit'])('launch hold blocks %s before reservation or evaluation',async action=>{
 const response=await send({...body,action,examId:'19f4c1e7-a82a-53ad-9aa2-7c72594518f1',questionIds:[id]});
 expect(response.status).toBe(action==='availability'?200:409);expect(await response.json()).toMatchObject({code:'NATURAL_MATH_HOLD'});
 expect(m.request).not.toHaveBeenCalled();expect(m.dispatch).not.toHaveBeenCalled();
});
it('launch hold preserves existing retry admission and request identity',async()=>{
 const response=await send({action:'retry',examId:'19f4c1e7-a82a-53ad-9aa2-7c72594518f1',runId:id,key:id});
 expect(response.status).toBe(202);expect(m.request.mock.calls[0][0]).toBe('/rest/v1/rpc/essay_exam_retry');
 expect(JSON.parse(m.request.mock.calls[0][2].body).p_run).toBe(id);
});

it('source flag routes quote through worker-only source RPC without evaluation',async()=>{
 m.request.mockResolvedValue(Response.json({credits:1,credit_source:{grant_id:id,source:'purchase'}}));
 expect((await send({action:'quote',examId:id,questionIds:[id]},{ESSAY_CREDIT_SOURCE_ENABLED:'true'})).status).toBe(200);
 expect(m.request.mock.calls[0][0]).toBe('/rest/v1/rpc/essay_exam_quote_source');expect(m.dispatch).not.toHaveBeenCalled();
});
it('confirmed grant is sent to the atomic source submit RPC',async()=>{
 expect((await send({...body,expectedGrant:id},{ESSAY_CREDIT_SOURCE_ENABLED:'true'})).status).toBe(202);
 expect(m.request.mock.calls[0][0]).toBe('/rest/v1/rpc/essay_exam_submit_source');
 expect(JSON.parse(m.request.mock.calls[0][2].body)).toMatchObject({p_expected_grant:id,p_previous:null,p_parent:null,p_key:id});
});
it.each(['CREDIT_SOURCE_CHANGED','CREDIT_SOURCE_CONFIRMATION_REQUIRED'])('source rejection never dispatches evaluation: %s',async code=>{
 m.request.mockResolvedValue(Response.json({message:code},{status:409}));
 const response=await send({...body,expectedGrant:id},{ESSAY_CREDIT_SOURCE_ENABLED:'true'});
 expect(response.status).toBe(409);expect(await response.json()).toEqual({code});
 expect(m.dispatch).toHaveBeenCalledTimes(1);
});
it('disabled source contract and malformed grant cannot reserve',async()=>{
 for(const [expectedGrant,extra] of [[id,{}],['invalid',{ESSAY_CREDIT_SOURCE_ENABLED:'true'}]] as const){
  expect((await send({...body,expectedGrant},extra)).status).toBe(409);
 }
 expect(m.request).not.toHaveBeenCalled();
});
