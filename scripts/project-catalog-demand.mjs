import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

/** Only officially verified university-wide totals can enter the public sort model.
 * Campus records remain separate; no automatic summing or use of reported rank. */
export function projectCatalogDemand(research,catalog){
 const byId=new Map(catalog.universities.map(u=>[u.sourceUniversityId,u]));
 const universities=Object.fromEntries(catalog.universities.map(u=>[u.sourceUniversityId,{
  universityId:u.universityId,admissionYear:2027,sourceRecords:[],verificationStatus:'unverified',
  applicants:null,competitionRatio:null,sourceUrl:null,verifiedAt:null,
 }]));
 for(const r of research.records){
  const u=byId.get(r.sourceUniversityId);
  if(!u||u.universityId!==r.universityId||r.admissionYear!==2027)throw new Error('Invalid catalog identity/year');
  if(r.offeringIds.some(id=>!u.offerings.some(o=>o.id===id)))throw new Error('Invalid campus offering');
  const out=universities[r.sourceUniversityId];out.sourceRecords.push(r.sourceRecord);
  const v=r.officialVerification;
  if(r.verificationStatus!=='verified'||v?.status!=='verified')continue;
  if(v.admissionYear!==2027||v.scope!=='university_total'||!/^https:\/\//.test(v.sourceUrl??'')||!/^\d{4}-\d{2}-\d{2}$/.test(v.verifiedAt??''))throw new Error('Incomplete official verification');
  if(out.verificationStatus==='verified')throw new Error('Duplicate university total');
  if(v.applicants!==null&&(!Number.isInteger(v.applicants)||v.applicants<0))throw new Error('Invalid applicant total');
  if(v.competitionRatio!==null&&(!Number.isFinite(v.competitionRatio)||v.competitionRatio<0))throw new Error('Invalid competition ratio');
  Object.assign(out,{verificationStatus:'verified',applicants:v.applicants,competitionRatio:v.competitionRatio,sourceUrl:v.sourceUrl,verifiedAt:v.verifiedAt});
 }
 return {version:1,sourceSha256:research.source.sha256,universities};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const research=JSON.parse(fs.readFileSync('data/research/essay-demand-2027.json','utf8'));
 const catalog=JSON.parse(fs.readFileSync('src/data/essay-public-catalog.json','utf8'));
 const output=JSON.stringify(projectCatalogDemand(research,catalog),null,2)+'\n';
 const target='src/data/essay-catalog-demand.json';
 if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw new Error('Stale demand projection');}
 else fs.writeFileSync(target,output);
 console.log('Catalog demand:44 source records /42 universities; verified-only projection OK');
}
