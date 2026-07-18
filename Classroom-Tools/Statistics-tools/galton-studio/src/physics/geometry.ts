import { BIN_COUNT } from '../model/types';
import type { RouteDirection } from '../model/allocation';

export interface Point {
  x: number;
  y: number;
}

export interface PegRow {
  row: number;
  pegs: readonly Point[];
}

export interface BinGeometry {
  index: number;
  left: number;
  right: number;
  centreX: number;
  top: number;
  bottom: number;
}

export interface FunnelGeometry {
  start: Point;
  end: Point;
  width: number;
}

export interface BoardGeometry {
  pegRows: readonly PegRow[];
  bins: readonly BinGeometry[];
  dividerXs: readonly number[];
  funnels: readonly FunnelGeometry[];
  floorY: number;
  leftRail: { centre: Point; width: number; height: number; angle: number };
  rightRail: { centre: Point; width: number; height: number; angle: number };
  hopper: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    throatX: number;
    leftWallEnd: Point;
    rightWallEnd: Point;
    wallThickness: number;
    throatClearance: number;
    gateClosedX: number;
    gateOpenX: number;
  };
}

export const BOARD = {
  width: 720,
  height: 800,
  ballRadius: 6.5,
  pegRadius: 5,
  pegTop: 185,
  pegRowGap: 43,
  pegGap: 52,
  binTop: 610,
  binBottom: 770,
  binWidth: 52,
  hopperTop: 8,
  hopperBottom: 150,
  hopperWidth: 400,
  hopperTravel: 96,
  dividerWidth: 8,
  floorHeight: 18,
  hopperWallThickness: 12,
  hopperThroatCentreGap: 38.1,
  gateHeight: 8,
  funnelTop: 592,
  funnelWidth: 5,
  funnelHalfSpan: 10,
} as const;

export function routeCorridorX(
  geometry: BoardGeometry,
  route: readonly RouteDirection[],
  targetBin: number,
  progress: number,
): number {
  const target = geometry.bins[targetBin];
  if (!target) throw new RangeError(`Target bin must be between 0 and ${BIN_COUNT - 1}`);
  const boundedProgress = Math.max(0, Math.min(1, progress));
  const decisionCount = BIN_COUNT - 1;
  const routeProgress = Math.min(
    decisionCount,
    boundedProgress * decisionCount + 1.5 * Math.sin(Math.PI * boundedProgress),
  );
  const completeDecisions = Math.min(decisionCount, Math.floor(routeProgress));
  let latticeX = BOARD.width / 2;
  for (let row = 0; row < completeDecisions; row += 1) {
    latticeX += (route[row] ?? 0) * BOARD.pegGap / 2;
  }
  if (completeDecisions < decisionCount) {
    latticeX += (route[completeDecisions] ?? 0)
      * BOARD.pegGap / 2
      * (routeProgress - completeDecisions);
  }
  const routeEndX = route.slice(0, decisionCount).reduce(
    (x, direction) => x + direction * BOARD.pegGap / 2,
    BOARD.width / 2,
  );
  const hopperOffset = geometry.hopper.throatX - BOARD.width / 2;
  const hopperBlend = Math.max(0, 1 - boundedProgress / 0.25);
  return latticeX
    + (target.centreX - routeEndX) * boundedProgress
    + hopperOffset * hopperBlend;
}

function frozenPoint(x: number, y: number): Point {
  return Object.freeze({ x, y });
}

function createPegRows(): readonly PegRow[] {
  return Object.freeze(Array.from({ length: 10 }, (_, row) => {
    const pegs = Object.freeze(Array.from({ length: row + 1 }, (_, column) => (
      frozenPoint(
        BOARD.width / 2 + (column - row / 2) * BOARD.pegGap,
        BOARD.pegTop + row * BOARD.pegRowGap,
      )
    )));

    return Object.freeze({ row, pegs });
  }));
}

function createBins(): readonly BinGeometry[] {
  const leftmost = BOARD.width / 2 - (BIN_COUNT * BOARD.binWidth) / 2;

  return Object.freeze(Array.from({ length: BIN_COUNT }, (_, index) => {
    const left = leftmost + index * BOARD.binWidth;
    return Object.freeze({
      index,
      left,
      right: left + BOARD.binWidth,
      centreX: left + BOARD.binWidth / 2,
      top: BOARD.binTop,
      bottom: BOARD.binBottom,
    });
  }));
}

function createFunnels(dividerXs: readonly number[]): readonly FunnelGeometry[] {
  return Object.freeze(dividerXs.slice(1, -1).flatMap((dividerX) => ([
    Object.freeze({
      start: frozenPoint(dividerX, BOARD.funnelTop),
      end: frozenPoint(dividerX - BOARD.funnelHalfSpan, BOARD.binTop),
      width: BOARD.funnelWidth,
    }),
    Object.freeze({
      start: frozenPoint(dividerX, BOARD.funnelTop),
      end: frozenPoint(dividerX + BOARD.funnelHalfSpan, BOARD.binTop),
      width: BOARD.funnelWidth,
    }),
  ])));
}

export function createBoardGeometry(hopperPosition = 0): BoardGeometry {
  const bins = createBins();
  const dividerXs = Object.freeze([
    ...bins.map(({ left }) => left),
    bins.at(-1)?.right ?? BOARD.width / 2,
  ]);
  const funnels = createFunnels(dividerXs);
  const railHeight = 540;
  const boundedHopperPosition = Math.max(-1, Math.min(1, hopperPosition));
  const hopperOffset = boundedHopperPosition * BOARD.hopperTravel;
  const hopperLeft = BOARD.width / 2 - BOARD.hopperWidth / 2 + hopperOffset;
  const hopperRight = BOARD.width / 2 + BOARD.hopperWidth / 2 + hopperOffset;
  const throatX = BOARD.width / 2 + hopperOffset;
  const throatCentreOffset = BOARD.hopperThroatCentreGap / 2;
  const leftWallEnd = frozenPoint(throatX - throatCentreOffset, BOARD.hopperBottom);
  const rightWallEnd = frozenPoint(throatX + throatCentreOffset, BOARD.hopperBottom);
  const wallThickness = BOARD.hopperWallThickness;
  const throatClearance = rightWallEnd.x - leftWallEnd.x - wallThickness;

  return Object.freeze({
    pegRows: createPegRows(),
    bins,
    dividerXs,
    funnels,
    floorY: BOARD.binBottom + 14,
    leftRail: Object.freeze({
      centre: frozenPoint(62, 415),
      width: 14,
      height: railHeight,
      angle: 0.16,
    }),
    rightRail: Object.freeze({
      centre: frozenPoint(BOARD.width - 62, 415),
      width: 14,
      height: railHeight,
      angle: -0.16,
    }),
    hopper: Object.freeze({
      left: hopperLeft,
      right: hopperRight,
      top: BOARD.hopperTop,
      bottom: BOARD.hopperBottom,
      throatX,
      leftWallEnd,
      rightWallEnd,
      wallThickness,
      throatClearance,
      gateClosedX: throatX,
      gateOpenX: throatX + BOARD.hopperThroatCentreGap + 8,
    }),
  });
}
