import { describe, expect, it } from "vitest";
import { physicalClaimToInput, physicalFinalize } from "./physical-contract";
const claim = () => ({ evaluation_id: "evaluation", selected_extraction_id: null, context: {
  attempt: { attempt_id: "attempt", typed_answer: "2", prior_evaluation_id: null },
  leaf: { id: "leaf", response_format: "SHORT_ANSWER" }, problem: { statement: "1+1" },
  profile: { reasoning_required: false }, extraction: [],
  criteria: [{ id: "criterion", official_points: null }], solutions: [{ id: "solution", origin: "OFFICIAL", body: "2" }],
}});
describe("APP physical claim boundary", () => {
  it("keeps typed input with null extraction and canonical question/answer", () => {
    const wire = claim(), input = physicalClaimToInput(wire);
    expect(input.selectedExtractionId).toBeNull();
    expect(input.requiresReasoning).toBe(false);
    expect(input.criteria).toEqual([{ criterion_id: "criterion", max_points: null }]);
    expect(input.canonicalPackage).toMatchObject({ problem: { statement: "1+1" }, attempt: { typed_answer: "2" } });
    wire.context.attempt.typed_answer = "changed";
    expect(input.canonicalPackage).toMatchObject({ attempt: { typed_answer: "2" } });
  });
  it("fails closed on missing pinned profile/unknown origin", () => {
    expect(() => physicalClaimToInput({ ...claim(), context: {} })).toThrow("INVALID_CLAIM");
    const wire = claim(); wire.context.solutions[0].origin = "invented";
    expect(() => physicalClaimToInput(wire)).toThrow("INVALID_CLAIM");
  });
});

import {baseOutput,step} from "../fixtures";
it("maps calculation steps to existing SQL kinds, rejecting unrecognized output",()=>{
 const wire={...claim(),context:{...claim().context,profile:{reasoning_required:true,required_dimensions:["final_conclusion"],optional_dimensions:[]}}};
 const input=physicalClaimToInput(wire);
 const out=baseOutput({selected_extraction:null as unknown as string,steps:[step({position:1,regions:[]})]});
 expect(physicalFinalize(out,input)).toMatchObject({steps:[{kind:"COMPUTATION"}]});
 expect(out.steps[0].kind).toBe("CALCULATION");
 expect(()=>physicalFinalize({...out,steps:[{...out.steps[0],kind:"invented"}]},input)).toThrow("INVALID_OUTPUT");
});

it("rejects missing reasoning and mismatched hint levels before persistent finalize", () => {
 const wire={...claim(),context:{...claim().context,profile:{reasoning_required:true,required_dimensions:["final_conclusion"],optional_dimensions:[]}}};
 const input=physicalClaimToInput(wire);
 const out=baseOutput({selected_extraction:null as unknown as string,steps:[step({position:1,regions:[]})]});
 expect(()=>physicalFinalize({...out,steps:[]},input)).toThrow("INVALID_OUTPUT");
 for(const level of [0,1,2] as const){
   const hint={id:"hint",core_id:"core",level,body:"해당 개념을 확인하세요",validated:true,
     leakage_class:level===2?"CONCEPT_REVEAL" as const:"SAFE_DIRECTION" as const};
   expect(physicalFinalize({...out,hints:[hint]},input)).toMatchObject({hints:[{level,leakage_class:level===0?"CORE_ONLY":hint.leakage_class}]});
   expect(()=>physicalFinalize({...out,hints:[{...hint,leakage_class:level===2?"SAFE_DIRECTION":"CONCEPT_REVEAL"}]},input)).toThrow("INVALID_OUTPUT");
 }
});

// Diagnostics must identify a contract rejection without publishing submitted text.
it("reports stable failure codes and preserves rejected candidates",()=>{
 const input=physicalClaimToInput({...claim(),context:{...claim().context,profile:{reasoning_required:true,required_dimensions:["final_conclusion"],optional_dimensions:[]}}});
 const out=baseOutput({selected_extraction:null as unknown as string,steps:[step({position:1,regions:[],representation:"private student answer"})]});
 const cases=[
  [{...out,steps:[{...out.steps[0],position:0}]},"STEP_POSITION"],
  [{...out,rubric:{...out.rubric,dimensions:{}}},"MISSING_RUBRIC_DIMENSION"],
  [{...out,selected_extraction:"foreign"},"EXTRACTION_MISMATCH"],
 ] as const;
 for(const [candidate,code] of cases){
  const before=JSON.stringify(candidate);
  expect(()=>physicalFinalize(candidate,input)).toThrow(`INVALID_OUTPUT:${code}`);
  expect(JSON.stringify(candidate)).toBe(before);
 }
});
