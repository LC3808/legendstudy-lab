/** Disposable SQL harness only. STDIN contains a synthetic local PG claim.
 * Actual LAB conversion/validation; no network, JWT, provider or credentials.
 */
import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const load=createRequire(import.meta.url);
load.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {physicalClaimToInput,physicalFinalize}=load('../src/lib/math-eval/runtime/physical-contract.ts');
const {validateMathEval}=load('../src/lib/math-eval/validation.ts');
const {shortAnswerOutput}=load('../src/lib/math-eval/fixtures.ts');
const request=JSON.parse(fs.readFileSync(0,'utf8'));
assert.equal(request.isolated_fixture,true);
const input=physicalClaimToInput(request.claim);
assert.equal(input.canonicalPackage.attempt.typed_answer,'Synthetic web answer 2');
assert.ok(input.canonicalPackage.problem.statement);assert.equal(input.responseFormat,'SHORT_ANSWER');
const output=shortAnswerOutput({selected_extraction:input.selectedExtractionId});
output.criteria=input.criteria.map(c=>({criterion_id:c.criterion_id,satisfied:'SATISFIED',reason:'Synthetic fixture'}));
if(input.priorEvaluationId)output.progression={prior_evaluation_id:input.priorEvaluationId,core_corrected:false,root_error_removed:false,new_independent_error:false,answer_now_correct:false,justification_improved:false,no_material_change:true};
assert.equal(validateMathEval(output,input).ok,true);
process.stdout.write(JSON.stringify(physicalFinalize(output,input)));
