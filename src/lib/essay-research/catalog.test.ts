import {existsSync,readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {parseResearchCatalog,searchResearch,type ResearchCatalog} from './catalog';
import {syntheticCatalog} from './synthetic-fixture';
describe('research boundary',()=>{
 it('keeps unknowns and separate metadata/evaluation states',()=>{const c=parseResearchCatalog(syntheticCatalog());expect(c.offerings[0].tracks[0].type).toBe('UNKNOWN');expect(c.evaluationAllowed).toBe(false)});
 it('searches source campus/track and region without counts aggregation',()=>{const c=syntheticCatalog();expect(searchResearch(c,'합성','seoul')).toHaveLength(1);expect(searchResearch(c,'합성','nonseoul')).toHaveLength(0)});
 for(const field of ['publicationAllowed','evaluationAllowed'] as const)it('rejects enabled '+field,()=>{const c=syntheticCatalog();Object.assign(c,{[field]:true});expect(()=>parseResearchCatalog(c)).toThrow()});
 it('rejects inferred questionsets or routing',()=>{const c=syntheticCatalog();c.offerings[0].tracks[0].routing='READY';expect(()=>parseResearchCatalog(c)).toThrow();});
 it('rejects cross-offering source IDs, duplicate tracks and dangerous links',()=>{
  for(const change of [(c:ResearchCatalog)=>{c.offerings[0].tracks[0].sourceIds=['OTHER']},(c:ResearchCatalog)=>{c.offerings[0].tracks.push(c.offerings[0].tracks[0])},(c:ResearchCatalog)=>{c.offerings[0].sources=['javascript:alert(1)']}]){const c=syntheticCatalog();change(c);expect(()=>parseResearchCatalog(c)).toThrow();}
 });
});

it('preserves original HTTP official citations without inventing HTTPS',()=>{const c=syntheticCatalog();c.offerings[0].sources=['http://example.edu/source'];expect(parseResearchCatalog(c).offerings[0].sources[0]).toBe('http://example.edu/source')});

it.skipIf(!existsSync('.local/essay-research/catalog.json'))('validates actual Owner V2 converted bundle locally',()=>{const c=parseResearchCatalog(JSON.parse(readFileSync('.local/essay-research/catalog.json','utf8')));expect(c.offerings).toHaveLength(50);expect(c.offerings.flatMap(o=>o.tracks)).toHaveLength(101)});
