import {it,expect} from 'vitest';
import {publicCatalog,filterCatalog,catalogUniversity} from './public-discovery';
it('uses all 42 source universities without five-sample fallback or invented canonical IDs',()=>{expect(publicCatalog.universities).toHaveLength(42);expect(new Set(publicCatalog.universities.map(u=>u.sourceUniversityId)).size).toBe(42);expect(publicCatalog.universities.filter(u=>u.universityId)).toHaveLength(27);expect(publicCatalog.universities.flatMap(u=>u.offerings)).toHaveLength(49);});
it('searches actual names and campuses; combines filters within the SAME offering',()=>{expect(filterCatalog('성균관','','','')).toHaveLength(1);expect(filterCatalog('성균관','서울','','2027')[0].offerings.every(o=>o.region==='서울')).toBe(true);expect(filterCatalog('성균관','서울','','2025')).toHaveLength(0);expect(filterCatalog('','경기·인천','수리','2027').every(u=>u.offerings.every(o=>o.region==='경기·인천'&&o.types.includes('수리')))).toBe(true);});
it('retains campus rows and official sources, excludes quarantined future-date offering',()=>{expect(catalogUniversity('hufs')!.offerings).toHaveLength(2);const offerings=publicCatalog.universities.flatMap(u=>u.offerings);expect(offerings.every(o=>o.sources.length>0&&o.sources.every(s=>/^https?:\/\//.test(s)))).toBe(true);expect(offerings.some(o=>o.sourceIds.includes('LSL27-052'))).toBe(false);expect(catalogUniversity('hongik')).toBeDefined();});
it('does not infer evaluation types from administrative humanities or medical labels',()=>{for(const u of publicCatalog.universities)for(const o of u.offerings){if(o.types.includes('수리'))expect(o.rawEssayTypes.join(' ')).toMatch(/수리|수학\s*논술/);if(o.types.includes('과학'))expect(o.rawEssayTypes.join(' ')).toMatch(/과학\s*논술|과학\([0-9]+%\)|과학 제시문 서논술/);}});

it('preserves official admissions scope and never invents applicant statistics',()=>{
 const details=publicCatalog.universities.flatMap(u=>u.offerings.flatMap(o=>o.admissionDetails??[]));
 expect(details.length).toBeGreaterThanOrEqual(49);
 for(const d of details){expect(d.applicants).toBeNull();expect(d.competitionRatio).toBeNull();expect(d.sourceUrl).toMatch(/^https?:/);for(const value of Object.values(d.facts))expect(value).not.toMatch(/^(UNKNOWN|NOT PUBLISHED)/);}
 const pnu=catalogUniversity('pnu')!.offerings.flatMap(o=>o.admissionDetails??[]);
 expect(pnu.map(d=>d.facts.intake_count)).toEqual(expect.arrayContaining([expect.stringContaining('342명'),expect.stringContaining('21명')]));
 expect(catalogUniversity('konkuk')!.offerings[0].admissionDetails![0].facts.essay_weight).toBe('100%');
});
