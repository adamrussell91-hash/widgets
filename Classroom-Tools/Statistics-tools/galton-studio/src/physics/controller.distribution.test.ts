import { Body, Sleeping } from 'matter-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BIN_COUNT, type ExperimentSettings } from '../model/types';
import { GaltonController } from './controller';
import { BOARD } from './geometry';

const neutral: ExperimentSettings = {
  hopperPosition: 0,
  skew: 0,
  kurtosis: 3,
  releaseRate: 6,
  changeBehavior: 'keep',
};

const scenarios: { label: string; seed: number; settings: ExperimentSettings }[] = [
  { label: 'neutral', seed: 4_201, settings: neutral },
  { label: 'left-skewed', seed: 4_202, settings: { ...neutral, skew: -0.8 } },
  { label: 'right-skewed', seed: 4_203, settings: { ...neutral, skew: 0.8 } },
  { label: 'low-kurtosis', seed: 4_204, settings: { ...neutral, kurtosis: 1.8 } },
  { label: 'high-kurtosis', seed: 4_205, settings: { ...neutral, kurtosis: 6 } },
];

function histogram(bins: readonly number[]) {
  return Array.from({ length: BIN_COUNT }, (_, bin) => bins.filter((value) => value === bin).length);
}

function runPhysicalBatch(
  seed: number,
  settings: ExperimentSettings,
  track: (instance: GaltonController) => void,
) {
  const instance = new GaltonController({ seed, settings });
  track(instance);
  const physicalBodies = [...instance.snapshot().ballBodies];
  const assignedTargets = physicalBodies.map((body) => body.plugin.galton.targetBin as number);
  const geometry = instance.snapshot().apparatusGeometry!;
  instance.run();

  for (let index = 0; index < physicalBodies.length; index += 1) {
    if (index > 0) vi.advanceTimersByTime(Math.ceil(1000 / settings.releaseRate));
    const body = physicalBodies[index]!;
    expect(instance.snapshot().gateOpen).toBe(true);
    Body.setPosition(body, {
      x: geometry.hopper.throatX,
      y: geometry.hopper.bottom + BOARD.ballRadius + 2,
    });
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);
    Sleeping.set(body, false);

    instance.step(1000 / 120);
    let funnelExit: { x: number; y: number; vx: number; vy: number } | null = null;
    for (let frame = 0; frame < 1_800 && !body.plugin.galton.settled; frame += 1) {
      instance.step(1000 / 120);
      if (funnelExit === null && body.position.y >= BOARD.funnelTop) {
        funnelExit = {
          x: body.position.x,
          y: body.position.y,
          vx: body.velocity.x,
          vy: body.velocity.y,
        };
      }
    }
    expect(
      body.plugin.galton.settled,
      `ball ${index} did not settle: ${JSON.stringify({
        targetBin: body.plugin.galton.targetBin,
        position: body.position,
        velocity: body.velocity,
        funnelExit,
        nextRouteRow: body.plugin.galton.nextRouteRow,
        recycledCount: instance.snapshot().recycledCount,
        assignedSoFar: assignedTargets.slice(0, index),
        settledSoFar: instance.snapshot().settledBins,
      })}`,
    ).toBe(true);
  }

  return { instance, physicalBodies, assignedTargets };
}

describe('GaltonController physical distribution', () => {
  const instances: GaltonController[] = [];

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    instances.splice(0).forEach((instance) => instance.destroy());
    vi.useRealTimers();
  });

  it.each(scenarios)(
    'physically settles the $label batch into its allocated target histogram',
    ({ seed, settings }) => {
      const result = runPhysicalBatch(seed, settings, (instance) => instances.push(instance));
      const snapshot = result.instance.snapshot();
      const mismatches = result.assignedTargets.flatMap((targetBin, index) => (
        snapshot.settledBins[index] === targetBin
          ? []
          : [{ index, targetBin, settledBin: snapshot.settledBins[index] }]
      ));

      expect(snapshot.status).toBe('complete');
      expect(snapshot.settledBins).toHaveLength(100);
      expect(histogram(snapshot.settledBins), JSON.stringify(mismatches)).toEqual(
        histogram(result.assignedTargets),
      );
      expect(snapshot.ballBodies.every((body) => body.plugin.galton.settled)).toBe(true);
      expect(snapshot.ballBodies).toEqual(result.physicalBodies);
    },
    60_000,
  );
});
