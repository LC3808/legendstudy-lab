// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {MathExamSessionSubmit} from './exam-session-submit';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
const f=vi.hoisted(()=>({owner:'00000000-0000-4000-8000-000000000001',rpc:vi.fn(),create:vi.fn(),read:vi.fn(),saved:new Map<string,string>()}));
vi.mock('../auth-context',()=>({useAuth:()=>({user:{id:f.owner},client:{auth:{getSession:async()=>({data:{session:{user:{id:f.owner},access_token:'synthetic'}}})},rpc:f.rpc}})}));
vi.mock('@/lib/temporary-draft-store',()=>({temporaryDraftStore:{read:(key:string)=>f.saved.get(key)||'',write:(key:string,value:string)=>f.saved.set(key,value),remove:(key:string)=>f.saved.delete(key)}}));
vi.mock('@/lib/source-image-draft',()=>({sourceImageDraft:async()=>null}));
vi.mock('@/lib/math-input/runtime/input-client',()=>({MathInputClient:class {createAttempt=f.create;readInput=f.read;}}));
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const exam={key:'exam',dbExamId:id(9),questions:[1,2,3,4].map(n=>({key:`q${n}`,dbQuestionId:id(10+n),label:`${n}번 문제`}))} as SourceExam;
const drafts=Object.fromEntries([1,2,3,4].map(n=>[`q${n}`,{body:`답안${n}`,saved:true,images:false,revision:1}]));
const leaves=Object.fromEntries([1,2,3,4].map(n=>[id(10+n),id(20+n)]));
let serial=0,lost=false,first=true, submitted:string[]=[];
beforeEach(()=>{
 f.saved.clear();serial=0;lost=false;first=true;submitted=[];
 f.create.mockReset().mockImplementation(async()=>({attempt_id:id(100+(++serial))}));
 f.read.mockReset().mockResolvedValue({can_request_evaluation:true,input_state:'READY_FOR_EVALUATION',candidate_regions:[],candidate:null});
 f.rpc.mockReset().mockImplementation((name:string,args:Record<string,unknown>)=>({abortSignal:async()=>{
  if(name==='math_session_history')return {data:{version:'math-session-history-v1',runs:[]},error:null};
  if(name==='math_session_submit'){submitted=args.p_attempts as string[];if(lost&&first){first=false;throw Error('response lost');}return {data:id(200),error:null};}
  if(name==='math_session_read')return {data:{version:'math-session-v1',run_id:id(200),exam_id:id(9),parent_id:null,state:'completed',created_at:'2026-10-25',free_rewrite_available:true,questions:submitted.map((attempt_id,i)=>({attempt_id,leaf_id:id(21+i),question_id:id(11+i),evaluation_id:id(300+i),state:'COMPLETED'}))},error:null};
  throw Error('unexpected RPC '+name);
 }}));
 vi.stubGlobal('fetch',vi.fn());
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('Math session submission uses the saved exam unit',()=>{
 it.each([1,2,4])('%i answers produce one explicit round request',async n=>{
  render(<MathExamSessionSubmit exam={exam} drafts={drafts} included={[1,2,3,4].slice(0,n).map(x=>`q${x}`)} leaves={leaves}/>);
  const prepare=await screen.findByRole('button',{name:/保存|저장한 답안 입력 확인/});
  await waitFor(()=>expect((prepare as HTMLButtonElement).disabled).toBe(false));fireEvent.click(prepare);
  const submit=await screen.findByRole('button',{name:'회차 첨삭 요청 · 1 크레딧'});
  expect(f.rpc.mock.calls.filter(([name])=>name==='math_session_submit')).toHaveLength(0);
  fireEvent.click(submit);await screen.findByRole('dialog');
  if(n<4)expect(screen.getByText(/별도 회차로 1 크레딧/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'첨삭 진행하기'}));
  await screen.findByText('회차 첨삭이 완료됐습니다.');
  const calls=f.rpc.mock.calls.filter(([name])=>name==='math_session_submit');expect(calls).toHaveLength(1);
  expect(calls[0][1].p_attempts).toHaveLength(n);expect(calls[0][1].p_parent).toBeNull();
 });
 it('empty answers cannot prepare or create a paid request',async()=>{
  render(<MathExamSessionSubmit exam={exam} drafts={{}} included={[]} leaves={leaves}/>);
  const button=await screen.findByRole('button',{name:/저장한 답안 입력 확인/});expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(f.create).not.toHaveBeenCalled();expect(f.rpc.mock.calls.some(([name])=>name==='math_session_submit')).toBe(false);
 });
 it('ambiguous submission survives remount and reuses the same round key',async()=>{
  lost=true;const props={exam,drafts,included:['q1'],leaves};
  const view=render(<MathExamSessionSubmit {...props}/>);
  const prepare=await screen.findByRole('button',{name:/저장한 답안 입력 확인/});await waitFor(()=>expect((prepare as HTMLButtonElement).disabled).toBe(false));fireEvent.click(prepare);
  fireEvent.click(await screen.findByRole('button',{name:'회차 첨삭 요청 · 1 크레딧'}));fireEvent.click(screen.getByRole('button',{name:'첨삭 진행하기'}));
  await screen.findByRole('button',{name:'같은 회차 처리 확인'});await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('확인하지 못했어요'));
  const firstCall=f.rpc.mock.calls.find(([name])=>name==='math_session_submit')![1];view.unmount();
  render(<MathExamSessionSubmit {...props}/>);fireEvent.click(await screen.findByRole('button',{name:'같은 회차 처리 확인'}));
  await screen.findByText('회차 첨삭이 완료됐습니다.');
  const calls=f.rpc.mock.calls.filter(([name])=>name==='math_session_submit');expect(calls).toHaveLength(2);expect(calls[1][1]).toEqual(firstCall);expect(f.create).toHaveBeenCalledTimes(1);
 });
});

it('restores an existing mixed-input candidate read-only and waits for student confirmation',async()=>{
 const fingerprint=JSON.stringify({owner:f.owner,examId:exam.dbExamId,parentId:'',answers:[{questionId:id(11),body:drafts.q1.body,images:[]}]});
 const scope=`legendstudy:essay-source-draft:v1:${f.owner}:math-session:${exam.dbExamId}:initial:${id(11)}`;
 f.saved.set(scope,JSON.stringify({fingerprint,key:id(90),attemptKeys:{q1:id(91)},attempts:{q1:id(101)}}));
 f.read.mockResolvedValue({attempt:{leaf_id:id(21)},can_request_evaluation:false,input_state:'CONFIRMATION_REQUIRED',candidate_regions:[],candidate:{run_id:id(50),state:'COMPLETED'}});
 const onReady=vi.fn();
 render(<MathExamSessionSubmit exam={exam} drafts={drafts} included={['q1']} leaves={leaves} onInputsReady={onReady} restoreExistingInputs/>);
 await screen.findByRole('button',{name:'이 내용으로 확인'});
 expect(screen.getByRole('region',{name:'사진 답안 확인'})).toBeTruthy();
 expect(f.read).toHaveBeenCalledWith(id(101));expect(f.create).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
 expect(f.rpc).not.toHaveBeenCalled();expect(onReady).not.toHaveBeenCalled();
 expect(screen.queryByRole('button',{name:'회차 첨삭 요청 · 1 크레딧'})).toBeNull();
});

it('passes already-confirmed input to the Essay parent without a Math paid submission',async()=>{
 const fingerprint=JSON.stringify({owner:f.owner,examId:exam.dbExamId,parentId:'',answers:[{questionId:id(11),body:drafts.q1.body,images:[]}]});
 const scope=`legendstudy:essay-source-draft:v1:${f.owner}:math-session:${exam.dbExamId}:initial:${id(11)}`;
 f.saved.set(scope,JSON.stringify({fingerprint,key:id(90),attemptKeys:{q1:id(91)},attempts:{q1:id(101)}}));
 f.read.mockResolvedValue({attempt:{leaf_id:id(21)},can_request_evaluation:true,input_state:'READY_FOR_EVALUATION',selected_extraction_id:id(51),candidate_regions:[],candidate:{run_id:id(50),state:'COMPLETED'}});
 const onReady=vi.fn();render(<MathExamSessionSubmit exam={exam} drafts={drafts} included={['q1']} leaves={leaves} onInputsReady={onReady} restoreExistingInputs/>);
 await waitFor(()=>expect(onReady).toHaveBeenCalledWith({q1:{attemptId:id(101),confirmedRunId:id(51)}}));
 expect(f.create).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();expect(f.rpc).not.toHaveBeenCalled();
});
