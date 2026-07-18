import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { summarizeSettledBins } from '../model/statistics';
import { BinReadouts, BoardBinReadouts } from './BinReadouts';

afterEach(cleanup);

describe('BinReadouts', () => {
  it('exposes count, one-decimal percentage, and two-decimal z-score for all eleven bins', () => {
    render(<BinReadouts bins={summarizeSettledBins([0, 5, 5, 10]).bins} />);

    expect(screen.getAllByRole('group', { name: /Bin \d+:/ })).toHaveLength(11);
    expect(screen.getAllByRole('button', { name: /Bin \d+:/ })).toHaveLength(11);
    expect(screen.getByRole('group', { name: 'Bin 5: 2 balls, 50.0%, z-score 0.00' })).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.getByText('z 0.00')).toBeInTheDocument();
  });

  it('uses an em dash and explanation for unavailable z-scores', () => {
    const { container } = render(<BinReadouts bins={summarizeSettledBins([]).bins} />);

    expect(screen.getAllByText('z —')).toHaveLength(11);
    expect(screen.getByText(/available once settled balls have a non-zero spread/i)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
  });

  it('renders concise count, percentage, and z-score values aligned beneath all eleven desktop bins', () => {
    render(<BoardBinReadouts bins={summarizeSettledBins([0, 5, 5, 10]).bins} />);

    const list = screen.getByRole('list', { name: 'Values directly beneath the board bins' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(11);
    expect(within(list).getByRole('listitem', { name: 'Bin 5: 2 balls, 50.0%, z-score 0.00' }))
      .toHaveTextContent('Bin 5250.0%z 0.00');
  });

  it('provides eleven focusable bin disclosures beside the board for narrow screens', () => {
    render(<BoardBinReadouts bins={summarizeSettledBins([0, 5, 5, 10]).bins} />);

    const list = screen.getByRole('list', { name: 'Bin details beside the board' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(11);
    expect(within(list).getAllByRole('button', { name: /Bin \d+:/ })).toHaveLength(11);

    const binFive = within(list).getByRole('button', {
      name: 'Bin 5: 2 balls, 50.0%, z-score 0.00',
    });
    expect(binFive).toHaveStyle({ minBlockSize: '44px', minInlineSize: '44px' });
  });
});
