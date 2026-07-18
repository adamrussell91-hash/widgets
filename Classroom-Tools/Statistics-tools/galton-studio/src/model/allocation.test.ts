import { describe, expect, it } from 'vitest';
import { buildExpectedPmf } from './distribution';
import { createRng } from './prng';
import { allocateTargetBins, buildBallAssignments, buildRoute } from './allocation';

const neutral = {
  hopperPosition: 0,
  skew: 0,
  kurtosis: 3,
  releaseRate: 6,
  changeBehavior: 'keep' as const,
};

describe('balanced ball allocation', () => {
  it('allocates exactly 100 neutral targets within one ball of expectation', () => {
    const pmf = buildExpectedPmf(neutral);
    const targets = allocateTargetBins(pmf, 100, createRng(42));
    const counts = Array(11).fill(0) as number[];
    targets.forEach((bin) => { counts[bin] += 1; });
    expect(targets).toHaveLength(100);
    counts.forEach((count, bin) => expect(Math.abs(count - pmf[bin]! * 100)).toBeLessThan(1));
  });

  it('reproduces assignments for the same seed', () => {
    const pmf = buildExpectedPmf({ ...neutral, skew: 0.8 });
    expect(buildBallAssignments(pmf, 100, createRng(77)))
      .toEqual(buildBallAssignments(pmf, 100, createRng(77)));
  });

  it.each([0, 1, 5, 10])('builds a ten-row route ending in bin %i', (targetBin) => {
    const route = buildRoute(targetBin, createRng(9));
    expect(route).toHaveLength(10);
    expect(route.filter((direction) => direction === 1)).toHaveLength(targetBin);
  });

  it('normalizes invalid mass and returns only valid bins', () => {
    const targets = allocateTargetBins([Number.NaN, -1, 2], 17, createRng(3));
    expect(targets).toHaveLength(17);
    expect(targets.every((bin) => bin >= 0 && bin <= 10)).toBe(true);
  });
});
