import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AppErrorBoundary', () => {
  it('replaces a failed board with calm recovery copy and a Retry action', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function BrokenBoard(): ReactElement {
      throw new Error('Matter could not initialise');
    }

    render(<AppErrorBoundary><BrokenBoard /></AppErrorBoundary>);

    expect(screen.getByRole('heading', { name: 'The board could not start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(screen.getByText(/experiment is safe to try again/i)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Galton board/i })).not.toBeInTheDocument();
  });

  it('remounts its child with a new internal reset key when Retry is clicked', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    let attempts = 0;
    function BrokenBoard(): ReactElement {
      attempts += 1;
      throw new Error('still unavailable');
    }

    render(<AppErrorBoundary><BrokenBoard /></AppErrorBoundary>);
    const attemptsBeforeRetry = attempts;
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(attempts).toBeGreaterThan(attemptsBeforeRetry);
    expect(screen.getByRole('heading', { name: 'The board could not start' })).toBeInTheDocument();
  });

  it('restores the experiment when a retry succeeds', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    let unavailable = true;
    function RecoveringBoard(): ReactElement {
      if (unavailable) throw new Error('canvas unavailable');
      return <div role="img" aria-label="Working Galton board" />;
    }

    render(<AppErrorBoundary><RecoveringBoard /></AppErrorBoundary>);
    unavailable = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByRole('img', { name: 'Working Galton board' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'The board could not start' })).not.toBeInTheDocument();
  });
});
