import { BIN_COUNT } from './types';
import type { DistributionRegime, ExperimentSettings, PhysicsMode } from './types';
import type { Rng } from './prng';

const STEP_COUNT = BIN_COUNT - 1;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalized(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  return total > 0 ? values.map((value) => value / total) : Array(BIN_COUNT).fill(1 / BIN_COUNT);
}

function boundedSettings(settings: ExperimentSettings): ExperimentSettings {
  return {
    ...settings,
    hopperPosition: clamp(settings.hopperPosition, -1, 1),
    skew: clamp(settings.skew, -1, 1),
    kurtosis: clamp(settings.kurtosis, 1.8, 6),
    releaseRate: clamp(settings.releaseRate, 1, 12),
  };
}

export function modeFor(settings: ExperimentSettings): PhysicsMode {
  return Math.abs(settings.skew) < 1e-6 && Math.abs(settings.kurtosis - 3) < 1e-6
    ? 'natural'
    : 'guided';
}

function binomialCoefficient(n: number, k: number): number {
  let coefficient = 1;
  for (let factor = 1; factor <= k; factor += 1) {
    coefficient *= (n - k + factor) / factor;
  }
  return coefficient;
}

function naturalPmf(settings: ExperimentSettings): number[] {
  const probability = 0.5 + settings.hopperPosition * 0.16;
  return normalized(
    Array.from({ length: BIN_COUNT }, (_, bin) =>
      binomialCoefficient(STEP_COUNT, bin) * probability ** bin * (1 - probability) ** (STEP_COUNT - bin),
    ),
  );
}

function guidedWeight(x: number, settings: ExperimentSettings): number {
  const centre = 5 + settings.hopperPosition * 2.25;
  const beta = 2 * Math.pow(0.5, (settings.kurtosis - 3) / 3);
  const baseScale = 1.85;
  const scale = x < centre
    ? baseScale * Math.exp(-0.62 * settings.skew)
    : baseScale * Math.exp(0.62 * settings.skew);
  return Math.exp(-Math.pow(Math.abs(x - centre) / scale, beta));
}

function guidedPmf(settings: ExperimentSettings): number[] {
  return normalized(Array.from({ length: BIN_COUNT }, (_, bin) => guidedWeight(bin, settings)));
}

export function buildExpectedPmf(settings: ExperimentSettings): number[] {
  const bounded = boundedSettings(settings);
  return modeFor(bounded) === 'natural' ? naturalPmf(bounded) : guidedPmf(bounded);
}

export function sampleBin(pmf: number[], rng: Rng): number {
  const draw = rng();
  let cumulative = 0;
  for (let bin = 0; bin < BIN_COUNT; bin += 1) {
    cumulative += pmf[bin] ?? 0;
    if (draw < cumulative) return bin;
  }
  return BIN_COUNT - 1;
}

export function combineRegimes(regimes: DistributionRegime[]): number[] {
  const released = regimes.reduce((sum, regime) => sum + Math.max(0, regime.released), 0);
  if (released === 0) return Array(BIN_COUNT).fill(1 / BIN_COUNT);

  return normalized(Array.from({ length: BIN_COUNT }, (_, bin) => (
    regimes.reduce(
      (sum, regime) => sum + (regime.pmf[bin] ?? 0) * Math.max(0, regime.released),
      0,
    ) / released
  )));
}
