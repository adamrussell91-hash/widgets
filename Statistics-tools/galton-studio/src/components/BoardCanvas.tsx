import { useEffect, useReducer, useRef } from 'react';
import type { DescriptiveSummary } from '../model/types';
import type { GaltonController } from '../physics/controller';
import type { BoardGeometry } from '../physics/geometry';
import { BOARD } from '../physics/geometry';
import { renderBoard } from '../physics/render';

const OVERLAY_DURATION_MS = 220;

type BoardController = Pick<
  GaltonController,
  | 'snapshot'
  | 'subscribe'
  | 'step'
  | 'suspendForPageVisibility'
  | 'restoreAfterPageVisibility'
>;

export interface BoardCanvasProps {
  controller: BoardController;
  geometry: BoardGeometry;
  summary: DescriptiveSummary;
  expectedPmf: readonly number[];
  targetBallCount: number;
  overlayVisible: boolean;
  className?: string;
  onError?: (error: unknown) => void;
}

function useReducedMotion(): boolean {
  const queryRef = useRef<MediaQueryList | null>(null);
  if (queryRef.current === null && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    queryRef.current = window.matchMedia('(prefers-reduced-motion: reduce)');
  }
  const [, refresh] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    const query = queryRef.current;
    if (!query) return undefined;
    const onChange = () => refresh();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return queryRef.current?.matches ?? false;
}

function visuallyHiddenStyle(): React.CSSProperties {
  return {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  };
}

export function BoardCanvas({
  controller,
  geometry,
  summary,
  expectedPmf,
  targetBallCount,
  overlayVisible,
  className,
  onError,
}: BoardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const [, refreshSummary] = useReducer((value: number) => value + 1, 0);
  const latestFrameRef = useRef({ geometry, summary, expectedPmf, overlayVisible, reducedMotion, onError });
  latestFrameRef.current = { geometry, summary, expectedPmf, overlayVisible, reducedMotion, onError };

  useEffect(() => controller.subscribe(refreshSummary), [controller]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) {
      latestFrameRef.current.onError?.(new Error('A 2D canvas context is unavailable in this browser.'));
      return undefined;
    }

    let cssWidth: number = BOARD.width;
    let cssHeight: number = BOARD.height;
    let animationFrame = 0;
    let lastTimestamp: number | null = null;
    let overlayStartedAt: number | null = null;
    let hidden = document.hidden;

    if (hidden) controller.suspendForPageVisibility();

    const resizeCanvas = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
      const scale = Math.min(cssWidth / BOARD.width, cssHeight / BOARD.height);
      const offsetX = (cssWidth - BOARD.width * scale) / 2;
      const offsetY = (cssHeight - BOARD.height * scale) / 2;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(dpr * scale, 0, 0, dpr * scale, offsetX * dpr, offsetY * dpr);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return;
      cssWidth = entry.contentRect.width;
      cssHeight = entry.contentRect.height;
      resizeCanvas();
    });
    resizeObserver.observe(canvas);
    resizeCanvas();

    const onVisibilityChange = () => {
      const nextHidden = document.hidden;
      if (nextHidden === hidden) return;
      hidden = nextHidden;
      lastTimestamp = null;
      if (hidden) controller.suspendForPageVisibility();
      else controller.restoreAfterPageVisibility();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const animate = (timestamp: number) => {
      try {
        if (!hidden) {
          if (lastTimestamp !== null) controller.step(Math.max(0, timestamp - lastTimestamp));
          lastTimestamp = timestamp;
          const snapshot = controller.snapshot();
          const frame = latestFrameRef.current;
          const showOverlay = snapshot.status === 'complete' && frame.overlayVisible;
          if (showOverlay && overlayStartedAt === null) overlayStartedAt = timestamp;
          if (!showOverlay) overlayStartedAt = null;
          const overlayProgress = frame.reducedMotion
            ? 1
            : overlayStartedAt === null
              ? 0
              : Math.min(1, (timestamp - overlayStartedAt) / OVERLAY_DURATION_MS);

          const dpr = Math.max(1, window.devicePixelRatio || 1);
          const backingWidth = Math.max(1, Math.round(cssWidth * dpr));
          const backingHeight = Math.max(1, Math.round(cssHeight * dpr));
          if (canvas.width !== backingWidth || canvas.height !== backingHeight) resizeCanvas();
          context.setTransform(1, 0, 0, 1, 0, 0);
          const scale = Math.min(cssWidth / BOARD.width, cssHeight / BOARD.height);
          const offsetX = (cssWidth - BOARD.width * scale) / 2;
          const offsetY = (cssHeight - BOARD.height * scale) / 2;
          context.setTransform(dpr * scale, 0, 0, dpr * scale, offsetX * dpr, offsetY * dpr);
          renderBoard(context, {
            geometry: frame.geometry,
            snapshot,
            summary: frame.summary,
            expectedPmf: frame.expectedPmf,
            overlayVisible: frame.overlayVisible,
            reducedMotion: frame.reducedMotion,
            overlayProgress,
          });
        }
      } catch (error) {
        latestFrameRef.current.onError?.(error);
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => {
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [controller]);

  const textAlternative = `${summary.count} of ${targetBallCount} balls settled across ${geometry.bins.length} bins.`;

  return (
    <div className={className} style={{ position: 'relative', maxWidth: '100%' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Galton board. ${textAlternative}`}
        width={BOARD.width}
        height={BOARD.height}
        style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: `${BOARD.width} / ${BOARD.height}` }}
      />
      <span style={visuallyHiddenStyle()}>{textAlternative}</span>
    </div>
  );
}
