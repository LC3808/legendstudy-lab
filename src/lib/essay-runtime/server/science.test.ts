import {describe,it,expect,vi} from 'vitest';
import {evaluateScience,validateScienceResult,type ScienceInput,type ScienceResult} from './science';
import {sha256} from '../../math-release/server/request';
function fixture(){
 const input:ScienceInput={ownerId:'owner',attemptId:'attempt',answer:'합성 물리 답안: F=ma',artifacts:[],binding:{capability:'SCIENCE_REASONING',questionId:'synthetic-question',rubricVersion:'synthetic-only-v1',reviewed:true,sourceSha256:'a'.repeat(64),subject:'physics',criteria:[{id:'criterion',description:'합성 fixture: 조건과 단위 확인',evidenceIds:['evidence']}],evidence:[{id:'evidence',text:'실제 대학 문제가 아닌 합성 물리 조건'}],requiresArtifact:false}};
 const output:ScienceResult={question_id:'synthetic-question',rubric_version:'synthetic-only-v1',summary:'합성 피드백',strengths:['단위를 확인함'],next_actions:[],criteria:[{criterion_id:'criterion',verdict:'SATISFIED',explanation:'주어진 합성 기준 확인',evidence_ids:['evidence']}],requires_human_review:false};
 const fetcher=vi.fn(async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]}));
 const config={enabled:true,model:'fixture-model',key:'fixture-key',fetcher};return {input,output,config,fetcher};
}
describe('science candidate contract (synthetic engineering fixtures only)',()=>{
 it('constructs grounded text/formula request without account IDs, tools or inferred university rubric',async()=>{
  const {input,output,config,fetcher}=fixture();expect(await evaluateScience(input,config)).toEqual(output);
  const request=JSON.parse((fetcher.mock.calls[0] as unknown as [string,RequestInit])[1].body as string);
  expect(request.store).toBe(false);expect(request).not.toHaveProperty('tools');expect(JSON.stringify(request)).toContain('F=ma');expect(JSON.stringify(request)).not.toContain('ownerId');
 });
 it('reuses private artifact bytes and validates identity/hash before provider',async()=>{
  const {input,config,fetcher}=fixture();const bytes=new Uint8Array([137,80,78,71,13,10,26,10]);
  input.binding.requiresArtifact=true;input.artifacts=[{id:'artifact',ownerId:'owner',attemptId:'attempt',bucket:'math-private',objectKey:'owner/attempt/artifact.png',mediaType:'image/png',sha256:await sha256(bytes),bytes}];
  await evaluateScience(input,config);expect(JSON.stringify(fetcher.mock.calls)).toContain('data:image/png;base64,');
  fetcher.mockClear();input.artifacts[0].ownerId='other';await expect(evaluateScience(input,config)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
  input.artifacts[0].ownerId='owner';input.artifacts[0].sha256='b'.repeat(64);await expect(evaluateScience(input,config)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
 });
 it('refuses missing reviewed science authority and required artifacts before network',async()=>{
  for(const patch of [{reviewed:false},{requiresArtifact:true},{criteria:[]},{capability:'QUANTITATIVE'}]){
   const {input,config,fetcher}=fixture();Object.assign(input.binding,patch);await expect(evaluateScience(input,config)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
  }
 });
 it('rejects fabricated criterion, source, version, score and unsupported confidence',()=>{
  for(const mode of ['criterion','source','version','score','uncertain']){
   const {input,output}=fixture();
   if(mode==='criterion')output.criteria[0].criterion_id='fabricated';
   if(mode==='source')output.criteria[0].evidence_ids=['fabricated'];
   if(mode==='version')output.rubric_version='other';
   if(mode==='score')Object.assign(output,{score:100});
   if(mode==='uncertain')output.criteria[0].verdict='NOT_ASSESSABLE';
   expect(()=>validateScienceResult(output,input.binding)).toThrow();
  }
 });
 it('allows explicit review-required uncertainty without a fake score',()=>{
  const {input,output}=fixture();output.criteria[0].verdict='NOT_ASSESSABLE';output.requires_human_review=true;
  expect(validateScienceResult(output,input.binding).requires_human_review).toBe(true);
 });
 it('disabled/malformed/failed providers never produce a result or automatic retry',async()=>{
  const {input,config,fetcher}=fixture();await expect(evaluateScience(input,{...config,enabled:false})).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockResolvedValueOnce(Response.json({status:'incomplete',output:[]}));await expect(evaluateScience(input,config)).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(1);
 });
});
