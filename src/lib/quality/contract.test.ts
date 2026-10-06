import { describe, expect, it } from "vitest";

import {
  QUALITY_DTO_VERSION,
  parseCaseDetail,
  parseListEnvelope,
} from "./contract";
import { isQualityError } from "./errors";
import {
  qualityCaseDetailFixture,
  qualityListEnvelopeEmptyFixture,
  qualityListEnvelopePopulatedFixture,
} from "./fixtures";

describe("ql-read-v1 list envelope parsing", () => {
  it("T4: accepts the supported dto_version", () => {
    const page = parseListEnvelope(qualityListEnvelopePopulatedFixture);
    expect(page.dtoVersion).toBe(QUALITY_DTO_VERSION);
    expect(page.cases).toHaveLength(2);
  });

  it("T5: fails closed on an unsupported dto_version", () => {
    const bad = { ...qualityListEnvelopePopulatedFixture, dto_version: "ql-read-v2" };
    expect(() => parseListEnvelope(bad)).toThrowError();
    try {
      parseListEnvelope(bad);
    } catch (error) {
      expect(isQualityError(error) && error.kind).toBe("UNSUPPORTED_DTO");
    }
  });

  it("T5: fails closed when dto_version is missing from the list envelope", () => {
    const bad = { cases: [], next_cursor: null };
    try {
      parseListEnvelope(bad);
      throw new Error("should have thrown");
    } catch (error) {
      expect(isQualityError(error) && error.kind).toBe("UNSUPPORTED_DTO");
    }
  });

  it("T6: parses an empty list as a valid empty page (not an error)", () => {
    const page = parseListEnvelope(qualityListEnvelopeEmptyFixture);
    expect(page.cases).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it("T7: preserves nullable case fields without coercion", () => {
    const page = parseListEnvelope(qualityListEnvelopePopulatedFixture);
    const [first, second] = page.cases;
    expect(first.model_name).toBe("gpt-quality-eval");
    expect(second.model_name).toBeNull();
    expect(second.completed_at).toBeNull();
    expect(second.core_count).toBe(0);
  });

  it("T9: preserves the paired cursor (requested_at + evaluation_id)", () => {
    const page = parseListEnvelope(qualityListEnvelopePopulatedFixture);
    expect(page.nextCursor).toEqual({
      requested_at: "2026-10-01T04:00:00.000Z",
      evaluation_id: "22222222-2222-2222-2222-222222222222",
    });
  });

  it("T17: rejects a malformed envelope safely", () => {
    for (const bad of [null, 42, "x", { dto_version: QUALITY_DTO_VERSION, cases: {} }]) {
      try {
        parseListEnvelope(bad);
        throw new Error("should have thrown");
      } catch (error) {
        expect(isQualityError(error)).toBe(true);
        expect(["MALFORMED_RESPONSE", "UNSUPPORTED_DTO"]).toContain(
          isQualityError(error) ? error.kind : "",
        );
      }
    }
  });

  it("T17: rejects a case row missing evaluation_id", () => {
    const bad = { dto_version: QUALITY_DTO_VERSION, cases: [{ status: "completed" }], next_cursor: null };
    try {
      parseListEnvelope(bad);
      throw new Error("should have thrown");
    } catch (error) {
      expect(isQualityError(error) && error.kind).toBe("MALFORMED_RESPONSE");
    }
  });

  it("T17: rejects a malformed cursor (unpaired)", () => {
    const bad = {
      dto_version: QUALITY_DTO_VERSION,
      cases: [],
      next_cursor: { requested_at: "2026-10-01T04:00:00.000Z" },
    };
    try {
      parseListEnvelope(bad);
      throw new Error("should have thrown");
    } catch (error) {
      expect(isQualityError(error) && error.kind).toBe("MALFORMED_RESPONSE");
    }
  });
});

describe("ql-read-v1 detail parsing", () => {
  it("T4: accepts a detail body with the supported dto_version", () => {
    const detail = parseCaseDetail(qualityCaseDetailFixture);
    expect(detail.evaluation_id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("tolerates a detail body without dto_version (version-gated via the list)", () => {
    const withoutVersion = { ...qualityCaseDetailFixture };
    delete (withoutVersion as { dto_version?: unknown }).dto_version;
    const detail = parseCaseDetail(withoutVersion);
    expect(detail.evaluation_id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("T5: fails closed when a detail body declares an unsupported dto_version", () => {
    const bad = { ...qualityCaseDetailFixture, dto_version: "ql-read-v9" };
    try {
      parseCaseDetail(bad);
      throw new Error("should have thrown");
    } catch (error) {
      expect(isQualityError(error) && error.kind).toBe("UNSUPPORTED_DTO");
    }
  });

  it("T17: rejects a detail body without evaluation_id", () => {
    const bad = { dto_version: QUALITY_DTO_VERSION, question_context: {} };
    try {
      parseCaseDetail(bad);
      throw new Error("should have thrown");
    } catch (error) {
      expect(isQualityError(error) && error.kind).toBe("MALFORMED_RESPONSE");
    }
  });
});
