import { Bodies } from 'matter-js';
import { describe, expect, it, vi } from 'vitest';
import type { DescriptiveSummary, RunStatus } from '../model/types';
import type { GaltonSnapshot } from './controller';
import { BOARD, createBoardGeometry } from './geometry';
import { drawExpectedBars, drawTheoreticalCurve, renderBoard, type RenderFrame } from './render';

interface RecordedCanvas {
  context: CanvasRenderingContext2D;
  arcs: Array<{ x: number; y: number; radius: number }>;
  fillRects: Array<{ x: number; y: number; width: number; height: number; fillStyle: string }>;
  strokes: Array<{ strokeStyle: string; dash: number[]; lineWidth: number }>;
  texts: Array<{ text: string; alpha: number }>;
  translations: Array<{ x: number; y: number }>;
}

function recordedCanvas(): RecordedCanvas {
  const arcs: RecordedCanvas['arcs'] = [];
  const fillRects: RecordedCanvas['fillRects'] = [];
  const strokes: RecordedCanvas['strokes'] = [];
  const texts: RecordedCanvas['texts'] = [];
  const translations: RecordedCanvas['translations'] = [];
  let fillStyle = '';
  let strokeStyle = '';
  let dash: number[] = [];
  let globalAlpha = 1;
  let lineWidth = 1;
  const gradient = { addColorStop: vi.fn() };
  const context = {
    canvas: { width: BOARD.width, height: BOARD.height },
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    arc: vi.fn((x: number, y: number, radius: number) => arcs.push({ x, y, radius })),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(() => strokes.push({ strokeStyle, dash: [...dash], lineWidth })),
    fillRect: vi.fn((x: number, y: number, width: number, height: number) => {
      fillRects.push({ x, y, width, height, fillStyle });
    }),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn((x: number, y: number) => translations.push({ x, y })),
    rotate: vi.fn(),
    setLineDash: vi.fn((value: number[]) => { dash = [...value]; }),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    fillText: vi.fn((text: string) => texts.push({ text, alpha: globalAlpha })),
    measureText: vi.fn(() => ({ width: 70 })),
    set fillStyle(value: string | CanvasGradient | CanvasPattern) { fillStyle = String(value); },
    get fillStyle() { return fillStyle; },
    set strokeStyle(value: string | CanvasGradient | CanvasPattern) { strokeStyle = String(value); },
    get strokeStyle() { return strokeStyle; },
    set globalAlpha(value: number) { globalAlpha = value; },
    get globalAlpha() { return globalAlpha; },
    set lineWidth(value: number) { lineWidth = value; },
    get lineWidth() { return lineWidth; },
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D;

  return { context, arcs, fillRects, strokes, texts, translations };
}

function summary(count = 2): DescriptiveSummary {
  return {
    count,
    mean: count ? 5 : null,
    variance: count ? 1 : null,
    standardDeviation: count ? 1 : null,
    skewness: count ? 0 : null,
    pearsonKurtosis: count ? 3 : null,
    bins: Array.from({ length: 11 }, (_, bin) => ({
      bin,
      count: bin === 5 ? count : 0,
      percentage: bin === 5 && count ? 100 : 0,
      zScore: count ? bin - 5 : null,
    })),
  };
}

function snapshot(status: RunStatus, positions = [{ x: 123, y: 234 }, { x: 456, y: 567 }]): GaltonSnapshot {
  return {
    status,
    hopperCount: status === 'ready' ? positions.length : 0,
    activeCount: status === 'running' ? positions.length : 0,
    settledBins: status === 'complete' ? [5, 5] : [],
    ballBodies: positions.map(({ x, y }, index) => Bodies.circle(x, y, BOARD.ballRadius, {
      label: 'ball',
      plugin: { galton: { tag: 'ball', ballId: index + 1 } },
    })),
    regimes: [],
    canRefill: false,
    recycledCount: 0,
    settlementDiagnostics: [],
  };
}

function frame(status: RunStatus, positions?: Array<{ x: number; y: number }>): RenderFrame {
  return {
    geometry: createBoardGeometry(),
    snapshot: snapshot(status, positions),
    summary: summary(),
    expectedPmf: [0.001, 0.01, 0.044, 0.117, 0.205, 0.246, 0.205, 0.117, 0.044, 0.01, 0.001],
    overlayVisible: true,
    reducedMotion: false,
    overlayProgress: 1,
  };
}

describe('renderBoard', () => {
  it('covers the complete logical board with a warm-white field at the start of every frame', () => {
    const canvas = recordedCanvas();

    renderBoard(canvas.context, frame('running'));

    expect(canvas.fillRects[0]).toEqual({
      x: 0,
      y: 0,
      width: BOARD.width,
      height: BOARD.height,
      fillStyle: '#fbfaf6',
    });
  });

  it('draws all 55 peg positions, 11 collection areas, and 12 divider lines', () => {
    const canvas = recordedCanvas();

    renderBoard(canvas.context, frame('ready'));

    expect(canvas.arcs.filter(({ radius }) => radius === BOARD.pegRadius)).toHaveLength(55);
    expect(canvas.fillRects.filter(({ height }) => height === BOARD.binBottom - BOARD.binTop)).toHaveLength(11);
    const dividerStrokes = canvas.strokes.filter(({ strokeStyle, lineWidth }) => (
      strokeStyle === '#8d93a2' && lineWidth === BOARD.dividerWidth
    ));
    expect(dividerStrokes).toHaveLength(12);
  });

  it('does not decorate the flat board with faux mounting screws', () => {
    const canvas = recordedCanvas();

    renderBoard(canvas.context, frame('ready'));

    expect(canvas.arcs.filter(({ radius }) => radius === 4)).toEqual([]);
  });

  it('draws every shared funnel segment and the gate at its actual physical position', () => {
    const canvas = recordedCanvas();
    const renderFrame = frame('running');
    const geometry = createBoardGeometry(0.5);
    renderFrame.geometry = geometry;
    renderFrame.snapshot = {
      ...renderFrame.snapshot,
      apparatusGeometry: geometry,
      gateOpen: true,
      gatePosition: { x: geometry.hopper.gateOpenX, y: geometry.hopper.bottom },
    };

    renderBoard(canvas.context, renderFrame);

    const funnelStrokes = canvas.strokes.filter(({ strokeStyle, lineWidth }) => (
      strokeStyle === '#8d93a2' && lineWidth === BOARD.funnelWidth
    ));
    expect(funnelStrokes).toHaveLength(geometry.funnels.length);
    expect(canvas.translations).toContainEqual({
      x: geometry.hopper.gateOpenX,
      y: geometry.hopper.bottom,
    });
  });

  it('draws the physical collection floor at the shared Matter geometry position', () => {
    const canvas = recordedCanvas();
    const geometry = createBoardGeometry();

    renderBoard(canvas.context, frame('ready'));

    expect(canvas.fillRects).toContainEqual(expect.objectContaining({
      x: geometry.dividerXs[0],
      y: geometry.floorY - BOARD.floorHeight / 2,
      width: geometry.dividerXs.at(-1)! - geometry.dividerXs[0]!,
      height: BOARD.floorHeight,
    }));
  });

  it('draws every ball exactly once at its actual Matter body position', () => {
    const positions = [{ x: 101.25, y: 210.5 }, { x: 618.75, y: 703.125 }];
    const canvas = recordedCanvas();

    renderBoard(canvas.context, frame('complete', positions));

    expect(canvas.arcs.filter(({ radius }) => radius === BOARD.ballRadius)).toEqual([
      { ...positions[0]!, radius: BOARD.ballRadius },
      { ...positions[1]!, radius: BOARD.ballRadius },
    ]);
  });

  it('does not synthesize settled ball positions from bin counts', () => {
    const canvas = recordedCanvas();
    const renderFrame = frame('complete', []);
    renderFrame.summary = summary(57);
    renderFrame.snapshot = { ...renderFrame.snapshot, settledBins: Array(57).fill(5) };

    renderBoard(canvas.context, renderFrame);

    expect(canvas.arcs.filter(({ radius }) => radius === BOARD.ballRadius)).toHaveLength(0);
  });

  it.each<RunStatus>(['ready', 'running', 'paused', 'settling'])('keeps analytical overlays hidden while status is %s', (status) => {
    const canvas = recordedCanvas();

    renderBoard(canvas.context, frame(status));

    expect(canvas.strokes.some(({ strokeStyle }) => strokeStyle === '#f68620')).toBe(false);
    expect(canvas.fillRects.some(({ fillStyle }) => fillStyle === 'rgba(246, 134, 32, 0.12)')).toBe(false);
  });

  it('draws expected-frequency bars and the orange curve only for a visible completed overlay', () => {
    const hidden = recordedCanvas();
    const visible = recordedCanvas();
    const hiddenFrame = frame('complete');
    hiddenFrame.overlayVisible = false;

    renderBoard(hidden.context, hiddenFrame);
    renderBoard(visible.context, frame('complete'));

    expect(hidden.strokes.some(({ strokeStyle }) => strokeStyle === '#f68620')).toBe(false);
    expect(visible.fillRects.filter(({ fillStyle }) => fillStyle === 'rgba(246, 134, 32, 0.12)')).toHaveLength(11);
    expect(visible.strokes.some(({ strokeStyle, dash }) => strokeStyle === '#f68620' && dash.length === 0)).toBe(true);
  });

  it('scales expected probability bars to the settled-ball frequency', () => {
    const twentySettled = recordedCanvas();
    const fortySettled = recordedCanvas();
    const geometry = createBoardGeometry();
    const pmf = Array(11).fill(0.05);

    drawExpectedBars(twentySettled.context, geometry, pmf, 20);
    drawExpectedBars(fortySettled.context, geometry, pmf, 40);

    expect(fortySettled.fillRects[0]!.height).toBeCloseTo(twentySettled.fillRects[0]!.height * 2);
  });

  it('keeps explanatory labels outside the board so they cannot overlap the apparatus', () => {
    const canvas = recordedCanvas();

    renderBoard(canvas.context, frame('complete'));

    expect(canvas.texts).toEqual([]);
  });

  it('uses monotone cubic controls through bin centres with the exact theoretical stroke', () => {
    const canvas = recordedCanvas();
    const geometry = createBoardGeometry();
    const increasingPmf = Array.from({ length: 11 }, (_, index) => index / 100);

    drawTheoreticalCurve(canvas.context, geometry, increasingPmf, 100);

    const move = vi.mocked(canvas.context.moveTo).mock.calls[0]!;
    expect(move).toEqual([geometry.bins[0]!.centreX, geometry.bins[0]!.bottom]);
    const curves = vi.mocked(canvas.context.bezierCurveTo).mock.calls;
    expect(curves).toHaveLength(10);
    curves.forEach(([control1X, control1Y, control2X, control2Y, endX, endY], index) => {
      const start = geometry.bins[index]!;
      const end = geometry.bins[index + 1]!;
      const startY = start.bottom - increasingPmf[index]! * 100 * 4.5;
      const expectedEndY = end.bottom - increasingPmf[index + 1]! * 100 * 4.5;
      expect(control1X).toBeGreaterThan(start.centreX);
      expect(control2X).toBeGreaterThanOrEqual(control1X);
      expect(control2X).toBeLessThan(end.centreX);
      expect(endX).toBe(end.centreX);
      expect(control1Y).toBeLessThanOrEqual(startY);
      expect(control1Y).toBeGreaterThanOrEqual(expectedEndY);
      expect(control2Y).toBeLessThanOrEqual(startY);
      expect(control2Y).toBeGreaterThanOrEqual(expectedEndY);
      expect(endY).toBe(expectedEndY);
    });
    expect(canvas.strokes.at(-1)).toMatchObject({ strokeStyle: '#f68620', lineWidth: 3, dash: [] });
  });
});
