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
    expect(screen.getByText('Classic bell-curve settings')).toBeInTheDocument();
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

  it('shows live descriptive statistics with classroom-friendly names', () => {
    render(
      <StatsPanel
        summary={summarizeSettledBins([1, 2, 3, 4, 5, 6, 7, 8])}
        mode="natural"
        hasMixedRegimes={false}
      />,
    );

    expect(screen.getByText('Mean bin')).toBeInTheDocument();
    expect(screen.getByText('Spread')).toBeInTheDocument();
    expect(screen.getByText('Skew')).toBeInTheDocument();
    expect(screen.getByText('Tail weight')).toBeInTheDocument();
  });

  it('explains why moments are undefined for a constant sample', () => {
    const { container } = render(
      <StatsPanel summary={summarizeSettledBins([5, 5, 5])} mode="natural" hasMixedRegimes={false} />,
    );
    expect(screen.getByText(/undefined because the standard deviation is zero/i)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
  });

  it('uses short, accessible custom-shape teaching copy', () => {
    render(
      <StatsPanel
        summary={summarizeSettledBins([1, 2, 3])}
        mode="guided"
        hasMixedRegimes
      />,
    );

    expect(screen.getByText('Custom shape settings')).toBeInTheDocument();
    expect(screen.getByText('Includes balls from earlier settings')).toBeInTheDocument();
    expect(screen.getByText('Shape and tails')).toHaveStyle({ minBlockSize: '44px' });
    expect(screen.getByText(/orange line shows the shape/i)).toBeInTheDocument();
  });
});
