import { Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { BoardCanvas } from './components/BoardCanvas';
import { BoardBinReadouts } from './components/BinReadouts';
import { ControlPanel } from './components/ControlPanel';
import { StatsPanel } from './components/StatsPanel';
import { useGaltonExperiment } from './hooks/useGaltonExperiment';
import { BATCH_SIZE, MAX_SETTLED_BALLS, type RunStatus } from './model/types';
import { createBoardGeometry } from './physics/geometry';

const BOARD_GEOMETRY = createBoardGeometry();

const STATUS_LABELS: Record<RunStatus, string> = {
  ready: 'Ready',
  running: 'Running',
  paused: 'Paused',
  settling: 'Settling',
  complete: 'Complete',
  error: 'Needs attention',
};

function ExperimentApp() {
  const experiment = useGaltonExperiment();
  const {
    actions,
    controller,
    expectedPmf,
    hasMixedRegimes,
    mode,
    overlayVisible,
    settings,
    snapshot,
    summary,
  } = experiment;
  const [boardError, setBoardError] = useState<Error | null>(null);
  const [announcement, setAnnouncement] = useState({ id: 0, message: '' });
  const previousStatus = useRef(snapshot.status);

  const announce = useCallback((message: string) => {
    setAnnouncement(({ id }) => ({ id: id + 1, message }));
  }, []);

  useEffect(() => {
    const completed = previousStatus.current !== 'complete' && snapshot.status === 'complete';
    previousStatus.current = snapshot.status;
    if (completed) announce('Experiment completed.');
  }, [announce, snapshot.status]);

  const reportBoardError = useCallback((error: unknown) => {
    setBoardError(error instanceof Error ? error : new Error('The board renderer stopped unexpectedly.'));
  }, []);
  const resetExperiment = useCallback(() => {
    actions.reset();
    announce('Experiment reset.');
  }, [actions, announce]);
  const runExperiment = useCallback(() => {
    actions.run();
    announce('Experiment started.');
  }, [actions, announce]);
  const pauseExperiment = useCallback(() => {
    actions.pause();
    announce('Experiment paused.');
  }, [actions, announce]);
  const resumeExperiment = useCallback(() => {
    actions.resume();
  }, [actions]);
  const refillExperiment = useCallback(() => {
    actions.refill();
  }, [actions]);

  if (boardError) throw boardError;

  const targetBallCount = summary.count + snapshot.activeCount + snapshot.hopperCount;
  const batchNumber = Math.min(
    MAX_SETTLED_BALLS / BATCH_SIZE,
    Math.max(1, Math.ceil(targetBallCount / BATCH_SIZE)),
  );
  const canRefill = snapshot.status === 'complete'
    && snapshot.canRefill
    && summary.count < MAX_SETTLED_BALLS;

  const primaryAction = () => {
    if (snapshot.status === 'running' || snapshot.status === 'settling') {
      return { label: 'Pause', icon: Pause, action: pauseExperiment };
    }
    if (snapshot.status === 'paused') {
      return { label: 'Resume', icon: Play, action: resumeExperiment };
    }
    if (canRefill) {
      return { label: 'Refill 100 balls', icon: RotateCcw, action: refillExperiment };
    }
    if (snapshot.status === 'complete' || snapshot.status === 'error') {
      return { label: 'Start over', icon: RotateCcw, action: resetExperiment };
    }
    return { label: 'Run', icon: Play, action: runExperiment };
  };

  const primary = primaryAction();
  const PrimaryIcon = primary.icon;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#experiment">Skip to experiment</a>
      <header className="app-header">
        <div className="app-header__brand">
          <p className="eyebrow">Interactive probability laboratory</p>
          <h1>Galton Studio</h1>
          <p className="app-header__subtitle">Probability made physical.</p>
        </div>

        <div className="run-strip" aria-label="Experiment status and actions">
          <div className="run-strip__status">
            <span className="run-strip__batch">Batch {batchNumber} of {MAX_SETTLED_BALLS / BATCH_SIZE}</span>
            <span className="run-strip__total">{summary.count} observations</span>
            <strong data-status={snapshot.status}>{STATUS_LABELS[snapshot.status]}</strong>
          </div>
          {snapshot.status !== 'complete' && snapshot.status !== 'error' && (
            <button className="button button--quiet" type="button" onClick={resetExperiment}>
              <RotateCcw aria-hidden="true" size={17} /> Reset
            </button>
          )}
          <button className="button button--primary" type="button" onClick={primary.action}>
            <PrimaryIcon aria-hidden="true" size={18} /> {primary.label}
          </button>
        </div>
      </header>

      <main id="experiment" className="experiment-layout" tabIndex={-1}>
        <ControlPanel
          settings={settings}
          status={snapshot.status}
          mode={mode}
          settledCount={summary.count}
          canRefill={snapshot.canRefill}
          overlayVisible={overlayVisible}
          onRun={runExperiment}
          onPause={pauseExperiment}
          onResume={resumeExperiment}
          onReset={resetExperiment}
          onRefill={refillExperiment}
          onOverlayChange={actions.setOverlayVisible}
          onSettingsChange={actions.updateSettings}
        />

        <section className="board-panel" aria-labelledby="physical-board-heading">
          <div className="board-panel__heading">
            <div>
              <p className="eyebrow">Physical apparatus</p>
              <h2 id="physical-board-heading">Physical Galton board</h2>
            </div>
            <span className="mode-chip">{mode === 'natural' ? 'Natural physics' : 'Guided demonstration'}</span>
          </div>
          {snapshot.status === 'ready' && summary.count === 0 && snapshot.activeCount === 0 && (
            <aside className="prediction-prompt" aria-label="Prediction prompt">
              <strong>Before you run</strong>
              <span>Which bin do you predict will collect the most balls—and why?</span>
            </aside>
          )}
          <div className="board-stage">
            <BoardCanvas
              className="board-canvas"
              controller={controller}
              geometry={BOARD_GEOMETRY}
              summary={summary}
              expectedPmf={expectedPmf}
              targetBallCount={targetBallCount}
              overlayVisible={overlayVisible}
              onError={reportBoardError}
            />
          </div>
          <BoardBinReadouts bins={summary.bins} />
          <div className="board-panel__legend" aria-label="Board legend">
            <span><i className="legend-dot legend-dot--observed" /> Observed balls</span>
            <span><i className="legend-line legend-line--theory" /> Theoretical model after completion</span>
          </div>
        </section>

        <StatsPanel summary={summary} mode={mode} hasMixedRegimes={hasMixedRegimes} />
      </main>

      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        <span key={announcement.id}>{announcement.message}</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <ExperimentApp />
    </AppErrorBoundary>
  );
}
