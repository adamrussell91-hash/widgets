export const BIN_COUNT = 11;
export const BATCH_SIZE = 100;
export const MAX_SETTLED_BALLS = 600;

export type RunStatus = 'ready' | 'running' | 'paused' | 'settling' | 'complete' | 'error';
export type ChangeBehavior = 'keep' | 'reset';
export type PhysicsMode = 'natural' | 'guided';

export interface ExperimentSettings {
  hopperPosition: number;
  skew: number;
  kurtosis: number;
  releaseRate: number;
  changeBehavior: ChangeBehavior;
}

export interface DistributionRegime {
  pmf: number[];
  released: number;
  mode: PhysicsMode;
}

export interface BinSummary {
  bin: number;
  count: number;
  percentage: number;
  zScore: number | null;
}

export interface DescriptiveSummary {
  count: number;
  mean: number | null;
  variance: number | null;
  standardDeviation: number | null;
  skewness: number | null;
  pearsonKurtosis: number | null;
  bins: BinSummary[];
}
