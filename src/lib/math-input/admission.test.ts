import { describe, expect, it } from "vitest";

import { admitMathInput, MATH_INPUT_LIMITS } from "./admission";
import { imageArtifact, typedArtifact } from "./fixtures";

describe("admitMathInput", () => {
  it("admits a valid single image and orders by page index", () => {
    const result = admitMathInput([imageArtifact(1), imageArtifact(0)]);
    expect(result.status).toBe("ADMITTED");
    expect(result.orderedArtifacts.map((a) => a.pageIndex)).toEqual([0, 1]);
  });

  it("rejects empty input", () => {
    expect(admitMathInput([]).reasons).toContain("EMPTY_INPUT");
  });

  it("rejects an unsupported media type", () => {
    const result = admitMathInput([imageArtifact(0, { mediaType: "image/gif" })]);
    expect(result.status).toBe("REJECTED");
    expect(result.reasons).toContain("UNSUPPORTED_INPUT");
  });

  it("rejects an image over the size bound", () => {
    const result = admitMathInput([imageArtifact(0, { byteSize: MATH_INPUT_LIMITS.maxFileBytes + 1 })]);
    expect(result.reasons).toContain("FILE_TOO_LARGE");
  });

  it("rejects an image with no evidence reference", () => {
    const result = admitMathInput([imageArtifact(0, { evidenceRef: null })]);
    expect(result.reasons).toContain("INVALID_FILE");
  });

  it("rejects too many pages", () => {
    const artifacts = Array.from({ length: MATH_INPUT_LIMITS.maxPages + 1 }, (_, i) => imageArtifact(i));
    expect(admitMathInput(artifacts).reasons).toContain("TOO_MANY_PAGES");
  });

  it("rejects duplicate page indexes", () => {
    const result = admitMathInput([imageArtifact(0), imageArtifact(0)]);
    expect(result.reasons).toContain("DUPLICATE_PAGE_INDEX");
  });

  it("rejects empty typed input and over-long typed input", () => {
    expect(admitMathInput([typedArtifact(0, "   ")]).reasons).toContain("TYPED_EMPTY");
    const long = "x".repeat(MATH_INPUT_LIMITS.maxTypedChars + 1);
    expect(admitMathInput([typedArtifact(0, long)]).reasons).toContain("TYPED_TOO_LONG");
  });
});
