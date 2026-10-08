/**
 * MATH-3C-1 — benchmark fixture manifest. One fixture per required category (20 total).
 * Deterministic + synthetic; NO real student data. Region ids are stable so scoring aligns provider
 * output to expected facts (live-provider alignment is a MATH-3C-2 concern documented in the harness).
 */

import type { MathInputArtifact, MathResponseFormat } from "../types";
import type { BenchmarkCategory, BenchmarkFixture, ExpectedRegion } from "./types";

function img(fixtureId: string, pageIndex: number, modality: "IMAGE" | "PDF" = "IMAGE"): MathInputArtifact {
  return {
    artifactId: `${fixtureId}:art${pageIndex}`,
    modality,
    mediaType: modality === "PDF" ? "application/pdf" : "image/png",
    byteSize: 128_000,
    pageIndex,
    evidenceRef: `evidence://bakeoff/${fixtureId}/p${pageIndex}`,
  };
}

function typed(fixtureId: string, text: string): MathInputArtifact {
  // artifactId chosen so the pipeline's generated region id (`${artifactId}:typed`) is stable/known.
  return {
    artifactId: fixtureId,
    modality: "TYPED",
    mediaType: "text/plain",
    byteSize: 0,
    pageIndex: 0,
    evidenceRef: null,
    typedText: text,
  };
}

function exp(
  fixtureId: string,
  index: number,
  partial: Omit<ExpectedRegion, "regionId"> & Partial<Pick<ExpectedRegion, "regionId">>,
): ExpectedRegion {
  return { regionId: `${fixtureId}:r${index}`, ...partial };
}

function fixture(
  id: string,
  category: BenchmarkCategory,
  title: string,
  responseFormat: MathResponseFormat,
  artifacts: MathInputArtifact[],
  expectedRegions: ExpectedRegion[],
): BenchmarkFixture {
  return { id, category, title, responseFormat, artifacts, expectedRegions };
}

export const BENCHMARK_FIXTURES: readonly BenchmarkFixture[] = [
  fixture("B01", "KOREAN_HANDWRITING", "손글씨 한국어 풀이", "FULL_SOLUTION", [img("B01", 0)], [
    exp("B01", 1, { pageIndex: 0, readingOrder: 0, role: "REASONING_TEXT", critical: false, expectedRawText: "주어진 조건에서", expectedNormalizedMath: null }),
    exp("B01", 2, { pageIndex: 0, readingOrder: 1, role: "FINAL_ANSWER", critical: true, expectedRawText: "a=3", expectedNormalizedMath: "a=3" }),
  ]),
  fixture("B02", "KOREAN_PROSE_FORMULAS", "한국어 서술 + 수식", "FULL_SOLUTION", [img("B02", 0)], [
    exp("B02", 1, { pageIndex: 0, readingOrder: 0, role: "REASONING_TEXT", critical: false, expectedRawText: "연속이므로 극한값이 같다", expectedNormalizedMath: null }),
    exp("B02", 2, { pageIndex: 0, readingOrder: 1, role: "FORMULA", critical: true, expectedRawText: "lim f(x)=f(1)", expectedNormalizedMath: "\\lim_{x\\to1} f(x)=f(1)" }),
  ]),
  fixture("B03", "SUPERSCRIPT_SUBSCRIPT", "위첨자/아래첨자", "FULL_SOLUTION", [img("B03", 0)], [
    exp("B03", 1, { pageIndex: 0, readingOrder: 0, role: "EXPONENT", critical: true, expectedRawText: "x^2", expectedNormalizedMath: "x^2" }),
    exp("B03", 2, { pageIndex: 0, readingOrder: 1, role: "FORMULA", critical: false, expectedRawText: "a_1+a_2", expectedNormalizedMath: "a_1+a_2" }),
  ]),
  fixture("B04", "FRACTIONS", "분수", "SHORT_ANSWER", [img("B04", 0)], [
    exp("B04", 1, { pageIndex: 0, readingOrder: 0, role: "FINAL_ANSWER", critical: true, expectedRawText: "1/2", expectedNormalizedMath: "\\frac{1}{2}" }),
  ]),
  fixture("B05", "RADICALS", "근호", "SHORT_ANSWER", [img("B05", 0)], [
    exp("B05", 1, { pageIndex: 0, readingOrder: 0, role: "FINAL_ANSWER", critical: true, expectedRawText: "sqrt(2)", expectedNormalizedMath: "\\sqrt{2}" }),
  ]),
  fixture("B06", "INEQUALITIES", "부등식", "SHORT_REASONING", [img("B06", 0)], [
    exp("B06", 1, { pageIndex: 0, readingOrder: 0, role: "INEQUALITY_DIRECTION", critical: true, expectedRawText: "x>=1", expectedNormalizedMath: "x\\ge 1" }),
  ]),
  fixture("B07", "INTEGRAL_BOUNDS", "적분 구간", "FULL_SOLUTION", [img("B07", 0)], [
    exp("B07", 1, { pageIndex: 0, readingOrder: 0, role: "INTEGRATION_BOUND", critical: true, expectedRawText: "int_0^1 x^2 dx", expectedNormalizedMath: "\\int_0^1 x^2\\,dx" }),
  ]),
  fixture("B08", "MATRICES", "행렬", "FULL_SOLUTION", [img("B08", 0)], [
    exp("B08", 1, { pageIndex: 0, readingOrder: 0, role: "FORMULA", critical: true, expectedRawText: "[[1,0],[0,1]]", expectedNormalizedMath: "\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}" }),
  ]),
  fixture("B09", "MULTILINE_EQUATIONS", "여러 줄 수식 전개", "FULL_SOLUTION", [img("B09", 0)], [
    exp("B09", 1, { pageIndex: 0, readingOrder: 0, role: "FORMULA", critical: false, expectedRawText: "f(x)=x^2-2x", expectedNormalizedMath: "f(x)=x^2-2x" }),
    exp("B09", 2, { pageIndex: 0, readingOrder: 1, role: "FORMULA", critical: true, expectedRawText: "f'(x)=2x-2", expectedNormalizedMath: "f'(x)=2x-2" }),
    exp("B09", 3, { pageIndex: 0, readingOrder: 2, role: "FINAL_ANSWER", critical: true, expectedRawText: "x=1", expectedNormalizedMath: "x=1" }),
  ]),
  fixture("B10", "MULTIPAGE_READING_ORDER", "여러 페이지 읽기 순서", "FULL_SOLUTION", [img("B10", 0), img("B10", 1)], [
    exp("B10", 1, { pageIndex: 0, readingOrder: 0, role: "REASONING_TEXT", critical: false, expectedRawText: "1페이지", expectedNormalizedMath: null }),
    exp("B10", 2, { pageIndex: 1, readingOrder: 0, role: "FINAL_ANSWER", critical: true, expectedRawText: "k=4", expectedNormalizedMath: "k=4" }),
  ]),
  fixture("B11", "SUBPROBLEM_MARKERS", "소문항 번호", "FULL_SOLUTION", [img("B11", 0)], [
    exp("B11", 1, { pageIndex: 0, readingOrder: 0, role: "SUBPROBLEM_MARKER", critical: true, expectedRawText: "(1)", expectedNormalizedMath: null }),
    exp("B11", 2, { pageIndex: 0, readingOrder: 1, role: "FINAL_ANSWER", critical: true, expectedRawText: "2", expectedNormalizedMath: "2" }),
  ]),
  fixture("B12", "GRAPHS_DIAGRAMS", "그래프/도형", "FULL_SOLUTION", [img("B12", 0)], [
    exp("B12", 1, { pageIndex: 0, readingOrder: 0, role: "GRAPH", critical: false, expectedRawText: "", expectedNormalizedMath: null, requiresEvidenceRef: true }),
  ]),
  fixture("B13", "CROSSED_OUT_CORRECTED", "지우고 고친 손글씨", "FULL_SOLUTION", [img("B13", 0)], [
    exp("B13", 1, { pageIndex: 0, readingOrder: 0, role: "FINAL_ANSWER", critical: true, expectedRawText: "x=5", expectedNormalizedMath: "x=5" }),
  ]),
  fixture("B14", "DENSE_FULL_SOLUTION", "조밀한 전체 풀이", "FULL_SOLUTION", [img("B14", 0)], [
    exp("B14", 1, { pageIndex: 0, readingOrder: 0, role: "REASONING_TEXT", critical: false, expectedRawText: "판별식을 계산하면", expectedNormalizedMath: null }),
    exp("B14", 2, { pageIndex: 0, readingOrder: 1, role: "FORMULA", critical: true, expectedRawText: "D=b^2-4ac", expectedNormalizedMath: "D=b^2-4ac" }),
    exp("B14", 3, { pageIndex: 0, readingOrder: 2, role: "FINAL_ANSWER", critical: true, expectedRawText: "m<1", expectedNormalizedMath: "m<1" }),
  ]),
  fixture("B15", "PROOF", "증명", "PROOF", [img("B15", 0)], [
    exp("B15", 1, { pageIndex: 0, readingOrder: 0, role: "REASONING_TEXT", critical: true, expectedRawText: "필요조건과 충분조건을 각각 보인다", expectedNormalizedMath: null }),
    exp("B15", 2, { pageIndex: 0, readingOrder: 1, role: "FINAL_ANSWER", critical: true, expectedRawText: "따라서 동치이다", expectedNormalizedMath: null }),
  ]),
  fixture("B16", "SHORT_ANSWER", "단답형", "SHORT_ANSWER", [typed("B16", "12")], [
    exp("B16", 1, { regionId: "B16:typed", pageIndex: 0, readingOrder: 0, role: "FINAL_ANSWER", critical: true, expectedRawText: "12", expectedNormalizedMath: "12" }),
  ]),
  fixture("B17", "AMBIGUOUS_EXPONENT", "x^2 / x^3 혼동", "FULL_SOLUTION", [img("B17", 0)], [
    exp("B17", 1, { pageIndex: 0, readingOrder: 0, role: "EXPONENT", critical: true, expectedRawText: "x^2", expectedNormalizedMath: "x^2" }),
  ]),
  fixture("B18", "AMBIGUOUS_SIGN", "+ / - 혼동", "FULL_SOLUTION", [img("B18", 0)], [
    exp("B18", 1, { pageIndex: 0, readingOrder: 0, role: "OPERATOR_SIGN", critical: true, expectedRawText: "-", expectedNormalizedMath: "-" }),
  ]),
  fixture("B19", "AMBIGUOUS_INEQUALITY", "< / ≤ 혼동", "FULL_SOLUTION", [img("B19", 0)], [
    exp("B19", 1, { pageIndex: 0, readingOrder: 0, role: "INEQUALITY_DIRECTION", critical: true, expectedRawText: "<=", expectedNormalizedMath: "\\le" }),
  ]),
  fixture("B20", "REGION_LOCALIZATION", "근거/영역 위치 추적", "FULL_SOLUTION", [img("B20", 0)], [
    exp("B20", 1, { pageIndex: 0, readingOrder: 0, role: "FORMULA", critical: true, expectedRawText: "y=2x+1", expectedNormalizedMath: "y=2x+1", requiresEvidenceRef: true }),
  ]),
] as const;
