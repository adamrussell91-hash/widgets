import { BIN_COUNT } from './types';
import type { DescriptiveSummary } from './types';

const INVALID_SETTLED_BIN = 'Settled bin must be an integer within the board';

export function summarizeSettledBins(
  values: readonly number[],
  binCount = BIN_COUNT,
): DescriptiveSummary {
  const counts = Array<number>(binCount).fill(0);

  for (const value of values) {
    if (!Number.isInteger(value) || value < 0 || value >= binCount) {
      throw new RangeError(INVALID_SETTLED_BIN);
    }
    counts[value] += 1;
  }

  const count = values.length;
  if (count === 0) {
    return {
      count,
      mean: null,
      variance: null,
      standardDeviation: null,
      skewness: null,
      pearsonKurtosis: null,
      bins: counts.map((binCountValue, bin) => ({
        bin,
        count: binCountValue,
        percentage: 0,
        zScore: null,
      })),
    };
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;

  for (const value of values) {
    const deviation = value - mean;
    m2 += deviation ** 2;
    m3 += deviation ** 3;
    m4 += deviation ** 4;
  }

  const variance = m2 / count;
  const standardDeviation = Math.sqrt(variance);
  const skewness = standardDeviation > 0 ? (m3 / count) / standardDeviation ** 3 : null;
  const pearsonKurtosis = variance > 0 ? (m4 / count) / variance ** 2 : null;

  return {
    count,
    mean,
    variance,
    standardDeviation,
    skewness,
    pearsonKurtosis,
    bins: counts.map((binCountValue, bin) => ({
      bin,
      count: binCountValue,
      percentage: (binCountValue / count) * 100,
      zScore: standardDeviation > 0 ? (bin - mean) / standardDeviation : null,
    })),
  };
}
