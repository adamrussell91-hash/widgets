import { describe, expect, it } from 'vitest';
import { BIN_COUNT, type ExperimentSettings } from '../model/types';
import { GaltonController } from './controller';
import { BOARD } from './geometry';
import { createPhysicsWorld } from './world';

const neutral: ExperimentSettings = {
  hopperPosition: 0,
  skew: 0,
  kurtosis: 3,
  releaseRate: 6,
  changeBehavior: 'keep',
};

function rectangleSideLengths(body: { vertices: { x: number; y: number }[] }): number[] {
  return body.vertices
    .map((vertex, index, vertices) => {
      const next = vertices[(index + 1) % vertices.length]!;
      return Math.hypot(next.x - vertex.x, next.y - vertex.y);
    })
    .sort((a, b) => a - b);
}

function expectRectangleDimensions(
  body: { vertices: { x: number; y: number }[] },
  width: number,
  height: number,
) {
  expect(rectangleSideLengths(body)).toEqual([
    expect.closeTo(Math.min(width, height), 8),
    expect.closeTo(Math.min(width, height), 8),
    expect.closeTo(Math.max(width, height), 8),
    expect.closeTo(Math.max(width, height), 8),
  ]);
}

describe('createPhysicsWorld', () => {
  it('creates the complete static apparatus with the expected body counts', () => {
    const physics = createPhysicsWorld();

    expect(physics.engine.enableSleeping).toBe(true);
    expect(physics.engine.gravity).toMatchObject({ y: 1, scale: 0.001 });
    expect(physics.bodies.pegs).toHaveLength(55);
    expect(physics.bodies.rails).toHaveLength(2);
    expect(physics.bodies.dividers).toHaveLength(BIN_COUNT + 1);
    expect(physics.bodies.funnels).toHaveLength((BIN_COUNT - 1) * 2);
    expect(physics.bodies.hopperWalls).toHaveLength(6);
    expect(physics.bodies.floor.isStatic).toBe(true);
    expect(physics.bodies.gate.isStatic).toBe(true);
  });

  it('labels every apparatus body with its Galton tag', () => {
    const physics = createPhysicsWorld();
    const bodies = [
      ...physics.bodies.pegs,
      ...physics.bodies.rails,
      ...physics.bodies.dividers,
      ...physics.bodies.funnels,
      physics.bodies.floor,
      ...physics.bodies.hopperWalls,
      physics.bodies.gate,
    ];

    expect(bodies).toHaveLength(55 + 2 + (BIN_COUNT + 1) + (BIN_COUNT - 1) * 2 + 1 + 6 + 1);
    for (const body of bodies) {
      expect(body.label).toBe(body.plugin.galton.tag);
      expect(body.plugin.galton.tag).toMatch(/^(peg|rail|divider|funnel|floor|hopper-wall|gate)$/);
    }
  });

  it('uses static Matter bodies for every part of the board', () => {
    const physics = createPhysicsWorld();
    const bodies = [
      ...physics.bodies.pegs,
      ...physics.bodies.rails,
      ...physics.bodies.dividers,
      ...physics.bodies.funnels,
      physics.bodies.floor,
      ...physics.bodies.hopperWalls,
      physics.bodies.gate,
    ];

    expect(bodies.every((body) => body.isStatic)).toBe(true);
  });

  it('maps pegs, dividers, rails, and floor directly from the shared geometry', () => {
    const physics = createPhysicsWorld();
    const pegPoints = physics.geometry.pegRows.flatMap(({ pegs }) => pegs);

    physics.bodies.pegs.forEach((peg, index) => {
      expect(peg.position).toMatchObject(pegPoints[index]);
      expect(peg.circleRadius).toBe(BOARD.pegRadius);
    });
    physics.bodies.dividers.forEach((divider, index) => {
      expect(divider.position).toMatchObject({
        x: physics.geometry.dividerXs[index],
        y: (BOARD.binTop + BOARD.binBottom) / 2,
      });
      expectRectangleDimensions(divider, BOARD.dividerWidth, BOARD.binBottom - BOARD.binTop);
    });
    [physics.geometry.leftRail, physics.geometry.rightRail].forEach((rail, index) => {
      const body = physics.bodies.rails[index]!;
      expect(body.position).toMatchObject(rail.centre);
      expect(body.angle).toBeCloseTo(rail.angle, 12);
      expectRectangleDimensions(body, rail.width, rail.height);
    });

    const floorLeft = physics.geometry.dividerXs[0]!;
    const floorRight = physics.geometry.dividerXs.at(-1)!;
    expect(physics.bodies.floor.position).toMatchObject({
      x: (floorLeft + floorRight) / 2,
      y: physics.geometry.floorY,
    });
    expectRectangleDimensions(physics.bodies.floor, floorRight - floorLeft, BOARD.floorHeight);
  });

  it('maps hopper wall endpoints and its gate from shared collision geometry', () => {
    const physics = createPhysicsWorld();
    const { hopper } = physics.geometry;
    const starts = [
      { x: hopper.left, y: hopper.top },
      { x: hopper.right, y: hopper.top },
    ];
    const ends = [hopper.leftWallEnd, hopper.rightWallEnd];

    const wallSegments = physics.bodies.hopperWalls.filter((body) => body.circleRadius === 0);
    const endCaps = physics.bodies.hopperWalls.filter((body) => body.circleRadius !== 0);
    wallSegments.forEach((wall, index) => {
      const start = starts[index]!;
      const end = ends[index]!;
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      expect(wall.position).toMatchObject({ x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 });
      expect(wall.angle).toBeCloseTo(Math.atan2(end.y - start.y, end.x - start.x), 12);
      expectRectangleDimensions(wall, length, hopper.wallThickness);
    });
    expect(wallSegments).toHaveLength(2);
    expect(endCaps).toHaveLength(4);
    expect(endCaps.map(({ position }) => position)).toEqual([
      { x: hopper.left, y: hopper.top },
      { x: hopper.right, y: hopper.top },
      hopper.leftWallEnd,
      hopper.rightWallEnd,
    ]);
    expect(endCaps.every((body) => body.circleRadius === hopper.wallThickness / 2)).toBe(true);
    expect(physics.bodies.gate.position).toMatchObject({ x: hopper.throatX, y: hopper.bottom });
    expectRectangleDimensions(
      physics.bodies.gate,
      hopper.rightWallEnd.x - hopper.leftWallEnd.x,
      BOARD.gateHeight,
    );
    expect(hopper.throatClearance).toBeGreaterThanOrEqual(BOARD.ballRadius * 2);
  });

  it('maps every physical funnel segment directly from shared collision geometry', () => {
    const physics = createPhysicsWorld();

    physics.bodies.funnels.forEach((body, index) => {
      const funnel = physics.geometry.funnels[index]!;
      const length = Math.hypot(funnel.end.x - funnel.start.x, funnel.end.y - funnel.start.y);
      expect(body.position).toMatchObject({
        x: (funnel.start.x + funnel.end.x) / 2,
        y: (funnel.start.y + funnel.end.y) / 2,
      });
      expect(body.angle).toBeCloseTo(
        Math.atan2(funnel.end.y - funnel.start.y, funnel.end.x - funnel.start.x),
        12,
      );
      expectRectangleDimensions(body, length, funnel.width);
    });
  });

  it('creates hopper walls and the closed gate at the requested physical position', () => {
    const physics = createPhysicsWorld(0.75);

    expect(physics.geometry.hopper.throatX).toBe(
      BOARD.width / 2 + BOARD.hopperTravel * 0.75,
    );
    expect(physics.bodies.gate.position.x).toBe(physics.geometry.hopper.gateClosedX);
    expect(physics.bodies.hopperWalls.at(-1)!.position.x)
      .toBe(physics.geometry.hopper.rightWallEnd.x);
  });

  it('uses actual rounded Matter end caps to admit one collision hull but not two', () => {
    const physics = createPhysicsWorld();
    const controller = new GaltonController({ seed: 42, settings: neutral });
    const caps = physics.bodies.hopperWalls
      .filter((body) => (
        body.circleRadius === physics.geometry.hopper.wallThickness / 2
        && body.position.y === physics.geometry.hopper.bottom
      ))
      .sort((a, b) => a.position.x - b.position.x);

    expect(caps).toHaveLength(2);
    const [leftCap, rightCap] = caps;
    const aperture = rightCap!.bounds.min.x - leftCap!.bounds.max.x;
    const ballWidths = controller.snapshot().ballBodies.map((body) => body.bounds.max.x - body.bounds.min.x);

    expect(aperture).toBeGreaterThan(Math.max(...ballWidths));
    expect(aperture).toBeLessThan(Math.min(...ballWidths) * 2);
    expect(physics.bodies.gate.bounds.min.x).toBeLessThanOrEqual(leftCap!.bounds.max.x);
    expect(physics.bodies.gate.bounds.max.x).toBeGreaterThanOrEqual(rightCap!.bounds.min.x);

    controller.destroy();
  });
});
