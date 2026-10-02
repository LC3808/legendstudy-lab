import { describe, expect, it } from "vitest";

import { blockingRegions, isBlockingRegion, isCriticalRole, isUncertain } from "./confidence";
import { region } from "./fixtures";

describe("confidence / criticality", () => {
  it("treats LOW/AMBIGUOUS/UNREADABLE as uncertain and HIGH/MEDIUM as not", () => {
    expect(isUncertain("LOW")).toBe(true);
    expect(isUncertain("AMBIGUOUS")).toBe(true);
    expect(isUncertain("UNREADABLE")).toBe(true);
    expect(isUncertain("HIGH")).toBe(false);
    expect(isUncertain("MEDIUM")).toBe(false);
  });

  it("makes only the final answer critical for SHORT_ANSWER", () => {
    expect(isCriticalRole("FINAL_ANSWER", "SHORT_ANSWER")).toBe(true);
    expect(isCriticalRole("OPERATOR_SIGN", "SHORT_ANSWER")).toBe(false);
    expect(isCriticalRole("REASONING_TEXT", "SHORT_ANSWER")).toBe(false);
  });

  it("makes symbol roles critical for FULL_SOLUTION but not plain reasoning text", () => {
    expect(isCriticalRole("OPERATOR_SIGN", "FULL_SOLUTION")).toBe(true);
    expect(isCriticalRole("EXPONENT", "FULL_SOLUTION")).toBe(true);
    expect(isCriticalRole("REASONING_TEXT", "FULL_SOLUTION")).toBe(false);
  });

  it("blocks only when a region is both uncertain and critical", () => {
    const uncertainCritical = region({ role: "EXPONENT", confidence: "AMBIGUOUS" });
    const uncertainNonCritical = region({ role: "REASONING_TEXT", confidence: "LOW" });
    const confidentCritical = region({ role: "EXPONENT", confidence: "HIGH" });
    expect(isBlockingRegion(uncertainCritical, "FULL_SOLUTION")).toBe(true);
    expect(isBlockingRegion(uncertainNonCritical, "FULL_SOLUTION")).toBe(false);
    expect(isBlockingRegion(confidentCritical, "FULL_SOLUTION")).toBe(false);
    expect(blockingRegions([uncertainCritical, uncertainNonCritical, confidentCritical], "FULL_SOLUTION")).toHaveLength(1);
  });
});
