import registry from '../../../src/data/essay-source-registry.json';
import {publicCatalog as catalog} from '../../../src/lib/essay-runtime/public-discovery';
import {officialUrl} from '../../../src/lib/essay-runtime/catalog';
/** One public metadata source for native APP and WEB; never exposes answers/evidence. */
export function onRequestGet(){
 return Response.json({...registry,universities:catalog.universities.filter(u=>registry.coverage.some(c=>c.sourceUniversityId===u.sourceUniversityId)).map(u=>({sourceUniversityId:u.sourceUniversityId,universityId:u.universityId,name:u.name,officialSourceUrl:u.researchSources?.map(s=>officialUrl(s.url)).find(Boolean)??u.offerings.flatMap(o=>o.sources).map(officialUrl).find(Boolean)??null}))},{headers:{'Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff'}});
}
