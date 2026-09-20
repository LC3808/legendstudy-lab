import { reviewedUniversities } from "@/fixtures/public-metadata";
import type { UniversityPublicMetadata } from "@/types/domain";

export function listUniversities(): UniversityPublicMetadata[] {
  return reviewedUniversities;
}

export function getUniversity(universityId: string): UniversityPublicMetadata | undefined {
  return reviewedUniversities.find((university) => university.id === universityId);
}

export function getUniversityYear(
  universityId: string,
  year: string,
): UniversityPublicMetadata | undefined {
  const university = getUniversity(universityId);
  return university?.admissionYear === Number(year) ? university : undefined;
}

export function searchUniversities(
  universities: UniversityPublicMetadata[],
  query: string,
  region: string,
  year: string,
  taxonomy: string,
): UniversityPublicMetadata[] {
  const normalized = query.trim().toLocaleLowerCase("ko-KR");
  return universities.filter((university) => {
    const queryMatches = !normalized || [
      university.universityName,
      university.campus,
      university.region,
      university.city,
      university.admissionTrack,
      university.examTypeLabel,
      university.taxonomyLabel,
    ].join(" ").toLocaleLowerCase("ko-KR").includes(normalized);
    const regionMatches = region === "전체" || university.region === region;
    const yearMatches = year === "전체" || String(university.admissionYear) === year;
    const taxonomyMatches = taxonomy === "전체" || university.taxonomy === taxonomy;
    return queryMatches && regionMatches && yearMatches && taxonomyMatches;
  });
}

export function taxonomyDisplayLabel(taxonomy: UniversityPublicMetadata["taxonomy"]): string {
  const labels: Record<UniversityPublicMetadata["taxonomy"], string> = {
    long_essay_document_analysis: "장문 논술형",
    structured_short_response: "약술형 응답",
    math_proof: "수리 풀이형",
    science_response: "과학 응답형",
    mixed_aat_structured_response: "복합형 AAT",
  };
  return labels[taxonomy];
}
