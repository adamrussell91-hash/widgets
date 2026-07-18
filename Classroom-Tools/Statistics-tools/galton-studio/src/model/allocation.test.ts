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

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects the non-finite allocation count %s',
    (count) => {
      expect(() => allocateTargetBins([1], count, createRng(3)))
        .toThrowError(/allocation count must be finite/i);
    },
  );

  it('rejects allocation counts above its documented public limit', () => {
    expect(() => allocateTargetBins([1], 1_000_001, createRng(3)))
      .toThrowError(/allocation count must not exceed 1000000/i);
  });

  it.each([
    ['neutral', neutral],
    ['left-skewed', { ...neutral, skew: -0.8 }],
    ['right-skewed', { ...neutral, skew: 0.8 }],
    ['low-kurtosis', { ...neutral, kurtosis: 1.8 }],
    ['high-kurtosis', { ...neutral, kurtosis: 6 }],
    ['shifted', { ...neutral, hopperPosition: 1 }],
  ])('preserves quota invariants for arbitrary $label counts and seeds', (_label, settings) => {
    const pmf = buildExpectedPmf(settings);
    for (const count of [0, 1, 2, 5, 10, 11, 17, 100, 257]) {
      for (const seed of [1, 2, 42, 9_999]) {
        const targets = allocateTargetBins(pmf, count, createRng(seed));
        const quotas = Array(11).fill(0) as number[];
        targets.forEach((target) => { quotas[target] += 1; });

        expect(targets).toHaveLength(count);
        expect(quotas.reduce((sum, quota) => sum + quota, 0)).toBe(count);
        quotas.forEach((quota, bin) => {
          const expected = pmf[bin]! * count;
          expect(quota).toBeGreaterThanOrEqual(Math.floor(expected));
          expect(quota).toBeLessThanOrEqual(Math.ceil(expected));
        });
      }
    }
  });

  it('uses the seed only to choose tied quota seats and assignment order', () => {
    const tiedPmf = [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
    const allocations = Array.from({ length: 12 }, (_, seed) => (
      allocateTargetBins(tiedPmf, 2, createRng(seed + 1))
    ));
    const quotaSignatures = allocations.map((targets) => {
      const quotas = Array(11).fill(0) as number[];
      targets.forEach((target) => { quotas[target] += 1; });
      quotas.forEach((quota, bin) => {
        expect(quota).toBeGreaterThanOrEqual(bin < 3 ? 0 : 0);
        expect(quota).toBeLessThanOrEqual(bin < 3 ? 1 : 0);
      });
      return quotas.join(',');
    });

    expect(new Set(quotaSignatures).size).toBeGreaterThan(1);
    expect(new Set(allocations.map((targets) => targets.join(','))).size).toBeGreaterThan(1);
  });

  it('builds valid deterministic routes for every target bin across seeds', () => {
    for (let targetBin = 0; targetBin <= 10; targetBin += 1) {
      for (const seed of [1, 2, 42, 9_999]) {
        const route = buildRoute(targetBin, createRng(seed));
        expect(route).toHaveLength(10);
        expect(route.every((direction) => direction === -1 || direction === 1)).toBe(true);
        expect(route.filter((direction) => direction === 1)).toHaveLength(targetBin);
        expect(route).toEqual(buildRoute(targetBin, createRng(seed)));
      }
    }
  });
});
