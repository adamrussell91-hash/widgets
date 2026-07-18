import { describe, expect, it } from 'vitest';
import { buildExpectedPmf, combineRegimes, modeFor, sampleBin } from './distribution';
import { createRng } from './prng';
import type { ExperimentSettings } from './types';

const neutral: ExperimentSettings = {
  hopperPosition: 0,
  skew: 0,
  kurtosis: 3,
  releaseRate: 4,
  changeBehavior: 'keep',
};

const meanOf = (pmf: number[]) =>
  pmf.reduce((sum, probability, bin) => sum + probability * bin, 0);
const tailMass = (pmf: number[]) => pmf[0] + pmf[1] + pmf[9] + pmf[10];

describe('probability distributions', () => {
  it('builds a normalized PMF with one probability per bin', () => {
    const pmf = buildExpectedPmf(neutral);

    expect(pmf).toHaveLength(11);
    expect(pmf.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it('uses natural mode only for neutral shape controls', () => {
    expect(modeFor(neutral)).toBe('natural');
    expect(modeFor({ ...neutral, skew: 0.4 })).toBe('guided');
  });

  it('moves the expected mean right for positive skew', () => {
    expect(meanOf(buildExpectedPmf({ ...neutral, skew: 0.7 }))).toBeGreaterThan(5);
  });

  it('puts more mass in the tails for higher kurtosis', () => {
    expect(tailMass(buildExpectedPmf({ ...neutral, kurtosis: 6 }))).toBeGreaterThan(
      tailMass(buildExpectedPmf({ ...neutral, kurtosis: 1.8 })),
    );
  });

  it('combines regimes by released-ball weight', () => {
    const mixture = combineRegimes([
      { pmf: [1, ...Array(10).fill(0)], released: 2, mode: 'natural' },
      { pmf: [...Array(10).fill(0), 1], released: 6, mode: 'guided' },
    ]);

    expect(mixture[0]).toBeCloseTo(0.25, 12);
    expect(mixture[10]).toBeCloseTo(0.75, 12);
  });

  it('returns a uniform PMF when no observations have been released', () => {
    expect(combineRegimes([])).toEqual(Array(11).fill(1 / 11));
  });

  it('samples only valid bin indices', () => {
    const rng = createRng(42);
    const pmf = buildExpectedPmf(neutral);

    for (let draw = 0; draw < 1_000; draw += 1) {
      expect(sampleBin(pmf, rng)).toBeGreaterThanOrEqual(0);
      expect(sampleBin(pmf, rng)).toBeLessThanOrEqual(10);
    }
  });
});
