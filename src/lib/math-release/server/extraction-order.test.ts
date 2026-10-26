import {it,expect} from 'vitest';
import {orderExtractionRegions} from './extraction-order';
it('joins repeated photo-local orders in student image order without changing text',()=>{
 const regions=[{artifact_id:'b',page:1,reading_order:1,raw_text:'B'}, {artifact_id:'a',page:1,reading_order:2,raw_text:'A2'}, {artifact_id:'a',page:1,reading_order:1,raw_text:'A1'}];
 expect(orderExtractionRegions(regions,[{artifact_id:'a'},{artifact_id:'b'}])).toEqual([{...regions[2],reading_order:1},{...regions[1],reading_order:2},{...regions[0],reading_order:3}]);
 expect(regions[0].reading_order).toBe(1);
});
it('rejects evidence from a different question',()=>{expect(()=>orderExtractionRegions([{artifact_id:'foreign',page:1,reading_order:1}],[{artifact_id:'a'}])).toThrow('INVALID_OUTPUT');});
