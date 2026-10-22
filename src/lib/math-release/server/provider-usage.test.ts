import {it,expect,vi} from 'vitest';
import {candidateJson} from './provider';
it('records bounded token usage without answer or generated content',async()=>{
 const log=vi.spyOn(console,'info').mockImplementation(()=>{});
 try {
 const result=await candidateJson({enabled:true,model:'fixture',key:'private-key',fetcher:vi.fn(async()=>Response.json({status:'completed',usage:{input_tokens:12,output_tokens:8},output:[{content:[{type:'output_text',text:'{"result":"private-result"}'}]}]})) as typeof fetch},'private-criteria','private-answer');
 expect(result).toEqual({result:'private-result'});
 expect(log).toHaveBeenCalledWith('MATH_PROVIDER_USAGE',{model:'fixture',input_tokens:12,output_tokens:8});
 expect(JSON.stringify(log.mock.calls)).not.toContain('private');
 } finally {log.mockRestore();}
});
