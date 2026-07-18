import { Pause, Play, RotateCcw } from 'lucide-react';
import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react';
import {
  MAX_SETTLED_BALLS,
  type ExperimentSettings,
  type PhysicsMode,
  type RunStatus,
} from '../model/types';

export interface ControlPanelProps {
  settings: ExperimentSettings;
  status: RunStatus;
  mode: PhysicsMode;
  settledCount: number;
  canRefill: boolean;
  overlayVisible: boolean;
  onRun(): void;
  onPause(): void;
  onResume(): void;
  onReset(): void;
  onRefill(): void;
  onOverlayChange(visible: boolean): void;
  onSettingsChange(patch: Partial<ExperimentSettings>): void;
}

interface RangeControlProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  output: string;
  description: string;
  minimumLabel: string;
  maximumLabel: string;
  regions?: readonly { label: string; range: string }[];
  onChange(value: number): void;
}

function RangeControl({
  id,
  label,
  value,
  min,
  max,
  step,
  output,
  description,
  minimumLabel,
  maximumLabel,
  regions,
  onChange,
}: RangeControlProps) {
  const updateFromArrowKey = (event: KeyboardEvent<HTMLInputElement>) => {
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowUp'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
        ? -1
        : 0;
    if (direction === 0) return;

    event.preventDefault();
    const precision = `${step}`.split('.')[1]?.length ?? 0;
    const nextValue = Math.min(max, Math.max(min, value + direction * step));
    onChange(Number(nextValue.toFixed(precision)));
  };

  return (
    <div className="control-panel__range">
      <div className="control-panel__label-row">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{output}</output>
      </div>
      <input
        id={id}
        aria-label={label}
        aria-describedby={`${id}-description`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ minBlockSize: 44, inlineSize: '100%' }}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        onKeyDown={updateFromArrowKey}
      />
      <p id={`${id}-description`} className="control-panel__description">{description}</p>
      <div className="control-panel__endpoints" aria-hidden="true">
        <span>{minimumLabel}</span>
        <span>{maximumLabel}</span>
      </div>
      {regions && (
        <ul className="control-panel__regions" aria-label={`${label} regions`}>
          {regions.map((region) => (
            <li key={region.label}>
              <strong>{region.label}</strong>
              <span>{region.range}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionButton({ children, onClick }: { children: ReactNode; onClick(): void }) {
  return <button type="button" onClick={onClick}>{children}</button>;
}

export function ControlPanel({
  settings,
  status,
  settledCount,
  canRefill,
  overlayVisible,
  onRun,
  onPause,
  onResume,
  onReset,
  onRefill,
  onOverlayChange,
  onSettingsChange,
}: ControlPanelProps) {
  const updateNumber = (key: 'hopperPosition' | 'skew' | 'kurtosis' | 'releaseRate') =>
    (value: number) => onSettingsChange({ [key]: value });
  const refillAvailable = status === 'complete'
    && canRefill
    && settledCount < MAX_SETTLED_BALLS;

  const primaryAction = () => {
    if (status === 'running' || status === 'settling') {
      return (
        <ActionButton onClick={onPause}>
          <Pause aria-hidden="true" size={18} /> Pause experiment
        </ActionButton>
      );
    }
    if (status === 'paused') {
      return (
        <ActionButton onClick={onResume}>
          <Play aria-hidden="true" size={18} /> Resume experiment
        </ActionButton>
      );
    }
    if (refillAvailable) {
      return (
        <ActionButton onClick={onRefill}>
          <RotateCcw aria-hidden="true" size={18} /> Refill 100 balls
        </ActionButton>
      );
    }
    if (status === 'complete' || status === 'error') {
      return (
        <ActionButton onClick={onReset}>
          <RotateCcw aria-hidden="true" size={18} /> Start over
        </ActionButton>
      );
    }
    return (
      <ActionButton onClick={onRun}>
        <Play aria-hidden="true" size={18} /> Run experiment
      </ActionButton>
    );
  };

  const updateChangeBehavior = (event: ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ changeBehavior: event.currentTarget.value as ExperimentSettings['changeBehavior'] });
  };

  const overlayAvailable = status === 'complete';

  return (
    <section className="control-panel" aria-labelledby="experiment-controls-heading">
      <h2 id="experiment-controls-heading">Experiment controls</h2>

      <RangeControl
        id="hopper-position"
        label="Starting position"
        value={settings.hopperPosition}
        min={-1}
        max={1}
        step={0.05}
        output={settings.hopperPosition.toFixed(2)}
        description="Move where the balls enter the board."
        minimumLabel="Left"
        maximumLabel="Right"
        onChange={updateNumber('hopperPosition')}
      />
      <RangeControl
        id="skewness"
        label="Shape"
        value={settings.skew}
        min={-1}
        max={1}
        step={0.05}
        output={settings.skew.toFixed(2)}
        description="Stretch the distribution toward either side."
        minimumLabel="Left tail"
        maximumLabel="Right tail"
        onChange={updateNumber('skew')}
      />
      <RangeControl
        id="pearson-kurtosis"
        label="Tail weight"
        value={settings.kurtosis}
        min={1.8}
        max={6}
        step={0.1}
        output={settings.kurtosis.toFixed(1)}
        description="Control how often balls reach the outer bins."
        minimumLabel="Fewer extremes"
        maximumLabel="More extremes"
        onChange={updateNumber('kurtosis')}
      />
      <RangeControl
        id="release-rate"
        label="Release rate"
        value={settings.releaseRate}
        min={1}
        max={12}
        step={1}
        output={`${settings.releaseRate} balls/s`}
        description="Choose how quickly balls are released."
        minimumLabel="Slow"
        maximumLabel="Fast"
        onChange={updateNumber('releaseRate')}
      />

      <fieldset className="control-panel__segmented">
        <legend>On parameter change</legend>
        <label>
          <input
            type="radio"
            name="change-behavior"
            value="keep"
            checked={settings.changeBehavior === 'keep'}
            style={{ minBlockSize: 44, minInlineSize: 44 }}
            onChange={updateChangeBehavior}
          />
          Keep
        </label>
        <label>
          <input
            type="radio"
            name="change-behavior"
            value="reset"
            checked={settings.changeBehavior === 'reset'}
            style={{ minBlockSize: 44, minInlineSize: 44 }}
            onChange={updateChangeBehavior}
          />
          Reset
        </label>
      </fieldset>

      <div className="control-panel__actions">
        {primaryAction()}
        {refillAvailable && (
          <ActionButton onClick={onReset}>
            <RotateCcw aria-hidden="true" size={18} /> Start over
          </ActionButton>
        )}
        {status !== 'complete' && status !== 'error' && (
          <ActionButton onClick={onReset}>
            <RotateCcw aria-hidden="true" size={18} /> Reset experiment
          </ActionButton>
        )}
      </div>

      <div className="control-panel__overlay">
        <label>
          <input
            type="checkbox"
            role="switch"
            checked={overlayAvailable && overlayVisible}
            disabled={!overlayAvailable}
            style={{ minBlockSize: 44, minInlineSize: 44 }}
            onChange={(event) => onOverlayChange(event.currentTarget.checked)}
          />
          Analysis overlay
        </label>
        {!overlayAvailable && <p>Available when all balls have settled.</p>}
      </div>

    </section>
  );
}
