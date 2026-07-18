import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildExpectedPmf } from '../model/distribution';
import type { ExperimentSettings } from '../model/types';
import type { GaltonSnapshot } from '../physics/controller';

const neutral: ExperimentSettings = {
  hopperPosition: 0,
  skew: 0,
  kurtosis: 3,
  releaseRate: 6,
  changeBehavior: 'keep',
};

interface ControllerDouble {
  snapshot: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  refill: ReturnType<typeof vi.fn>;
  setSettings: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  publish(nextSnapshot: GaltonSnapshot): void;
  replaceSnapshot(nextSnapshot: GaltonSnapshot): void;
  state: {
    snapshot: GaltonSnapshot;
    listener?: () => void;
    destroyed: boolean;
    successfulRuns: number;
  };
}

const mocks = vi.hoisted(() => {
  function initialSnapshot() {
    return {
      status: 'ready',
      hopperCount: 100,
      activeCount: 0,
      settledBins: [],
      ballBodies: [],
      regimes: [],
      canRefill: false,
      recycledCount: 0,
    } as GaltonSnapshot;
  }

  const controllers: ControllerDouble[] = [];
  let beforeSubscribe: ((controller: ControllerDouble) => void) | undefined;

  function createController(): ControllerDouble {
    const state = {
      snapshot: initialSnapshot(),
      listener: undefined as (() => void) | undefined,
      destroyed: false,
      successfulRuns: 0,
    };
    const controller = {
      snapshot: vi.fn(() => state.snapshot),
      subscribe: vi.fn((listener: () => void) => {
        state.listener = listener;
        beforeSubscribe?.(controller);
        return () => {
          if (state.listener === listener) state.listener = undefined;
        };
      }),
      run: vi.fn(() => {
        if (!state.destroyed) state.successfulRuns += 1;
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      reset: vi.fn(),
      refill: vi.fn(),
      setSettings: vi.fn(),
      destroy: vi.fn(() => {
        state.destroyed = true;
      }),
      publish(nextSnapshot: GaltonSnapshot) {
        state.snapshot = nextSnapshot;
        state.listener?.();
      },
      replaceSnapshot(nextSnapshot: GaltonSnapshot) {
        state.snapshot = nextSnapshot;
      },
      state,
    };
    controllers.push(controller);
    return controller;
  }

  return {
    controllers,
    get beforeSubscribe() {
      return beforeSubscribe;
    },
    set beforeSubscribe(callback: typeof beforeSubscribe) {
      beforeSubscribe = callback;
    },
    GaltonController: vi.fn(function MockGaltonController() {
      return createController();
    }),
  };
});

vi.mock('../physics/controller', () => ({ GaltonController: mocks.GaltonController }));

import { useGaltonExperiment } from './useGaltonExperiment';

function makeSnapshot(overrides: Partial<GaltonSnapshot> = {}): GaltonSnapshot {
  return {
    status: 'ready',
    hopperCount: 100,
    activeCount: 0,
    settledBins: [],
    ballBodies: [],
    regimes: [],
    canRefill: false,
    recycledCount: 0,
    ...overrides,
  };
}

function controller() {
  return mocks.controllers.at(-1)!;
}

function publish(nextSnapshot: GaltonSnapshot) {
  act(() => controller().publish(nextSnapshot));
}

describe('useGaltonExperiment', () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    mocks.controllers.splice(0);
    mocks.beforeSubscribe = undefined;
    vi.clearAllMocks();
  });

  it('creates a neutral experiment with an empty summary', () => {
    const { result } = renderHook(() => useGaltonExperiment());

    expect(result.current.settings).toEqual(neutral);
    expect(result.current.snapshot).toEqual(controller().state.snapshot);
    expect(result.current.summary.count).toBe(0);
    expect(result.current.expectedPmf).toHaveLength(11);
    expect(result.current.mode).toBe('natural');
    expect(result.current.hasMixedRegimes).toBe(false);
    expect(result.current.overlayVisible).toBe(false);
    expect(result.current.controller).toBe(controller());
    expect(mocks.GaltonController).toHaveBeenCalledTimes(1);
  });

  it('keeps the committed controller usable through StrictMode effect rehearsal and destroys it on unmount', async () => {
    const { result, unmount } = renderHook(() => useGaltonExperiment(), { reactStrictMode: true });
    const committedController = controller();

    await act(async () => {
      await Promise.resolve();
    });
    expect(committedController.destroy).not.toHaveBeenCalled();
    act(() => result.current.actions.run());
    expect(committedController.state.successfulRuns).toBe(1);
    expect(mocks.controllers).toContain(committedController);

    unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(committedController.destroy).toHaveBeenCalledOnce();
    expect(committedController.state.destroyed).toBe(true);
  });

  it('reads an update that happens while subscribing', () => {
    mocks.beforeSubscribe = (instance) => {
      instance.replaceSnapshot(makeSnapshot({ settledBins: [4] }));
    };

    const { result } = renderHook(() => useGaltonExperiment());

    expect(result.current.snapshot.settledBins).toEqual([4]);
    expect(result.current.summary.count).toBe(1);
  });

  it('delegates run, pause, resume, reset, and allowed refill actions to its controller', () => {
    const { result } = renderHook(() => useGaltonExperiment());
    publish(makeSnapshot({ status: 'complete', canRefill: true }));

    act(() => {
      result.current.actions.run();
      result.current.actions.pause();
      result.current.actions.resume();
      result.current.actions.reset();
      result.current.actions.refill();
    });

    expect(controller().run).toHaveBeenCalledOnce();
    expect(controller().pause).toHaveBeenCalledOnce();
    expect(controller().resume).toHaveBeenCalledOnce();
    expect(controller().reset).toHaveBeenCalledOnce();
    expect(controller().refill).toHaveBeenCalledOnce();
  });

  it('updates the descriptive summary when settled bins are published', () => {
    const { result } = renderHook(() => useGaltonExperiment());

    publish(makeSnapshot({ settledBins: [3, 5, 5, 7] }));

    expect(result.current.summary).toMatchObject({
      count: 4,
      mean: 5,
      bins: expect.arrayContaining([
        expect.objectContaining({ bin: 3, count: 1, percentage: 25 }),
        expect.objectContaining({ bin: 5, count: 2, percentage: 50 }),
      ]),
    });
  });

  it('shows the overlay at completion and hides it on a new run or reset', () => {
    const { result } = renderHook(() => useGaltonExperiment());

    publish(makeSnapshot({ status: 'complete' }));
    expect(result.current.overlayVisible).toBe(true);

    publish(makeSnapshot({ status: 'running' }));
    expect(result.current.overlayVisible).toBe(false);
    publish(makeSnapshot({ status: 'complete' }));
    act(() => result.current.actions.reset());
    expect(result.current.overlayVisible).toBe(false);
  });

  it('retains all settings across batched Keep-mode patches', () => {
    const { result } = renderHook(() => useGaltonExperiment());

    act(() => {
      result.current.actions.updateSettings({ skew: 0.7 });
      result.current.actions.updateSettings({ releaseRate: 10 });
    });

    expect(result.current.settings).toEqual({ ...neutral, skew: 0.7, releaseRate: 10 });
    expect(controller().setSettings).toHaveBeenLastCalledWith({ ...neutral, skew: 0.7, releaseRate: 10 });
  });

  it('resets with settings updated earlier in the same batch', () => {
    const getRandomValues = vi.fn((values: Uint32Array) => {
      values[0] = 1234;
      return values;
    });
    vi.stubGlobal('crypto', { getRandomValues });
    const { result } = renderHook(() => useGaltonExperiment());

    act(() => {
      result.current.actions.updateSettings({ skew: 0.7 });
      result.current.actions.reset();
    });

    expect(controller().reset).toHaveBeenLastCalledWith({
      seed: 1234,
      settings: { ...neutral, skew: 0.7 },
    });
  });

  it('keeps previous releases and exposes a weighted expected mixture after a Keep-mode change', () => {
    const { result } = renderHook(() => useGaltonExperiment());
    const originalPmf = Array(11).fill(0);
    originalPmf[5] = 1;
    const changedPmf = Array(11).fill(0);
    changedPmf[8] = 1;

    act(() => result.current.actions.updateSettings({ skew: 0.7 }));
    expect(controller().setSettings).toHaveBeenCalledWith({ ...neutral, skew: 0.7 });

    publish(makeSnapshot({
      regimes: [
        { pmf: originalPmf, released: 25, mode: 'natural' },
        { pmf: changedPmf, released: 75, mode: 'guided' },
      ],
    }));

    expect(result.current.hasMixedRegimes).toBe(true);
    expect(result.current.expectedPmf[5]).toBe(0.25);
    expect(result.current.expectedPmf[8]).toBe(0.75);
  });

  it('does not call equal PMFs with different labels mixed regimes', () => {
    const { result } = renderHook(() => useGaltonExperiment());
    const pmf = Array(11).fill(0);
    pmf[5] = 1;

    publish(makeSnapshot({
      regimes: [
        { pmf, released: 10, mode: 'natural' },
        { pmf: [...pmf], released: 10, mode: 'guided' },
      ],
    }));

    expect(result.current.hasMixedRegimes).toBe(false);
  });

  it('falls back to the current expected PMF until a regime has releases', () => {
    const settings = { ...neutral, skew: 0.7 };
    const { result } = renderHook(() => useGaltonExperiment(settings));

    publish(makeSnapshot({
      regimes: [{ pmf: Array(11).fill(1 / 11), released: 0, mode: 'natural' }],
    }));

    expect(result.current.expectedPmf).toEqual(buildExpectedPmf(settings));
  });

  it('does not clear the experiment merely when Reset change behavior is selected', () => {
    const { result } = renderHook(() => useGaltonExperiment());

    act(() => result.current.actions.updateSettings({ changeBehavior: 'reset' }));

    expect(controller().reset).not.toHaveBeenCalled();
    expect(controller().setSettings).toHaveBeenCalledWith({
      ...neutral,
      changeBehavior: 'reset',
    });
  });

  it('does not clear the experiment when release rate changes in Reset mode', () => {
    const { result } = renderHook(() => useGaltonExperiment());

    act(() => result.current.actions.updateSettings({ changeBehavior: 'reset' }));
    vi.clearAllMocks();
    act(() => result.current.actions.updateSettings({ releaseRate: 10 }));

    expect(controller().reset).not.toHaveBeenCalled();
    expect(controller().setSettings).toHaveBeenCalledWith({
      ...neutral,
      changeBehavior: 'reset',
      releaseRate: 10,
    });
  });

  it.each([
    ['hopper position', { hopperPosition: 0.6 }],
    ['skew', { skew: 0.7 }],
    ['kurtosis', { kurtosis: 5 }],
  ] satisfies [string, Partial<ExperimentSettings>][])('clears with a new seed when %s changes in Reset mode', (_label, patch) => {
    const getRandomValues = vi.fn((values: Uint32Array) => {
      values[0] = 1234;
      return values;
    });
    vi.stubGlobal('crypto', { getRandomValues });
    const { result } = renderHook(() => useGaltonExperiment());

    act(() => result.current.actions.updateSettings({ changeBehavior: 'reset' }));
    vi.clearAllMocks();
    act(() => result.current.actions.updateSettings(patch));

    expect(controller().reset).toHaveBeenCalledWith({
      seed: 1234,
      settings: { ...neutral, changeBehavior: 'reset', ...patch },
    });
  });

  it.each([
    ['hopper position', { hopperPosition: -0.6 }],
    ['skew', { skew: -0.7 }],
    ['kurtosis', { kurtosis: 1.8 }],
  ] satisfies [string, Partial<ExperimentSettings>][])('keeps the current board when %s changes in Keep mode', (_label, patch) => {
    const { result } = renderHook(() => useGaltonExperiment());

    act(() => result.current.actions.updateSettings(patch));

    expect(controller().reset).not.toHaveBeenCalled();
    expect(controller().setSettings).toHaveBeenCalledWith({ ...neutral, ...patch });
  });

  it('uses a fresh seed for each allowed refill', () => {
    let seed = 0;
    vi.stubGlobal('crypto', {
      getRandomValues(values: Uint32Array) {
        values[0] = seed;
        seed += 1;
        return values;
      },
    });
    const { result } = renderHook(() => useGaltonExperiment());
    publish(makeSnapshot({ status: 'complete', canRefill: true }));

    act(() => {
      result.current.actions.refill();
      result.current.actions.refill();
    });

    expect(controller().refill).toHaveBeenNthCalledWith(1, 1);
    expect(controller().refill).toHaveBeenNthCalledWith(2, 2);
  });

  it('clamps settings before passing them to the controller', () => {
    const { result } = renderHook(() => useGaltonExperiment());

    act(() => result.current.actions.updateSettings({
      hopperPosition: 2,
      skew: -2,
      kurtosis: 10,
      releaseRate: 0,
    }));

    expect(controller().setSettings).toHaveBeenCalledWith({
      ...neutral,
      hopperPosition: 1,
      skew: -1,
      kurtosis: 6,
      releaseRate: 1,
    });
  });

  it('does not refill after the 600-ball limit has been reached', () => {
    const { result } = renderHook(() => useGaltonExperiment());

    publish(makeSnapshot({ status: 'complete', canRefill: true, settledBins: Array(600).fill(5) }));
    act(() => result.current.actions.refill());

    expect(controller().refill).not.toHaveBeenCalled();
  });
});
