import {it,expect} from 'vitest';
import fs from 'node:fs';
import {projectCatalogDemand} from '../../../scripts/project-catalog-demand.mjs';
const research=JSON.parse(fs.readFileSync('data/research/essay-demand-2027.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('src/data/essay-public-catalog.json','utf8'));
it('matches the committed browser projection, excluding provisional numeric claims',()=>{
 expect(projectCatalogDemand(research,catalog)).toEqual(JSON.parse(fs.readFileSync('src/data/essay-catalog-demand.json','utf8')));
});
it('uses separately verified university totals only, never reported counts or campus sums',()=>{
 const input=structuredClone(research);input.records[0].verificationStatus='verified';
 input.records[0].officialVerification={status:'verified',admissionYear:2027,scope:'university_total',sourceUrl:'https://example.edu/admission',verifiedAt:'2026-10-11',applicants:10000,competitionRatio:25};
 expect(projectCatalogDemand(input,catalog).universities.gachon.applicants).toBe(10000);
 input.records[0].officialVerification.scope='campus';expect(()=>projectCatalogDemand(input,catalog)).toThrow('Incomplete');
 input.records[0].officialVerification.scope='university_total';input.records[0].officialVerification.admissionYear=2026;
 expect(()=>projectCatalogDemand(input,catalog)).toThrow('Incomplete');
});
it('rejects mismatched canonical identities and duplicate totals',()=>{
 const input=structuredClone(research);input.records[0].universityId='wrong';expect(()=>projectCatalogDemand(input,catalog)).toThrow('identity');
 const valid=structuredClone(research);valid.records[0].verificationStatus='verified';
 valid.records[0].officialVerification={status:'verified',admissionYear:2027,scope:'university_total',sourceUrl:'https://example.edu/admission',verifiedAt:'2026-10-11',applicants:10000,competitionRatio:25};
 valid.records.push(structuredClone(valid.records[0]));expect(()=>projectCatalogDemand(valid,catalog)).toThrow('Duplicate');
});
