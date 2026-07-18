import type { Body } from 'matter-js';
import type { DescriptiveSummary } from '../model/types';
import type { GaltonSnapshot } from './controller';
import { BOARD, type BinGeometry, type BoardGeometry } from './geometry';

const PAPER = '#fbfaf6';
const THEORETICAL_ORANGE = '#f68620';
const OBSERVED_BAR = 'rgba(246, 134, 32, 0.12)';
const APPARATUS = '#8d93a2';
const BIN_HEIGHT = BOARD.binBottom - BOARD.binTop;
const CHART_HEIGHT = BIN_HEIGHT - 24;
const EXPECTED_FREQUENCY_SCALE = 4.5;

export interface RenderFrame {
  geometry: BoardGeometry;
  snapshot: GaltonSnapshot;
  summary: DescriptiveSummary;
  expectedPmf: readonly number[];
  overlayVisible: boolean;
  reducedMotion: boolean;
  overlayProgress: number;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function drawGraphPaper(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, BOARD.width, BOARD.height);
}

export function drawAcrylicPanel(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
  ctx.fillRect(18, 4, BOARD.width - 36, BOARD.height - 10);
  ctx.strokeStyle = 'rgba(167, 171, 185, 0.46)';
  ctx.lineWidth = 1;
  ctx.strokeRect(18.5, 4.5, BOARD.width - 37, BOARD.height - 11);
}

function drawFlatPath(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = APPARATUS;
  ctx.fill();
}

export function drawHopper(ctx: CanvasRenderingContext2D, geometry: BoardGeometry): void {
  const { hopper } = geometry;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = hopper.wallThickness;
  ctx.beginPath();
  ctx.moveTo(hopper.left, hopper.top);
  ctx.lineTo(hopper.leftWallEnd.x, hopper.leftWallEnd.y);
  ctx.moveTo(hopper.right, hopper.top);
  ctx.lineTo(hopper.rightWallEnd.x, hopper.rightWallEnd.y);
  ctx.strokeStyle = APPARATUS;
  ctx.stroke();
  ctx.restore();
}

export function drawGate(
  ctx: CanvasRenderingContext2D,
  geometry: BoardGeometry,
  position = { x: geometry.hopper.gateClosedX, y: geometry.hopper.bottom },
): void {
  const width = geometry.hopper.rightWallEnd.x - geometry.hopper.leftWallEnd.x;
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.beginPath();
  ctx.rect(-width / 2, -BOARD.gateHeight / 2, width, BOARD.gateHeight);
  drawFlatPath(ctx);
  ctx.restore();
}

export function drawFunnels(ctx: CanvasRenderingContext2D, geometry: BoardGeometry): void {
  ctx.save();
  ctx.lineCap = 'round';
  geometry.funnels.forEach(({ start, end, width }) => {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = APPARATUS;
    ctx.lineWidth = width;
    ctx.stroke();
  });
  ctx.restore();
}

function drawRail(ctx: CanvasRenderingContext2D, rail: BoardGeometry['leftRail']): void {
  ctx.save();
  ctx.translate(rail.centre.x, rail.centre.y);
  ctx.rotate(rail.angle);
  ctx.fillStyle = APPARATUS;
  ctx.fillRect(-rail.width / 2, -rail.height / 2, rail.width, rail.height);
  ctx.restore();
}

export function drawRails(ctx: CanvasRenderingContext2D, geometry: BoardGeometry): void {
  drawRail(ctx, geometry.leftRail);
  drawRail(ctx, geometry.rightRail);
}

export function drawPeg(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, BOARD.pegRadius, 0, Math.PI * 2);
  ctx.fillStyle = APPARATUS;
  ctx.fill();
}

export function drawBin(ctx: CanvasRenderingContext2D, bin: BinGeometry): void {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(bin.left, bin.top, bin.right - bin.left, bin.bottom - bin.top);
}

function drawDivider(ctx: CanvasRenderingContext2D, x: number): void {
  ctx.beginPath();
  ctx.moveTo(x, BOARD.binTop);
  ctx.lineTo(x, BOARD.binBottom);
  ctx.strokeStyle = APPARATUS;
  ctx.lineWidth = BOARD.dividerWidth;
  ctx.stroke();
}

export function drawCollectionFloor(ctx: CanvasRenderingContext2D, geometry: BoardGeometry): void {
  const left = geometry.dividerXs[0] ?? 0;
  const right = geometry.dividerXs.at(-1) ?? BOARD.width;
  const top = geometry.floorY - BOARD.floorHeight / 2;
  ctx.fillStyle = APPARATUS;
  ctx.fillRect(left, top, right - left, BOARD.floorHeight);
}

export function drawBall(ctx: CanvasRenderingContext2D, body: Body, radius: number): void {
  const { x, y } = body.position;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#376fb7';
  ctx.fill();
}

function expectedHeights(expectedPmf: readonly number[], settledCount: number): number[] {
  const frequencies = expectedPmf.map((probability) => Math.max(0, probability) * settledCount);
  return frequencies.map((frequency) => Math.min(CHART_HEIGHT, frequency * EXPECTED_FREQUENCY_SCALE));
}

export function drawExpectedBars(
  ctx: CanvasRenderingContext2D,
  geometry: BoardGeometry,
  expectedPmf: readonly number[],
  settledCount: number,
): void {
  const heights = expectedHeights(expectedPmf, settledCount);
  geometry.bins.forEach((bin, index) => {
    const height = heights[index] ?? 0;
    const x = bin.left + 7;
    const width = bin.right - bin.left - 14;
    const y = bin.bottom - height;
    ctx.fillStyle = OBSERVED_BAR;
    ctx.fillRect(x, y, width, height);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(246, 134, 32, 0.72)';
    ctx.lineWidth = 1.25;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, Math.max(0, height - 1));
  });
  ctx.setLineDash([]);
}

interface CurvePoint {
  x: number;
  y: number;
}

function monotoneTangents(points: readonly CurvePoint[]): number[] {
  const slopes = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1]!;
    return (next.y - point.y) / (next.x - point.x);
  });
  return points.map((_, index) => {
    if (index === 0) return slopes[0] ?? 0;
    if (index === points.length - 1) return slopes.at(-1) ?? 0;
    const before = slopes[index - 1]!;
    const after = slopes[index]!;
    if (before === 0 || after === 0 || Math.sign(before) !== Math.sign(after)) return 0;
    return (2 * before * after) / (before + after);
  });
}

export function drawTheoreticalCurve(
  ctx: CanvasRenderingContext2D,
  geometry: BoardGeometry,
  expectedPmf: readonly number[],
  settledCount: number,
): void {
  const heights = expectedHeights(expectedPmf, settledCount);
  const points = geometry.bins.map((bin, index) => ({
    x: bin.centreX,
    y: bin.bottom - (heights[index] ?? 0),
  }));
  if (points.length < 2) return;
  const tangents = monotoneTangents(points);
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let index = 0; index < points.length - 1; index += 1) {
    const point = points[index]!;
    const next = points[index + 1]!;
    const width = next.x - point.x;
    ctx.bezierCurveTo(
      point.x + width / 3,
      point.y + tangents[index]! * width / 3,
      next.x - width / 3,
      next.y - tangents[index + 1]! * width / 3,
      next.x,
      next.y,
    );
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = THEORETICAL_ORANGE;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

export function renderBoard(context: CanvasRenderingContext2D, frame: RenderFrame): void {
  const geometry = frame.snapshot.apparatusGeometry ?? frame.geometry;
  const overlayAllowed = frame.snapshot.status === 'complete' && frame.overlayVisible;
  const overlayOpacity = frame.reducedMotion ? 1 : clampUnit(frame.overlayProgress);

  context.save();
  drawGraphPaper(context);
  drawAcrylicPanel(context);

  if (overlayAllowed) {
    const previousAlpha = context.globalAlpha;
    context.globalAlpha = previousAlpha * overlayOpacity;
    drawExpectedBars(context, geometry, frame.expectedPmf, frame.summary.count);
    context.globalAlpha = previousAlpha;
  }

  drawRails(context, geometry);
  drawHopper(context, geometry);
  drawGate(context, geometry, frame.snapshot.gatePosition);
  geometry.pegRows.forEach(({ pegs }) => pegs.forEach(({ x, y }) => drawPeg(context, x, y)));
  drawFunnels(context, geometry);
  geometry.bins.forEach((bin) => drawBin(context, bin));
  geometry.dividerXs.forEach((x) => drawDivider(context, x));
  drawCollectionFloor(context, geometry);
  frame.snapshot.ballBodies.forEach((body) => drawBall(context, body, body.circleRadius ?? BOARD.ballRadius));

  if (overlayAllowed) {
    const previousAlpha = context.globalAlpha;
    context.globalAlpha = previousAlpha * overlayOpacity;
    drawTheoreticalCurve(context, geometry, frame.expectedPmf, frame.summary.count);
    context.globalAlpha = previousAlpha;
  }

  context.restore();
}
