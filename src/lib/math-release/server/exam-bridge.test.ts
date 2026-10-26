import {afterEach,expect,it,vi} from 'vitest';
import {evaluateExamMath} from './exam-bridge';
import {baseOutput} from '../../math-eval/fixtures';
const raw={evaluation_id:'evaluation',selected_extraction_id:null,context:{attempt:{attempt_id:'attempt',typed_answer:'PRIVATE ANSWER',prior_evaluation_id:null},leaf:{id:'leaf',response_format:'FULL_SOLUTION'},profile:{reasoning_required:true},problem:{statement:'PRIVATE PROBLEM'},extraction:[],criteria:[],solutions:[]}};
afterEach(()=>vi.restoreAllMocks());
it('logs only bounded domain codes while preserving rejection',async()=>{
 const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
 const output=baseOutput();output.rubric.rubric_version='unknown' as typeof output.rubric.rubric_version;
 await expect(evaluateExamMath(raw,{providerId:'test',modelId:'test',evaluate:async()=>({output})})).rejects.toThrow('INVALID_MATH_OUTPUT');
 expect(warn).toHaveBeenCalledWith('MATH_CHILD_VALIDATION_FAILURE',expect.objectContaining({stage:'domain',codes:expect.arrayContaining(['UNKNOWN_RUBRIC_VERSION'])}));
 expect(JSON.stringify(warn.mock.calls)).not.toMatch(/PRIVATE|unsupported rubric_version/);
});
