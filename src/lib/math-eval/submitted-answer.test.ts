import { describe, expect, it, vi } from "vitest";
import { submittedMathAnswer } from "./submitted-answer";
import { baseOutput, step } from "./fixtures";
import { physicalClaimToInput } from "./runtime/physical-contract";
import { validateMathEval } from "./validation";
import { openAiCandidate } from "../math-release/server/provider";
import { MathEvaluationWorkerClient, runWorkerEvaluation } from "./runtime/worker-client";

// Synthetic only: no official/student text, live network or database.
const photoClaim = () => ({ evaluation_id: "evaluation", lease_token: "lease", selected_extraction_id: "confirmed", context: {
  attempt: { attempt_id: "attempt", input_kind: "EVIDENCE", typed_answer: null as string|null, prior_evaluation_id: null, kind: "INITIAL" },
  leaf: { id: "leaf", response_format: "FULL_SOLUTION" }, problem: { statement: "합성 미분 문제" },
  profile: { reasoning_required: true, required_dimensions: ["final_conclusion"], optional_dimensions: [] },
  extraction: Array.from({length:10}, (_,i) => ({id:`region-${i+1}`, page:1, reading_order:i+1,
    raw_text:i===0?"예시답안":`풀이 ${i}: y=${i}x`, normalized_math:i===0?"":`y=${i}x`, uncertain:false})),
  criteria: [], sources: [{id:"source",kind:"OFFICIAL"}], solutions: [],
}});
const rejectedOutput = () => baseOutput({steps:[], paths:[], selected_extraction:"confirmed", overall:{
  status:"COMPLETE", diagnostic:"NOT_DETERMINABLE", answer:"NOT_DETERMINABLE", coverage:"NOT_ATTEMPTED",
}});

describe("explicit confirmed student work", () => {
  it("sends all ten confirmed photo regions despite null typed text, preserving canonical context", async () => {
    const input=physicalClaimToInput(photoClaim());
    const before=structuredClone(input.canonicalPackage);
    let body: Record<string,unknown> = {};
    const fetcher=vi.fn(async (_url:unknown, init?:RequestInit) => {
      body=JSON.parse(String(init?.body));
      return Response.json({status:"completed",output:[{content:[{type:"output_text",text:JSON.stringify(rejectedOutput())}]}]});
    });
    const result=await openAiCandidate({enabled:true,model:"synthetic-model",key:"synthetic-test-key",fetcher:fetcher as typeof fetch}).evaluate(input);
    const wire=JSON.parse((body.input as {role:string;content:string}[]).find(x=>x.role==="user")!.content);
    expect(wire.student_answer).toMatchObject({source:"STUDENT_SUBMISSION",typed_text:null,confirmed_extraction_id:"confirmed"});
    expect(wire.student_answer.confirmed_regions).toHaveLength(10);
    expect(wire.student_answer.confirmed_regions.map((r:{id:string})=>r.id)).toEqual(input.regionIds);
    expect(wire.student_answer.confirmed_regions[0].raw_text).toBe("예시답안");
    expect(wire.extraction).toEqual(before!.extraction);
    expect(wire.problem).toEqual(before!.problem);
    expect(input.canonicalPackage).toEqual(before);
    expect(body.instructions).toContain("typed_text may be null for a photo submission");
    expect(result.output.provenance.prompt_version).toBe("math-activation-candidate-4");
    expect(validateMathEval(result.output,input).issues.map(i=>i.code)).toContain("SUBMITTED_ANSWER_IGNORED");
  });
  it("preserves typed-only and mixed text without moving official material into the submission", () => {
    const photo=photoClaim();
    photo.context.attempt.typed_answer="보충 풀이 x=2";
    photo.context.attempt.input_kind="MIXED";
    const mixed=submittedMathAnswer(physicalClaimToInput(photo))!;
    expect(mixed.typed_text).toBe("보충 풀이 x=2");
    expect(mixed.confirmed_regions).toHaveLength(10);
    const typed={...photo,selected_extraction_id:null,context:{...photo.context,extraction:[],attempt:{...photo.context.attempt,input_kind:"TYPED"}}};
    expect(submittedMathAnswer(physicalClaimToInput(typed))).toEqual({source:"STUDENT_SUBMISSION",typed_text:"보충 풀이 x=2",confirmed_extraction_id:null,confirmed_regions:[]});
  });
  it("fails the ignored-photo response before finalize instead of publishing/settling it", async () => {
    const actions:string[]=[];
    const worker=new MathEvaluationWorkerClient({rpc:async (_name,req)=>{
      actions.push(req.action as string);
      return {dto_version:req.dto_version,action:req.action,result:req.action==="claim"?photoClaim():{failed:true}};
    }});
    const result=await runWorkerEvaluation({worker,evaluationId:"evaluation",adapter:{providerId:"synthetic",modelId:"synthetic",evaluate:async()=>({output:rejectedOutput()})}});
    expect(result.finalized).toBe(false);
    expect(result.failed).toBe(true);
    expect(actions).toEqual(["claim","fail"]);
    expect(result.validation.issues.map(i=>i.code)).toContain("SUBMITTED_ANSWER_IGNORED");
  });
  it("allows an explicitly grounded irrelevant/non-solution submission to remain NOT_ATTEMPTED", () => {
    const input=physicalClaimToInput(photoClaim());
    const output=rejectedOutput();
    output.steps=[step({position:1,regions:["region-1"],representation:"예시답안",status:"NOT_ASSESSABLE",explanation:"제목만 옮긴 부분은 문제의 풀이가 아닙니다."})];
    expect(validateMathEval(output,input).ok).toBe(true);
    expect(output.overall.coverage).toBe("NOT_ATTEMPTED");
    expect(output.overall.answer).toBe("NOT_DETERMINABLE");
  });
  it("does not accept invented region acknowledgement or an unexplained empty assessment", () => {
    const input=physicalClaimToInput(photoClaim());
    for (const item of [step({position:1,regions:["foreign"],representation:"x",status:"NOT_ASSESSABLE",explanation:"설명"}),step({position:1,regions:["region-1"],representation:"예시답안",status:"NOT_ASSESSABLE",explanation:""})]) {
      expect(validateMathEval({...rejectedOutput(),steps:[item]},input).issues.map(i=>i.code)).toContain("SUBMITTED_ANSWER_IGNORED");
    }
  });
  it("retains incomplete and incorrect judgments rather than forcing a correct answer", () => {
    const input=physicalClaimToInput(photoClaim());
    for (const answer of ["INCORRECT","PARTIALLY_CORRECT","NOT_DETERMINABLE"] as const) {
      const output=baseOutput({selected_extraction:"confirmed",steps:[step({position:1,regions:["region-2"],status:"INSUFFICIENT_JUSTIFICATION"})],overall:{status:"PARTIAL",diagnostic:"NOT_DETERMINABLE",answer,coverage:"PARTIAL_ATTEMPT"}});
      expect(validateMathEval(output,input).ok).toBe(true);
    }
  });
  it("keeps genuinely empty submissions distinct and requires typed-only rejection to cite actual text", () => {
    const photo=photoClaim();
    const empty={...photo,selected_extraction_id:null,context:{...photo.context,extraction:[],attempt:{...photo.context.attempt,input_kind:"TYPED",typed_answer:" "}}};
    const out={...rejectedOutput(),selected_extraction:null as unknown as string};
    expect(validateMathEval(out,physicalClaimToInput(empty)).ok).toBe(true);
    empty.context.attempt.typed_answer="모르겠습니다";
    expect(validateMathEval(out,physicalClaimToInput(empty)).ok).toBe(false);
    const acknowledged={...out,steps:[step({position:1,regions:[],representation:"모르겠습니다",status:"NOT_ASSESSABLE",explanation:"수학 풀이가 제출되지 않았습니다."})]};
    expect(validateMathEval(acknowledged,physicalClaimToInput(empty)).ok).toBe(true);
  });
});
