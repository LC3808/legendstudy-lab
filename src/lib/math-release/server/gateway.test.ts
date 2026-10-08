import { describe, expect, it, vi } from "vitest";
import { evaluationGateway } from "./gateway";
import { MathEvaluationWorkerClient } from "../../math-eval/runtime/worker-client";
import { candidateJson } from "./provider";
import { mediaSignature, boundedBody } from "./request";
const id="00000000-0000-4000-8000-000000000001";
const request=(body: unknown={evaluation_id:id},origin="https://test.example")=>new Request("https://test.example/api/math/evaluate",{method:"POST",headers:{origin,authorization:"Bearer synthetic"},body:JSON.stringify(body)});
describe("gateway privilege and provider boundary",()=>{
 it("kill switch denies before authentication or claim",async()=>{
  const auth=vi.fn(),rpc=vi.fn();
  const response=await evaluationGateway({enabled:false,origin:"https://test.example",authenticate:auth,student:()=>({rpc}),worker:new MathEvaluationWorkerClient({rpc}),adapter:{providerId:"synthetic",modelId:"synthetic",evaluate:vi.fn()}})(request());
  expect(response.status).toBe(503);expect(auth).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
 });
 it("foreign owner denied before privileged worker",async()=>{
  const privileged=vi.fn(),adapter=vi.fn();
  const response=await evaluationGateway({enabled:true,origin:"https://test.example",authenticate:async()=>true,student:()=>({rpc:async()=>{throw Error("private reason");}}),worker:new MathEvaluationWorkerClient({rpc:privileged}),adapter:{providerId:"synthetic",modelId:"synthetic",evaluate:adapter}})(request());
  expect(response.status).toBe(409);expect(privileged).not.toHaveBeenCalled();expect(adapter).not.toHaveBeenCalled();expect(await response.text()).not.toContain("private reason");
 });
 it("completed owner retry reads learning state without re-claim or provider",async()=>{
  const privileged=vi.fn(),adapter=vi.fn();
  const student=vi.fn(async(fn:string,args:unknown)=>{expect(fn).toBe("math_learning");expect(args).toMatchObject({action:"read_learning_state"});return {result:{evaluation_id:id,evaluation_state:"COMPLETED"}};});
  const response=await evaluationGateway({enabled:true,origin:"https://test.example",authenticate:async()=>true,student:()=>({rpc:student}),worker:new MathEvaluationWorkerClient({rpc:privileged}),adapter:{providerId:"synthetic",modelId:"synthetic",evaluate:adapter}})(request());
  expect(response.status).toBe(200);expect(privileged).not.toHaveBeenCalled();expect(adapter).not.toHaveBeenCalled();
 });
 it("candidate requires explicit enable/model/key and performs no implicit call",async()=>{
  const fetcher=vi.fn();await expect(candidateJson({enabled:false,model:"",key:"",fetcher},"JSON",{})).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
 });
 it("provider redirects fail closed without forwarding its credential",async()=>{
  const fetcher=vi.fn(async(_url: string | URL | Request,init?:RequestInit)=>{
   expect(init?.redirect).toBe("manual");
   return new Response(null,{status:307,headers:{location:"https://untrusted.example.invalid"}});
  });
  await expect(candidateJson({enabled:true,model:"synthetic",key:"synthetic-not-a-key",fetcher},"JSON",{})).rejects.toThrow("PROVIDER_UNAVAILABLE");
  expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it("provider refuses incomplete output and never exposes raw failure",async()=>{
  const fetcher=vi.fn(async(_url: string | URL | Request, _init?: RequestInit)=>{void _url;void _init;return Response.json({status:"incomplete",output:[]});});
  await expect(candidateJson({enabled:true,model:"synthetic",key:"synthetic-not-a-key",fetcher},"JSON",{})).rejects.toThrow("INVALID_OUTPUT");
  const sent=JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));expect(sent.input[0]).toEqual({role:"developer",content:"JSON"});expect(sent.store).toBe(false);
 });
 it("file signatures reject MIME spoofing",()=>{
  expect(mediaSignature(new TextEncoder().encode("<script>"),"image/png")).toBe(false);
  expect(mediaSignature(new TextEncoder().encode("%PDF-1.7"),"application/pdf")).toBe(true);
 });
 it("stream size bound rejects a chunked oversized upload",async()=>{
  await expect(boundedBody(new Response("123456"),3)).rejects.toThrow("BODY_BOUND");
 });
});
