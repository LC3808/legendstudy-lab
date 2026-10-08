import {describe,it,expect} from 'vitest';
import {EssayRuntimeClient,essayRequestId,parseEssayStatus,type EssayTransport,type Row} from './client';
const user='00000000-0000-4000-8000-000000000001',question='00000000-0000-4000-8000-000000000002',attempt='00000000-0000-4000-8000-000000000003',evaluation='00000000-0000-4000-8000-000000000004';
function fixture(){
 let owner:string|null=user,session:string|undefined,body='',revision=0;
 const calls:{name:string;args:Row}[]=[],queries:{table:string;columns:string;limit:number}[]=[];
 const store:EssayTransport={userId:()=>owner,rpc:async(name,args)=>{
  calls.push({name,args});
  if(name==='essay_open_session'){session=String(args.p_id);return session;}
  if(name==='essay_save_draft'){if(args.p_revision!==revision)throw {code:'PT409'};body=String(args.p_body);return ++revision;}
  if(name==='essay_submit_attempt')return attempt;
  if(name==='essay_request_evaluation')return evaluation;
  if(name==='essay_evaluation_status')return {state:'completed',credit_state:'settled',credit_mode:'paid',no_credit_consumed:false,release_confirmed:false};
  throw Error(name);
 },rows:async(table,columns,filters,limit)=>{
  queries.push({table,columns,limit});
  if(table==='essay_practice_sessions')return session?[{id:session,user_id:owner,question_id:question}]:[];
  if(table==='essay_drafts')return [{body,revision}];
  if(table==='essay_evaluations'&&filters.id)return [{id:evaluation,session_id:session,overall_summary:'평가 결과',rewrite_checklist:['논거 보완']}];
  return [];
 }};
 return {store,calls,queries,switchUser:()=>{owner=question;}};
}
describe('APP-compatible Humanities Web binding',()=>{
 it('opens, CAS saves, submits with stable restart-safe keys, reads settled result, rewrites and reads bounded history',async()=>{
  const f=fixture(),c=new EssayRuntimeClient(f.store,question,true);await c.open();const d=await c.save('검증 답안',0);
  const a=await c.submit(d.body,d.revision);await c.submit(d.body,d.revision);
  const submits=f.calls.filter(x=>x.name==='essay_submit_attempt');expect(submits[0].args).toEqual(submits[1].args);
  const id=await c.requestEvaluation(a,async()=>{});expect(await c.result(id)).toMatchObject({overall_summary:'평가 결과'});
  const reload=new EssayRuntimeClient(f.store,question,true);expect(await reload.open()).toEqual(d);
  const next=await reload.save('개선한 답안',d.revision);await reload.submit(next.body,next.revision);
  expect(f.calls.filter(x=>x.name==='essay_submit_attempt').at(-1)?.args.p_key).not.toBe(submits[0].args.p_key);
  await reload.history();expect(f.queries.every(x=>x.limit<=50)).toBe(true);
  expect(f.queries.filter(x=>x.table==='essay_attempts').every(x=>!x.columns.split(',').includes('body'))).toBe(true);
  expect(f.calls.map(x=>x.name)).not.toContain('credit_post_grant');
 });
 it('does not reserve Credit when server runtime admission fails',async()=>{
  const f=fixture(),c=new EssayRuntimeClient(f.store,question,true);await c.open();
  await expect(c.requestEvaluation(attempt,async()=>{throw Error('WORKER_UNAVAILABLE');})).rejects.toThrow();
  expect(f.calls.some(x=>x.name==='essay_request_evaluation')).toBe(false);
 });
 it('disables writes by default and never silently overwrites a CAS conflict',async()=>{
  const f=fixture();await expect(new EssayRuntimeClient(f.store,question).open()).rejects.toMatchObject({code:'DISABLED'});
  const c=new EssayRuntimeClient(f.store,question,true);await c.open();await c.save('first',0);
  await expect(c.save('stale',0)).rejects.toMatchObject({code:'PT409'});
  expect(await c.readDraft()).toEqual({body:'first',revision:1});
 });
 it('rejects a foreign session and discards in-flight data after account switch',async()=>{
  const f=fixture(),c=new EssayRuntimeClient(f.store,question,true);await c.open();
  f.store.rows=async()=>[{id:attempt,user_id:question,question_id:question}];
  await expect(c.open(attempt)).rejects.toMatchObject({code:'PT403'});
  f.store.rows=async()=>{f.switchUser();return [{body:'old account',revision:1}];};
  await expect(c.readDraft()).rejects.toMatchObject({code:'PT401'});
 });
 it('matches APP deterministic scope UUID and cannot infer release from unknown state',async()=>{
  const id=await essayRequestId('same scope');expect(await essayRequestId('same scope')).toBe(id);expect(id).toMatch(/-4.{3}-a/);
  expect(parseEssayStatus({state:'reconciling',credit_state:'included',credit_mode:'included',no_credit_consumed:true,release_confirmed:false}).no_credit_consumed).toBe(false);
  expect(()=>parseEssayStatus({state:'completed'})).toThrow();
 });
});
