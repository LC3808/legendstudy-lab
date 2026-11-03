import { orderExtractionRegions } from "./extraction-order";

export const EXTRACTION_BATCH_BYTES = 20 * 1024 * 1024;
type Artifact = { artifact_id: string; media_type: string };
type Loaded = { byteLength: number; content: unknown };

/** Keep original bytes; each call is bounded and only a complete aggregate is returned. */
export async function extractInBatches<T extends Artifact>(
  evidence: T[],
  load: (artifact: T) => Promise<Loaded>,
  recognize: (content: unknown[]) => Promise<unknown>,
): Promise<unknown[]> {
  if (!evidence.length || evidence.length > 20 || new Set(evidence.map(a => a.artifact_id)).size !== evidence.length) throw Error("INVALID_INPUT");
  let bytes = 0;
  let batch: T[] = [], parts: unknown[] = [];
  const regions: unknown[] = [];
  const flush = async () => {
    if (!batch.length) return;
    const output = await recognize([{ type: "input_text", text: "Read each artifact into ordered regions. Match artifact_id from this inventory: " + JSON.stringify(batch.map(({ artifact_id, media_type }) => ({ artifact_id, media_type }))) }, ...parts]) as { regions?: unknown };
    if (!output || !Array.isArray(output.regions) || !output.regions.length || regions.length + output.regions.length > 100) throw Error("INVALID_OUTPUT");
    const ordered = orderExtractionRegions(output.regions, batch);
    // Missing photos must not silently become a completed whole-answer extraction.
    const represented = new Set(ordered.map(r => (r as {artifact_id:string}).artifact_id));
    if (batch.some(a => !represented.has(a.artifact_id))) throw Error("INVALID_OUTPUT");
    for (const value of ordered) {
      const r = value as Record<string, unknown>;
      const fields = ['artifact_id','page','reading_order','raw_text','normalized_math','confidence','uncertain','x','y','width','height'];
      if (Object.keys(r).some(k => !fields.includes(k)) || typeof r.raw_text !== 'string' || typeof r.normalized_math !== 'string' || r.raw_text.length > 10000 || r.normalized_math.length > 10000 || typeof r.uncertain !== 'boolean') throw Error('INVALID_OUTPUT');
      if (r.confidence != null && (typeof r.confidence !== 'number' || !Number.isFinite(r.confidence) || r.confidence < 0 || r.confidence > 1)) throw Error('INVALID_OUTPUT');
      const {x,y,width,height} = r;
      if ([x,y,width,height].some(n => typeof n !== 'number' || !Number.isFinite(n)) || Number(x)<0 || Number(y)<0 || Number(width)<=0 || Number(height)<=0 || Number(x)+Number(width)>1 || Number(y)+Number(height)>1) throw Error('INVALID_REGION_BOUNDS');
    }
    regions.push(...ordered);
    batch = []; parts = []; bytes = 0;
  };
  for (const artifact of evidence) {
    const loaded = await load(artifact);
    if (!Number.isSafeInteger(loaded.byteLength) || loaded.byteLength <= 0 || loaded.byteLength > EXTRACTION_BATCH_BYTES) throw Error("INPUT_BOUND");
    if (bytes + loaded.byteLength > EXTRACTION_BATCH_BYTES) await flush();
    batch.push(artifact); parts.push(loaded.content); bytes += loaded.byteLength;
  }
  await flush();
  return orderExtractionRegions(regions, evidence);
}
