import { describe, expect, it } from 'vitest';
import { BIN_COUNT } from '../model/types';
import { BOARD, createBoardGeometry } from './geometry';

describe('createBoardGeometry', () => {
  it('defines the 720-by-800 apparatus and its ten triangular peg rows', () => {
    const geometry = createBoardGeometry();

    expect(BOARD.width).toBe(720);
    expect(BOARD.height).toBe(800);
    expect(geometry.pegRows).toHaveLength(10);
    expect(geometry.pegRows.map(({ pegs }) => pegs.length)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(geometry.pegRows.flatMap(({ pegs }) => pegs)).toHaveLength(55);
  });

  it('centres eleven evenly spaced bins within the floor span', () => {
    const geometry = createBoardGeometry();
    const floorLeft = geometry.dividerXs[0] ?? 0;
    const floorRight = geometry.dividerXs.at(-1) ?? 0;
    const centres = geometry.bins.map(({ centreX }) => centreX);

    expect(geometry.bins).toHaveLength(BIN_COUNT);
    expect(geometry.dividerXs).toHaveLength(BIN_COUNT + 1);
    expect(centres.every((centre) => centre > floorLeft && centre < floorRight)).toBe(true);
    expect(centres.slice(1).map((centre, index) => centre - (centres[index] ?? 0)))
      .toEqual(Array(BIN_COUNT - 1).fill(BOARD.binWidth));
  });

  it('models the reservoir with a centred passable throat using immutable collections', () => {
    const geometry = createBoardGeometry();

    expect(geometry.hopper.right - geometry.hopper.left).toBe(BOARD.hopperWidth);
    expect(geometry.hopper.throatX).toBe(BOARD.width / 2);
    expect(geometry.hopper.bottom - geometry.hopper.top).toBe(BOARD.hopperBottom - BOARD.hopperTop);
    expect(Object.isFrozen(geometry.pegRows)).toBe(true);
    expect(Object.isFrozen(geometry.bins)).toBe(true);
    expect(Object.isFrozen(geometry.dividerXs)).toBe(true);
  });

  it('records the clear aperture between the rounded hopper end caps', () => {
    const { hopper } = createBoardGeometry();
    const capClearance = hopper.rightWallEnd.x - hopper.leftWallEnd.x - hopper.wallThickness;

    expect(hopper.rightWallEnd.x - hopper.leftWallEnd.x).toBeCloseTo(BOARD.hopperThroatCentreGap, 10);
    expect(hopper.throatClearance).toBeCloseTo(capClearance, 10);
  });

  it('keeps the enlarged physical reservoir inside the board and clear of the first peg', () => {
    const { hopper, pegRows } = createBoardGeometry();
    const nominalArea = (
      (hopper.right - hopper.left)
      + (hopper.rightWallEnd.x - hopper.leftWallEnd.x)
    ) / 2 * (hopper.bottom - hopper.top);
    const batchDiscArea = 100 * Math.PI * BOARD.ballRadius ** 2;

    expect(hopper.left).toBeGreaterThan(0);
    expect(hopper.right).toBeLessThan(BOARD.width);
    expect(hopper.top).toBeGreaterThanOrEqual(0);
    expect(hopper.bottom + BOARD.ballRadius * 2).toBeLessThan(pegRows[0]!.pegs[0]!.y);
    expect(nominalArea).toBeGreaterThan(batchDiscArea / 0.65);
  });

  it('moves only the physical hopper and release point across its bounded travel', () => {
    const left = createBoardGeometry(-1);
    const centre = createBoardGeometry(0);
    const right = createBoardGeometry(1);

    expect(left.hopper.throatX).toBe(centre.hopper.throatX - BOARD.hopperTravel);
    expect(right.hopper.throatX).toBe(centre.hopper.throatX + BOARD.hopperTravel);
    expect(left.hopper.left).toBeGreaterThan(18);
    expect(right.hopper.right).toBeLessThan(BOARD.width - 18);
    expect(left.pegRows).toEqual(centre.pegRows);
    expect(right.bins).toEqual(centre.bins);
  });

  it('defines paired physical funnel guides above each internal bin divider', () => {
    const geometry = createBoardGeometry();

    expect(geometry.funnels).toHaveLength((BIN_COUNT - 1) * 2);
    geometry.dividerXs.slice(1, -1).forEach((dividerX, index) => {
      const pair = geometry.funnels.slice(index * 2, index * 2 + 2);
      expect(pair.map(({ start }) => start)).toEqual([
        { x: dividerX, y: BOARD.funnelTop },
        { x: dividerX, y: BOARD.funnelTop },
      ]);
      expect(pair[0]!.end.x).toBeLessThan(dividerX);
      expect(pair[1]!.end.x).toBeGreaterThan(dividerX);
      expect(pair.every(({ end }) => end.y === BOARD.binTop)).toBe(true);
    });
  });
});
