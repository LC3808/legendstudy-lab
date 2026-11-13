import {publicCatalog} from './public-discovery';
import {officialUrl} from './catalog';

/** Public facts only. Dates remain verbatim: ranges/divisions must not be
 * interpreted as an individual applicant's confirmed appointment. */
export function universityNewsCatalog() {
 return {
  version: 'university-news-catalog-v1',
  asOf: publicCatalog.asOf,
  universities: publicCatalog.universities.map(u => ({
   universityId: u.universityId,
   sourceUniversityId: u.sourceUniversityId,
   name: u.name,
   identityStatus: u.universityId ? 'MAPPED' : 'UNMAPPED',
   officialSourceUrl: u.researchSources?.map(s=>officialUrl(s.url)).find(Boolean)
    ?? u.offerings.flatMap(o=>o.sources).map(officialUrl).find(Boolean) ?? null,
   offerings: u.offerings.flatMap(o=>(o.admissionDetails??[]).map(d=>({
    id: `${o.id}:${d.sourceId}`,
    academicYear:o.admissionYear,
    admissionName:d.name,
    divisions:o.types,
    campus:o.campus,
    examDateText:d.facts.exam_date??null,
    examTimeText:d.facts.exam_time??null,
    scheduleStatus:d.facts.exam_date ? 'SOURCE_TEXT_AVAILABLE' : 'UNCONFIRMED',
    sourceStatus:d.sourceStatus,
    verifiedAt:d.verifiedAt,
    sourceUrl:officialUrl(d.sourceUrl),
   }))),
  })),
 };
}
