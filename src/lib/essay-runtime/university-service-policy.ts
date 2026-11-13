/** Owner decision 2026-11-13: permanently outside the Essay service roadmap.
 * Keep source Catalog/Registry records for provenance; omit these discovery cards.
 */
export const excludedEssayUniversities = new Set([
 'hanshin','tukorea','koreatech','suwon','shinhan','seokyeong','kangnam',
]);
export const isEssayDiscoveryUniversity = (sourceId:string) => !excludedEssayUniversities.has(sourceId);
