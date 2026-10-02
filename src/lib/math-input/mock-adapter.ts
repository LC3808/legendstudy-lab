/**
 * MATH-3B — deterministic, provider-neutral mock adapters for implementation + tests. No network,
 * no secrets, no live provider call (PROVIDER_CALLS = 0). Real provider bake-off is MATH-3C.
 *
 * These are the ONLY "providers" MATH-3B uses. They carry no provider-specific payload shape — they
 * emit the canonical VisionProviderResult directly (MATH-3A §39).
 */

import type {
  VisionProviderAdapter,
  VisionProviderResult,
  VisionRequest,
} from "./types";

export type ScriptedExtract = (request: VisionRequest) => VisionProviderResult;

/** Adapter driven by a pure function of the request — fully deterministic. */
export function createFunctionAdapter(
  providerId: string,
  modelId: string,
  extract: ScriptedExtract,
): VisionProviderAdapter {
  return {
    providerId,
    modelId,
    extract: async (request) => extract(request),
  };
}

/** Adapter that always returns the same result (optionally filtered to targeted region ids). */
export function createStaticAdapter(
  providerId: string,
  modelId: string,
  result: Omit<VisionProviderResult, "providerId" | "modelId">,
): VisionProviderAdapter {
  return createFunctionAdapter(providerId, modelId, (request) => {
    const base: VisionProviderResult = { providerId, modelId, ...result };
    if (!request.targetRegionIds) return base;
    const wanted = new Set(request.targetRegionIds);
    return { ...base, regions: base.regions.filter((r) => wanted.has(r.regionId)) };
  });
}

/** A fallback adapter whose answers for targeted regions come from an override map. */
export function createFallbackAdapter(
  providerId: string,
  modelId: string,
  overrides: Record<string, VisionProviderResult["regions"][number]>,
  providerStatus: VisionProviderResult["providerStatus"] = "OK",
): VisionProviderAdapter {
  return createFunctionAdapter(providerId, modelId, (request) => {
    if (providerStatus !== "OK") {
      return { providerId, modelId, regions: [], providerStatus };
    }
    const targets = request.targetRegionIds ?? Object.keys(overrides);
    const regions = targets
      .map((id) => overrides[id])
      .filter((region): region is NonNullable<typeof region> => Boolean(region));
    return { providerId, modelId, regions, providerStatus: "OK" };
  });
}
