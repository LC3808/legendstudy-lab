import { describe, expect, it } from "vitest";

import { listUniversities, getUniversity, getUniversityYear, searchUniversities } from "./public-catalog";

describe("public catalog", () => {
  it("preserves the reviewed five-university fixture subset", () => {
    const universities = listUniversities();
    expect(universities).toHaveLength(5);
    expect(universities.map((university) => university.id)).toEqual(["knu", "pnu", "kwangwoon", "ajou", "seokyeong"]);
    expect(universities.every((university) => university.origin === "OFFICIAL_SOURCE")).toBe(true);
    expect(universities.every((university) => university.sourceLinks.length > 0)).toBe(true);
  });

  it("looks up a university and declared public metadata year without fallback", () => {
    expect(getUniversity("knu")?.universityName).toBe("경북대학교");
    expect(getUniversity("missing")).toBeUndefined();
    expect(getUniversityYear("pnu", "2027")?.admissionTrack).toContain("일반전형");
    expect(getUniversityYear("pnu", "2026")).toBeUndefined();
  });

  it("filters by name, region, year, and taxonomy without inventing fixture rows", () => {
    const universities = listUniversities();
    expect(searchUniversities(universities, "아주", "전체", "2027", "전체").map((item) => item.id)).toEqual(["ajou"]);
    expect(searchUniversities(universities, "", "서울", "2027", "전체").map((item) => item.id)).toEqual(["kwangwoon", "seokyeong"]);
    expect(searchUniversities(universities, "", "전체", "2027", "mixed_aat_structured_response").map((item) => item.id)).toEqual(["knu"]);
    expect(searchUniversities(universities, "", "전체", "2026", "전체")).toEqual([]);
  });
});
