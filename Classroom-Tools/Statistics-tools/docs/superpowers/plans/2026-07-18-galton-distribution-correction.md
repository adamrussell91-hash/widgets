# Galton Studio Distribution Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every completed Galton Studio batch physically settle into seeded, balanced target-bin counts derived from the active neutral, skew, and kurtosis PMF.

**Architecture:** Add a pure allocation module that converts a PMF into seeded largest-remainder quotas and ten-row routes. Store peg rows and ball assignments in Matter.js plugin metadata. The controller assigns every unreleased ball through the same PMF-driven path, consumes one route decision per peg row, and applies bounded steering while preserving real bodies and physical settling.

**Tech Stack:** TypeScript 7, Matter.js 0.20, React 19, Vitest 4, pnpm 11, Vite 8.

## Global Constraints

- Keep 10 staggered peg rows and 11 bins numbered `0..10`.
- Keep 100 real Matter.js ball bodies per batch and the existing 600-body cap.
- Never teleport a released ball, replace settled bodies, or count a target instead of the physical resting bin.
- Every quota list must sum exactly to the requested allocation count and stay within one ball per bin of the PMF expectation.
- Seeds must reproduce quota ties, target order, routes, and settled outcomes.
- Keep pause, resume, reset, refill, Keep-mode regimes, statistics, accessibility, and GitHub Pages behaviour intact.
- Use failing tests before each production change.

## File map

- Create `galton-studio/src/model/allocation.ts`: pure quota, shuffle, and route construction.
- Create `galton-studio/src/model/allocation.test.ts`: allocation and determinism tests.
- Modify `galton-studio/src/physics/world.ts`: peg-row and ball-route plugin metadata.
- Modify `galton-studio/src/physics/world.test.ts`: peg metadata assertions.
- Modify `galton-studio/src/physics/controller.ts`: assignment lifecycle, recycling, route impulses, corrective steering.
- Modify `galton-studio/src/physics/controller.test.ts`: controller metadata and settings lifecycle tests.
- Create `galton-studio/src/physics/controller.distribution.test.ts`: real-controller settling regressions.
- Modify `galton-studio/src/App.tsx`, `src/components/ControlPanel.tsx`, `src/components/StatsPanel.tsx`, and their tests: honest model-driven mode copy.
- Modify `galton-studio/README.md`: explain balanced PMF allocation and physical routing.

---

### Task 1: Seeded PMF allocation and routes

**Files:**
- Create: `Classroom-Tools/Statistics-tools/galton-studio/src/model/allocation.ts`
- Create: `Classroom-Tools/Statistics-tools/galton-studio/src/model/allocation.test.ts`

**Interfaces:**
- Consumes: `Rng = () => number` from `src/model/prng.ts`; `BIN_COUNT` from `src/model/types.ts`.
- Produces: `RouteDirection`, `BallAssignment`, `allocateTargetBins(pmf, count, rng)`, `buildRoute(targetBin, rng)`, and `buildBallAssignments(pmf, count, rng)`.

- [ ] **Step 1: Write failing allocation tests**

```ts
import { describe, expect, it } from 'vitest';
import { buildExpectedPmf } from './distribution';
import { createRng } from './prng';
import { allocateTargetBins, buildBallAssignments, buildRoute } from './allocation';

const neutral = {
  hopperPosition: 0,
  skew: 0,
  kurtosis: 3,
  releaseRate: 6,
  changeBehavior: 'keep' as const,
};

describe('balanced ball allocation', () => {
  it('allocates exactly 100 neutral targets within one ball of expectation', () => {
    const pmf = buildExpectedPmf(neutral);
    const targets = allocateTargetBins(pmf, 100, createRng(42));
    const counts = Array(11).fill(0) as number[];
    targets.forEach((bin) => { counts[bin] += 1; });
    expect(targets).toHaveLength(100);
    counts.forEach((count, bin) => expect(Math.abs(count - pmf[bin]! * 100)).toBeLessThan(1));
  });

  it('reproduces assignments for the same seed', () => {
    const pmf = buildExpectedPmf({ ...neutral, skew: 0.8 });
    expect(buildBallAssignments(pmf, 100, createRng(77)))
      .toEqual(buildBallAssignments(pmf, 100, createRng(77)));
  });

  it.each([0, 1, 5, 10])('builds a ten-row route ending in bin %i', (targetBin) => {
    const route = buildRoute(targetBin, createRng(9));
    expect(route).toHaveLength(10);
    expect(route.filter((direction) => direction === 1)).toHaveLength(targetBin);
  });

  it('normalizes invalid mass and returns only valid bins', () => {
    const targets = allocateTargetBins([Number.NaN, -1, 2], 17, createRng(3));
    expect(targets).toHaveLength(17);
    expect(targets.every((bin) => bin >= 0 && bin <= 10)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test -- src/model/allocation.test.ts`

Expected: FAIL because `./allocation` does not exist.

- [ ] **Step 3: Implement the pure allocation module**

```ts
import { BIN_COUNT } from './types';
import type { Rng } from './prng';

export type RouteDirection = -1 | 1;

export interface BallAssignment {
  targetBin: number;
  route: RouteDirection[];
}

function normalizedPmf(pmf: readonly number[]): number[] {
  const weights = Array.from({ length: BIN_COUNT }, (_, bin) => {
    const value = pmf[bin] ?? 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  return total > 0 ? weights.map((value) => value / total) : Array(BIN_COUNT).fill(1 / BIN_COUNT);
}

function shuffle<T>(values: T[], rng: Rng): T[] {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex]!, values[index]!];
  }
  return values;
}

export function allocateTargetBins(pmf: readonly number[], count: number, rng: Rng): number[] {
  const size = Math.max(0, Math.floor(count));
  const probabilities = normalizedPmf(pmf);
  const expected = probabilities.map((probability) => probability * size);
  const quotas = expected.map(Math.floor);
  const remaining = size - quotas.reduce((sum, quota) => sum + quota, 0);
  const seats = expected
    .map((value, bin) => ({ bin, remainder: value - quotas[bin]!, tie: rng() }))
    .sort((a, b) => b.remainder - a.remainder || a.tie - b.tie);
  seats.slice(0, remaining).forEach(({ bin }) => { quotas[bin] += 1; });
  return shuffle(quotas.flatMap((quota, bin) => Array(quota).fill(bin) as number[]), rng);
}

export function buildRoute(targetBin: number, rng: Rng): RouteDirection[] {
  const rights = Math.max(0, Math.min(BIN_COUNT - 1, Math.round(targetBin)));
  return shuffle([
    ...Array<RouteDirection>(rights).fill(1),
    ...Array<RouteDirection>(BIN_COUNT - 1 - rights).fill(-1),
  ], rng);
}

export function buildBallAssignments(
  pmf: readonly number[],
  count: number,
  rng: Rng,
): BallAssignment[] {
  return allocateTargetBins(pmf, count, rng).map((targetBin) => ({
    targetBin,
    route: buildRoute(targetBin, rng),
  }));
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm test -- src/model/allocation.test.ts src/model/distribution.test.ts`

Expected: both files PASS.

- [ ] **Step 5: Commit**

```bash
git add Classroom-Tools/Statistics-tools/galton-studio/src/model/allocation.ts Classroom-Tools/Statistics-tools/galton-studio/src/model/allocation.test.ts
git commit -m "feat: allocate balanced Galton targets"
```

---

### Task 2: Add physical row and route metadata

**Files:**
- Modify: `Classroom-Tools/Statistics-tools/galton-studio/src/physics/world.ts`
- Modify: `Classroom-Tools/Statistics-tools/galton-studio/src/physics/world.test.ts`

**Interfaces:**
- Consumes: `RouteDirection` from `src/model/allocation.ts`.
- Produces: `GaltonBodyPlugin.galton.pegRow`, `.route`, and `.nextRouteRow` metadata used by the controller.

- [ ] **Step 1: Add a failing world test**

```ts
it('labels each peg with its physical row', () => {
  const physics = createPhysicsWorld();
  physics.geometry.pegRows.forEach(({ row, pegs }) => {
    const bodies = physics.bodies.pegs.filter((peg) => peg.plugin.galton.pegRow === row);
    expect(bodies).toHaveLength(pegs.length);
  });
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `pnpm test -- src/physics/world.test.ts`

Expected: FAIL because peg bodies have no `pegRow` metadata.

- [ ] **Step 3: Add metadata types and populate pegs**

Import `RouteDirection`, add optional `pegRow`, `route`, and `nextRouteRow` properties to `GaltonBodyPlugin`, and replace peg creation with:

```ts
const pegs = geometry.pegRows.flatMap(({ row, pegs }) => pegs.map(({ x, y }) => (
  Bodies.circle(x, y, BOARD.pegRadius, {
    ...staticBodyOptions('peg'),
    plugin: { galton: { tag: 'peg', pegRow: row } },
  })
)));
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm test -- src/physics/world.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Classroom-Tools/Statistics-tools/galton-studio/src/physics/world.ts Classroom-Tools/Statistics-tools/galton-studio/src/physics/world.test.ts
git commit -m "feat: tag Galton peg rows"
```

---

### Task 3: Assign every unreleased body from the active PMF

**Files:**
- Modify: `Classroom-Tools/Statistics-tools/galton-studio/src/physics/controller.ts`
- Modify: `Classroom-Tools/Statistics-tools/galton-studio/src/physics/controller.test.ts`

**Interfaces:**
- Consumes: `buildBallAssignments()` and `BallAssignment` from `src/model/allocation.ts`.
- Produces: every waiting ball has a numeric `targetBin`, ten-direction `route`, and `nextRouteRow = 0` before release.

- [ ] **Step 1: Replace the old natural-null assertion with failing assignment tests**

```ts
it.each([
  ['neutral', neutral],
  ['skewed', { ...neutral, skew: 0.7 }],
  ['heavy-tailed', { ...neutral, kurtosis: 6 }],
])('preassigns balanced targets and routes in %s mode', (_label, settings) => {
  const instance = tracked(settings);
  const bodies = instance.snapshot().ballBodies;
  expect(bodies.every((body) => Number.isInteger(body.plugin.galton.targetBin))).toBe(true);
  expect(bodies.every((body) => body.plugin.galton.route?.length === 10)).toBe(true);
});

it('regenerates only unreleased assignments after a Keep-mode change', () => {
  const instance = tracked();
  const released = releaseOne(instance);
  const releasedAssignment = {
    targetBin: released.plugin.galton.targetBin,
    route: [...released.plugin.galton.route!],
  };
  const waitingBefore = instance.snapshot().ballBodies
    .filter((body) => !body.plugin.galton.released)
    .map((body) => body.plugin.galton.targetBin);
  instance.setSettings({ ...neutral, skew: 0.8 });
  const waitingAfter = instance.snapshot().ballBodies
    .filter((body) => !body.plugin.galton.released)
    .map((body) => body.plugin.galton.targetBin);
  expect(released.plugin.galton.targetBin).toBe(releasedAssignment.targetBin);
  expect(released.plugin.galton.route).toEqual(releasedAssignment.route);
  expect(waitingAfter).not.toEqual(waitingBefore);
});
```

- [ ] **Step 2: Run controller tests and verify RED**

Run: `pnpm test -- src/physics/controller.test.ts`

Expected: FAIL because neutral targets are `null` and routes are absent.

- [ ] **Step 3: Implement assignment lifecycle**

Add `assignUnreleasedBalls()`:

```ts
private assignUnreleasedBalls() {
  const waiting = [...this.balls.values()].filter(({ released }) => !released);
  const assignments = buildBallAssignments(buildExpectedPmf(this.settings), waiting.length, this.rng);
  waiting.forEach(({ body }, index) => {
    const assignment = assignments[index]!;
    body.plugin.galton.targetBin = assignment.targetBin;
    body.plugin.galton.route = [...assignment.route];
    body.plugin.galton.nextRouteRow = 0;
  });
}
```

Call it after `loadPhysicalBalls()` during initial creation and refill, and after `this.settings = cloneSettings(settings)` in `setSettings()`. Initialize new ball metadata with `targetBin: null`, `route: []`, and `nextRouteRow: 0`. In `captureGateCrossing()`, remove `sampleBin()` and retain the preassigned target and route.

- [ ] **Step 4: Preserve assignments during recycling**

Change `createBall` to accept an optional `BallAssignment`; when recycling, capture the lost body's target and route before deletion and pass them to the replacement. Reset only `nextRouteRow` to zero.

- [ ] **Step 5: Run controller tests and verify GREEN**

Run: `pnpm test -- src/physics/controller.test.ts src/model/allocation.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add Classroom-Tools/Statistics-tools/galton-studio/src/physics/controller.ts Classroom-Tools/Statistics-tools/galton-studio/src/physics/controller.test.ts
git commit -m "feat: assign all Galton ball routes"
```

---

### Task 4: Consume routes and physically reach allocated bins

**Files:**
- Modify: `Classroom-Tools/Statistics-tools/galton-studio/src/physics/controller.ts`
- Modify: `Classroom-Tools/Statistics-tools/galton-studio/src/physics/controller.test.ts`
- Create: `Classroom-Tools/Statistics-tools/galton-studio/src/physics/controller.distribution.test.ts`

**Interfaces:**
- Consumes: peg `pegRow` metadata and ball `route` metadata.
- Produces: `applyRouteImpulse(ball, row)` and `applyCorrectiveSteering(state)` controller behaviour.

- [ ] **Step 1: Add a failing one-decision-per-row test**

```ts
it('consumes at most one route decision for repeated contacts in a peg row', () => {
  const instance = tracked();
  const ball = releaseOne(instance);
  const internal = instance as unknown as { guideCollisions(event: unknown): void };
  const peg = (instance.snapshot().apparatusGeometry!.pegRows[0]!.pegs[0]);
  const pegBody = ((instance as any).physics.bodies.pegs as Body[])
    .find((body) => body.plugin.galton.pegRow === 0)!;
  const pair = { bodyA: ball, bodyB: pegBody };
  internal.guideCollisions({ pairs: [pair] });
  internal.guideCollisions({ pairs: [pair] });
  expect(ball.plugin.galton.nextRouteRow).toBe(1);
  expect(peg).toBeDefined();
});
```

- [ ] **Step 2: Add a failing physical distribution regression**

Create a helper that uses fake timers, releases each waiting body immediately below the open gate, then advances real `GaltonController.step()` frames until that body settles before releasing the next. For neutral and shaped settings, assert:

```ts
expect(snapshot.status).toBe('complete');
expect(snapshot.settledBins).toHaveLength(100);
expect(histogram(snapshot.settledBins)).toEqual(histogram(assignedTargets));
expect(snapshot.ballBodies.every((body) => body.plugin.galton.settled)).toBe(true);
```

Use fixed seeds for neutral, `skew: -0.8`, `skew: 0.8`, `kurtosis: 1.8`, and `kurtosis: 6`.

- [ ] **Step 3: Run both tests and verify RED**

Run: `pnpm test -- src/physics/controller.test.ts src/physics/controller.distribution.test.ts`

Expected: route progress does not change and physical settled counts do not match targets.

- [ ] **Step 4: Implement one impulse per peg row**

Use these initial bounded constants and adjust only from integration evidence:

```ts
const ROUTE_IMPULSE = 0.000055;
const MAX_STEERING_FORCE = 0.000022;
const STEERING_GAIN = 0.00000018;
```

On a ball/peg collision, read `pegRow`. Ignore a row below `nextRouteRow`, consume `route[pegRow]`, set `nextRouteRow = pegRow + 1`, and apply `direction * ROUTE_IMPULSE` horizontally.

- [ ] **Step 5: Implement bounded between-row corrective steering**

For released, unsettled bodies between `BOARD.pegTop` and `BOARD.funnelTop`, interpolate a desired x-coordinate from the hopper throat to the target-bin centre using vertical progress. Apply a horizontal force clamped to `MAX_STEERING_FORCE`:

```ts
const progress = Math.max(0, Math.min(1,
  (body.position.y - BOARD.pegTop) / (BOARD.funnelTop - BOARD.pegTop),
));
const targetX = geometry.bins[targetBin]!.centreX;
const desiredX = geometry.hopper.throatX + (targetX - geometry.hopper.throatX) * progress;
const forceX = Math.max(-MAX_STEERING_FORCE, Math.min(
  MAX_STEERING_FORCE,
  (desiredX - body.position.x) * STEERING_GAIN,
));
Body.applyForce(body, body.position, { x: forceX, y: 0 });
```

Call steering once per fixed step before settlement classification. Do not apply it at or below `BOARD.funnelTop`.

- [ ] **Step 6: Calibrate with the physical regression only**

Run: `pnpm test -- src/physics/controller.distribution.test.ts`

Expected: all five fixed-seed scenarios settle 100 bodies and their physical histograms equal assigned-target histograms. If a body misses, change only the three bounded steering constants, rerunning this command after each single change.

- [ ] **Step 7: Run controller and world tests**

Run: `pnpm test -- src/physics/controller.test.ts src/physics/controller.distribution.test.ts src/physics/world.test.ts`

Expected: PASS with no warnings.

- [ ] **Step 8: Commit**

```bash
git add Classroom-Tools/Statistics-tools/galton-studio/src/physics/controller.ts Classroom-Tools/Statistics-tools/galton-studio/src/physics/controller.test.ts Classroom-Tools/Statistics-tools/galton-studio/src/physics/controller.distribution.test.ts
git commit -m "fix: steer physical balls to balanced targets"
```

---

### Task 5: Make simulation disclosure accurate

**Files:**
- Modify: `Classroom-Tools/Statistics-tools/galton-studio/src/App.tsx`
- Modify: `Classroom-Tools/Statistics-tools/galton-studio/src/App.test.tsx`
- Modify: `Classroom-Tools/Statistics-tools/galton-studio/src/components/ControlPanel.tsx`
- Modify: `Classroom-Tools/Statistics-tools/galton-studio/src/components/ControlPanel.test.tsx`
- Modify: `Classroom-Tools/Statistics-tools/galton-studio/src/components/StatsPanel.tsx`
- Modify: `Classroom-Tools/Statistics-tools/galton-studio/src/components/StatsPanel.test.tsx`
- Modify: `Classroom-Tools/Statistics-tools/galton-studio/src/components/EducationPanel.tsx`
- Modify: `Classroom-Tools/Statistics-tools/galton-studio/README.md`

**Interfaces:**
- Consumes: existing `PhysicsMode` only for naming the selected PMF family.
- Produces: honest user-facing disclosure that every distribution is model-driven and physically animated.

- [ ] **Step 1: Write failing copy assertions**

Update component tests to expect `Model-driven physics` in neutral mode and `Shaped model-driven physics` when skew or kurtosis is non-neutral. Assert the education disclosure mentions balanced target allocation and physical steering.

- [ ] **Step 2: Run component tests and verify RED**

Run: `pnpm test -- src/App.test.tsx src/components/ControlPanel.test.tsx src/components/StatsPanel.test.tsx`

Expected: FAIL with the old `Natural physics` / `Guided demonstration` strings.

- [ ] **Step 3: Update UI copy and README**

Replace the old labels consistently. Rewrite README's mode section to state that the active PMF allocates balanced seeded targets and that bounded peg-contact steering keeps real Matter.js bodies on those routes. Explicitly state that observed variation is in path and arrival order, while full-batch quotas are intentionally kept close to expectation for classroom reliability.

- [ ] **Step 4: Run component tests and verify GREEN**

Run: `pnpm test -- src/App.test.tsx src/components/ControlPanel.test.tsx src/components/StatsPanel.test.tsx src/components/EducationPanel.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Classroom-Tools/Statistics-tools/galton-studio/src/App.tsx Classroom-Tools/Statistics-tools/galton-studio/src/App.test.tsx Classroom-Tools/Statistics-tools/galton-studio/src/components Classroom-Tools/Statistics-tools/galton-studio/README.md
git commit -m "docs: disclose model-driven Galton physics"
```

---

### Task 6: Full regression and production verification

**Files:**
- Modify only files implicated by verification failures.

**Interfaces:**
- Consumes: all preceding tasks.
- Produces: a clean, buildable local branch ready for review and optional publication.

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`

Expected: all test files PASS with zero failures.

- [ ] **Step 2: Run the production build**

Run: `pnpm build`

Expected: TypeScript and Vite complete with exit code 0 and no warnings.

- [ ] **Step 3: Check repository state and patch quality**

Run: `git diff --check`

Expected: no output.

Run: `git status --short`

Expected: only intentional source, test, documentation, and generated deployment files are listed; no `node_modules`, temporary diagnostics, or unrelated files.

- [ ] **Step 4: Commit any verification-only corrections**

Stage only files needed for a failing test or build and commit with a narrowly scoped message. Do not push; publication requires explicit user approval.
