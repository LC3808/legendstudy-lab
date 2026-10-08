/**
 * MATH-3C-1 — benchmark runner. Runs a provider factory across the fixture set THROUGH the MATH-3B
 * pipeline (admission → extraction → targeted fallback → merge → readiness), then scores. NO live
 * provider call: adapters are injected (mock now; real-provider adapters wrap their API in MATH-3C-2).
 */

import { fixedClock } from "../fixtures";
import { runExtractionPipeline } from "../orchestration";
import { aggregate, expectedRegionCorrect, regionConfident, scoreFixture } from "./scoring";
import { BENCHMARK_FIXTURES } from "./manifest";
import type { BenchmarkProviderFactory } from "./providers";
import type { BenchmarkFixture, ProviderBenchmarkReport, ProviderMeter } from "./types";
import type { ExtractionPipelineResult } from "../types";

export interface RunBenchmarkParams {
  providerId: string;
  modelId: string;
  factory: BenchmarkProviderFactory;
  fallbackFactory?: BenchmarkProviderFactory;
  fixtures?: readonly BenchmarkFixture[];
  meter?: (fixture: BenchmarkFixture) => ProviderMeter;
}

async function runPipelineFor(
  fixture: BenchmarkFixture,
  factory: BenchmarkProviderFactory,
  fallbackFactory?: BenchmarkProviderFactory,
): Promise<ExtractionPipelineResult> {
  const hasVisual = fixture.artifacts.some((a) => a.modality !== "TYPED");
  return runExtractionPipeline({
    attemptId: fixture.id,
    responseFormat: fixture.responseFormat,
    artifacts: fixture.artifacts,
    primary: hasVisual ? factory(fixture) : undefined,
    fallback: fallbackFactory && hasVisual ? fallbackFactory(fixture) : undefined,
    clock: fixedClock,
  });
}

/** How many critical regions the fallback resolved that the primary alone left unresolved. */
async function computeFallbackUsefulness(
  fixture: BenchmarkFixture,
  factory: BenchmarkProviderFactory,
  fallbackFactory: BenchmarkProviderFactory,
): Promise<number> {
  const primaryOnly = await runPipelineFor(fixture, factory);
  const withFallback = await runPipelineFor(fixture, factory, fallbackFactory);
  const pById = new Map((primaryOnly.run?.regions ?? []).map((r) => [r.regionId, r]));
  const fById = new Map((withFallback.run?.regions ?? []).map((r) => [r.regionId, r]));

  let resolved = 0;
  for (const expected of fixture.expectedRegions) {
    if (!expected.critical) continue;
    const p = pById.get(expected.regionId);
    const f = fById.get(expected.regionId);
    const unresolvedPrimary = !p || !regionConfident(p.confidence) || !expectedRegionCorrect(expected, p);
    const resolvedFallback = Boolean(f && regionConfident(f.confidence) && expectedRegionCorrect(expected, f));
    if (unresolvedPrimary && resolvedFallback) resolved += 1;
  }
  return resolved;
}

export async function runBenchmark(params: RunBenchmarkParams): Promise<ProviderBenchmarkReport> {
  const fixtures = params.fixtures ?? BENCHMARK_FIXTURES;
  const fixtureScores = [];

  for (const fixture of fixtures) {
    const result = await runPipelineFor(fixture, params.factory, params.fallbackFactory);
    const fallbackUsefulness =
      params.fallbackFactory && fixture.artifacts.some((a) => a.modality !== "TYPED")
        ? await computeFallbackUsefulness(fixture, params.factory, params.fallbackFactory)
        : null;
    fixtureScores.push(
      scoreFixture(fixture, result, {
        fallbackUsefulness,
        meter: params.meter ? params.meter(fixture) : null,
      }),
    );
  }

  return {
    providerId: params.providerId,
    modelId: params.modelId,
    fixtureScores,
    aggregate: aggregate(fixtureScores),
  };
}
