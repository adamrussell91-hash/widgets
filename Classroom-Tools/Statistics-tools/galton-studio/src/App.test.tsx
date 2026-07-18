import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { summarizeSettledBins } from './model/statistics';

const experiment = vi.hoisted(() => ({
  actions: {
    run: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
    refill: vi.fn(),
    setOverlayVisible: vi.fn(),
    updateSettings: vi.fn(),
  },
  controller: {
    snapshot: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    step: vi.fn(),
  },
  current: null as any,
}));

vi.mock('./hooks/useGaltonExperiment', () => ({
  useGaltonExperiment: () => experiment.current,
}));

vi.mock('./components/BoardCanvas', () => ({
  BoardCanvas: () => <div role="img" aria-label="Galton board. 0 of 100 balls settled across 11 bins." />,
}));

import App from './App';

afterEach(cleanup);

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    experiment.current = {
      settings: {
        hopperPosition: 0,
        skew: 0,
        kurtosis: 3,
        releaseRate: 6,
        changeBehavior: 'keep',
      },
      snapshot: {
        status: 'ready',
        hopperCount: 100,
        activeCount: 0,
        settledBins: [],
        ballBodies: [],
        regimes: [],
        canRefill: false,
        recycledCount: 0,
      },
      summary: summarizeSettledBins([]),
      expectedPmf: Array(11).fill(1 / 11),
      mode: 'natural',
      hasMixedRegimes: false,
      overlayVisible: false,
      actions: experiment.actions,
      controller: experiment.controller,
    };
  });

  it('composes the complete physical probability instrument', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Galton Studio' })).toBeInTheDocument();
    expect(screen.getByText('Probability made physical.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Physical Galton board' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Experiment controls' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Live statistics' })).toBeInTheDocument();
    expect(screen.getAllByRole('group', { name: /Bin \d+:/ })).toHaveLength(11);
    expect(screen.getAllByText('Model-driven physics').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled();
    expect(screen.getByText('Total observations')).toBeInTheDocument();
    expect(within(screen.getByRole('banner')).getByText('0 observations')).toBeInTheDocument();
    expect(screen.getByText('Before you run')).toBeInTheDocument();
    expect(screen.getByText('Which bin do you predict will collect the most balls—and why?')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Values directly beneath the board bins' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Physical Galton board' }))
        .getByRole('list', { name: 'Bin details beside the board' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Interpret the experiment' })).toBeInTheDocument();
  });

  it('labels and discloses a shaped model-driven PMF at the app render site', () => {
    experiment.current = {
      ...experiment.current,
      settings: { ...experiment.current.settings, skew: 0.4 },
      mode: 'guided',
    };

    render(<App />);

    const board = screen.getByRole('region', { name: 'Physical Galton board' });
    expect(within(board).getByText('Shaped model-driven physics')).toBeInTheDocument();
    expect(screen.getByText(/active shaped PMF creates seeded largest-remainder target quotas/i))
      .toBeInTheDocument();
  });

  it('removes the prediction prompt once the physical experiment begins', () => {
    const { rerender } = render(<App />);
    expect(screen.getByText('Before you run')).toBeInTheDocument();

    experiment.current = {
      ...experiment.current,
      snapshot: { ...experiment.current.snapshot, status: 'running', hopperCount: 99, activeCount: 1 },
    };
    rerender(<App />);

    expect(screen.queryByText('Before you run')).not.toBeInTheDocument();
  });

  it('keeps controls, board, and statistics in useful narrow-screen source order', () => {
    render(<App />);

    const controls = screen.getByRole('region', { name: 'Experiment controls' });
    const board = screen.getByRole('region', { name: 'Physical Galton board' });
    const statistics = screen.getByRole('complementary', { name: 'Live statistics' });

    expect(controls.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(board.compareDocumentPosition(statistics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('offers compact header actions and announces a requested reset', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Run' }));
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Reset' }));

    expect(experiment.actions.run).toHaveBeenCalledOnce();
    expect(experiment.actions.reset).toHaveBeenCalledOnce();
    const liveRegions = document.querySelectorAll('[aria-live]');
    expect(liveRegions).toHaveLength(1);
    expect(screen.getByText('Experiment reset.')).toBeInTheDocument();
    expect(within(screen.getByRole('banner')).getByText('Ready')).toBeInTheDocument();
  });

  it('announces only the specified lifecycle events and repeats identical resets', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<App />);
    const banner = screen.getByRole('banner');

    await user.click(within(banner).getByRole('button', { name: 'Run' }));
    expect(screen.getByText('Experiment started.')).toBeInTheDocument();

    experiment.current = {
      ...experiment.current,
      snapshot: { ...experiment.current.snapshot, status: 'paused' },
    };
    rerender(<App />);
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Resume' }));
    expect(experiment.actions.resume).toHaveBeenCalledOnce();
    expect(screen.queryByText('Experiment resumed.')).not.toBeInTheDocument();

    experiment.current = {
      ...experiment.current,
      snapshot: { ...experiment.current.snapshot, status: 'ready' },
    };
    rerender(<App />);
    const reset = within(screen.getByRole('banner')).getByRole('button', { name: 'Reset' });
    await user.click(reset);
    const firstAnnouncement = document.querySelector('[aria-live] span');
    await user.click(reset);
    expect(document.querySelector('[aria-live] span')).not.toBe(firstAnnouncement);
    expect(screen.getByText('Experiment reset.')).toBeInTheDocument();
  });

  it('keeps completed-batch actions consistent and advances the batch only after refill', async () => {
    const user = userEvent.setup();
    const settledBins = Array(100).fill(5);
    experiment.current = {
      ...experiment.current,
      snapshot: {
        ...experiment.current.snapshot,
        status: 'complete',
        hopperCount: 0,
        settledBins,
        canRefill: true,
      },
      summary: summarizeSettledBins(settledBins),
      overlayVisible: true,
    };
    const { rerender } = render(<App />);

    expect(within(screen.getByRole('banner')).getByText('Batch 1 of 6')).toBeInTheDocument();
    expect(within(screen.getByRole('banner')).getByText('100 observations')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Refill 100 balls' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Run experiment' })).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Refill 100 balls' }));
    expect(experiment.actions.refill).toHaveBeenCalledOnce();
    expect(screen.queryByText('Hopper refilled with 100 balls.')).not.toBeInTheDocument();

    experiment.current = {
      ...experiment.current,
      snapshot: {
        ...experiment.current.snapshot,
        status: 'ready',
        hopperCount: 100,
        canRefill: false,
      },
    };
    rerender(<App />);
    expect(within(screen.getByRole('banner')).getByText('Batch 2 of 6')).toBeInTheDocument();
  });

  it('announces completion when the controller enters complete state', () => {
    const { rerender } = render(<App />);
    experiment.current = {
      ...experiment.current,
      snapshot: { ...experiment.current.snapshot, status: 'complete' },
    };

    rerender(<App />);

    expect(screen.getByText('Experiment completed.')).toBeInTheDocument();
  });

  it('offers only one recovery action in the header error state', () => {
    experiment.current = {
      ...experiment.current,
      snapshot: { ...experiment.current.snapshot, status: 'error' },
    };

    render(<App />);

    const headerButtons = within(screen.getByRole('banner')).getAllByRole('button');
    expect(headerButtons).toHaveLength(1);
    expect(headerButtons[0]).toHaveAccessibleName('Start over');
  });

  it('provides a skip link to the experiment', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'Skip to experiment' })).toHaveAttribute('href', '#experiment');
  });

  it('shows the deployed distribution-correction build identifier', () => {
    render(<App />);
    expect(screen.getByText('Distribution fix build 2')).toBeInTheDocument();
  });
});
