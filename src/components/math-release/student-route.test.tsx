// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuthContext, type AuthContextValue } from "../auth-context";
import { MathStudentRoute } from "./student-route";
const uuid="00000000-0000-4000-8000-000000000001";
function fixture(target = {leafId:uuid, label:"연습 문제", statement:"식을 계산하세요"}) {
 const actions:{action:string;payload:Record<string,unknown>}[]=[];
 let evidence=false,confirmed=false,serial=0;
 const included={status:"AVAILABLE",eligible:true,included_count:1,initial_evaluation_id:uuid,expires_at:null,as_of:"2026-10-04",request_route:"math_learning.request_reevaluation"};
 const state={evaluation_id:uuid,attempt_id:uuid,leaf_id:target.leafId,lineage_id:uuid,response_format:"FULL_SOLUTION",evaluation_state:"COMPLETED",valid_evaluation_available:true,
 core:[{core_id:uuid,error_id:uuid,step_id:uuid,title:"부호를 확인하세요",diagnosis:"부호",why:"식의 부호가 달라집니다",next_action:"다시 계산하세요"}],
 hints:[{hint_id:uuid,core_id:uuid,level:1,available:true,can_reveal:true}],solutions:[{solution_id:uuid,target:"REFERENCE",provenance:"OFFICIAL_SOLUTION"}],included_reevaluation:included,reevaluation_delta:null};
 const rpc=vi.fn((name:string,args:{p_request?:{action:string;payload:Record<string,unknown>;dto_version:string}})=>{
  const p=args?.p_request;let result:unknown;
  if(name==="math_catalog")result=[{essay_exam_id:uuid,leaf_id:target.leafId,label:target.label,statement:target.statement,problem_statement:"긴 수식 x² + y²",response_format:"FULL_SOLUTION"}];
  else if(name==="math_session_submit")result=uuid;
  else if(name==="math_session_read")result={version:"math-session-v1",questions:[{attempt_id:uuid,evaluation_id:uuid}]};
  else {
   actions.push({action:p!.action,payload:p!.payload});
   switch(p!.action){
    case "history":result={attempts:[]};break;
    case "create_attempt":case "create_resolve_attempt":evidence=p!.payload.input_kind!=="TYPED";serial++;result={attempt_id:uuid};break;
    case "register_evidence":result={artifact_id:uuid,storage_state:"REGISTERED",upload_available:false};break;
    case "confirm_extraction":confirmed=true;result={confirmed_run_id:uuid};break;
    case "read_input":result={attempt:{id:uuid},can_request_evaluation:!evidence||confirmed,input_state:!evidence||confirmed?"READY_FOR_EVALUATION":"CONFIRMATION_REQUIRED",selected_extraction_id:null,candidate:{run_id:uuid},artifacts:[],confirmed_regions:[],candidate_regions:evidence&&!confirmed?[{id:uuid,artifact_id:uuid,page:1,reading_order:1,raw_text:"x",normalized_math:"x",uncertain:true,x:0,y:0,width:1,height:1}]:[]};break;
    case "request_evaluation":case "request_reevaluation":result={evaluation_id:uuid,additional_credit:0};break;
    case "read_learning_state":result=state;break;
    case "read_result":result={evaluation_id:uuid,output:{overall:{explanation:"풀이를 확인했습니다"},steps:[]}};break;
    case "read_learning_history":result={lineage_id:uuid,attempts:[],included_reevaluation:included,next_cursor:null};break;
    case "reveal_hint":result={body:"양변의 부호를 확인하세요"};break;
    case "reveal_solution":result={body:"공식 해설입니다",provenance:"OFFICIAL_SOLUTION"};break;
    default:throw Error("unexpected action");
   }
   result={dto_version:p!.dto_version,action:p!.action,result};
  }
  return {abortSignal:()=>Promise.resolve({data:result,error:null})};
 });
 const client={rpc,auth:{getSession:async()=>({data:{session:{access_token:"synthetic"}}})}} as unknown as SupabaseClient;
 const auth:AuthContextValue={client,status:"authenticated",user:{id:uuid,email:"synthetic@example.invalid"},recoveryActive:false,completeRecovery:()=>{},signOut:async()=>{}};
 return {auth,actions,count:()=>serial};
}
afterEach(()=>vi.unstubAllGlobals());
describe("student route integration",()=>{
 it("disabled launch makes no RPC and guest requests login",()=>{
  const f=fixture();const view=render(<AuthContext.Provider value={f.auth}><MathStudentRoute enabled={false}/></AuthContext.Provider>);
  expect(screen.getByText("서비스를 준비하고 있습니다.")).toBeTruthy();expect(f.actions).toEqual([]);
  view.rerender(<AuthContext.Provider value={{...f.auth,user:null,status:"anonymous"}}><MathStudentRoute enabled/></AuthContext.Provider>);
  expect(screen.getByRole("link",{name:"로그인"})).toBeTruthy();
 });
 it("typed answer → result → hint → solution → resolve → included reevaluation → history",async()=>{
  const refresh = vi.fn(); window.addEventListener("legendstudy:credit-refresh", refresh);
  const f=fixture();vi.stubGlobal("fetch",vi.fn(async()=>Response.json({status:"COMPLETED"})));
  render(<AuthContext.Provider value={f.auth}><MathStudentRoute enabled/></AuthContext.Provider>);
  await screen.findByText("연습 문제 · 식을 계산하세요");
  fireEvent.change(screen.getByLabelText("내 답안"),{target:{value:"x = 2"}});
  fireEvent.click(screen.getByRole("button",{name:"답안 제출 · 입력 확인"}));
  fireEvent.click(await screen.findByRole("button",{name:"첨삭 진행"}));
  await screen.findByText("풀이를 확인했습니다");
  fireEvent.click(screen.getByRole("button",{name:"힌트 보기"}));await screen.findByText("양변의 부호를 확인하세요");
  expect(screen.queryByRole("button",{name:/해설/})).toBeNull();
  expect(f.actions.some(x=>x.action==="reveal_solution")).toBe(false);
  fireEvent.click(screen.getByRole("button",{name:"답안을 다시 작성해 보세요"}));
  fireEvent.change(screen.getByLabelText("내 답안"),{target:{value:"x = 3"}});
  fireEvent.click(screen.getByRole("button",{name:"답안 제출 · 입력 확인"}));
  fireEvent.click(await screen.findByRole("button",{name:"재첨삭"}));
  await waitFor(()=>expect(f.actions.some(x=>x.action==="request_reevaluation")).toBe(true));
  await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(2));
  window.removeEventListener("legendstudy:credit-refresh", refresh);
  expect(f.actions.filter(x=>x.action==="history").length).toBeGreaterThanOrEqual(3);
  expect(f.count()).toBe(2);expect(screen.getByRole("region",{name:"학습 기록"})).toBeTruthy();
 });
 it("image upload → actual row id normalization → correction → confirmation",async()=>{
  const f=fixture();vi.stubGlobal("fetch",vi.fn(async()=>Response.json({status:"CONFIRMATION_REQUIRED"})));
  render(<AuthContext.Provider value={f.auth}><MathStudentRoute enabled/></AuthContext.Provider>);
  await screen.findByText("연습 문제 · 식을 계산하세요");
  fireEvent.change(screen.getByLabelText(/답안 사진/),{target:{files:[new File(["synthetic"],"answer.png",{type:"image/png"})]}});
  fireEvent.click(screen.getByRole("button",{name:"답안 제출 · 입력 확인"}));
  const correction=await screen.findByLabelText("수정할 내용");fireEvent.change(correction,{target:{value:"x²"}});
  fireEvent.click(screen.getByRole("button",{name:"수정"}));fireEvent.click(screen.getByRole("button",{name:"확인한 답안 저장"}));
  await screen.findByRole("button",{name:"첨삭 진행"});
  expect(f.actions.find(x=>x.action==="confirm_extraction")?.payload.run_id).toBe(uuid);
  expect(f.actions.find(x=>x.action==="confirm_extraction")?.payload.regions).toEqual([{region_id:uuid,raw_text:"x²",normalized_math:"x²"}]);
 });
 it("account switch unmounts personal state and ignores late replies",async()=>{
  const f=fixture();const view=render(<AuthContext.Provider value={f.auth}><MathStudentRoute enabled/></AuthContext.Provider>);
  await screen.findByLabelText("내 답안");fireEvent.change(screen.getByLabelText("내 답안"),{target:{value:"private answer"}});
  view.rerender(<AuthContext.Provider value={{...f.auth,user:{id:"other"}}}><MathStudentRoute enabled/></AuthContext.Provider>);
  expect((screen.getByLabelText("내 답안") as HTMLTextAreaElement).value).toBe("");
 });
});

it("pinned unavailable leaf cannot fall back to the first catalog question", async () => {
 const f=fixture(); const fetchMock=vi.fn(); vi.stubGlobal("fetch",fetchMock);
 render(<AuthContext.Provider value={f.auth}><MathStudentRoute enabled requestedLeafId="not-in-authorized-catalog"/></AuthContext.Provider>);
 await screen.findByText("선택한 문항은 아직 수리논술 첨삭이 준비되지 않았습니다.");
 fireEvent.change(screen.getByLabelText("내 답안"),{target:{value:"synthetic"}});
 expect((screen.getByRole("button",{name:"답안 제출 · 입력 확인"}) as HTMLButtonElement).disabled).toBe(true);
 expect((screen.getByLabelText("문제 선택") as HTMLSelectElement).disabled).toBe(true);
 expect(f.actions.some(x=>x.action==="create_attempt")).toBe(false); expect(fetchMock).not.toHaveBeenCalled();
});
it("pinned authorized leaf uses existing Math attempt contract and retains evaluation HOLD",async()=>{
 const f=fixture(); render(<AuthContext.Provider value={f.auth}><MathStudentRoute enabled evaluationEnabled={false} requestedLeafId={uuid}/></AuthContext.Provider>);
 await screen.findByText("긴 수식 x² + y²");
 fireEvent.change(screen.getByLabelText("내 답안"),{target:{value:"synthetic"}});
 expect((screen.getByLabelText("문제 선택") as HTMLSelectElement).value).toBe(uuid);
 expect((screen.getByRole("button",{name:"답안 제출 · 입력 확인"}) as HTMLButtonElement).disabled).toBe(true);
 expect(f.actions.some(x=>x.action==="create_attempt")).toBe(false);
});

it("Konkuk representative: six ordered mock uploads → confirmation → evaluation → rewrite → History",async()=>{
 const target={leafId:"3bab07d3-c047-53c2-89ad-9fa20ec7b3f3",label:"건국대 2026 수시 자연 1번 · 로컬 연결 검증",statement:"합성 입력 — 공식 원문 및 평가 품질 검증과 별도"};
 const f=fixture(target); const uploads:string[]=[];
 const fetchMock=vi.fn(async(url:string,init?:RequestInit)=>{
  if(url.endsWith('/upload')) uploads.push((init!.body as FormData).get('file') instanceof File ? ((init!.body as FormData).get('file') as File).name : 'missing');
  return Response.json({status:"COMPLETED"});
 });vi.stubGlobal("fetch",fetchMock);
 render(<AuthContext.Provider value={f.auth}><MathStudentRoute enabled requestedLeafId={target.leafId}/></AuthContext.Provider>);
 await screen.findByText(target.statement);
 for(let i=1;i<=6;i++){
  const inputs=screen.getAllByLabelText("답안 이미지 첨부");
  fireEvent.change(inputs[inputs.length-1],{target:{files:[new File(["synthetic"],`page${i}.png`,{type:"image/png"})]}});
 }
 await screen.findByText("사진 6/6장 · 첨부한 순서로 저장됩니다.");
 fireEvent.click(screen.getByRole('button',{name:'사진 2 앞으로'}));
 fireEvent.click(screen.getByRole('button',{name:'답안 제출 · 입력 확인'}));
 const correction=await screen.findByLabelText('수정할 내용');
 fireEvent.change(correction,{target:{value:'합성 판독 확인: A=(1,e)'}});
 fireEvent.click(screen.getByRole('button',{name:'수정'}));
 fireEvent.click(screen.getByRole('button',{name:'확인한 답안 저장'}));
 fireEvent.click(await screen.findByRole('button',{name:'첨삭 진행'}));
 await screen.findByText('풀이를 확인했습니다');
 expect(uploads).toEqual(['page2.png','page1.png','page3.png','page4.png','page5.png','page6.png']);
 expect(f.actions.find(x=>x.action==='create_attempt')?.payload.leaf_id).toBe(target.leafId);
 expect(f.actions.filter(x=>x.action==='register_evidence').map(x=>(x.payload.metadata as {position:number}).position)).toEqual([1,2,3,4,5,6]);
 fireEvent.click(screen.getByRole('button',{name:'답안을 다시 작성해 보세요'}));
 fireEvent.change(screen.getByLabelText('내 답안'),{target:{value:'합성 재작성 풀이'}});
 fireEvent.click(screen.getByRole('button',{name:'답안 제출 · 입력 확인'}));
 fireEvent.click(await screen.findByRole('button',{name:'재첨삭'}));
 await waitFor(()=>expect(f.actions.some(x=>x.action==='request_reevaluation')).toBe(true));
 expect(f.actions.find(x=>x.action==='create_resolve_attempt')?.payload.leaf_id).toBe(target.leafId);
 expect(screen.getByRole('region',{name:'학습 기록'})).toBeTruthy();
});
