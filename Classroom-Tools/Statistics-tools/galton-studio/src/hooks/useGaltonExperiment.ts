import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { buildExpectedPmf, combineRegimes, modeFor } from '../model/distribution';
import { summarizeSettledBins } from '../model/statistics';
import {
  MAX_SETTLED_BALLS,
  type DescriptiveSummary,
  type ExperimentSettings,
  type PhysicsMode,
} from '../model/types';
import { GaltonController, type GaltonSnapshot } from '../physics/controller';

export interface UseGaltonExperimentResult {
  controller: GaltonController;
  settings: ExperimentSettings;
  snapshot: GaltonSnapshot;
  summary: DescriptiveSummary;
  expectedPmf: number[];
  mode: PhysicsMode;
  hasMixedRegimes: boolean;
  overlayVisible: boolean;
  actions: {
    run(): void;
    pause(): void;
    resume(): void;
    reset(): void;
    refill(): void;
    setOverlayVisible(visible: boolean): void;
    updateSettings(patch: Partial<ExperimentSettings>): void;
  };
}

export const NEUTRAL_EXPERIMENT_SETTINGS: ExperimentSettings = {
  hopperPosition: 0,
  skew: 0,
  kurtosis: 3,
  releaseRate: 6,
  changeBehavior: 'keep',
};

function clamp(value: number, minimum: number, maximum: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}

function boundedSettings(settings: ExperimentSettings): ExperimentSettings {
  return {
    ...settings,
    hopperPosition: clamp(settings.hopperPosition, -1, 1, NEUTRAL_EXPERIMENT_SETTINGS.hopperPosition),
    skew: clamp(settings.skew, -1, 1, NEUTRAL_EXPERIMENT_SETTINGS.skew),
    kurtosis: clamp(settings.kurtosis, 1.8, 6, NEUTRAL_EXPERIMENT_SETTINGS.kurtosis),
    releaseRate: clamp(settings.releaseRate, 1, 12, NEUTRAL_EXPERIMENT_SETTINGS.releaseRate),
  };
}

function createSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

function hasMultipleRegimes(snapshot: GaltonSnapshot) {
  const distinctRegimes = snapshot.regimes.reduce<typeof snapshot.regimes[number][]>((unique, regime) => {
    if (regime.released <= 0) return unique;
    const alreadyPresent = unique.some((previous) => (
      previous.pmf.length === regime.pmf.length
      && previous.pmf.every((value, index) => value === regime.pmf[index])
    ));
    if (!alreadyPresent) unique.push(regime);
    return unique;
  }, []);
  return distinctRegimes.length > 1;
}

/** Connects the imperative physics controller to React state and UI actions. */
export function useGaltonExperiment(
  initialSettings: ExperimentSettings = NEUTRAL_EXPERIMENT_SETTINGS,
): UseGaltonExperimentResult {
  const settingsRef = useRef<ExperimentSettings | null>(null);
  if (settingsRef.current === null) settingsRef.current = boundedSettings(initialSettings);
  const [settings, setSettings] = useState(settingsRef.current);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const controllerRef = useRef<GaltonController | null>(null);

  if (controllerRef.current === null) {
    controllerRef.current = new GaltonController({ seed: createSeed(), settings: settingsRef.current });
  }

  const controller = controllerRef.current;
  const subscribe = useCallback((onStoreChange: () => void) => controller.subscribe(onStoreChange), [controller]);
  const getSnapshot = useCallback(() => controller.snapshot(), [controller]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const lifecycleGenerationRef = useRef(0);
  useEffect(() => {
    const generation = ++lifecycleGenerationRef.current;
    return () => {
      Promise.resolve().then(() => {
        if (lifecycleGenerationRef.current === generation) controller.destroy();
      });
    };
  }, [controller]);

  useEffect(() => {
    setOverlayVisible((visible) => {
      if (snapshot.status === 'complete') return true;
      return snapshot.status === 'running' || snapshot.status === 'ready' ? false : visible;
    });
  }, [snapshot.status]);

  const summary = useMemo(() => summarizeSettledBins(snapshot.settledBins), [snapshot.settledBins]);
  const mode = useMemo(() => modeFor(settings), [settings]);
  const expectedPmf = useMemo(() => (
    snapshot.regimes.some((regime) => regime.released > 0)
      ? combineRegimes([...snapshot.regimes])
      : buildExpectedPmf(settings)
  ), [settings, snapshot.regimes]);
  const hasMixedRegimes = useMemo(() => hasMultipleRegimes(snapshot), [snapshot]);

  const run = useCallback(() => {
    setOverlayVisible(false);
    controller.run();
  }, [controller]);

  const resume = useCallback(() => {
    setOverlayVisible(false);
    controller.resume();
  }, [controller]);

  const reset = useCallback(() => {
    setOverlayVisible(false);
    controller.reset({ seed: createSeed(), settings: settingsRef.current! });
  }, [controller]);

  const updateSettings = useCallback((patch: Partial<ExperimentSettings>) => {
    const previousSettings = settingsRef.current!;
    const nextSettings = boundedSettings({ ...previousSettings, ...patch });
    const distributionChanged = (
      nextSettings.hopperPosition !== previousSettings.hopperPosition
      || nextSettings.skew !== previousSettings.skew
      || nextSettings.kurtosis !== previousSettings.kurtosis
    );
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    setOverlayVisible(false);
    if (nextSettings.changeBehavior === 'reset' && distributionChanged) {
      controller.reset({ seed: createSeed(), settings: nextSettings });
    } else {
      controller.setSettings(nextSettings);
    }
  }, [controller]);

  const refill = useCallback(() => {
    if (!snapshot.canRefill || snapshot.settledBins.length >= MAX_SETTLED_BALLS) return;
    setOverlayVisible(false);
    controller.refill(createSeed());
  }, [controller, snapshot.canRefill, snapshot.settledBins.length]);

  return {
    controller,
    settings,
    snapshot,
    summary,
    expectedPmf,
    mode,
    hasMixedRegimes,
    overlayVisible,
    actions: {
      run,
      pause: controller.pause.bind(controller),
      resume,
      reset,
      refill,
      setOverlayVisible,
      updateSettings,
    },
  };
}
