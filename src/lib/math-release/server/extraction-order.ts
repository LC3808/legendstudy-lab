/** Join photo-local reading orders into one answer without changing extracted content. */
export function orderExtractionRegions(regions: unknown[], evidence: {artifact_id:string}[]): unknown[] {
 const positions=new Map(evidence.map((row,index)=>[row.artifact_id,index]));
 const rows=regions.map((value,index)=>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('INVALID_OUTPUT');
  const row=value as Record<string,unknown>;
  if(typeof row.artifact_id!=='string'||!positions.has(row.artifact_id)||!Number.isInteger(row.page)||Number(row.page)<1||!Number.isInteger(row.reading_order)||Number(row.reading_order)<1)throw Error('INVALID_OUTPUT');
  return {row,index};
 });
 rows.sort((a,b)=>positions.get(a.row.artifact_id as string)!-positions.get(b.row.artifact_id as string)!||Number(a.row.page)-Number(b.row.page)||Number(a.row.reading_order)-Number(b.row.reading_order)||a.index-b.index);
 return rows.map(({row},index)=>({...row,reading_order:index+1}));
}
