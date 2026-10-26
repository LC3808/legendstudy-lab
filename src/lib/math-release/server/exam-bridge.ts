/** Reuse the existing Math candidate/validator under an Essay exam reservation.
 * No Math request-evaluation, billing, reserve, settle or student-selected context.
 * The caller must load this context from a fenced server RPC, not HTTP input.
 */
import {physicalClaimToInput, physicalFinalize} from '../../math-eval/runtime/physical-contract';
import {validateMathEval} from '../../math-eval/validation';
import type {MathEvaluatorAdapter} from '../../math-eval/types';
import {mathReport} from '../../my/evaluation-report';
export class InvalidMathChildOutput extends Error {}

export async function evaluateExamMath(raw: unknown, adapter: MathEvaluatorAdapter) {
  const input=physicalClaimToInput(raw);
  const candidate=await adapter.evaluate(input);
  // Record bounded validator codes only: never candidate text, IDs, answers or package data.
  let validation;
  try { validation=validateMathEval(candidate.output,input); }
  catch { console.warn('MATH_CHILD_VALIDATION_FAILURE',{stage:'structure',codes:['MALFORMED_OUTPUT']}); throw new InvalidMathChildOutput('INVALID_MATH_OUTPUT'); }
  if(!validation.ok) {
    console.warn('MATH_CHILD_VALIDATION_FAILURE',{stage:'domain',codes:[...new Set(validation.issues.map(issue=>issue.code))]});
    throw new InvalidMathChildOutput('INVALID_MATH_OUTPUT');
  }
  // Preserve the Math result schema and diagnostic scale; never invent Essay stars.
  let output:Record<string,unknown>;
  try{output=physicalFinalize(candidate.output,input);}catch{console.warn('MATH_CHILD_VALIDATION_FAILURE',{stage:'physical',codes:['PHYSICAL_CONTRACT_REJECTED']});throw new InvalidMathChildOutput('INVALID_MATH_OUTPUT');}
  const context=input.canonicalPackage!;
  const report=mathReport({output,profile:context.profile});
  return {...output,summary:report.summary,exam_math:{profile:context.profile,
    criteria:context.criteria,problem:context.problem,leafId:input.leafId}};
}
