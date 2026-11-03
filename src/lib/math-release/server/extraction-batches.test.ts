import { expect, it, vi } from 'vitest';
import { extractInBatches, EXTRACTION_BATCH_BYTES as limit } from './extraction-batches';
const evidence = ['left','right'].map(artifact_id => ({artifact_id,media_type:'image/png'}));
const row = (id:string) => ({artifact_id:id,page:1,reading_order:1,raw_text:'-x²/3'});
const recognize = (content:unknown[]) => ({regions: JSON.parse((content[0] as {text:string}).text.split('inventory: ')[1]).map((a:{artifact_id:string}) => row(a.artifact_id))});
it('splits actual iPhone byte sizes, preserves artifact/text and global ordering', async () => {
 const provider=vi.fn(async (content:unknown[])=>recognize(content));
 const result=await extractInBatches(evidence,async a=>({byteLength:a.artifact_id==='left'?11417229:14218771,content:{image:a.artifact_id}}),provider);
 expect(provider).toHaveBeenCalledTimes(2);
 expect(result).toEqual([row('left'),{...row('right'),reading_order:2}]);
 expect(provider.mock.calls[0][0]).toHaveLength(2);
 expect(provider.mock.calls[1][0]).toHaveLength(2);
});
it('keeps a fitting multi-photo input in one call, including the exact limit',async()=>{
 const provider=vi.fn(async(content:unknown[])=>recognize(content));
 await extractInBatches(evidence,async a=>({byteLength:limit/2,content:a}),provider);
 expect(provider).toHaveBeenCalledTimes(1);
});
it('rejects an oversized individual file before invoking the provider',async()=>{
 const provider=vi.fn();
 await expect(extractInBatches(evidence,async()=>({byteLength:limit+1,content:null}),provider)).rejects.toThrow('INPUT_BOUND');
 expect(provider).not.toHaveBeenCalled();
});
it('never returns partial success when the second batch fails',async()=>{
 const provider=vi.fn().mockResolvedValueOnce({regions:[row('left')]}).mockRejectedValueOnce(Error('PROVIDER_UNAVAILABLE'));
 await expect(extractInBatches(evidence,async a=>({byteLength:limit,content:a}),provider)).rejects.toThrow('PROVIDER_UNAVAILABLE');
 expect(provider).toHaveBeenCalledTimes(2);
});
it.each(['foreign','right'])('rejects a region from %s outside its current batch',async id=>{
 await expect(extractInBatches(evidence,async a=>({byteLength:limit,content:a}),async()=>({regions:[row(id)]}))).rejects.toThrow('INVALID_OUTPUT');
});
it('rejects omitted photos and an aggregate over 100 regions',async()=>{
 await expect(extractInBatches(evidence,async a=>({byteLength:1,content:a}),async()=>({regions:[row('left')]}))).rejects.toThrow('INVALID_OUTPUT');
 await expect(extractInBatches(evidence,async a=>({byteLength:limit,content:a}),async content=>({regions:Array.from({length:51},()=>recognize(content).regions[0])}))).rejects.toThrow('INVALID_OUTPUT');
});
