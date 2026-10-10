import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseResearchCatalog, type ResearchCatalog } from './catalog';
/** Never imports research in a production export, even with a stale preview flag.
 * This is a local file adapter, not an authenticated production/private API. */
export async function loadResearchPreview():Promise<ResearchCatalog|null>{
 if(process.env.NODE_ENV!=='development'||process.env.LEGENDSTUDY_ESSAY_PREVIEW!=='1')return null;
 return parseResearchCatalog(JSON.parse(await readFile(join(process.cwd(),'.local/essay-research/catalog.json'),'utf8')));
}
