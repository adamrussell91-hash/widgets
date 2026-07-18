import { describe, expect, it } from 'vitest';
import { buildExpectedPmf, sampleBin } from './distribution';
import { createRng } from './prng';
import { summarizeSettledBins } from './statistics';
import type { DescriptiveSummary, ExperimentSettings } from './types';

const SAMPLE_SIZE = 50_000;
const neutral: ExperimentSettings = {
  hopperPosition: 0,
  skew: 0,
  kurtosis: 3,
  releaseRate: 4,
  changeBehavior: 'keep',
};

const scenarios = {
  neutral: { settings: neutral, seed: 10_001 },
  negativeSkew: { settings: { ...neutral, skew: -0.8 }, seed: 20_002 },
  positiveSkew: { settings: { ...neutral, skew: 0.8 }, seed: 30_003 },
  leptokurtic: { settings: { ...neutral, kurtosis: 6 }, seed: 40_004 },
  platykurtic: { settings: { ...neutral, kurtosis: 1.8 }, seed: 50_005 },
} as const;

interface SimulationResult {
  summary: DescriptiveSummary;
  minimumBin: number;
  maximumBin: number;
}

function simulate(settings: ExperimentSettings, seed: number): SimulationResult {
  const pmf = buildExpectedPmf(settings);
  const rng = createRng(seed);
  const bins = Array.from({ length: SAMPLE_SIZE }, () => sampleBin(pmf, rng));
  return {
    summary: summarizeSettledBins(bins),
    minimumBin: Math.min(...bins),
    maximumBin: Math.max(...bins),
  };
}

const results = Object.fromEntries(
  Object.entries(scenarios).map(([name, { settings, seed }]) => [name, simulate(settings, seed)]),
) as Record<keyof typeof scenarios, SimulationResult>;

describe('deterministic target-bin simulation', () => {
  it('keeps every target in bins 0..10 and reports percentages totalling 100', () => {
    Object.values(results).forEach(({ summary, minimumBin, maximumBin }) => {
      expect(minimumBin).toBeGreaterThanOrEqual(0);
      expect(maximumBin).toBeLessThanOrEqual(10);
      expect(summary.count).toBe(SAMPLE_SIZE);
      expect(summary.bins).toHaveLength(11);
      expect(summary.bins.reduce((total, { count }) => total + count, 0)).toBe(SAMPLE_SIZE);
      expect(summary.bins.reduce((total, { percentage }) => total + percentage, 0)).toBeCloseTo(100, 10);
    });
  });

  it('keeps the finite ten-step neutral model symmetric with its expected Pearson kurtosis', () => {
    const { skewness, pearsonKurtosis } = results.neutral.summary;

    expect(Math.abs(skewness!)).toBeLessThan(0.08);
    // A Binomial(10, 0.5) has Pearson kurtosis 3 - 2/10 = 2.8, not exactly 3.
    // The 0.08 window is deliberately wider than fixed-seed sampling noise at n=50,000.
    expect(Math.abs(pearsonKurtosis! - 2.8)).toBeLessThan(0.08);
  });

  it('separates the positive and negative skew controls by a meaningful margin', () => {
    expect(
      results.positiveSkew.summary.skewness! - results.negativeSkew.summary.skewness!,
    ).toBeGreaterThan(0.35);
  });

  it('orders the shape controls as leptokurtic, mesokurtic, then platykurtic', () => {
    expect(results.leptokurtic.summary.pearsonKurtosis!)
      .toBeGreaterThan(results.neutral.summary.pearsonKurtosis!);
    expect(results.neutral.summary.pearsonKurtosis!)
      .toBeGreaterThan(results.platykurtic.summary.pearsonKurtosis!);
  });
});
