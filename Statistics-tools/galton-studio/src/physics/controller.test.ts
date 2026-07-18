import { Bodies, Body, Composite, Events, Sleeping } from 'matter-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExperimentSettings } from '../model/types';
import { BOARD, createBoardGeometry } from './geometry';
import { GaltonController } from './controller';

const neutral: ExperimentSettings = {
  hopperPosition: 0,
  skew: 0,
  kurtosis: 3,
  releaseRate: 6,
  changeBehavior: 'keep',
};

function controller(settings = neutral) {
  return new GaltonController({ seed: 42, settings });
}

function releaseOne(instance: GaltonController) {
  const ball = instance.snapshot().ballBodies.find((body) => !body.plugin.galton.released)!;
  instance.run();
  Body.setPosition(ball, { x: BOARD.width / 2, y: BOARD.hopperBottom + BOARD.ballRadius + 2 });
  instance.step(1000 / 120);
  return ball;
}

function advance(instance: GaltonController, milliseconds: number) {
  const frames = Math.ceil(milliseconds / (1000 / 120));
  for (let frame = 0; frame < frames; frame += 1) instance.step(1000 / 120);
}

function releaseBatch(instance: GaltonController) {
  instance.run();
  for (let released = 0; released < 100; released += 1) {
    if (released > 0) vi.advanceTimersByTime(Math.ceil(1000 / neutral.releaseRate));
    const ball = instance.snapshot().ballBodies.find((body) => !body.plugin.galton.released)!;
    Body.setPosition(ball, {
      x: 125 + (released % 10) * 52,
      y: 175 + Math.floor(released / 10) * 36,
    });
    instance.step(1000 / 120);
  }
}

function arrangeActiveBallsInBins(instance: GaltonController) {
  const geometry = createBoardGeometry();
  const active = instance.snapshot().ballBodies.filter((body) => (
    body.plugin.galton.released && !body.plugin.galton.settled
  ));
  active.forEach((body, index) => {
    const bin = geometry.bins[index % geometry.bins.length]!;
    const layer = Math.floor(index / geometry.bins.length);
    Body.setPosition(body, {
      x: bin.centreX,
      y: geometry.floorY - BOARD.floorHeight / 2 - BOARD.ballRadius - layer * 13.2,
    });
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);
  });
}

describe('GaltonController', () => {
  const instances: GaltonController[] = [];

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    instances.splice(0).forEach((instance) => instance.destroy());
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function tracked(settings = neutral) {
    const instance = controller(settings);
    instances.push(instance);
    return instance;
  }

  it('starts with 100 real, non-overlapping Matter balls physically loaded in the hopper', () => {
    const instance = tracked();
    const snapshot = instance.snapshot();

    expect(snapshot.hopperCount).toBe(100);
    expect(snapshot.activeCount).toBe(0);
    expect(snapshot.ballBodies).toHaveLength(100);
    expect(snapshot.ballBodies.every((body) => body.label === 'ball' && body.isStatic === false)).toBe(true);
    const hopper = createBoardGeometry().hopper;
    snapshot.ballBodies.forEach((body) => {
      expect(body).toMatchObject({
        circleRadius: BOARD.ballRadius,
        restitution: 0.38,
        friction: 0.025,
        frictionAir: 0.0025,
        density: 0.0018,
        sleepThreshold: 70,
      });
      expect(body.collisionFilter.group).toBe(0);
      expect(body.position.x).toBeGreaterThan(hopper.left);
      expect(body.position.x).toBeLessThan(hopper.right);
      expect(body.position.y).toBeGreaterThan(hopper.top);
      expect(body.position.y).toBeLessThan(hopper.bottom);
    });
    snapshot.ballBodies.forEach((body, index) => {
      snapshot.ballBodies.slice(index + 1).forEach((other) => {
        expect(Math.hypot(body.position.x - other.position.x, body.position.y - other.position.y))
          .toBeGreaterThanOrEqual(BOARD.ballRadius * 2 - 0.05);
      });
    });
  });

  it('runs, pauses, resumes, and resets to an empty result', () => {
    const instance = tracked();

    instance.run();
    expect(instance.snapshot().status).toBe('running');
    instance.pause();
    expect(instance.snapshot().status).toBe('paused');
    instance.resume();
    expect(instance.snapshot().status).toBe('running');
    instance.reset({ seed: 43 });
    expect(instance.snapshot().settledBins).toEqual([]);
    expect(instance.snapshot().status).toBe('ready');
  });

  it('opens and closes the visible physical gate at the shared geometry positions', () => {
    const instance = tracked();
    const ready = instance.snapshot();

    expect(ready.gateOpen).toBe(false);
    expect(ready.gatePosition).toEqual({
      x: ready.apparatusGeometry!.hopper.gateClosedX,
      y: ready.apparatusGeometry!.hopper.bottom,
    });

    instance.run();
    const running = instance.snapshot();
    expect(running.gateOpen).toBe(true);
    expect(running.gatePosition!.x).toBe(running.apparatusGeometry!.hopper.gateOpenX);

    instance.pause();
    const paused = instance.snapshot();
    expect(paused.gateOpen).toBe(false);
    expect(paused.gatePosition!.x).toBe(paused.apparatusGeometry!.hopper.gateClosedX);
  });

  it('moves the hopper, gate, and waiting batch without teleporting released balls', () => {
    const instance = tracked();
    const released = releaseOne(instance);
    instance.pause();
    const waiting = instance.snapshot().ballBodies.find((body) => !body.plugin.galton.released)!;
    const releasedBefore = { ...released.position };
    const waitingBefore = { ...waiting.position };
    const beforeThroat = instance.snapshot().apparatusGeometry!.hopper.throatX;

    instance.setSettings({ ...neutral, hopperPosition: 0.75 });

    const after = instance.snapshot();
    const delta = BOARD.hopperTravel * 0.75;
    expect(after.apparatusGeometry!.hopper.throatX).toBe(beforeThroat + delta);
    expect(after.gatePosition!.x).toBe(after.apparatusGeometry!.hopper.gateClosedX);
    expect(waiting.position.x).toBeCloseTo(waitingBefore.x + delta, 10);
    expect(waiting.position.y).toBeCloseTo(waitingBefore.y, 10);
    expect(released.position).toEqual(releasedBefore);
  });

  it('assigns guidance targets only to released balls in guided mode', () => {
    const natural = tracked();
    const guided = tracked({ ...neutral, skew: 0.7 });

    expect(releaseOne(natural).plugin.galton.targetBin).toBeNull();
    const guidedBall = releaseOne(guided);
    expect(guidedBall.plugin.galton.targetBin).toBeGreaterThanOrEqual(0);
    expect(guidedBall.plugin.galton.targetBin).toBeLessThanOrEqual(10);
  });

  it('emits settled exactly once and preserves the original body, id, and transform in the Matter world', () => {
    const instance = tracked();
    const ball = releaseOne(instance);
    const matterId = ball.id;
    const galtonId = ball.plugin.galton.ballId;
    const listener = vi.fn();
    Events.on(ball, 'settled', listener);
    ball.sleepThreshold = 1_000;
    Sleeping.set(ball, false);
    const bin = createBoardGeometry().bins[5]!;
    Body.setPosition(ball, { x: bin.centreX, y: bin.bottom - 20 });
    Body.setVelocity(ball, { x: 0, y: 0 });

    for (let frame = 0; frame < 160 && !ball.plugin.galton.settled; frame += 1) {
      instance.step(1000 / 120);
    }
    expect(ball.plugin.galton.settled).toBe(true);
    const settledTransform = { position: { ...ball.position }, angle: ball.angle };
    for (let frame = 0; frame < 80; frame += 1) instance.step(1000 / 120);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(instance.snapshot().settledBins).toEqual([5]);
    expect(instance.snapshot().ballBodies).toContain(ball);
    const physics = (instance as unknown as { physics: { world: Composite } }).physics;
    expect(Composite.allBodies(physics.world)).toContain(ball);
    expect(ball.id).toBe(matterId);
    expect(ball.plugin.galton.ballId).toBe(galtonId);
    expect(ball.position).toEqual(settledTransform.position);
    expect(ball.angle).toBe(settledTransform.angle);
    expect(ball.isSleeping).toBe(true);
    expect(ball.isStatic).toBe(false);
  });

  it('reset cancels pending releases and a second run does not schedule twice', () => {
    const instance = tracked();
    instance.run();
    const pendingAfterRun = vi.getTimerCount();

    instance.run();
    expect(vi.getTimerCount()).toBe(pendingAfterRun);
    instance.reset({ seed: 44 });
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(2_000);
    expect(instance.snapshot().status).toBe('ready');
    expect(instance.snapshot().hopperCount).toBe(100);
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const instance = tracked();
    const listener = vi.fn();
    const unsubscribe = instance.subscribe(listener);

    instance.run();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    instance.pause();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns one stable snapshot until a state change is emitted', () => {
    const instance = tracked();
    const beforeChange = instance.snapshot();

    expect(instance.snapshot()).toBe(beforeChange);
    instance.run();
    const afterChange = instance.snapshot();
    expect(afterChange).not.toBe(beforeChange);
    expect(instance.snapshot()).toBe(afterChange);
  });

  it('pauses fixed stepping without moving bodies', () => {
    const instance = tracked();
    const ball = releaseOne(instance);
    instance.pause();
    const before = { ...ball.position };

    instance.step(1_000);

    expect(ball.position).toEqual(before);
  });

  it('retains a long-frame backlog and drains it in deterministic eight-step slices', () => {
    const longFrame = tracked();
    const fixedFrames = tracked();
    const longBall = longFrame.snapshot().ballBodies[0]!;
    const fixedBall = fixedFrames.snapshot().ballBodies[0]!;
    longFrame.run();
    fixedFrames.run();
    Body.setPosition(longBall, { x: 200, y: 250 });
    Body.setPosition(fixedBall, { x: 200, y: 250 });
    Body.setVelocity(longBall, { x: 0, y: 0 });
    Body.setVelocity(fixedBall, { x: 0, y: 0 });
    Sleeping.set(longBall, false);
    Sleeping.set(fixedBall, false);

    longFrame.step((1000 / 120) * 16 + 0.001);
    for (let frame = 0; frame < 8; frame += 1) fixedFrames.step(1000 / 120);
    expect(longBall.position.x).toBeCloseTo(fixedBall.position.x, 8);
    expect(longBall.position.y).toBeCloseTo(fixedBall.position.y, 8);

    longFrame.step(0);
    for (let frame = 0; frame < 8; frame += 1) fixedFrames.step(1000 / 120);

    expect(longBall.position.x).toBeCloseTo(fixedBall.position.x, 8);
    expect(longBall.position.y).toBeCloseTo(fixedBall.position.y, 8);
    expect(longBall.velocity.x).toBeCloseTo(fixedBall.velocity.x, 8);
    expect(longBall.velocity.y).toBeCloseTo(fixedBall.velocity.y, 8);
  });

  it('marks exactly one crossing without teleporting either released body', () => {
    const instance = tracked();
    const [first, second] = instance.snapshot().ballBodies;
    instance.run();
    Body.setPosition(first!, { x: BOARD.width / 2, y: BOARD.hopperBottom + BOARD.ballRadius + 2 });
    Body.setPosition(second!, { x: BOARD.width / 2 + 30, y: BOARD.hopperBottom + BOARD.ballRadius + 2 });
    const firstBefore = { ...first!.position };

    instance.step(1000 / 120);

    expect(instance.snapshot().activeCount).toBe(1);
    expect(first!.plugin.galton.released).toBe(true);
    expect(second!.plugin.galton.released).toBe(false);
    expect(Math.abs(first!.position.x - firstBefore.x)).toBeLessThan(2);
    expect(Math.abs(first!.position.y - firstBefore.y)).toBeLessThan(2);
    expect(instance.snapshot().regimes).toMatchObject([{ released: 1, mode: 'natural' }]);
  });

  it('does not accept a second near-throat crossing until the next metered opening', () => {
    const instance = tracked();
    const [first, second] = instance.snapshot().ballBodies;
    instance.run();
    Body.setPosition(first!, { x: BOARD.width / 2, y: BOARD.hopperBottom + BOARD.ballRadius + 2 });
    Body.setPosition(second!, { x: BOARD.width / 2 + 8, y: BOARD.hopperBottom + BOARD.ballRadius + 2 });

    instance.step(1000 / 120);
    instance.step(1000 / 120);
    expect(instance.snapshot().activeCount).toBe(1);

    vi.advanceTimersByTime(Math.ceil(1000 / neutral.releaseRate));
    instance.step(1000 / 120);
    expect(instance.snapshot().activeCount).toBe(2);
  });

  it('closes an unproductive opening after 650 ms before scheduling another opening', () => {
    const instance = tracked();
    const ball = instance.snapshot().ballBodies[0]!;
    instance.run();

    vi.advanceTimersByTime(650);
    Body.setPosition(ball, { x: BOARD.width / 2, y: BOARD.hopperBottom + BOARD.ballRadius + 2 });
    instance.step(1000 / 120);
    expect(instance.snapshot().activeCount).toBe(0);

    vi.advanceTimersByTime(Math.ceil(1000 / neutral.releaseRate));
    instance.step(1000 / 120);
    expect(instance.snapshot().activeCount).toBe(1);
  });

  it('preserves the remaining release delay across pause and resume', () => {
    const instance = tracked();
    releaseOne(instance);
    vi.advanceTimersByTime(100);
    instance.pause();
    vi.advanceTimersByTime(1_000);
    instance.resume();
    const next = instance.snapshot().ballBodies.find((body) => !body.plugin.galton.released)!;
    Body.setPosition(next, { x: BOARD.width / 2, y: BOARD.hopperBottom + BOARD.ballRadius + 2 });

    instance.step(1000 / 120);
    expect(instance.snapshot().activeCount).toBe(1);
    vi.advanceTimersByTime(65);
    instance.step(1000 / 120);
    expect(instance.snapshot().activeCount).toBe(1);
    vi.advanceTimersByTime(2);
    instance.step(1000 / 120);
    expect(instance.snapshot().activeCount).toBe(2);
  });

  it('preserves the remaining safety interval across pause and resume', () => {
    const instance = tracked();
    const ball = instance.snapshot().ballBodies[0]!;
    instance.run();
    vi.advanceTimersByTime(400);
    instance.pause();
    vi.advanceTimersByTime(1_000);
    instance.resume();

    vi.advanceTimersByTime(251);
    Body.setPosition(ball, { x: BOARD.width / 2, y: BOARD.hopperBottom + BOARD.ballRadius + 2 });
    instance.step(1000 / 120);
    expect(instance.snapshot().activeCount).toBe(0);

    vi.advanceTimersByTime(1000 / neutral.releaseRate);
    instance.step(1000 / 120);
    expect(instance.snapshot().activeCount).toBe(1);
  });

  it('freezes a pending release while page-hidden and resumes its remaining cadence without a burst', () => {
    const instance = tracked();
    releaseOne(instance);
    vi.advanceTimersByTime(60);
    const next = instance.snapshot().ballBodies.find((body) => !body.plugin.galton.released)!;
    Body.setPosition(next, { x: BOARD.width / 2, y: BOARD.hopperBottom + BOARD.ballRadius + 2 });

    instance.suspendForPageVisibility();
    const hiddenSnapshot = instance.snapshot();
    expect(hiddenSnapshot.status).toBe('running');
    expect(hiddenSnapshot.gateOpen).toBe(false);
    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(10_000);
    instance.step(10_000);
    expect(instance.snapshot().activeCount).toBe(1);

    instance.restoreAfterPageVisibility();
    expect(instance.snapshot().status).toBe('running');
    expect(instance.snapshot().gateOpen).toBe(false);
    vi.advanceTimersByTime(100);
    instance.step(1000 / 120);
    expect(instance.snapshot().activeCount).toBe(1);
    vi.advanceTimersByTime(7);
    instance.step(1000 / 120);
    expect(instance.snapshot().activeCount).toBe(2);
  });

  it('freezes and restores the remaining open-gate safety interval while page-hidden', () => {
    const instance = tracked();
    instance.run();
    vi.advanceTimersByTime(200);

    instance.suspendForPageVisibility();
    expect(instance.snapshot()).toMatchObject({ status: 'running', gateOpen: false });
    vi.advanceTimersByTime(10_000);
    expect(instance.snapshot().gateOpen).toBe(false);

    instance.restoreAfterPageVisibility();
    expect(instance.snapshot()).toMatchObject({ status: 'running', gateOpen: true });
    vi.advanceTimersByTime(449);
    expect(instance.snapshot().gateOpen).toBe(true);
    vi.advanceTimersByTime(2);
    expect(instance.snapshot().gateOpen).toBe(false);
  });

  it('does not turn a learner-paused run back into running across page visibility changes', () => {
    const instance = tracked();
    instance.run();
    instance.pause();

    instance.suspendForPageVisibility();
    instance.restoreAfterPageVisibility();

    expect(instance.snapshot()).toMatchObject({ status: 'paused', gateOpen: false });
    expect(vi.getTimerCount()).toBe(0);
    instance.resume();
    expect(instance.snapshot()).toMatchObject({ status: 'running', gateOpen: true });
  });

  it('sustains real Matter releases without repositioning balls', () => {
    const instance = tracked({ ...neutral, releaseRate: 12 });
    instance.run();
    const releaseTimes: number[] = [];
    let released = 0;

    for (let frame = 1; frame <= 2_400 && released < 12; frame += 1) {
      vi.advanceTimersByTime(1000 / 120);
      instance.step(1000 / 120);
      const frameSnapshot = instance.snapshot();
      const escapedUnreleased = frameSnapshot.ballBodies.filter((body) => (
        !body.plugin.galton.released
        && body.position.y > BOARD.hopperBottom + BOARD.ballRadius
      ));
      expect(escapedUnreleased, `unmetered physical escape at frame ${frame}`).toHaveLength(0);
      const nextReleased = frameSnapshot.regimes.reduce((sum, regime) => sum + regime.released, 0);
      if (nextReleased > released) {
        releaseTimes.push(frame * (1000 / 120));
        released = nextReleased;
      }
    }

    expect(releaseTimes, `released ${released} balls in 20 seconds`).toHaveLength(12);
    releaseTimes.slice(1).forEach((releasedAt, index) => {
      expect(releasedAt - releaseTimes[index]!).toBeGreaterThanOrEqual(1000 / 12 - 1e-6);
    });
  });

  it('removes a lost active body after two seconds and physically replaces it in the hopper', () => {
    const instance = tracked();
    const lost = releaseOne(instance);
    Body.setPosition(lost, { x: -BOARD.ballRadius - 5, y: 300 });
    Body.setVelocity(lost, { x: 0, y: 0 });

    advance(instance, 1_990);
    expect(instance.snapshot().ballBodies).toContain(lost);
    advance(instance, 50);

    const snapshot = instance.snapshot();
    expect(snapshot.ballBodies).not.toContain(lost);
    expect(snapshot.ballBodies).toHaveLength(100);
    expect(snapshot.hopperCount).toBe(100);
    expect(snapshot.activeCount).toBe(0);
    expect(snapshot.settledBins).toEqual([]);
    expect(snapshot.recycledCount).toBe(1);
    const replacement = snapshot.ballBodies.find((body) => !body.plugin.galton.released)!;
    const hopper = createBoardGeometry().hopper;
    expect(replacement.position.y).toBeGreaterThan(hopper.top);
    expect(replacement.position.y).toBeLessThan(hopper.bottom);
  });

  it('gives simultaneous lost balls distinct non-overlapping replacement positions', () => {
    const instance = tracked();
    const first = releaseOne(instance);
    vi.advanceTimersByTime(Math.ceil(1000 / neutral.releaseRate));
    const second = instance.snapshot().ballBodies.find((body) => !body.plugin.galton.released)!;
    Body.setPosition(second, { x: 200, y: 300 });
    instance.step(1000 / 120);
    expect(instance.snapshot().activeCount).toBe(2);
    const originalIds = new Set(instance.snapshot().ballBodies.map(({ id }) => id));
    Body.setPosition(first, { x: -BOARD.ballRadius - 5, y: 300 });
    Body.setPosition(second, { x: BOARD.width + BOARD.ballRadius + 5, y: 300 });
    Body.setVelocity(first, { x: 0, y: 0 });
    Body.setVelocity(second, { x: 0, y: 0 });
    Sleeping.set(first, false);
    Sleeping.set(second, false);

    for (let frame = 0; frame < 260 && instance.snapshot().recycledCount < 2; frame += 1) {
      instance.step(1000 / 120);
    }

    const replacements = instance.snapshot().ballBodies.filter(({ id }) => !originalIds.has(id));
    expect(replacements).toHaveLength(2);
    expect(Math.hypot(
      replacements[0]!.position.x - replacements[1]!.position.x,
      replacements[0]!.position.y - replacements[1]!.position.y,
    )).toBeGreaterThanOrEqual(BOARD.ballRadius * 2);
    expect(instance.snapshot()).toMatchObject({ hopperCount: 100, activeCount: 0, recycledCount: 2 });
  });

  it('applies the exact capped guidance force only on an eligible targeted peg contact', () => {
    const guided = tracked({ ...neutral, skew: 1 });
    const ball = releaseOne(guided);
    const targetBin = ball.plugin.galton.targetBin as number;
    const geometry = createBoardGeometry();
    const peg = geometry.pegRows.flatMap(({ pegs }) => pegs)
      .sort((a, b) => Math.abs(b.x - geometry.bins[targetBin]!.centreX)
        - Math.abs(a.x - geometry.bins[targetBin]!.centreX))[0]!;
    const applyForce = vi.spyOn(Body, 'applyForce');
    Body.setPosition(ball, { x: peg.x, y: peg.y - BOARD.pegRadius - BOARD.ballRadius - 2 });
    Body.setVelocity(ball, { x: 0, y: 2 });
    Sleeping.set(ball, false);

    advance(guided, 200);

    const call = applyForce.mock.calls.find(([subject]) => subject === ball);
    expect(call).toBeDefined();
    const [, position, force] = call!;
    const targetX = geometry.bins[targetBin]!.centreX;
    const direction = Math.sign(targetX - position.x);
    const distanceFactor = Math.min(1, Math.abs(targetX - position.x) / 220);
    expect(force).toEqual({ x: direction * distanceFactor * 0.000018, y: 0 });
  });

  it('does not apply guidance on an untargeted peg contact', () => {
    const natural = tracked();
    const ball = releaseOne(natural);
    const peg = createBoardGeometry().pegRows[0]!.pegs[0]!;
    const applyForce = vi.spyOn(Body, 'applyForce');
    Body.setPosition(ball, { x: peg.x, y: peg.y - BOARD.pegRadius - BOARD.ballRadius - 2 });
    Body.setVelocity(ball, { x: 0, y: 2 });
    Sleeping.set(ball, false);

    advance(natural, 200);

    expect(applyForce.mock.calls.some(([subject]) => subject === ball)).toBe(false);
  });

  it('does not apply guidance when a targeted ball contacts another ball instead of a peg', () => {
    const guided = tracked({ ...neutral, skew: 1 });
    const targeted = releaseOne(guided);
    const other = guided.snapshot().ballBodies.find((body) => !body.plugin.galton.released)!;
    const applyForce = vi.spyOn(Body, 'applyForce');
    Body.setPosition(targeted, { x: 200, y: 300 });
    Body.setPosition(other, { x: 210, y: 300 });
    Body.setVelocity(targeted, { x: 1, y: 0 });
    Body.setVelocity(other, { x: -1, y: 0 });
    Sleeping.set(targeted, false);
    Sleeping.set(other, false);

    guided.step(1000 / 120);

    expect(applyForce.mock.calls.some(([subject]) => subject === targeted)).toBe(false);
  });

  it('enters settling after the last hopper ball crosses', () => {
    const instance = tracked();

    releaseBatch(instance);

    expect(instance.snapshot().hopperCount).toBe(0);
    expect(instance.snapshot().activeCount).toBe(100);
    expect(instance.snapshot().status).toBe('settling');
  });

  it('refuses refill before completion', () => {
    const instance = tracked();

    expect(instance.refill(99)).toBe(false);
    expect(instance.snapshot().hopperCount).toBe(100);
  });

  it('allows refill at 500 bodies but refuses it above the exact 600-body cap', () => {
    const instance = tracked();
    const internal = instance as unknown as {
      status: string;
      notify(): void;
      balls: Map<number, {
        body: Body;
        released: boolean;
        settledBin: number | null;
        settling: { bin: number | null; enteredAtMs: number | null };
        outsideSinceMs: number | null;
      }>;
    };
    internal.status = 'complete';
    for (let index = 0; index < 400; index += 1) {
      const body = Bodies.circle(-1_000 - index * 20, -1_000, BOARD.ballRadius);
      internal.balls.set(body.id, {
        body,
        released: true,
        settledBin: 0,
        settling: { bin: 0, enteredAtMs: 0 },
        outsideSinceMs: null,
      });
    }
    internal.notify();
    expect(instance.snapshot().ballBodies).toHaveLength(500);
    expect(instance.snapshot().canRefill).toBe(true);

    const overflow = Bodies.circle(-20_000, -1_000, BOARD.ballRadius);
    internal.balls.set(overflow.id, {
      body: overflow,
      released: true,
      settledBin: 0,
      settling: { bin: 0, enteredAtMs: 0 },
      outsideSinceMs: null,
    });
    internal.notify();
    expect(instance.snapshot().ballBodies).toHaveLength(501);
    expect(instance.snapshot().canRefill).toBe(false);
    expect(instance.refill(99)).toBe(false);
  });

  it('destroy cancels timers, removes bodies, and silences subscribers', () => {
    const instance = tracked();
    const listener = vi.fn();
    instance.subscribe(listener);
    instance.run();
    expect(vi.getTimerCount()).toBe(1);
    listener.mockClear();

    instance.destroy();
    vi.advanceTimersByTime(2_000);
    instance.step(2_000);

    expect(vi.getTimerCount()).toBe(0);
    expect(listener).not.toHaveBeenCalled();
    expect(instance.snapshot().ballBodies).toEqual([]);
  });

  it('keeps prior observations and starts a new regime when settings change in keep mode', () => {
    const instance = tracked();
    releaseOne(instance);
    instance.setSettings({ ...neutral, skew: 0.6 });
    vi.advanceTimersByTime(Math.ceil(1000 / neutral.releaseRate));
    const next = instance.snapshot().ballBodies.find((body) => !body.plugin.galton.released)!;
    Body.setPosition(next, { x: 200, y: 300 });

    instance.step(1000 / 120);

    expect(instance.snapshot().regimes.map(({ mode, released }) => ({ mode, released }))).toEqual([
      { mode: 'natural', released: 1 },
      { mode: 'guided', released: 1 },
    ]);
  });

  it('updates settings without clearing the physical world when reset behavior is selected', () => {
    const instance = tracked();
    releaseOne(instance);
    const before = instance.snapshot();

    instance.setSettings({ ...neutral, skew: 0.6, changeBehavior: 'reset' });

    expect(instance.snapshot()).toMatchObject({
      status: 'running',
      hopperCount: 99,
      activeCount: 1,
      settledBins: before.settledBins,
      regimes: before.regimes,
    });
    expect(instance.snapshot().ballBodies).toEqual(before.ballBodies);
  });

  it('completes when every released body settles, then permits one physical refill batch', () => {
    const instance = tracked();
    releaseBatch(instance);
    arrangeActiveBallsInBins(instance);
    const retainedBodies = [...instance.snapshot().ballBodies];
    retainedBodies.forEach((body) => {
      body.sleepThreshold = 1_000;
      Sleeping.set(body, false);
    });

    advance(instance, 3_000);

    expect(instance.snapshot().status).toBe('complete');
    expect(instance.snapshot().activeCount).toBe(0);
    expect(instance.snapshot().settledBins).toHaveLength(100);
    expect(instance.snapshot().ballBodies).toEqual(retainedBodies);
    expect(retainedBodies.every((body) => body.isSleeping)).toBe(true);
    expect(instance.snapshot().canRefill).toBe(true);
    expect(instance.refill(99)).toBe(true);
    expect(instance.snapshot()).toMatchObject({
      status: 'ready',
      hopperCount: 100,
      activeCount: 0,
      canRefill: false,
    });
    expect(instance.snapshot().ballBodies).toHaveLength(200);
  });

  it('re-sleeps a previously reawakened counted body when completion is reached', () => {
    const instance = tracked();
    releaseBatch(instance);
    const [early, ...remaining] = instance.snapshot().ballBodies;
    const geometry = createBoardGeometry();
    const bin = geometry.bins[0]!;
    Body.setPosition(early!, { x: bin.centreX, y: bin.bottom - 20 });
    Body.setVelocity(early!, { x: 0, y: 0 });
    early!.sleepThreshold = 1_000;
    Sleeping.set(early!, false);
    remaining.forEach((body) => {
      Body.setPosition(body, { x: 200, y: 300 });
      Body.setVelocity(body, { x: 2, y: 0 });
    });

    for (let frame = 0; frame < 240 && !early!.plugin.galton.settled; frame += 1) {
      instance.step(1000 / 120);
    }
    expect(early!.plugin.galton.settled).toBe(true);
    expect(early!.isSleeping).toBe(true);
    Sleeping.set(early!, false);
    expect(early!.isSleeping).toBe(false);
    arrangeActiveBallsInBins(instance);
    remaining.forEach((body) => {
      body.sleepThreshold = 1_000;
      Sleeping.set(body, false);
    });

    advance(instance, 3_000);

    expect(instance.snapshot().status).toBe('complete');
    expect(instance.snapshot().ballBodies).toContain(early);
    expect(early!.isSleeping).toBe(true);
  });
});
