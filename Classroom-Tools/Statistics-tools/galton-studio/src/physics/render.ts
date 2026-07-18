import type { Body } from 'matter-js';
import type { DescriptiveSummary } from '../model/types';
import type { GaltonSnapshot } from './controller';
import { BOARD, type BinGeometry, type BoardGeometry } from './geometry';

const PAPER = '#edf6fa';
const INK = '#18364b';
const SECONDARY_INK = '#5e7687';
const THEORETICAL_RED = '#cf3038';
const OBSERVED_BAR = 'rgba(18, 89, 166, 0.18)';
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
  ctx.beginPath();
  for (let x = 0.5; x <= BOARD.width; x += 24) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BOARD.height);
  }
  for (let y = 0.5; y <= BOARD.height; y += 24) {
    ctx.moveTo(0, y);
    ctx.lineTo(BOARD.width, y);
  }
  ctx.strokeStyle = 'rgba(77, 130, 154, 0.075)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawAcrylicPanel(ctx: CanvasRenderingContext2D): void {
  const panel = ctx.createLinearGradient(18, 0, BOARD.width - 18, BOARD.height);
  panel.addColorStop(0, 'rgba(255, 255, 255, 0.68)');
  panel.addColorStop(0.52, 'rgba(255, 255, 255, 0.3)');
  panel.addColorStop(1, 'rgba(218, 236, 244, 0.36)');
  ctx.fillStyle = panel;
  ctx.fillRect(18, 4, BOARD.width - 36, BOARD.height - 10);
  ctx.strokeStyle = 'rgba(104, 138, 153, 0.48)';
  ctx.lineWidth = 1;
  ctx.strokeRect(18.5, 4.5, BOARD.width - 37, BOARD.height - 11);
}

function drawMetalPath(ctx: CanvasRenderingContext2D): void {
  const metal = ctx.createLinearGradient(0, -8, 0, 8);
  metal.addColorStop(0, '#f8fdff');
  metal.addColorStop(0.42, '#c4d2d8');
  metal.addColorStop(1, '#627681');
  ctx.fillStyle = metal;
  ctx.fill();
  ctx.strokeStyle = '#526b78';
  ctx.lineWidth = 1;
  ctx.stroke();
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
  const wall = ctx.createLinearGradient(hopper.left, 0, hopper.right, 0);
  wall.addColorStop(0, '#6b7e88');
  wall.addColorStop(0.28, '#eef7fa');
  wall.addColorStop(0.72, '#c1d0d6');
  wall.addColorStop(1, '#5e717b');
  ctx.strokeStyle = wall;
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.moveTo(hopper.left + 4, hopper.top + 1);
  ctx.lineTo(hopper.leftWallEnd.x + 2, hopper.leftWallEnd.y - 3);
  ctx.moveTo(hopper.right - 4, hopper.top + 1);
  ctx.lineTo(hopper.rightWallEnd.x - 2, hopper.rightWallEnd.y - 3);
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
  drawMetalPath(ctx);
  ctx.restore();
}

export function drawFunnels(ctx: CanvasRenderingContext2D, geometry: BoardGeometry): void {
  ctx.save();
  ctx.lineCap = 'round';
  geometry.funnels.forEach(({ start, end, width }) => {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = '#617985';
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(start.x - 0.8, start.y + 0.5);
    ctx.lineTo(end.x - 0.8, end.y - 0.5);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
  ctx.restore();
}

function drawRail(ctx: CanvasRenderingContext2D, rail: BoardGeometry['leftRail']): void {
  ctx.save();
  ctx.translate(rail.centre.x, rail.centre.y);
  ctx.rotate(rail.angle);
  const gradient = ctx.createLinearGradient(-rail.width / 2, 0, rail.width / 2, 0);
  gradient.addColorStop(0, '#637984');
  gradient.addColorStop(0.3, '#f7fcfe');
  gradient.addColorStop(0.62, '#bdcdd4');
  gradient.addColorStop(1, '#536a75');
  ctx.fillStyle = gradient;
  ctx.fillRect(-rail.width / 2, -rail.height / 2, rail.width, rail.height);
  ctx.strokeStyle = 'rgba(48, 77, 91, 0.66)';
  ctx.strokeRect(-rail.width / 2, -rail.height / 2, rail.width, rail.height);
  ctx.restore();
}

export function drawRails(ctx: CanvasRenderingContext2D, geometry: BoardGeometry): void {
  drawRail(ctx, geometry.leftRail);
  drawRail(ctx, geometry.rightRail);
}

export function drawPeg(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const gradient = ctx.createRadialGradient(x - 1.8, y - 2.1, 0.5, x, y, BOARD.pegRadius);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.34, '#dbe7eb');
  gradient.addColorStop(0.72, '#91a5ae');
  gradient.addColorStop(1, '#4d636e');
  ctx.beginPath();
  ctx.arc(x, y, BOARD.pegRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = 'rgba(55, 78, 88, 0.74)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

export function drawBin(ctx: CanvasRenderingContext2D, bin: BinGeometry): void {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(bin.left, bin.top, bin.right - bin.left, bin.bottom - bin.top);
}

function drawDivider(ctx: CanvasRenderingContext2D, x: number): void {
  ctx.beginPath();
  ctx.moveTo(x, BOARD.binTop);
  ctx.lineTo(x, BOARD.binBottom);
  ctx.strokeStyle = '#78909c';
  ctx.lineWidth = BOARD.dividerWidth;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - BOARD.dividerWidth / 2 + 1, BOARD.binTop);
  ctx.lineTo(x - BOARD.dividerWidth / 2 + 1, BOARD.binBottom);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawCollectionFloor(ctx: CanvasRenderingContext2D, geometry: BoardGeometry): void {
  const left = geometry.dividerXs[0] ?? 0;
  const right = geometry.dividerXs.at(-1) ?? BOARD.width;
  const top = geometry.floorY - BOARD.floorHeight / 2;
  const floor = ctx.createLinearGradient(0, top, 0, top + BOARD.floorHeight);
  floor.addColorStop(0, '#f7fcfe');
  floor.addColorStop(0.32, '#cbd9df');
  floor.addColorStop(1, '#607681');
  ctx.fillStyle = floor;
  ctx.fillRect(left, top, right - left, BOARD.floorHeight);
  ctx.strokeStyle = 'rgba(61, 86, 97, 0.74)';
  ctx.lineWidth = 1;
  ctx.strokeRect(left + 0.5, top + 0.5, right - left - 1, BOARD.floorHeight - 1);
}

export function drawBall(ctx: CanvasRenderingContext2D, body: Body, radius: number): void {
  const { x, y } = body.position;
  const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.4, 1, x, y, radius);
  gradient.addColorStop(0, '#ecfeff');
  gradient.addColorStop(0.22, '#55c7d4');
  gradient.addColorStop(1, '#0876a3');
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = 'rgba(4, 84, 118, 0.68)';
  ctx.lineWidth = 0.75;
  ctx.stroke();
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
    ctx.strokeStyle = 'rgba(18, 89, 166, 0.68)';
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
  ctx.strokeStyle = THEORETICAL_RED;
  ctx.lineWidth = 2.25;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawFaceHighlights(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.74)';
  ctx.lineWidth = 1;
  ctx.strokeRect(22.5, 8.5, BOARD.width - 45, BOARD.height - 19);
  ctx.beginPath();
  ctx.moveTo(30, 17);
  ctx.lineTo(30, BOARD.height - 24);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.stroke();
}

export function drawMountingScrews(ctx: CanvasRenderingContext2D): void {
  const positions = [
    { x: 34, y: 20 },
    { x: BOARD.width - 34, y: 20 },
    { x: 34, y: BOARD.height - 20 },
    { x: BOARD.width - 34, y: BOARD.height - 20 },
  ];
  positions.forEach(({ x, y }) => {
    const metal = ctx.createRadialGradient(x - 1.2, y - 1.4, 0.4, x, y, 4);
    metal.addColorStop(0, '#ffffff');
    metal.addColorStop(0.45, '#cbd8dd');
    metal.addColorStop(1, '#657b85');
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = metal;
    ctx.fill();
    ctx.strokeStyle = 'rgba(54, 78, 89, 0.72)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 2, y);
    ctx.lineTo(x + 2, y);
    ctx.strokeStyle = 'rgba(70, 92, 102, 0.78)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  });
}

function drawLabels(ctx: CanvasRenderingContext2D, overlayAllowed: boolean, overlayOpacity: number): void {
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText('Observed balls', 74, BOARD.binTop - 14);
  if (overlayAllowed) {
    const previousAlpha = ctx.globalAlpha;
    ctx.globalAlpha = previousAlpha * overlayOpacity;
    ctx.textAlign = 'right';
    ctx.fillStyle = THEORETICAL_RED;
    ctx.fillText('Theoretical model', BOARD.width - 74, BOARD.binTop - 14);
    ctx.globalAlpha = previousAlpha;
  } else {
    ctx.textAlign = 'right';
    ctx.fillStyle = SECONDARY_INK;
    ctx.fillText('Analysis appears after completion', BOARD.width - 74, BOARD.binTop - 14);
  }
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
  drawFaceHighlights(context);
  drawMountingScrews(context);

  if (overlayAllowed) {
    const previousAlpha = context.globalAlpha;
    context.globalAlpha = previousAlpha * overlayOpacity;
    drawTheoreticalCurve(context, geometry, frame.expectedPmf, frame.summary.count);
    context.globalAlpha = previousAlpha;
  }

  drawLabels(context, overlayAllowed, overlayOpacity);
  context.restore();
}
