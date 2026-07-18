import { Body, Bodies } from 'matter-js';
import { describe, expect, it } from 'vitest';
import { BOARD, createBoardGeometry } from './geometry';
import { classifySettledBall, type SettlingMemory } from './settling';

function memory(): SettlingMemory {
  return { bin: null, enteredAtMs: null };
}

function ballAt(x: number, y: number, speed = 0) {
  const body = Bodies.circle(x, y, BOARD.ballRadius);
  Body.setVelocity(body, { x: speed, y: 0 });
  return body;
}

describe('classifySettledBall', () => {
  const geometry = createBoardGeometry();
  const bin = geometry.bins[3]!;

  it('does not classify a ball above the bin entry', () => {
    expect(classifySettledBall(ballAt(bin.centreX, bin.top - 1), geometry, memory(), 1_000)).toBeNull();
  });

  it('does not classify a ball below the bin bottom', () => {
    const state = memory();
    const body = ballAt(bin.centreX, bin.bottom + 1, 0.1);

    expect(classifySettledBall(body, geometry, state, 1_000)).toBeNull();
    expect(classifySettledBall(body, geometry, state, 1_450)).toBeNull();
    expect(state).toEqual({ bin: null, enteredAtMs: null });
  });

  it('does not classify a ball moving faster than 0.16 units per step', () => {
    expect(classifySettledBall(ballAt(bin.centreX, bin.top + 20, 0.17), geometry, memory(), 1_000)).toBeNull();
  });

  it('does not classify a ball before a 450 ms dwell interval', () => {
    const state = memory();
    const body = ballAt(bin.centreX, bin.top + 20, 0.1);

    expect(classifySettledBall(body, geometry, state, 1_000)).toBeNull();
    expect(classifySettledBall(body, geometry, state, 1_449)).toBeNull();
  });

  it('returns the bin after the ball remains slow within it for 450 ms', () => {
    const state = memory();
    const body = ballAt(bin.centreX, bin.top + 20, 0.1);

    expect(classifySettledBall(body, geometry, state, 1_000)).toBeNull();
    expect(classifySettledBall(body, geometry, state, 1_450)).toBe(3);
  });

  it('restarts dwell when a collision moves the ball into another bin', () => {
    const state = memory();
    const body = ballAt(bin.centreX, bin.top + 20, 0.1);

    classifySettledBall(body, geometry, state, 1_000);
    Body.setPosition(body, { x: geometry.bins[4]!.centreX, y: body.position.y });

    expect(classifySettledBall(body, geometry, state, 1_450)).toBeNull();
    expect(state).toEqual({ bin: 4, enteredAtMs: 1_450 });
    expect(classifySettledBall(body, geometry, state, 1_900)).toBe(4);
  });
});
