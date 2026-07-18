import {
  Bodies,
  Body,
  Composite,
  Engine,
  Events,
  Sleeping,
  type IEventCollision,
} from 'matter-js';
import { buildBallAssignments, type BallAssignment } from '../model/allocation';
import { buildExpectedPmf, modeFor } from '../model/distribution';
import { createRng, type Rng } from '../model/prng';
import {
  BATCH_SIZE,
  MAX_SETTLED_BALLS,
  type DistributionRegime,
  type ExperimentSettings,
  type RunStatus,
} from '../model/types';
import {
  BOARD,
  createBoardGeometry,
  type BoardGeometry,
  type Point,
} from './geometry';
import { classifySettledBall, type SettlingMemory } from './settling';
import { createPhysicsWorld, type PhysicsWorld } from './world';

const FIXED_STEP_MS = 1000 / 120;
const MAX_STEPS_PER_FRAME = 8;
const GATE_SAFETY_MS = 650;
const RECYCLE_DWELL_MS = 2_000;
const CLOSED_GATE_MASK = 0xffffffff;
const BALL_COLLISION_SIDES = 24;
const BALL_COLLISION_SKIN = 0.6;
const ROUTE_IMPULSE = 0.000055;
const HOPPER_FEED_VERTICAL_SPEED = 2;
const HOPPER_FEED_HORIZONTAL_SPEED = 1.5;

export interface GaltonSnapshot {
  status: RunStatus;
  hopperCount: number;
  activeCount: number;
  settledBins: readonly number[];
  ballBodies: readonly Body[];
  regimes: readonly DistributionRegime[];
  canRefill: boolean;
  recycledCount: number;
  settlementDiagnostics: readonly BallSettlementDiagnostic[];
  apparatusGeometry?: BoardGeometry;
  gatePosition?: Point;
  gateOpen?: boolean;
}

export interface BallSettlementDiagnostic {
  logicalBallId: number;
  physicalBodyId: number;
  targetBin: number | null;
  settledBin: number;
  matchesTarget: boolean;
}

export interface GaltonControllerOptions {
  seed: number;
  settings: ExperimentSettings;
}

export interface ResetOptions {
  seed: number;
  settings?: ExperimentSettings;
}

export type SnapshotListener = () => void;

interface BallState {
  body: Body;
  released: boolean;
  logicalBallId: number;
  assignmentLocked: boolean;
  releaseCounted: boolean;
  releaseRegime: Omit<DistributionRegime, 'released'> | null;
  settledBin: number | null;
  settling: SettlingMemory;
  outsideSinceMs: number | null;
}

interface PausedGateSchedule {
  phase: 'release-delay' | 'safety';
  remainingMs: number;
}

interface LogicalBallLifecycle {
  logicalBallId: number;
  assignmentLocked: boolean;
  releaseCounted: boolean;
  releaseRegime: Omit<DistributionRegime, 'released'> | null;
}

function cloneSettings(settings: ExperimentSettings): ExperimentSettings {
  return { ...settings };
}

function settingsMatch(a: DistributionRegime, pmf: number[], mode: DistributionRegime['mode']) {
  return a.mode === mode && a.pmf.every((value, index) => value === pmf[index]);
}

function pmfsMatch(a: readonly number[], b: readonly number[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export class GaltonController {
  private physics!: PhysicsWorld;
  private status: RunStatus = 'ready';
  private statusBeforePause: RunStatus = 'ready';
  private settings: ExperimentSettings;
  private seed: number;
  private rng!: Rng;
  private balls = new Map<number, BallState>();
  private settledBins: number[] = [];
  private settlementDiagnostics: BallSettlementDiagnostic[] = [];
  private regimes: DistributionRegime[] = [];
  private cachedSnapshot: GaltonSnapshot | null = null;
  private listeners = new Set<SnapshotListener>();
  private accumulatorMs = 0;
  private simulationTimeMs = 0;
  private nextBallId = 1;
  private nextLogicalBallId = 1;
  private recycledCount = 0;
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;
  private releaseDueAtMs: number | null = null;
  private safetyDueAtMs: number | null = null;
  private pausedGateSchedule: PausedGateSchedule | null = null;
  private visibilityGateSchedule: PausedGateSchedule | null = null;
  private visibilitySuspended = false;
  private gateOpen = false;
  private destroyed = false;
  private pendingRouteImpulses: { ball: Body; row: number }[] = [];
  private readonly collisionHandler = (event: IEventCollision<Engine>) => this.guideCollisions(event);

  constructor(options: GaltonControllerOptions) {
    this.seed = options.seed;
    this.settings = cloneSettings(options.settings);
    this.createBatchWorld(options.seed);
  }

  snapshot(): GaltonSnapshot {
    if (this.cachedSnapshot) return this.cachedSnapshot;
    const states = [...this.balls.values()];
    this.cachedSnapshot = {
      status: this.status,
      hopperCount: states.filter(({ released }) => !released).length,
      activeCount: states.filter(({ released, settledBin }) => released && settledBin === null).length,
      settledBins: [...this.settledBins],
      ballBodies: states.map(({ body }) => body),
      regimes: this.regimes.map((regime) => ({ ...regime, pmf: [...regime.pmf] })),
      canRefill: this.status === 'complete' && states.length + BATCH_SIZE <= MAX_SETTLED_BALLS,
      recycledCount: this.recycledCount,
      settlementDiagnostics: this.settlementDiagnostics.map((diagnostic) => ({ ...diagnostic })),
      apparatusGeometry: this.physics.geometry,
      gatePosition: { ...this.physics.bodies.gate.position },
      gateOpen: this.gateOpen,
    };
    return this.cachedSnapshot;
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  run(): void {
    if (this.destroyed || this.status !== 'ready') return;
    this.status = 'running';
    this.pausedGateSchedule = null;
    if (!this.visibilitySuspended) this.openGate();
    this.notify();
  }

  pause(): void {
    if (this.destroyed || (this.status !== 'running' && this.status !== 'settling')) return;
    this.statusBeforePause = this.status;
    this.status = 'paused';
    this.pausedGateSchedule = this.visibilitySuspended
      ? this.visibilityGateSchedule
      : this.captureGateSchedule();
    this.visibilityGateSchedule = null;
    this.cancelReleaseTimers();
    this.closeGate();
    this.notify();
  }

  resume(): void {
    if (this.destroyed || this.status !== 'paused') return;
    this.status = this.statusBeforePause;
    const pausedSchedule = this.pausedGateSchedule;
    this.pausedGateSchedule = null;
    if (this.status === 'running') {
      if (this.visibilitySuspended) {
        this.visibilityGateSchedule = pausedSchedule;
      } else {
        this.restoreGateSchedule(pausedSchedule);
      }
    }
    this.notify();
  }

  reset(options: ResetOptions): void {
    if (this.destroyed) return;
    this.disposeWorld();
    this.seed = options.seed;
    if (options.settings) this.settings = cloneSettings(options.settings);
    this.status = 'ready';
    this.statusBeforePause = 'ready';
    this.accumulatorMs = 0;
    this.simulationTimeMs = 0;
    this.nextBallId = 1;
    this.nextLogicalBallId = 1;
    this.recycledCount = 0;
    this.pausedGateSchedule = null;
    this.visibilityGateSchedule = null;
    this.gateOpen = false;
    this.pendingRouteImpulses = [];
    this.balls.clear();
    this.settledBins = [];
    this.settlementDiagnostics = [];
    this.regimes = [];
    this.createBatchWorld(options.seed);
    this.notify();
  }

  refill(seed: number): boolean {
    if (this.destroyed || !this.snapshot().canRefill) return false;
    this.seed = seed;
    this.rng = createRng(seed);
    this.loadPhysicalBalls(BATCH_SIZE);
    this.assignUnreleasedBalls();
    this.warmUp();
    this.status = 'ready';
    this.accumulatorMs = 0;
    this.notify();
    return true;
  }

  setSettings(settings: ExperimentSettings): void {
    if (this.destroyed) return;
    const previousPmf = buildExpectedPmf(this.settings);
    const nextPmf = buildExpectedPmf(settings);
    if (settings.hopperPosition !== this.settings.hopperPosition) {
      this.moveHopper(settings.hopperPosition);
    }
    this.settings = cloneSettings(settings);
    if (!pmfsMatch(previousPmf, nextPmf)) this.assignUnreleasedBalls();
    this.notify();
  }

  suspendForPageVisibility(): void {
    if (this.destroyed || this.visibilitySuspended) return;
    this.visibilitySuspended = true;
    if (this.status === 'running') {
      this.visibilityGateSchedule = this.captureGateSchedule();
      this.cancelReleaseTimers();
      this.closeGate();
    }
    this.notify();
  }

  restoreAfterPageVisibility(): void {
    if (this.destroyed || !this.visibilitySuspended) return;
    this.visibilitySuspended = false;
    const schedule = this.visibilityGateSchedule;
    this.visibilityGateSchedule = null;
    if (this.status === 'running') this.restoreGateSchedule(schedule);
    this.notify();
  }

  step(elapsedMs: number): void {
    if (
      this.destroyed
      || this.visibilitySuspended
      || this.status === 'paused'
      || this.status === 'ready'
      || this.status === 'complete'
    ) return;
    this.accumulatorMs += Math.max(0, elapsedMs);

    let steps = 0;
    while (this.accumulatorMs >= FIXED_STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      Engine.update(this.physics.engine, FIXED_STEP_MS);
      this.simulationTimeMs += FIXED_STEP_MS;
      this.accumulatorMs -= FIXED_STEP_MS;
      steps += 1;
      this.afterFixedStep();
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.disposeWorld();
    this.listeners.clear();
    this.balls.clear();
    this.pendingRouteImpulses = [];
    this.cachedSnapshot = null;
    this.destroyed = true;
  }

  private createBatchWorld(seed: number) {
    this.physics = createPhysicsWorld(this.settings.hopperPosition);
    this.physics.engine.positionIterations = 20;
    this.rng = createRng(seed);
    Events.on(this.physics.engine, 'collisionStart', this.collisionHandler);
    this.loadPhysicalBalls(BATCH_SIZE);
    this.assignUnreleasedBalls();
    this.warmUp();
  }

  private loadPhysicalBalls(count: number) {
    const positions = this.hopperPackingPositions(count);
    const bodies = positions.map(({ x, y }) => this.createBall(x, y));
    Composite.add(this.physics.world, bodies);
  }

  private hopperPackingPositions(count: number) {
    const { hopper } = this.physics.geometry;
    const positions: { x: number; y: number }[] = [];
    const spacing = BOARD.ballRadius * 2 + 0.3;
    const firstY = hopper.bottom - BOARD.gateHeight / 2 - BOARD.ballRadius - spacing;

    for (let row = 0; positions.length < count; row += 1) {
      const y = firstY - row * spacing;
      if (y - BOARD.ballRadius < hopper.top) {
        throw new Error('Hopper geometry cannot physically hold the requested batch');
      }
      const progress = (y - hopper.top) / (hopper.bottom - hopper.top);
      const wallInset = hopper.wallThickness / 2 + BOARD.ballRadius + 1;
      const left = hopper.left + progress * (hopper.leftWallEnd.x - hopper.left) + wallInset;
      const right = hopper.right + progress * (hopper.rightWallEnd.x - hopper.right) - wallInset;
      const capacity = Math.max(0, Math.floor((right - left) / spacing) + 1);
      const usedWidth = (capacity - 1) * spacing;
      const offset = row % 2 === 0 ? 0.05 : -0.05;
      for (let column = 0; column < capacity && positions.length < count; column += 1) {
        positions.push({
          x: (left + right - usedWidth) / 2 + column * spacing + offset * (this.rng() - 0.5),
          y: y + 0.05 * (this.rng() - 0.5),
        });
      }
    }
    return positions;
  }

  private assignUnreleasedBalls() {
    const waiting = [...this.balls.values()].filter(({ released, assignmentLocked }) => (
      !released && !assignmentLocked
    ));
    const assignments = buildBallAssignments(
      buildExpectedPmf(this.settings),
      waiting.length,
      this.rng,
    );
    waiting.forEach(({ body }, index) => {
      const assignment = assignments[index]!;
      body.plugin.galton.targetBin = assignment.targetBin;
      body.plugin.galton.route = [...assignment.route];
      body.plugin.galton.nextRouteRow = 0;
    });
  }

  private createBall(
    x: number,
    y: number,
    assignment?: BallAssignment,
    lifecycle?: LogicalBallLifecycle,
  ) {
    const ballId = this.nextBallId;
    this.nextBallId += 1;
    const logicalBallId = lifecycle?.logicalBallId ?? this.nextLogicalBallId;
    if (!lifecycle) this.nextLogicalBallId += 1;
    const collisionRadius = (
      BOARD.ballRadius + BALL_COLLISION_SKIN
    ) / Math.cos(Math.PI / BALL_COLLISION_SIDES);
    const body = Bodies.polygon(x, y, BALL_COLLISION_SIDES, collisionRadius, {
      label: 'ball',
      restitution: 0.38,
      friction: 0.025,
      frictionAir: 0.0025,
      density: 0.0018,
      slop: 0,
      sleepThreshold: 70,
      collisionFilter: { group: 0 },
      plugin: {
        galton: {
          tag: 'ball',
          ballId,
          logicalBallId,
          released: false,
          settled: false,
          targetBin: assignment?.targetBin ?? null,
          route: [...(assignment?.route ?? [])],
          nextRouteRow: 0,
        },
      },
    });
    body.circleRadius = BOARD.ballRadius;
    this.balls.set(body.id, {
      body,
      released: false,
      logicalBallId,
      assignmentLocked: lifecycle?.assignmentLocked ?? false,
      releaseCounted: lifecycle?.releaseCounted ?? false,
      releaseRegime: lifecycle?.releaseRegime
        ? { ...lifecycle.releaseRegime, pmf: [...lifecycle.releaseRegime.pmf] }
        : null,
      settledBin: null,
      settling: { bin: null, enteredAtMs: null },
      outsideSinceMs: null,
    });
    return body;
  }

  private warmUp() {
    this.closeGate();
    for (let step = 0; step < 180; step += 1) Engine.update(this.physics.engine, FIXED_STEP_MS);
    this.simulationTimeMs = 0;
  }

  private moveHopper(hopperPosition: number) {
    const previousGeometry = this.physics.geometry;
    const nextGeometry = createBoardGeometry(hopperPosition);
    const deltaX = nextGeometry.hopper.throatX - previousGeometry.hopper.throatX;
    if (deltaX === 0) return;

    this.physics.bodies.hopperWalls.forEach((body) => Body.translate(body, { x: deltaX, y: 0 }));
    Body.translate(this.physics.bodies.gate, { x: deltaX, y: 0 });
    for (const { body, released } of this.balls.values()) {
      if (released || body.position.y > previousGeometry.hopper.bottom + BOARD.ballRadius) continue;
      Body.translate(body, { x: deltaX, y: 0 });
      Sleeping.set(body, false);
    }
    this.physics.geometry = nextGeometry;
  }

  private captureGateSchedule(): PausedGateSchedule | null {
    if (this.releaseDueAtMs !== null) {
      return {
        phase: 'release-delay',
        remainingMs: Math.max(0, this.releaseDueAtMs - Date.now()),
      };
    }
    if (this.safetyDueAtMs !== null) {
      return {
        phase: 'safety',
        remainingMs: Math.max(0, this.safetyDueAtMs - Date.now()),
      };
    }
    return null;
  }

  private restoreGateSchedule(schedule: PausedGateSchedule | null) {
    if (schedule?.phase === 'release-delay') {
      this.scheduleGateOpening(schedule.remainingMs);
    } else if (schedule?.phase === 'safety') {
      this.openGate(schedule.remainingMs);
    } else {
      this.openGate();
    }
  }

  private afterFixedStep() {
    this.flushRouteImpulses();
    this.captureGateCrossing();
    this.applyHopperFeed();
    for (const state of [...this.balls.values()]) {
      if (!state.released || state.settledBin !== null) continue;
      if (this.recycleIfLost(state)) continue;
      const bin = classifySettledBall(
        state.body,
        this.physics.geometry,
        state.settling,
        this.simulationTimeMs,
      );
      if (bin !== null) this.settle(state, bin);
    }
    this.updateCompletion();
    this.notify();
  }

  private applyHopperFeed() {
    if (this.status !== 'running' || !this.gateOpen) return;
    const waiting = [...this.balls.values()].filter(({ released }) => !released);
    const next = waiting.reduce<BallState | null>((lowest, state) => (
      lowest === null || state.body.position.y > lowest.body.position.y ? state : lowest
    ), null);
    if (!next) return;
    const deltaX = this.physics.geometry.hopper.throatX - next.body.position.x;
    Sleeping.set(next.body, false);
    Body.setVelocity(next.body, {
      x: Math.max(-HOPPER_FEED_HORIZONTAL_SPEED, Math.min(HOPPER_FEED_HORIZONTAL_SPEED, deltaX)),
      y: Math.max(next.body.velocity.y, HOPPER_FEED_VERTICAL_SPEED),
    });
  }

  private captureGateCrossing() {
    if (this.status !== 'running' || !this.gateOpen) return;
    const crossing = [...this.balls.values()].find(({ body, released }) => (
      !released && body.position.y > this.physics.geometry.hopper.bottom + BOARD.ballRadius
    ));
    if (!crossing) return;

    crossing.released = true;
    crossing.assignmentLocked = true;
    crossing.body.plugin.galton.released = true;
    if (!crossing.releaseCounted) {
      const pmf = buildExpectedPmf(this.settings);
      const mode = modeFor(this.settings);
      crossing.releaseCounted = true;
      crossing.releaseRegime = { pmf: [...pmf], mode };
      const previous = this.regimes.at(-1);
      if (previous && settingsMatch(previous, pmf, mode)) previous.released += 1;
      else this.regimes.push({ pmf: [...pmf], released: 1, mode });
    }

    this.cancelReleaseTimers();
    this.closeGate();
    if (this.hopperCount() === 0) this.status = 'settling';
    else this.scheduleGateOpening();
  }

  private guideCollisions(event: IEventCollision<Engine>) {
    for (const { bodyA, bodyB } of event.pairs) {
      const ball = bodyA.label === 'ball' ? bodyA : bodyB.label === 'ball' ? bodyB : null;
      const other = ball === bodyA ? bodyB : bodyA;
      if (!ball || other.label !== 'peg') continue;
      const state = this.balls.get(ball.id);
      const targetBin = ball.plugin.galton.targetBin;
      if (!state?.released || state.settledBin !== null || typeof targetBin !== 'number') continue;
      const pegRow = other.plugin.galton.pegRow;
      if (typeof pegRow !== 'number') continue;
      this.applyRouteImpulse(ball, pegRow);
    }
  }

  private applyRouteImpulse(ball: Body, row: number) {
    const nextRouteRow = ball.plugin.galton.nextRouteRow ?? 0;
    if (row < nextRouteRow) return;
    const direction = ball.plugin.galton.route?.[row];
    if (direction !== -1 && direction !== 1) return;
    ball.plugin.galton.nextRouteRow = row + 1;
    this.pendingRouteImpulses.push({ ball, row });
  }

  private flushRouteImpulses() {
    for (const { ball, row } of this.pendingRouteImpulses.splice(0)) {
      const direction = ball.plugin.galton.route?.[row];
      if (direction !== -1 && direction !== 1) continue;
      Body.applyForce(ball, ball.position, { x: direction * ROUTE_IMPULSE, y: 0 });
    }
  }

  private settle(state: BallState, bin: number) {
    if (state.settledBin !== null) return;
    state.settledBin = bin;
    state.body.plugin.galton.settled = true;
    this.settledBins.push(bin);
    const targetBin = typeof state.body.plugin.galton.targetBin === 'number'
      ? state.body.plugin.galton.targetBin
      : null;
    this.settlementDiagnostics.push({
      logicalBallId: state.logicalBallId,
      physicalBodyId: state.body.id,
      targetBin,
      settledBin: bin,
      matchesTarget: targetBin === bin,
    });
    Sleeping.set(state.body, true);
    Events.trigger(state.body, 'settled', { bin });
  }

  private recycleIfLost(state: BallState) {
    const { x, y } = state.body.position;
    const outside = x < -BOARD.ballRadius || x > BOARD.width + BOARD.ballRadius
      || y < -BOARD.ballRadius * 3 || y > BOARD.height + BOARD.ballRadius;
    if (!outside) {
      state.outsideSinceMs = null;
      return false;
    }
    if (state.outsideSinceMs === null) {
      state.outsideSinceMs = this.simulationTimeMs;
      return false;
    }
    if (this.simulationTimeMs - state.outsideSinceMs < RECYCLE_DWELL_MS) return false;

    const assignment: BallAssignment = {
      targetBin: state.body.plugin.galton.targetBin as number,
      route: [...(state.body.plugin.galton.route ?? [])],
    };
    Composite.remove(this.physics.world, state.body);
    this.balls.delete(state.body.id);
    this.cancelReleaseTimers();
    this.closeGate();
    const replacementPosition = this.findReplacementPosition();
    const replacement = this.createBall(
      replacementPosition.x,
      replacementPosition.y,
      assignment,
      {
        logicalBallId: state.logicalBallId,
        assignmentLocked: true,
        releaseCounted: state.releaseCounted,
        releaseRegime: state.releaseRegime,
      },
    );
    Composite.add(this.physics.world, replacement);
    this.recycledCount += 1;
    if (this.status === 'settling') this.status = 'running';
    if (this.status === 'running') this.scheduleGateOpening();
    return true;
  }

  private findReplacementPosition() {
    const { hopper } = this.physics.geometry;
    const spacing = (BOARD.ballRadius + BALL_COLLISION_SKIN) * 2 + 0.2;
    const wallInset = hopper.wallThickness / 2 + BOARD.ballRadius + BALL_COLLISION_SKIN + 1;
    const existing = [...this.balls.values()].map(({ body }) => body.position);

    for (
      let y = hopper.top + wallInset;
      y <= hopper.bottom - BOARD.gateHeight / 2 - wallInset;
      y += spacing
    ) {
      const progress = (y - hopper.top) / (hopper.bottom - hopper.top);
      const left = hopper.left + progress * (hopper.leftWallEnd.x - hopper.left) + wallInset;
      const right = hopper.right + progress * (hopper.rightWallEnd.x - hopper.right) - wallInset;
      for (let x = left; x <= right; x += spacing) {
        if (existing.every((position) => Math.hypot(position.x - x, position.y - y) >= spacing)) {
          return { x, y };
        }
      }
    }

    throw new Error('No non-overlapping hopper position is available for a recycled ball');
  }

  private updateCompletion() {
    if (this.hopperCount() !== 0 || this.activeCount() !== 0) return;
    for (const { body, settledBin } of this.balls.values()) {
      if (settledBin !== null) Sleeping.set(body, true);
    }
    this.cancelReleaseTimers();
    this.closeGate();
    this.status = 'complete';
  }

  private hopperCount() {
    return [...this.balls.values()].filter(({ released }) => !released).length;
  }

  private activeCount() {
    return [...this.balls.values()].filter(({ released, settledBin }) => released && settledBin === null).length;
  }

  private openGate(safetyMs = GATE_SAFETY_MS) {
    if (
      this.visibilitySuspended
      || this.status !== 'running'
      || this.hopperCount() === 0
      || this.safetyTimer !== null
    ) return;
    Body.setPosition(this.physics.bodies.gate, {
      x: this.physics.geometry.hopper.gateOpenX,
      y: this.physics.geometry.hopper.bottom,
    });
    this.physics.bodies.gate.collisionFilter.mask = CLOSED_GATE_MASK;
    this.gateOpen = true;
    for (const { body, released } of this.balls.values()) {
      if (!released) Sleeping.set(body, false);
    }
    this.safetyDueAtMs = Date.now() + safetyMs;
    this.safetyTimer = setTimeout(() => {
      this.safetyTimer = null;
      this.safetyDueAtMs = null;
      this.closeGate();
      if (this.status === 'running' && this.hopperCount() > 0) this.scheduleGateOpening();
      this.notify();
    }, safetyMs);
  }

  private closeGate() {
    this.gateOpen = false;
    if (this.physics) {
      Body.setPosition(this.physics.bodies.gate, {
        x: this.physics.geometry.hopper.gateClosedX,
        y: this.physics.geometry.hopper.bottom,
      });
      this.physics.bodies.gate.collisionFilter.mask = CLOSED_GATE_MASK;
    }
  }

  private scheduleGateOpening(delayMs = 1000 / Math.max(1, this.settings.releaseRate)) {
    if (this.visibilitySuspended || this.status !== 'running' || this.releaseTimer !== null) return;
    this.releaseDueAtMs = Date.now() + delayMs;
    this.releaseTimer = setTimeout(() => {
      this.releaseTimer = null;
      this.releaseDueAtMs = null;
      this.openGate();
      this.notify();
    }, delayMs);
  }

  private cancelReleaseTimers() {
    if (this.releaseTimer !== null) clearTimeout(this.releaseTimer);
    if (this.safetyTimer !== null) clearTimeout(this.safetyTimer);
    this.releaseTimer = null;
    this.safetyTimer = null;
    this.releaseDueAtMs = null;
    this.safetyDueAtMs = null;
  }

  private disposeWorld() {
    this.cancelReleaseTimers();
    if (!this.physics) return;
    Events.off(this.physics.engine, 'collisionStart', this.collisionHandler);
    Composite.clear(this.physics.world, false, true);
    Engine.clear(this.physics.engine);
  }

  private notify() {
    this.cachedSnapshot = null;
    this.listeners.forEach((listener) => listener());
  }
}
