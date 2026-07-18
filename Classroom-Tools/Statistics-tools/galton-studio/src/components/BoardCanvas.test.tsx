import { act, render, screen } from '@testing-library/react';
import { Bodies, Sleeping } from 'matter-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DescriptiveSummary } from '../model/types';
import type { GaltonSnapshot } from '../physics/controller';
import { BOARD, createBoardGeometry } from '../physics/geometry';
import { BoardCanvas } from './BoardCanvas';

const canvasContext = {
  canvas: { width: 720, height: 800 },
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  arc: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  setLineDash: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 70 })),
} as unknown as CanvasRenderingContext2D;

class TestResizeObserver {
  static instances: TestResizeObserver[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  constructor(readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this);
  }
}

function summary(): DescriptiveSummary {
  return {
    count: 57,
    mean: 5,
    variance: 2,
    standardDeviation: Math.sqrt(2),
    skewness: 0,
    pearsonKurtosis: 3,
    bins: Array.from({ length: 11 }, (_, bin) => ({
      bin,
      count: bin === 5 ? 57 : 0,
      percentage: bin === 5 ? 100 : 0,
      zScore: bin - 5,
    })),
  };
}

function snapshot(): GaltonSnapshot {
  return {
    status: 'running',
    hopperCount: 43,
    activeCount: 0,
    settledBins: Array(57).fill(5),
    ballBodies: [],
    regimes: [],
    canRefill: false,
    recycledCount: 0,
    settlementDiagnostics: [],
  };
}

function controller() {
  return {
    snapshot: vi.fn(snapshot),
    subscribe: vi.fn(() => vi.fn()),
    step: vi.fn(),
    suspendForPageVisibility: vi.fn(),
    restoreAfterPageVisibility: vi.fn(),
  };
}

describe('BoardCanvas', () => {
  let animationCallback: FrameRequestCallback | undefined;

  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    TestResizeObserver.instances = [];
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    vi.stubGlobal('ResizeObserver', TestResizeObserver);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationCallback = callback;
      return 71;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(vi.fn());
  });

  it('exposes a text alternative for settled progress and bin count', () => {
    render(
      <BoardCanvas
        controller={controller()}
        geometry={createBoardGeometry()}
        summary={summary()}
        expectedPmf={Array(11).fill(1 / 11)}
        targetBallCount={100}
        overlayVisible={false}
      />,
    );

    expect(screen.getByText('57 of 100 balls settled across 11 bins.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Galton board/i })).toBeInTheDocument();
  });

  it('uses ResizeObserver to fit a 720-by-800 board into a DPR-safe canvas', () => {
    const instance = controller();
    const { container } = render(
      <BoardCanvas
        controller={instance}
        geometry={createBoardGeometry()}
        summary={summary()}
        expectedPmf={Array(11).fill(1 / 11)}
        targetBallCount={100}
        overlayVisible={false}
      />,
    );
    const canvas = container.querySelector('canvas')!;
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 });

    act(() => TestResizeObserver.instances[0]!.callback([
      { contentRect: { width: 360, height: 400 } as DOMRectReadOnly } as ResizeObserverEntry,
    ], TestResizeObserver.instances[0] as unknown as ResizeObserver));

    expect(canvas.width).toBe(720);
    expect(canvas.height).toBe(800);
    expect(canvasContext.setTransform).toHaveBeenLastCalledWith(1, 0, 0, 1, 0, 0);
  });

  it('reconciles backing dimensions and transform when only DPR changes', () => {
    const { container } = render(
      <BoardCanvas
        controller={controller()}
        geometry={createBoardGeometry()}
        summary={summary()}
        expectedPmf={Array(11).fill(1 / 11)}
        targetBallCount={100}
        overlayVisible={false}
      />,
    );
    const canvas = container.querySelector('canvas')!;
    act(() => TestResizeObserver.instances[0]!.callback([
      { contentRect: { width: 360, height: 400 } as DOMRectReadOnly } as ResizeObserverEntry,
    ], TestResizeObserver.instances[0] as unknown as ResizeObserver));
    expect(canvas.width).toBe(360);
    expect(canvas.height).toBe(400);

    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 });
    act(() => animationCallback?.(100));

    expect(canvas.width).toBe(720);
    expect(canvas.height).toBe(800);
    expect(canvasContext.setTransform).toHaveBeenLastCalledWith(1, 0, 0, 1, 0, 0);
  });

  it('clears for initialization and resize but not before ordinary opaque animation frames', () => {
    render(
      <BoardCanvas
        controller={controller()}
        geometry={createBoardGeometry()}
        summary={summary()}
        expectedPmf={Array(11).fill(1 / 11)}
        targetBallCount={100}
        overlayVisible={false}
      />,
    );
    const initializationClears = vi.mocked(canvasContext.clearRect).mock.calls.length;
    expect(initializationClears).toBeGreaterThan(0);

    act(() => animationCallback?.(100));
    expect(canvasContext.clearRect).toHaveBeenCalledTimes(initializationClears);

    act(() => TestResizeObserver.instances[0]!.callback([
      { contentRect: { width: 360, height: 400 } as DOMRectReadOnly } as ResizeObserverEntry,
    ], TestResizeObserver.instances[0] as unknown as ResizeObserver));
    const resizeClears = vi.mocked(canvasContext.clearRect).mock.calls.length;
    expect(resizeClears).toBeGreaterThan(initializationClears);

    act(() => animationCallback?.(116));
    expect(canvasContext.clearRect).toHaveBeenCalledTimes(resizeClears);
  });

  it('steps on animation frames only while visible and cleans up lifecycle resources', () => {
    const instance = controller();
    const removeListener = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(
      <BoardCanvas
        controller={instance}
        geometry={createBoardGeometry()}
        summary={summary()}
        expectedPmf={Array(11).fill(1 / 11)}
        targetBallCount={100}
        overlayVisible={false}
      />,
    );

    act(() => animationCallback?.(100));
    act(() => animationCallback?.(116));
    expect(instance.step).toHaveBeenCalledWith(16);

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(instance.suspendForPageVisibility).toHaveBeenCalledTimes(1);
    act(() => animationCallback?.(132));
    expect(instance.step).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(instance.restoreAfterPageVisibility).toHaveBeenCalledTimes(1);
    act(() => animationCallback?.(10_000));
    expect(instance.step).toHaveBeenCalledTimes(1);
    act(() => animationCallback?.(10_016));
    expect(instance.step).toHaveBeenLastCalledWith(16);

    unmount();
    expect(TestResizeObserver.instances[0]!.disconnect).toHaveBeenCalled();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(removeListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('suspends release scheduling immediately when mounted in a hidden document', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    const instance = controller();

    render(
      <BoardCanvas
        controller={instance}
        geometry={createBoardGeometry()}
        summary={summary()}
        expectedPmf={Array(11).fill(1 / 11)}
        targetBallCount={100}
        overlayVisible={false}
      />,
    );

    expect(instance.suspendForPageVisibility).toHaveBeenCalledTimes(1);
    act(() => animationCallback?.(1_000));
    expect(instance.step).not.toHaveBeenCalled();
  });

  it('keeps one canvas lifecycle while rerenders feed the next frame its latest analysis values', () => {
    const instance = controller();
    instance.snapshot.mockReturnValue({
      ...snapshot(),
      status: 'complete',
      hopperCount: 0,
    });
    const geometry = createBoardGeometry();
    const initialSummary = summary();
    const latestSummary = { ...initialSummary, count: 1 };
    const latestExpectedPmf = [1, ...Array(10).fill(0)];
    const { rerender } = render(
      <BoardCanvas
        controller={instance}
        geometry={geometry}
        summary={initialSummary}
        expectedPmf={Array(11).fill(1 / 11)}
        targetBallCount={100}
        overlayVisible={false}
      />,
    );
    const scheduledFrame = animationCallback;

    rerender(
      <BoardCanvas
        controller={instance}
        geometry={geometry}
        summary={latestSummary}
        expectedPmf={latestExpectedPmf}
        targetBallCount={100}
        overlayVisible
      />,
    );

    expect(TestResizeObserver.instances).toHaveLength(1);
    expect(TestResizeObserver.instances[0]!.disconnect).not.toHaveBeenCalled();
    expect(window.cancelAnimationFrame).not.toHaveBeenCalled();
    expect(animationCallback).toBe(scheduledFrame);

    act(() => animationCallback?.(100));

    const firstBin = geometry.bins[0]!;
    expect(canvasContext.fillRect).toHaveBeenCalledWith(
      firstBin.left + 7,
      firstBin.bottom - 4.5,
      firstBin.right - firstBin.left - 14,
      4.5,
    );
  });

  it('draws three sleeping balls in one bin at their exact irregular Matter coordinates', () => {
    const positions = [
      { x: 286.25, y: 722.5 },
      { x: 302.75, y: 708.125 },
      { x: 293.5, y: 691.875 },
    ];
    const bodies = positions.map(({ x, y }, index) => {
      const body = Bodies.circle(x, y, BOARD.ballRadius, {
        label: 'ball',
        plugin: {
          galton: { tag: 'ball', ballId: index + 1, released: true, settled: true, targetBin: null },
        },
      });
      Sleeping.set(body, true);
      return body;
    });
    const instance = controller();
    instance.snapshot.mockReturnValue({
      ...snapshot(),
      status: 'complete',
      hopperCount: 0,
      settledBins: [4, 4, 4],
      ballBodies: bodies,
    });

    render(
      <BoardCanvas
        controller={instance}
        geometry={createBoardGeometry()}
        summary={{ ...summary(), count: 3 }}
        expectedPmf={Array(11).fill(1 / 11)}
        targetBallCount={3}
        overlayVisible={false}
      />,
    );

    act(() => animationCallback?.(100));

    const ballArcs = vi.mocked(canvasContext.arc).mock.calls
      .filter(([, , radius]) => radius === BOARD.ballRadius)
      .map(([x, y, radius]) => ({ x, y, radius }));
    expect(ballArcs).toEqual(positions.map((position) => ({ ...position, radius: BOARD.ballRadius })));
    expect(bodies.every(({ isSleeping }) => isSleeping)).toBe(true);
  });

  it('unsubscribes from controller updates on unmount', () => {
    const instance = controller();
    const unsubscribe = vi.fn();
    instance.subscribe.mockReturnValue(unsubscribe);
    const { unmount } = render(
      <BoardCanvas
        controller={instance}
        geometry={createBoardGeometry()}
        summary={summary()}
        expectedPmf={Array(11).fill(1 / 11)}
        targetBallCount={100}
        overlayVisible={false}
      />,
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('removes the reduced-motion media-query listener on unmount', () => {
    const removeEventListener = vi.fn();
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
    const { unmount } = render(
      <BoardCanvas
        controller={controller()}
        geometry={createBoardGeometry()}
        summary={summary()}
        expectedPmf={Array(11).fill(1 / 11)}
        targetBallCount={100}
        overlayVisible={false}
      />,
    );

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('forwards renderer failures to onError', () => {
    const error = new Error('canvas failed');
    const onError = vi.fn();
    vi.mocked(canvasContext.fillRect).mockImplementationOnce(() => { throw error; });
    render(
      <BoardCanvas
        controller={controller()}
        geometry={createBoardGeometry()}
        summary={summary()}
        expectedPmf={Array(11).fill(1 / 11)}
        targetBallCount={100}
        overlayVisible={false}
        onError={onError}
      />,
    );

    act(() => animationCallback?.(100));

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('reports an unavailable 2D canvas context instead of leaving a blank board', () => {
    const onError = vi.fn();
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValueOnce(null);

    render(
      <BoardCanvas
        controller={controller()}
        geometry={createBoardGeometry()}
        summary={summary()}
        expectedPmf={Array(11).fill(1 / 11)}
        targetBallCount={100}
        overlayVisible={false}
        onError={onError}
      />,
    );

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'A 2D canvas context is unavailable in this browser.',
    }));
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });
});
