import { Body, Sleeping } from 'matter-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExperimentSettings } from '../model/types';
import { GaltonController, type GaltonSnapshot } from './controller';
import { BOARD } from './geometry';

const FIXED_STEP_MS = 1000 / 120;
const neutral: ExperimentSettings = {
  hopperPosition: 0,
  skew: 0,
  kurtosis: 3,
  releaseRate: 12,
  changeBehavior: 'keep',
};

const productionScenarios: { label: string; seed: number; settings: ExperimentSettings }[] = [
  { label: 'neutral seed A', seed: 6_101, settings: neutral },
  { label: 'neutral seed B', seed: 6_102, settings: neutral },
  { label: 'negative skew', seed: 6_103, settings: { ...neutral, skew: -0.8 } },
  { label: 'positive skew', seed: 6_104, settings: { ...neutral, skew: 0.8 } },
  { label: 'low kurtosis', seed: 6_105, settings: { ...neutral, kurtosis: 1.8 } },
  { label: 'high kurtosis', seed: 6_106, settings: { ...neutral, kurtosis: 6 } },
  { label: 'left hopper boundary', seed: 6_107, settings: { ...neutral, hopperPosition: -1 } },
  { label: 'right hopper boundary', seed: 6_108, settings: { ...neutral, hopperPosition: 1 } },
];

interface ProductionRunOptions {
  seed: number;
  settings: ExperimentSettings;
  keepChangeAt?: number;
  recycleAt?: number;
}

interface RecycledObservation {
  logicalBallId: number;
  originalBodyId: number;
  targetBin: number;
  route: readonly number[];
}

function totalReleases(snapshot: GaltonSnapshot) {
  return snapshot.regimes.reduce((sum, regime) => sum + regime.released, 0);
}

function runProductionBatch(
  options: ProductionRunOptions,
  track: (instance: GaltonController) => void,
) {
  const instance = new GaltonController({ seed: options.seed, settings: options.settings });
  track(instance);
  const initialBodies = [...instance.snapshot().ballBodies];
  const originalSetPosition = Body.setPosition;
  const originalTranslate = Body.translate;
  const releasedPositionMutations: { method: 'setPosition' | 'translate'; logicalBallId?: number }[] = [];
  vi.spyOn(Body, 'setPosition').mockImplementation((body, position) => {
    if (body.label === 'ball' && body.plugin.galton.released) {
      releasedPositionMutations.push({
        method: 'setPosition',
        logicalBallId: body.plugin.galton.logicalBallId,
      });
    }
    originalSetPosition(body, position);
  });
  vi.spyOn(Body, 'translate').mockImplementation((body, translation) => {
    if (body.label === 'ball' && body.plugin.galton.released) {
      releasedPositionMutations.push({
        method: 'translate',
        logicalBallId: body.plugin.galton.logicalBallId,
      });
    }
    originalTranslate(body, translation);
  });

  let keepChanged = false;
  let recycled: RecycledObservation | null = null;
  let maxActiveCount = 0;
  let frames = 0;
  instance.run();

  for (frames = 1; frames <= 7_200; frames += 1) {
    vi.advanceTimersByTime(FIXED_STEP_MS);
    instance.step(FIXED_STEP_MS);
    const snapshot = instance.snapshot();
    const releases = totalReleases(snapshot);
    maxActiveCount = Math.max(maxActiveCount, snapshot.activeCount);

    if (!keepChanged && options.keepChangeAt !== undefined && releases >= options.keepChangeAt) {
      keepChanged = true;
      instance.setSettings({ ...options.settings, skew: 0.8 });
    }

    if (recycled === null && options.recycleAt !== undefined && releases >= options.recycleAt) {
      const candidate = snapshot.ballBodies.find((body) => (
        body.plugin.galton.released && !body.plugin.galton.settled
      ));
      if (candidate) {
        recycled = {
          logicalBallId: candidate.plugin.galton.logicalBallId as number,
          originalBodyId: candidate.id,
          targetBin: candidate.plugin.galton.targetBin as number,
          route: [...(candidate.plugin.galton.route ?? [])],
        };
        originalSetPosition(candidate, { x: -BOARD.ballRadius - 10, y: 300 });
        Body.setVelocity(candidate, { x: 0, y: 0 });
        Sleeping.set(candidate, false);
      }
    }

    if (snapshot.status === 'complete') break;
  }

  return {
    instance,
    initialBodies,
    releasedPositionMutations,
    recycled,
    maxActiveCount,
    frames,
  };
}

function expectTruthfulPhysicalCompletion(result: ReturnType<typeof runProductionBatch>) {
  const snapshot = result.instance.snapshot();
  const incomplete = snapshot.ballBodies
    .filter((body) => !body.plugin.galton.settled)
    .slice(0, 10)
    .map((body) => ({
      logicalBallId: body.plugin.galton.logicalBallId,
      targetBin: body.plugin.galton.targetBin,
      released: body.plugin.galton.released,
      position: body.position,
      velocity: body.velocity,
      nextRouteRow: body.plugin.galton.nextRouteRow,
    }));
  const context = JSON.stringify({
    frames: result.frames,
    status: snapshot.status,
    hopperCount: snapshot.hopperCount,
    activeCount: snapshot.activeCount,
    settled: snapshot.settledBins.length,
    released: totalReleases(snapshot),
    recycledCount: snapshot.recycledCount,
    incomplete,
  });

  expect(snapshot.status, context).toBe('complete');
  expect(snapshot.settledBins, context).toHaveLength(100);
  expect(snapshot.settlementDiagnostics, context).toHaveLength(100);
  expect(snapshot.settlementDiagnostics.filter(({ matchesTarget }) => !matchesTarget), context)
    .toEqual([]);
  expect(new Set(snapshot.settlementDiagnostics.map(({ logicalBallId }) => logicalBallId)).size)
    .toBe(100);
  expect(snapshot.settledBins).toEqual(
    snapshot.settlementDiagnostics.map(({ settledBin }) => settledBin),
  );
  expect(totalReleases(snapshot)).toBe(100);
  expect(result.maxActiveCount).toBeGreaterThan(1);
  expect(result.releasedPositionMutations).toEqual([]);
  if (result.recycled === null) {
    expect(snapshot.ballBodies).toEqual(result.initialBodies);
    expect(new Set(snapshot.settlementDiagnostics.map(({ physicalBodyId }) => physicalBodyId)))
      .toEqual(new Set(result.initialBodies.map(({ id }) => id)));
  }
}

describe('GaltonController production-timing distribution evidence', () => {
  const instances: GaltonController[] = [];

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    instances.splice(0).forEach((instance) => instance.destroy());
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each(productionScenarios)(
    'settles the concurrent 12 balls/s $label batch per logical assignment',
    ({ seed, settings }) => {
      const result = runProductionBatch({ seed, settings }, (instance) => {
        instances.push(instance);
      });

      expectTruthfulPhysicalCompletion(result);
    },
    90_000,
  );

  it('settles a production-timing Keep change per logical assignment and weights both regimes once', () => {
    const result = runProductionBatch(
      { seed: 6_201, settings: neutral, keepChangeAt: 35 },
      (instance) => instances.push(instance),
    );

    expectTruthfulPhysicalCompletion(result);
    expect(result.instance.snapshot().regimes.map(({ released, mode }) => ({ released, mode }))).toEqual([
      { released: 35, mode: 'natural' },
      { released: 65, mode: 'guided' },
    ]);
  }, 90_000);

  it('settles a production-timing recycled logical ball once with its original assignment', () => {
    const result = runProductionBatch(
      { seed: 6_301, settings: neutral, recycleAt: 12 },
      (instance) => instances.push(instance),
    );

    expectTruthfulPhysicalCompletion(result);
    const snapshot = result.instance.snapshot();
    expect(snapshot.recycledCount).toBe(1);
    expect(result.recycled).not.toBeNull();
    const recycled = result.recycled!;
    const replacement = snapshot.ballBodies.find((body) => (
      body.plugin.galton.logicalBallId === recycled.logicalBallId
    ))!;
    const settlement = snapshot.settlementDiagnostics.find(({ logicalBallId }) => (
      logicalBallId === recycled.logicalBallId
    ))!;
    const retainedOriginalIds = new Set(result.initialBodies
      .map(({ id }) => id)
      .filter((id) => id !== recycled.originalBodyId));
    expect(replacement.id).not.toBe(recycled.originalBodyId);
    expect(snapshot.ballBodies.filter(({ id }) => retainedOriginalIds.has(id))).toHaveLength(99);
    expect(replacement.plugin.galton.targetBin).toBe(recycled.targetBin);
    expect(replacement.plugin.galton.route).toEqual(recycled.route);
    expect(settlement).toMatchObject({
      logicalBallId: recycled.logicalBallId,
      physicalBodyId: replacement.id,
      targetBin: recycled.targetBin,
      settledBin: recycled.targetBin,
      matchesTarget: true,
    });
  }, 90_000);
});
