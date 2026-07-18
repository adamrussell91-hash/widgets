import { describe, expect, it } from 'vitest';
import { summarizeSettledBins } from './statistics';

describe('summarizeSettledBins', () => {
  it('returns null descriptive moments and eleven empty bins for no observations', () => {
    const summary = summarizeSettledBins([]);

    expect(summary).toMatchObject({
      count: 0,
      mean: null,
      variance: null,
      standardDeviation: null,
      skewness: null,
      pearsonKurtosis: null,
    });
    expect(summary.bins).toHaveLength(11);
    expect(summary.bins).toEqual(
      Array.from({ length: 11 }, (_, bin) => ({
        bin,
        count: 0,
        percentage: 0,
        zScore: null,
      })),
    );
  });

  it('calculates population descriptive moments and bin summaries', () => {
    const summary = summarizeSettledBins([0, 1, 2, 3, 4]);

    expect(summary.mean).toBe(2);
    expect(summary.variance).toBe(2);
    expect(summary.standardDeviation).toBeCloseTo(Math.sqrt(2));
    expect(summary.skewness).toBeCloseTo(0);
    expect(summary.pearsonKurtosis).toBeCloseTo(1.7);
    expect(summary.bins[2].zScore).toBeCloseTo(0);
    expect(summary.bins.reduce((sum, bin) => sum + bin.percentage, 0)).toBeCloseTo(100);
  });

  it('returns null standardized moments for zero variance', () => {
    const summary = summarizeSettledBins([4, 4, 4]);

    expect(summary.standardDeviation).toBe(0);
    expect(summary.skewness).toBeNull();
    expect(summary.pearsonKurtosis).toBeNull();
    expect(summary.bins.every((bin) => bin.zScore === null)).toBe(true);
  });

  it('rejects non-integer and out-of-range settled bins', () => {
    expect(() => summarizeSettledBins([1.5])).toThrow(
      new RangeError('Settled bin must be an integer within the board'),
    );
    expect(() => summarizeSettledBins([11])).toThrow(
      new RangeError('Settled bin must be an integer within the board'),
    );
  });
});
