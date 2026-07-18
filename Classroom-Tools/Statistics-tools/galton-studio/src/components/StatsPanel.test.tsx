import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { summarizeSettledBins } from '../model/statistics';
import { StatsPanel } from './StatsPanel';

afterEach(cleanup);

describe('StatsPanel', () => {
  it('explains that statistics are collecting before any ball settles', () => {
    const { container } = render(
      <StatsPanel summary={summarizeSettledBins([])} mode="natural" hasMixedRegimes={false} />,
    );

    expect(screen.getByText('Collecting data')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText(/A statistic needs settled balls/)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
  });

  it('warns at exactly 29 observations that the result is unstable', () => {
    render(
      <StatsPanel
        summary={summarizeSettledBins(Array.from({ length: 29 }, (_, index) => index % 11))}
        mode="natural"
        hasMixedRegimes={false}
      />,
    );
    expect(screen.getByText('Early result—expect instability')).toBeInTheDocument();
  });

  it('removes the early warning at exactly 30 observations', () => {
    render(
      <StatsPanel
        summary={summarizeSettledBins(Array.from({ length: 30 }, (_, index) => index % 11))}
        mode="natural"
        hasMixedRegimes={false}
      />,
    );
    expect(screen.getByText('Observed summary')).toBeInTheDocument();
    expect(screen.queryByText('Early result—expect instability')).not.toBeInTheDocument();
  });

  it('shows live descriptive statistics with the required mathematical names', () => {
    render(
      <StatsPanel
        summary={summarizeSettledBins([1, 2, 3, 4, 5, 6, 7, 8])}
        mode="natural"
        hasMixedRegimes={false}
      />,
    );

    expect(screen.getByText('Mean bin')).toBeInTheDocument();
    expect(screen.getByText('Population standard deviation')).toBeInTheDocument();
    expect(screen.getByText(
      'The square root of the mean squared deviation, using all settled balls and dividing by N.',
    )).toBeInTheDocument();
    expect(screen.getByText('Observed skewness')).toBeInTheDocument();
    expect(screen.getByText('Pearson kurtosis')).toBeInTheDocument();
  });

  it('explains why moments are undefined for a constant sample', () => {
    const { container } = render(
      <StatsPanel summary={summarizeSettledBins([5, 5, 5])} mode="natural" hasMixedRegimes={false} />,
    );
    expect(screen.getByText(/undefined because the standard deviation is zero/i)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
  });

  it('uses accurate Guided demonstration and mixed-model teaching copy', () => {
    render(
      <StatsPanel
        summary={summarizeSettledBins([1, 2, 3])}
        mode="guided"
        hasMixedRegimes
      />,
    );

    expect(screen.getByText('Guided demonstration')).toBeInTheDocument();
    expect(screen.getByText('Combined expected model')).toBeInTheDocument();
    expect(screen.getByText(/small, controlled impulses/i)).toBeInTheDocument();
    expect(screen.getByText(/tail weight and the propensity for outliers/i)).toBeInTheDocument();
    expect(screen.getByText(/direction of the longer tail/i)).toBeInTheDocument();
    expect(screen.getByText(/red curve shows what the model expected/i)).toBeInTheDocument();
    expect(screen.getByText('How should I read skewness?')).toHaveStyle({ minBlockSize: '44px' });
  });
});
