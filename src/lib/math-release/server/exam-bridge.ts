/** Reuse the existing Math candidate/validator under an Essay exam reservation.
 * No Math request-evaluation, billing, reserve, settle or student-selected context.
 * The caller must load this context from a fenced server RPC, not HTTP input.
 */
import {physicalClaimToInput, physicalFinalize} from '../../math-eval/runtime/physical-contract';
import {validateMathEval} from '../../math-eval/validation';
import type {MathEvaluatorAdapter} from '../../math-eval/types';
import {mathReport} from '../../my/evaluation-report';

export async function evaluateExamMath(raw: unknown, adapter: MathEvaluatorAdapter) {
  const input=physicalClaimToInput(raw);
  const candidate=await adapter.evaluate(input);
  if(!validateMathEval(candidate.output,input).ok) throw Error('INVALID_MATH_OUTPUT');
  // Preserve the Math result schema and diagnostic scale; never invent Essay stars.
  const output=physicalFinalize(candidate.output,input);
  const context=input.canonicalPackage!;
  const report=mathReport({output,profile:context.profile});
  return {...output,summary:report.summary,exam_math:{profile:context.profile,
    criteria:context.criteria,problem:context.problem,leafId:input.leafId}};
}
