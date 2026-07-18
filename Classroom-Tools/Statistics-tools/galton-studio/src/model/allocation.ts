import { BIN_COUNT } from './types';
import type { Rng } from './prng';

export type RouteDirection = -1 | 1;

export interface BallAssignment {
  targetBin: number;
  route: RouteDirection[];
}

function normalizedPmf(pmf: readonly number[]): number[] {
  const weights = Array.from({ length: BIN_COUNT }, (_, bin) => {
    const value = pmf[bin] ?? 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  return total > 0 ? weights.map((value) => value / total) : Array(BIN_COUNT).fill(1 / BIN_COUNT);
}

function shuffle<T>(values: T[], rng: Rng): T[] {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex]!, values[index]!];
  }
  return values;
}

export function allocateTargetBins(pmf: readonly number[], count: number, rng: Rng): number[] {
  const size = Math.max(0, Math.floor(count));
  const probabilities = normalizedPmf(pmf);
  const expected = probabilities.map((probability) => probability * size);
  const quotas = expected.map(Math.floor);
  const remaining = size - quotas.reduce((sum, quota) => sum + quota, 0);
  const seats = expected
    .map((value, bin) => ({ bin, remainder: value - quotas[bin]!, tie: rng() }))
    .sort((a, b) => b.remainder - a.remainder || a.tie - b.tie);
  seats.slice(0, remaining).forEach(({ bin }) => { quotas[bin] += 1; });
  return shuffle(quotas.flatMap((quota, bin) => Array(quota).fill(bin) as number[]), rng);
}

export function buildRoute(targetBin: number, rng: Rng): RouteDirection[] {
  const rights = Math.max(0, Math.min(BIN_COUNT - 1, Math.round(targetBin)));
  return shuffle([
    ...Array<RouteDirection>(rights).fill(1),
    ...Array<RouteDirection>(BIN_COUNT - 1 - rights).fill(-1),
  ], rng);
}

export function buildBallAssignments(
  pmf: readonly number[],
  count: number,
  rng: Rng,
): BallAssignment[] {
  return allocateTargetBins(pmf, count, rng).map((targetBin) => ({
    targetBin,
    route: buildRoute(targetBin, rng),
  }));
}
