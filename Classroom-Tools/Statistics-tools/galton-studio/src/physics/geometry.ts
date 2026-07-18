import { BIN_COUNT } from '../model/types';

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
