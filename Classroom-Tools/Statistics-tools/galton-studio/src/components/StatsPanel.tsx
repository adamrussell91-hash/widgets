import type { DescriptiveSummary, PhysicsMode } from '../model/types';
import { BinReadouts, formatStatistic } from './BinReadouts';
import { EducationPanel } from './EducationPanel';

export interface StatsPanelProps {
  summary: DescriptiveSummary;
  mode: PhysicsMode;
  hasMixedRegimes: boolean;
}

interface StatisticProps {
  label: string;
  value: number | null;
  digits?: number;
  note?: string;
}

function Statistic({ label, value, digits = 2, note }: StatisticProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{formatStatistic(value, digits)}</dd>
      {note && <dd className="statistics-panel__definition">{note}</dd>}
    </div>
  );
}

export function StatsPanel({ summary, mode, hasMixedRegimes }: StatsPanelProps) {
  const noObservations = summary.count === 0;
  const zeroSpread = summary.count > 0 && summary.standardDeviation === 0;
  const unavailableReason = noObservations
    ? 'A statistic needs settled balls before it can be calculated.'
    : zeroSpread
      ? 'This statistic is undefined because the standard deviation is zero.'
      : 'This statistic is not defined for the current observations.';

  return (
    <aside className="statistics-panel" aria-labelledby="live-statistics-heading">
      <h2 id="live-statistics-heading">Live statistics</h2>
      <p>
        {noObservations
          ? 'Collecting data'
          : summary.count < 30
            ? 'Early result—expect instability'
            : 'Observed summary'}
      </p>
      <p>{mode === 'natural' ? 'Natural physics' : 'Guided demonstration'}</p>
      <p>{hasMixedRegimes ? 'Combined expected model' : 'Expected model'}</p>

      <dl className="statistics-panel__values">
        <Statistic label="Total observations" value={summary.count} digits={0} />
        <Statistic label="Mean bin" value={summary.mean} />
        <Statistic
          label="Population standard deviation"
          value={summary.standardDeviation}
          note="The square root of the mean squared deviation, using all settled balls and dividing by N."
        />
        <Statistic label="Observed skewness" value={summary.skewness} />
        <Statistic label="Pearson kurtosis" value={summary.pearsonKurtosis} />
      </dl>
      {[summary.mean, summary.standardDeviation, summary.skewness, summary.pearsonKurtosis]
        .some((value) => value === null || !Number.isFinite(value)) && (
        <p className="statistics-panel__note">{unavailableReason}</p>
      )}

      <BinReadouts bins={summary.bins} />
      <EducationPanel mode={mode} hasMixedRegimes={hasMixedRegimes} />
    </aside>
  );
}
