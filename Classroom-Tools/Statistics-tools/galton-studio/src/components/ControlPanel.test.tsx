import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExperimentSettings, RunStatus } from '../model/types';
import { ControlPanel, type ControlPanelProps } from './ControlPanel';

afterEach(cleanup);

const settings: ExperimentSettings = {
  hopperPosition: 0,
  skew: 0,
  kurtosis: 3,
  releaseRate: 6,
  changeBehavior: 'keep',
};

function props(overrides: Partial<ControlPanelProps> = {}): ControlPanelProps {
  return {
    settings,
    status: 'ready',
    mode: 'natural',
    settledCount: 0,
    canRefill: false,
    overlayVisible: false,
    onRun: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onReset: vi.fn(),
    onRefill: vi.fn(),
    onOverlayChange: vi.fn(),
    onSettingsChange: vi.fn(),
    ...overrides,
  };
}

describe('ControlPanel', () => {
  it('renders persistently labelled sliders with exact ranges and outputs', () => {
    render(<ControlPanel {...props()} />);

    const expected = [
      ['Hopper position', '-1', '1', '0.05', '0.00'],
      ['Skewness', '-1', '1', '0.05', '0.00'],
      ['Pearson kurtosis', '1.8', '6', '0.1', '3.0'],
      ['Release rate', '1', '12', '1', '6 balls/s'],
    ] as const;

    for (const [name, min, max, step, output] of expected) {
      const input = screen.getByRole('slider', { name });
      expect(input).toHaveAttribute('min', min);
      expect(input).toHaveAttribute('max', max);
      expect(input).toHaveAttribute('step', step);
      expect(within(input.closest('.control-panel__range')!).getByText(output)).toBeInTheDocument();
    }

    expect(screen.getByText('Left entry')).toBeInTheDocument();
    expect(screen.getByText('Right entry')).toBeInTheDocument();
    expect(screen.getByText('Longer left tail')).toBeInTheDocument();
    expect(screen.getByText('Longer right tail')).toBeInTheDocument();
    expect(screen.getByText('Lighter tails')).toBeInTheDocument();
    expect(screen.getByText('Heavier tails')).toBeInTheDocument();
    expect(screen.getByText('Slowest: 1 ball/s')).toBeInTheDocument();
    expect(screen.getByText('Fastest: 12 balls/s')).toBeInTheDocument();
    expect(screen.getByText('Model-driven physics')).toBeInTheDocument();
  });

  it('describes the full qualitative scale for every slider', () => {
    render(<ControlPanel {...props()} />);

    expect(screen.getByRole('slider', { name: 'Hopper position' })).toHaveAccessibleDescription(
      '−1 shifts entry left; 0 is centred; 1 shifts entry right.',
    );
    expect(screen.getByRole('slider', { name: 'Skewness' })).toHaveAccessibleDescription(
      '−1 gives a longer left tail; 0 is symmetric; 1 gives a longer right tail.',
    );
    expect(screen.getByRole('slider', { name: 'Pearson kurtosis' })).toHaveAccessibleDescription(
      '1.8 has lighter tails; 3 is mesokurtic; 6 has heavier tails.',
    );
    expect(screen.getByRole('slider', { name: 'Release rate' })).toHaveAccessibleDescription(
      '1 ball per second is slowest; 12 balls per second is fastest.',
    );
  });

  it('marks Observe, Explore, and Fast regions on the release-rate scale', () => {
    render(<ControlPanel {...props()} />);

    const regions = screen.getByRole('list', { name: 'Release rate regions' });
    expect(within(regions).getByText('Observe')).toBeInTheDocument();
    expect(within(regions).getByText('1–3')).toBeInTheDocument();
    expect(within(regions).getByText('Explore')).toBeInTheDocument();
    expect(within(regions).getByText('4–8')).toBeInTheDocument();
    expect(within(regions).getByText('Fast')).toBeInTheDocument();
    expect(within(regions).getByText('9–12')).toBeInTheDocument();
    expect(screen.getByText('6 balls/s')).toBeInTheDocument();
  });

  it('reacts to entry position, asymmetry, and tail-weight adjustments', () => {
    const { rerender } = render(<ControlPanel {...props()} />);

    expect(screen.getByRole('region', { name: 'What changed?' })).toHaveTextContent(
      'Entry is centred. The target is symmetric. Tails use the mesokurtic reference (Pearson 3).',
    );
    expect(screen.queryByRole('status', { name: 'What changed?' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'What changed?' })).not.toHaveAttribute('aria-atomic');

    rerender(
      <ControlPanel
        {...props({
          settings: {
            ...settings,
            hopperPosition: 0.4,
            skew: -0.6,
            kurtosis: 5,
          },
        })}
      />,
    );

    expect(screen.getByRole('region', { name: 'What changed?' })).toHaveTextContent(
      'Entry moves right. The target has a longer left tail. Heavier tails increase the propensity for extreme-bin outcomes.',
    );
  });

  it('uses the experiment mode supplied by the hook', () => {
    render(<ControlPanel {...props({ mode: 'guided' })} />);
    expect(screen.getByText('Shaped model-driven physics')).toBeInTheDocument();
  });

  it('updates a slider from the keyboard', async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(<ControlPanel {...props({ onSettingsChange })} />);

    await user.click(screen.getByRole('slider', { name: 'Skewness' }));
    await user.keyboard('{ArrowRight}');

    expect(onSettingsChange).toHaveBeenLastCalledWith({ skew: 0.05 });
  });

  it.each<[RunStatus, string]>([
    ['ready', 'Run experiment'],
    ['running', 'Pause experiment'],
    ['paused', 'Resume experiment'],
    ['settling', 'Pause experiment'],
    ['complete', 'Start over'],
  ])('offers the appropriate primary action while %s', (status, name) => {
    render(<ControlPanel {...props({ status })} />);
    expect(screen.getByRole('button', { name })).toBeEnabled();
  });

  it('dispatches both On parameter change choices', async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    const { rerender } = render(<ControlPanel {...props({ onSettingsChange })} />);

    expect(screen.getByRole('group', { name: 'On parameter change' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Reset' }));
    expect(onSettingsChange).toHaveBeenCalledWith({ changeBehavior: 'reset' });

    rerender(<ControlPanel {...props({ settings: { ...settings, changeBehavior: 'reset' }, onSettingsChange })} />);
    await user.click(screen.getByRole('radio', { name: 'Keep' }));
    expect(onSettingsChange).toHaveBeenLastCalledWith({ changeBehavior: 'keep' });
  });

  it('calls Pause, Resume, and Reset actions from their visible buttons', async () => {
    const user = userEvent.setup();
    const onPause = vi.fn();
    const onResume = vi.fn();
    const onReset = vi.fn();
    const { rerender } = render(<ControlPanel {...props({ status: 'running', onPause, onResume, onReset })} />);

    await user.click(screen.getByRole('button', { name: 'Pause experiment' }));
    expect(onPause).toHaveBeenCalledOnce();

    rerender(<ControlPanel {...props({ status: 'paused', onPause, onResume, onReset })} />);
    await user.click(screen.getByRole('button', { name: 'Resume experiment' }));
    expect(onResume).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Reset experiment' }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('only calls Refill when completion allows another 100-ball batch below 600', async () => {
    const user = userEvent.setup();
    const onRefill = vi.fn();
    const { rerender } = render(
      <ControlPanel {...props({ status: 'complete', canRefill: true, settledCount: 500, onRefill })} />,
    );
    const refill = screen.getByRole('button', { name: 'Refill 100 balls' });
    expect(refill).toBeEnabled();
    await user.click(refill);
    expect(onRefill).toHaveBeenCalledOnce();

    rerender(<ControlPanel {...props({ status: 'complete', canRefill: false, settledCount: 500, onRefill })} />);
    expect(screen.queryByRole('button', { name: 'Refill 100 balls' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start over' })).toBeEnabled();

    rerender(<ControlPanel {...props({ status: 'complete', canRefill: true, settledCount: 600, onRefill })} />);
    expect(screen.queryByRole('button', { name: 'Refill 100 balls' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start over' })).toBeEnabled();
    expect(onRefill).toHaveBeenCalledOnce();
  });

  it('offers a clear start-over action when a completed board cannot be refilled', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    const onRun = vi.fn();
    render(<ControlPanel {...props({ status: 'complete', onReset, onRun })} />);

    await user.click(screen.getByRole('button', { name: 'Start over' }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(onRun).not.toHaveBeenCalled();
  });

  it('makes refill primary and start over secondary when a completed batch can continue', () => {
    render(<ControlPanel {...props({ status: 'complete', canRefill: true, settledCount: 100 })} />);

    const actions = document.querySelector<HTMLElement>('.control-panel__actions')!;
    const buttons = within(actions).getAllByRole('button');
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Refill 100 balls',
      'Start over',
    ]);
    expect(screen.queryByRole('button', { name: 'Run experiment' })).not.toBeInTheDocument();
  });

  it('keeps the Analysis overlay switch unavailable until the run completes', () => {
    const { rerender } = render(<ControlPanel {...props({ status: 'running' })} />);
    expect(screen.getByRole('switch', { name: 'Analysis overlay' })).toBeDisabled();
    expect(screen.getByText('Available when all balls have settled.')).toBeInTheDocument();

    rerender(<ControlPanel {...props({ status: 'complete' })} />);
    expect(screen.getByRole('switch', { name: 'Analysis overlay' })).toBeEnabled();
  });

  it('reflects and updates the completed Analysis overlay state', async () => {
    const user = userEvent.setup();
    const onOverlayChange = vi.fn();
    const { rerender } = render(
      <ControlPanel {...props({ status: 'complete', overlayVisible: true, onOverlayChange })} />,
    );
    const overlay = screen.getByRole('switch', { name: 'Analysis overlay' });
    expect(overlay).toBeChecked();
    await user.click(overlay);
    expect(onOverlayChange).toHaveBeenLastCalledWith(false);

    rerender(<ControlPanel {...props({ status: 'complete', overlayVisible: false, onOverlayChange })} />);
    expect(screen.getByRole('switch', { name: 'Analysis overlay' })).not.toBeChecked();
    await user.click(screen.getByRole('switch', { name: 'Analysis overlay' }));
    expect(onOverlayChange).toHaveBeenLastCalledWith(true);
  });
});
