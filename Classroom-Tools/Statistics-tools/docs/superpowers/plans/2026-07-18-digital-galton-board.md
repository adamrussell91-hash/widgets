# Digital Galton Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a refined, GitHub Pages-compatible Galton board in which visible rigid-body balls fall from a physical hopper through pegs into bins while accurate descriptive statistics and post-run theoretical overlays explain the resulting distribution.

**Architecture:** A React/Vite shell owns experiment state and accessible controls. A Matter.js simulation controller owns the rigid-body world and emits settled-ball events; pure TypeScript modules own probability models and descriptive statistics. A custom Canvas 2D renderer draws the physical apparatus from the same geometry used for collisions, then draws analytical overlays only after a run completes.

**Tech Stack:** React, TypeScript, Vite, Matter.js, Canvas 2D, Vitest, Testing Library, CSS, Lucide React.

**Project root:** Create the application and its Git repository in `galton-studio/` because the enclosing ChatGPT project mirror has protected repository metadata. Every implementation path and command below is relative to `galton-studio/` unless explicitly stated otherwise.

## Global Constraints

- Static site only: no backend, database, authentication, or cloud state.
- Production assets must work under a GitHub Pages subpath by using Vite base `./`.
- Ten staggered peg rows and eleven labelled physical collection bins.
- One hundred real rigid-body balls per batch; no more than 600 settled bodies before Reset is required.
- Every ball remains an individual Matter.js body from visible hopper storage through final settling.
- Never replace settled balls with a grid, histogram fill, snapped layout, or decorative pile.
- Natural physics at centred hopper, zero skew, and mesokurtic settings; disclose Guided demonstration mode whenever skewness or kurtosis is non-neutral.
- Keep hopper position, skewness, and kurtosis as separate controls.
- Use descriptive population moments for the observed dataset and Pearson kurtosis with mesokurtic reference value 3.
- Hide expected-frequency bars and the classic-red theoretical curve before and during a run; reveal them only after completion.
- Use the approved Frosted Notebook visual direction: pearl glass, faint graph paper, cobalt/teal observations, and classic red theoretical analysis.
- Meet WCAG 2.1 AA, provide keyboard operation, visible focus, labelled controls, reduced-motion support, and 44-by-44-pixel touch targets.
- Use test-driven development and commit after each independently testable task.

---

## File map

```text
index.html                         Browser entry document
package.json                       Dependencies and scripts
tsconfig.json                      TypeScript project references
tsconfig.app.json                  Browser TypeScript settings
tsconfig.node.json                 Vite configuration TypeScript settings
vite.config.ts                     Vite, Vitest, and relative production base
src/main.tsx                       React entry point
src/App.tsx                        Top-level experiment composition
src/styles.css                     Frosted Notebook design system and responsive layout
src/test/setup.ts                  Testing Library matchers and browser shims
src/model/types.ts                 Shared experiment, model, and statistics contracts
src/model/prng.ts                  Seeded pseudorandom generator
src/model/distribution.ts          Natural/guided PMFs, sampling, and mixture history
src/model/statistics.ts            Descriptive moments and per-bin summaries
src/physics/geometry.ts            Single source of truth for apparatus coordinates
src/physics/world.ts               Matter.js bodies and collision tags
src/physics/settling.ts            Deterministic bin and dwell classification
src/physics/controller.ts          Hopper gate, stepping, guidance, run lifecycle, events
src/physics/render.ts              Canvas drawing for apparatus, bodies, and overlays
src/hooks/useGaltonExperiment.ts   React adapter for the simulation controller
src/components/BoardCanvas.tsx     Canvas lifecycle, resize, and accessible summary
src/components/ControlPanel.tsx    Run/reset/refill and parameter controls
src/components/StatsPanel.tsx      Totals, moments, interpretations, and formula
src/components/BinReadouts.tsx     Per-bin count, percentage, and z-score UI
src/components/EducationPanel.tsx  “Why?” disclosures and observed/expected explanation
src/components/AppErrorBoundary.tsx Calm retry state for renderer or simulation failures
src/**/*.test.ts(x)                Co-located unit and component tests
.github/workflows/deploy.yml       Optional GitHub Pages deployment workflow
README.md                          Local use, controls, model disclosure, and deployment
```

---

### Task 1: Create the tested React/Vite shell

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/test/setup.ts`
- Create: `src/App.test.tsx`

**Interfaces:**
- Consumes: none.
- Produces: a Vite React application, Vitest environment, `App` component, and project scripts used by every later task.

- [ ] **Step 1: Create the application repository, package manifest, and resolved stable dependencies**

From the enclosing workspace, create and enter the project repository:

```bash
mkdir -p galton-studio
cd galton-studio
git init -b main
```

Expected: an empty Git repository exists at `galton-studio/.git` on branch `main`.

Create `package.json` with:

```json
{
  "name": "galton-studio",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview"
  }
}
```

Run from `galton-studio/`:

```bash
npm install react react-dom matter-js lucide-react
npm install --save-dev vite typescript @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom @types/matter-js
```

Expected: `package-lock.json` is created and both install commands exit 0.

- [ ] **Step 2: Write the failing application smoke test**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('introduces the physical probability experiment', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /galton studio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run experiment/i })).toBeEnabled();
  });
});
```

- [ ] **Step 3: Add TypeScript, Vite, Vitest, and Testing Library configuration**

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
```

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Create `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Galton Studio</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Run the smoke test and verify the expected failure**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because `src/App.tsx` does not yet exist.

- [ ] **Step 5: Add the minimal accessible shell**

Create `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main>
      <h1>Galton Studio</h1>
      <p>Probability made physical.</p>
      <button type="button">Run experiment</button>
    </main>
  );
}
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Create the initial `src/styles.css`:

```css
*, *::before, *::after { box-sizing: border-box; }
html { color-scheme: light; }
body { margin: 0; min-width: 320px; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
button, input { font: inherit; }
:focus-visible { outline: 3px solid #075d96; outline-offset: 3px; }
```

- [ ] **Step 6: Verify test and production build**

Run: `npm test -- src/App.test.tsx && npm run build`

Expected: one passing test and a successful `dist/` build whose HTML references relative `./assets/...` paths.

- [ ] **Step 7: Commit the shell**

```bash
git add package.json package-lock.json index.html tsconfig*.json vite.config.ts src
git commit -m "chore: scaffold tested Galton Studio app"
```

---

### Task 2: Define experiment contracts and seeded probability models

**Files:**
- Create: `src/model/types.ts`
- Create: `src/model/prng.ts`
- Create: `src/model/prng.test.ts`
- Create: `src/model/distribution.ts`
- Create: `src/model/distribution.test.ts`

**Interfaces:**
- Consumes: Vitest from Task 1.
- Produces: `ExperimentSettings`, `DistributionRegime`, `createRng(seed)`, `buildExpectedPmf(settings)`, `sampleBin(pmf, rng)`, and `combineRegimes(regimes)`.

- [ ] **Step 1: Define exact shared contracts**

Create `src/model/types.ts`:

```ts
export const BIN_COUNT = 11;
export const BATCH_SIZE = 100;
export const MAX_SETTLED_BALLS = 600;

export type RunStatus = 'ready' | 'running' | 'paused' | 'settling' | 'complete' | 'error';
export type ChangeBehavior = 'keep' | 'reset';
export type PhysicsMode = 'natural' | 'guided';

export interface ExperimentSettings {
  hopperPosition: number; // -1 to 1
  skew: number; // -1 to 1
  kurtosis: number; // Pearson target, 1.8 to 6
  releaseRate: number; // balls per second, 1 to 12
  changeBehavior: ChangeBehavior;
}

export interface DistributionRegime {
  pmf: number[];
  released: number;
  mode: PhysicsMode;
}

export interface BinSummary {
  bin: number;
  count: number;
  percentage: number;
  zScore: number | null;
}

export interface DescriptiveSummary {
  count: number;
  mean: number | null;
  variance: number | null;
  standardDeviation: number | null;
  skewness: number | null;
  pearsonKurtosis: number | null;
  bins: BinSummary[];
}
```

- [ ] **Step 2: Write failing PRNG and PMF tests**

Create tests asserting:

```ts
const neutral: ExperimentSettings = {
  hopperPosition: 0,
  skew: 0,
  kurtosis: 3,
  releaseRate: 4,
  changeBehavior: 'keep',
};
const first = createRng(42);
const second = createRng(42);
const meanOf = (pmf: number[]) => pmf.reduce((sum, probability, bin) => sum + probability * bin, 0);
const tailMass = (pmf: number[]) => pmf[0] + pmf[1] + pmf[9] + pmf[10];
expect([first(), first(), first()]).toEqual([second(), second(), second()]);
expect(buildExpectedPmf(neutral)).toHaveLength(11);
expect(buildExpectedPmf(neutral).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
expect(modeFor(neutral)).toBe('natural');
expect(modeFor({ ...neutral, skew: 0.4 })).toBe('guided');
expect(meanOf(buildExpectedPmf({ ...neutral, skew: 0.7 }))).toBeGreaterThan(5);
expect(tailMass(buildExpectedPmf({ ...neutral, kurtosis: 6 }))).toBeGreaterThan(
  tailMass(buildExpectedPmf({ ...neutral, kurtosis: 1.8 })),
);
```

Also test that `combineRegimes` returns the release-count-weighted mixture and that `sampleBin` never returns an index outside `0..10`.

- [ ] **Step 3: Run tests to verify missing-module failures**

Run: `npm test -- src/model/prng.test.ts src/model/distribution.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 4: Implement deterministic random generation**

Implement `createRng` as Mulberry32:

```ts
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 5: Implement natural and guided PMFs**

In `distribution.ts`, clamp inputs, use an ideal 10-step binomial PMF for natural mode, and use a bounded two-piece exponential-power PMF for guided mode:

```ts
export function modeFor(settings: ExperimentSettings): PhysicsMode {
  return Math.abs(settings.skew) < 1e-6 && Math.abs(settings.kurtosis - 3) < 1e-6
    ? 'natural'
    : 'guided';
}

function guidedWeight(x: number, settings: ExperimentSettings): number {
  const centre = 5 + settings.hopperPosition * 2.25;
  const beta = 2 * Math.pow(0.5, (settings.kurtosis - 3) / 3);
  const baseScale = 1.85;
  const scale = x < centre
    ? baseScale * Math.exp(-0.62 * settings.skew)
    : baseScale * Math.exp(0.62 * settings.skew);
  return Math.exp(-Math.pow(Math.abs(x - centre) / scale, beta));
}
```

Normalize every PMF, calculate binomial coefficients without factorials, map hopper position to natural-mode `p` in `0.34..0.66`, sample by cumulative probability, and return a uniform PMF when `combineRegimes` receives no released observations.

- [ ] **Step 6: Run and pass model tests**

Run: `npm test -- src/model/prng.test.ts src/model/distribution.test.ts`

Expected: all PRNG, normalization, mode, directionality, mixture, and sampling tests pass.

- [ ] **Step 7: Commit probability models**

```bash
git add src/model
git commit -m "feat: add seeded distribution models"
```

---

### Task 3: Implement descriptive statistics and bin summaries

**Files:**
- Create: `src/model/statistics.ts`
- Create: `src/model/statistics.test.ts`

**Interfaces:**
- Consumes: `BIN_COUNT`, `BinSummary`, and `DescriptiveSummary` from `types.ts`.
- Produces: `summarizeSettledBins(values: readonly number[], binCount?: number): DescriptiveSummary`.

- [ ] **Step 1: Write explicit failing statistics tests**

Cover empty input, zero variance, percentages summing to 100, mean, population variance, standard deviation, z-score, skewness, Pearson kurtosis, and eleven empty bins. Use the exact dataset `[0, 1, 2, 3, 4]` and assert:

```ts
expect(summary.mean).toBe(2);
expect(summary.variance).toBe(2);
expect(summary.standardDeviation).toBeCloseTo(Math.sqrt(2));
expect(summary.skewness).toBeCloseTo(0);
expect(summary.pearsonKurtosis).toBeCloseTo(1.7);
expect(summary.bins[2].zScore).toBeCloseTo(0);
expect(summary.bins.reduce((sum, bin) => sum + bin.percentage, 0)).toBeCloseTo(100);
```

For `[4, 4, 4]`, assert that standard deviation is `0` and every z-score, skewness, and kurtosis value is `null`.

- [ ] **Step 2: Run the statistics test and verify it fails**

Run: `npm test -- src/model/statistics.test.ts`

Expected: FAIL because `summarizeSettledBins` is missing.

- [ ] **Step 3: Implement one-pass-safe descriptive moments**

Validate that every bin is an integer in range. Compute mean first, central moments `m2`, `m3`, and `m4` in a second pass, and return `null` for undefined statistics. Construct every bin summary, including empty bins:

```ts
const bins = Array.from({ length: binCount }, (_, bin) => ({
  bin,
  count: counts[bin],
  percentage: count === 0 ? 0 : (counts[bin] / count) * 100,
  zScore: standardDeviation && standardDeviation > 0
    ? (bin - mean) / standardDeviation
    : null,
}));
```

Throw `RangeError('Settled bin must be an integer within the board')` for invalid observations so physics classification defects fail loudly in development.

- [ ] **Step 4: Run statistics tests**

Run: `npm test -- src/model/statistics.test.ts`

Expected: every descriptive-statistics test passes.

- [ ] **Step 5: Commit statistics**

```bash
git add src/model/statistics.ts src/model/statistics.test.ts
git commit -m "feat: calculate live Galton statistics"
```

---

### Task 4: Build the shared physical apparatus geometry

**Files:**
- Create: `src/physics/geometry.ts`
- Create: `src/physics/geometry.test.ts`
- Create: `src/physics/world.ts`
- Create: `src/physics/world.test.ts`

**Interfaces:**
- Consumes: Matter.js and `BIN_COUNT`.
- Produces: `BOARD`, `createBoardGeometry()`, `createPhysicsWorld()`, `BodyTag`, and body plugin metadata used by the controller and renderer.

- [ ] **Step 1: Write failing geometry tests**

Assert that geometry has a 720-by-800 logical canvas, ten peg rows containing `1..10` pegs, 55 pegs total, eleven bins, one floor, twelve dividers, two side rails, a hopper reservoir, and a one-ball-width throat. Assert that every bin centre is inside the floor span and every adjacent bin centre is equally spaced.

- [ ] **Step 2: Run tests and verify missing-module failures**

Run: `npm test -- src/physics/geometry.test.ts src/physics/world.test.ts`

Expected: FAIL because geometry and world modules are absent.

- [ ] **Step 3: Implement immutable board geometry**

Create exact logical dimensions:

```ts
export interface Point { x: number; y: number }
export interface PegRow { row: number; pegs: readonly Point[] }
export interface BinGeometry {
  index: number;
  left: number;
  right: number;
  centreX: number;
  top: number;
  bottom: number;
}
export interface BoardGeometry {
  pegRows: readonly PegRow[];
  bins: readonly BinGeometry[];
  dividerXs: readonly number[];
  floorY: number;
  leftRail: { centre: Point; width: number; height: number; angle: number };
  rightRail: { centre: Point; width: number; height: number; angle: number };
  hopper: { left: number; right: number; top: number; bottom: number; throatX: number };
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
  hopperTop: 26,
  hopperBottom: 138,
  hopperWidth: 166,
} as const;
```

Generate peg row `r` with `r + 1` pegs centred around `width / 2`. Generate eleven bins centred on the board and twelve divider x-coordinates. Return frozen arrays so renderer and Matter.js bodies cannot diverge through mutation.

- [ ] **Step 4: Create tagged Matter.js bodies from geometry**

Define tags:

```ts
export type BodyTag =
  | 'ball'
  | 'peg'
  | 'rail'
  | 'divider'
  | 'floor'
  | 'hopper-wall'
  | 'gate';

export interface GaltonBodyPlugin {
  galton: { tag: BodyTag; ballId?: number; released?: boolean };
}
```

Create an engine with sleeping enabled; set gravity to `y: 1`, `scale: 0.001`. Create static circles for pegs, rectangles for floor/dividers/gate, and angled rectangles for rails and hopper walls. Apply `label` plus `plugin.galton` metadata to every body. Return `{ engine, world, bodies, geometry }` without starting a runner.

Export the exact world contract:

```ts
export interface PhysicsWorld {
  engine: Engine;
  world: Composite;
  geometry: BoardGeometry;
  bodies: {
    pegs: Body[];
    rails: Body[];
    dividers: Body[];
    floor: Body;
    hopperWalls: Body[];
    gate: Body;
  };
}

export function createPhysicsWorld(): PhysicsWorld;
```

- [ ] **Step 5: Verify body counts and tags**

Run: `npm test -- src/physics/geometry.test.ts src/physics/world.test.ts`

Expected: all geometry and body-tag tests pass; no body lacks `plugin.galton.tag`.

- [ ] **Step 6: Commit apparatus geometry**

```bash
git add src/physics/geometry.ts src/physics/geometry.test.ts src/physics/world.ts src/physics/world.test.ts
git commit -m "feat: model physical Galton apparatus"
```

---

### Task 5: Implement settling classification and simulation lifecycle

**Files:**
- Create: `src/physics/settling.ts`
- Create: `src/physics/settling.test.ts`
- Create: `src/physics/controller.ts`
- Create: `src/physics/controller.test.ts`

**Interfaces:**
- Consumes: `createPhysicsWorld`, geometry, seeded RNG, PMF sampling, and shared model types.
- Produces: `classifySettledBall`, `GaltonController`, and `GaltonSnapshot`.

Use these public contracts:

```ts
export interface GaltonSnapshot {
  status: RunStatus;
  hopperCount: number;
  activeCount: number;
  settledBins: readonly number[];
  ballBodies: readonly Body[];
  regimes: readonly DistributionRegime[];
  canRefill: boolean;
  recycledCount: number;
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

export interface SettlingMemory {
  bin: number | null;
  enteredAtMs: number | null;
}

export function classifySettledBall(
  body: Body,
  geometry: BoardGeometry,
  memory: SettlingMemory,
  nowMs: number,
): number | null;

export class GaltonController {
  constructor(options: GaltonControllerOptions);
  snapshot(): GaltonSnapshot;
  subscribe(listener: SnapshotListener): () => void;
  run(): void;
  pause(): void;
  resume(): void;
  reset(options: ResetOptions): void;
  refill(seed: number): boolean;
  setSettings(settings: ExperimentSettings): void;
  step(elapsedMs: number): void;
  destroy(): void;
}
```

- [ ] **Step 1: Write failing settling-rule tests**

Define `classifySettledBall(body, geometry, memory, nowMs)` tests using a fresh mutable `SettlingMemory` per ball for:

- `null` above `binTop`.
- `null` when speed exceeds `0.16` logical units per step.
- `null` before a 450 ms dwell interval.
- the correct bin index after the body remains within one bin and below the entry threshold for 450 ms.
- resetting the dwell timer if a later collision pushes the ball into another bin.

- [ ] **Step 2: Write failing controller contract tests**

Use fake timers and a fixed seed to assert:

```ts
const controller = new GaltonController({ seed: 42, settings: neutral });
expect(controller.snapshot().hopperCount).toBe(100);
expect(controller.snapshot().activeCount).toBe(0);
controller.run();
expect(controller.snapshot().status).toBe('running');
controller.pause();
expect(controller.snapshot().status).toBe('paused');
controller.resume();
controller.reset({ seed: 43 });
expect(controller.snapshot().settledBins).toEqual([]);
```

Also assert that neutral settings create no guidance targets, non-neutral settings create targets in `0..10`, a ball emits exactly one `settled` event, Reset cancels release scheduling, and a second `run()` call does not create another schedule.

- [ ] **Step 3: Run tests to verify missing implementations**

Run: `npm test -- src/physics/settling.test.ts src/physics/controller.test.ts`

Expected: FAIL because both modules are absent.

- [ ] **Step 4: Implement physical hopper loading**

Create 100 dynamic ball bodies above the closed gate using seeded jitter. Give each ball restitution `0.38`, friction `0.025`, frictionAir `0.0025`, density `0.0018`, `sleepThreshold: 70`, and a collision group that permits ball-to-ball collisions. Step the engine offscreen for a bounded warm-up of 180 fixed steps with the gate closed so balls form a physical hopper pile before the first frame is shown.

- [ ] **Step 5: Implement metered gate release without teleporting balls**

`run()` opens the gate by changing its collision mask. The controller watches for exactly one unreleased ball crossing below the throat, marks that body `released`, closes the gate, records the current distribution regime, and schedules the next opening from `1000 / releaseRate`. A 650 ms safety timeout recloses the gate if no ball crosses. No released ball position may be reassigned.

- [ ] **Step 6: Implement fixed stepping, guidance, settling, and recycling**

Expose `step(elapsedMs)` that accumulates time and calls `Engine.update(engine, 1000 / 120)` at most eight times per rendered frame. On eligible ball/peg contacts, apply a capped horizontal force toward the sampled target bin only in Guided mode:

```ts
const targetX = geometry.bins[targetBin].centreX;
const direction = Math.sign(targetX - body.position.x);
const distanceFactor = Math.min(1, Math.abs(targetX - body.position.x) / 220);
Body.applyForce(body, body.position, { x: direction * distanceFactor * 0.000018, y: 0 });
```

Call the settling classifier after fixed steps. Emit one settled event, store the bin, and leave the body in the world. If an active ball remains outside the apparatus bounds for two seconds, remove it, return one ball to the closed hopper, and do not emit a settled value.

- [ ] **Step 7: Implement Pause, Resume, Reset, Refill, and completion**

- Pause stops release scheduling and `step` returns without advancing the engine.
- Resume restarts both from the same state.
- Reset removes the engine and timers, creates a new engine and 100-ball physical hopper, clears regimes and settled values, and emits a snapshot.
- Refill adds 100 new physical hopper balls only after the previous batch completes and only if total settled plus hopper balls will not exceed 600.
- Status changes from `running` to `settling` after the last hopper ball crosses the gate and to `complete` after no released unsettled balls remain.

- [ ] **Step 8: Run lifecycle tests**

Run: `npm test -- src/physics/settling.test.ts src/physics/controller.test.ts`

Expected: all hopper-count, scheduling, pause, reset, guidance, counting-once, recycling, refill-limit, and completion tests pass.

- [ ] **Step 9: Commit the controller**

```bash
git add src/physics/settling.ts src/physics/settling.test.ts src/physics/controller.ts src/physics/controller.test.ts
git commit -m "feat: simulate physical ball lifecycle"
```

---

### Task 6: Draw the physical apparatus and post-run overlays

**Files:**
- Create: `src/physics/render.ts`
- Create: `src/physics/render.test.ts`
- Create: `src/components/BoardCanvas.tsx`
- Create: `src/components/BoardCanvas.test.tsx`

**Interfaces:**
- Consumes: controller snapshot, geometry, Matter bodies, expected PMF, and `DescriptiveSummary`.
- Produces: `renderBoard(context, frame)`, `BoardCanvas`, resize behavior, and a text alternative.

Use this render contract:

```ts
export interface RenderFrame {
  geometry: BoardGeometry;
  snapshot: GaltonSnapshot;
  summary: DescriptiveSummary;
  expectedPmf: readonly number[];
  overlayVisible: boolean;
  reducedMotion: boolean;
  overlayProgress: number;
}

export function renderBoard(
  context: CanvasRenderingContext2D,
  frame: RenderFrame,
): void;
```

- [ ] **Step 1: Write failing renderer and component tests**

Use a mocked `CanvasRenderingContext2D` and assert:

- all 55 peg positions are drawn.
- all eleven collection areas and twelve divider lines are drawn.
- every Matter ball body produces one ball draw call at its actual `body.position`.
- the renderer never derives settled-ball positions from bin counts.
- expected bars and red curve are not drawn for `ready`, `running`, `paused`, or `settling`.
- expected bars and curve are drawn for `complete && overlayVisible`.
- `BoardCanvas` exposes an accessible summary such as “57 of 100 balls settled across 11 bins.”

- [ ] **Step 2: Run tests and verify missing-module failures**

Run: `npm test -- src/physics/render.test.ts src/components/BoardCanvas.test.tsx`

Expected: FAIL because renderer and component do not exist.

- [ ] **Step 3: Implement material-specific Canvas primitives**

Create focused functions `drawGraphPaper`, `drawAcrylicPanel`, `drawHopper`, `drawGate`, `drawRails`, `drawPeg`, `drawBin`, `drawBall`, `drawExpectedBars`, and `drawTheoreticalCurve`. Use gradients and one-pixel highlights for acrylic, chrome, and teal glass balls. Draw each ball only from its Matter body:

```ts
export function drawBall(ctx: CanvasRenderingContext2D, body: Body, radius: number) {
  const { x, y } = body.position;
  const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.4, 1, x, y, radius);
  gradient.addColorStop(0, '#ecfeff');
  gradient.addColorStop(0.22, '#55c7d4');
  gradient.addColorStop(1, '#0876a3');
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
}
```

- [ ] **Step 4: Implement scale-safe board rendering**

Set the canvas backing store from `devicePixelRatio`, fit the 720-by-800 logical board with a uniform transform, and use the same geometry object as Matter.js. Do not rebuild bodies when the CSS size changes. Draw in this order: graph paper, acrylic back, expected bars when allowed, rails/hopper/pegs/bins, physical balls, acrylic face highlights, red curve when allowed, labels.

- [ ] **Step 5: Implement the theoretical overlay**

Scale expected probabilities to expected frequencies using settled count. Draw translucent cobalt bars with dashed outlines behind physical balls. Create the red curve with a monotone cubic interpolation through expected bin centres; use `#cf3038`, a 2.25 logical-pixel stroke, and the visible label “Theoretical model.” Respect reduced motion by showing the finished overlay immediately instead of animating opacity.

- [ ] **Step 6: Implement `BoardCanvas` lifecycle**

Use `ResizeObserver` for CSS size, `requestAnimationFrame` for stepping and rendering, `document.visibilitychange` to pause hidden-tab stepping, cleanup for all observers/listeners/frames, and a visually hidden text summary. Catch renderer errors and pass them to the error boundary callback.

- [ ] **Step 7: Verify renderer tests**

Run: `npm test -- src/physics/render.test.ts src/components/BoardCanvas.test.tsx`

Expected: all geometry, actual-body-position, staged-overlay, resizing, cleanup, and accessible-summary tests pass.

- [ ] **Step 8: Commit physical rendering**

```bash
git add src/physics/render.ts src/physics/render.test.ts src/components/BoardCanvas.tsx src/components/BoardCanvas.test.tsx
git commit -m "feat: render the physical Galton board"
```

---

### Task 7: Connect React state to the simulation controller

**Files:**
- Create: `src/hooks/useGaltonExperiment.ts`
- Create: `src/hooks/useGaltonExperiment.test.tsx`

**Interfaces:**
- Consumes: `GaltonController`, `summarizeSettledBins`, and model contracts.
- Produces: `UseGaltonExperimentResult` with snapshot, summary, expected PMF, mode, mixed-regime flag, overlay state, and actions.

- [ ] **Step 1: Define the hook contract and failing tests**

Use this return type:

```ts
export interface UseGaltonExperimentResult {
  settings: ExperimentSettings;
  snapshot: GaltonSnapshot;
  summary: DescriptiveSummary;
  expectedPmf: number[];
  mode: PhysicsMode;
  hasMixedRegimes: boolean;
  overlayVisible: boolean;
  actions: {
    run(): void;
    pause(): void;
    resume(): void;
    reset(): void;
    refill(): void;
    setOverlayVisible(visible: boolean): void;
    updateSettings(patch: Partial<ExperimentSettings>): void;
  };
}
```

Test initial neutral state, action delegation, incremental summary updates from settled events, automatic overlay visibility at completion, Keep-mode mixed regimes, Reset-mode clearing, and the 600-ball refill guard.

- [ ] **Step 2: Run hook tests and verify failure**

Run: `npm test -- src/hooks/useGaltonExperiment.test.tsx`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement subscription and derived state**

Create the controller exactly once per hook instance. Use `useSyncExternalStore` or a stable subscription adapter for controller snapshots. Compute descriptive statistics and expected mixtures with `useMemo`. Keep overlay state false until completion, then set true; changing to running or resetting sets it false.

- [ ] **Step 4: Implement Keep and Reset parameter changes**

In Keep mode, call `controller.setSettings(nextSettings)` without clearing bodies; retain regime history and mark mixed regimes after releases exist under two distinct PMFs. In Reset mode, call `controller.reset({ settings: nextSettings, seed: crypto.getRandomValues(new Uint32Array(1))[0] })`. Clamp all values before passing them to the controller.

- [ ] **Step 5: Run hook tests**

Run: `npm test -- src/hooks/useGaltonExperiment.test.tsx`

Expected: all action, derived-state, overlay, Keep/Reset, mixture, and cap tests pass.

- [ ] **Step 6: Commit the React adapter**

```bash
git add src/hooks
git commit -m "feat: connect simulation state to React"
```

---

### Task 8: Build accessible experiment controls and statistics panels

**Files:**
- Create: `src/components/ControlPanel.tsx`
- Create: `src/components/ControlPanel.test.tsx`
- Create: `src/components/StatsPanel.tsx`
- Create: `src/components/StatsPanel.test.tsx`
- Create: `src/components/BinReadouts.tsx`
- Create: `src/components/BinReadouts.test.tsx`
- Create: `src/components/EducationPanel.tsx`

**Interfaces:**
- Consumes: hook state/actions, descriptive summaries, run status, mode, and mixed-regime flag.
- Produces: labelled controls, live statistics, per-bin details, formulas, and teaching disclosures.

- [ ] **Step 1: Write failing accessibility and copy tests**

Assert persistent labels and numeric outputs for Hopper position, Skewness, Pearson kurtosis, Release rate, and On parameter change. Assert keyboard slider updates, Run/Pause/Resume/Refill status labels, disabled Refill at 600, and an overlay switch unavailable before completion.

For statistics, assert:

- em dash plus “Collecting data” before settled balls.
- “Early result—expect instability” for counts below 30.
- `null` metrics render an explanation, not `NaN` or `Infinity`.
- eleven bin controls expose count, percentage, and z-score.
- Guided mode explains controlled impulses.
- mixed regimes label the curve “Combined expected model.”
- kurtosis copy refers to tail weight and outlier propensity, not only peak height.

- [ ] **Step 2: Run component tests and verify failures**

Run: `npm test -- src/components/ControlPanel.test.tsx src/components/StatsPanel.test.tsx src/components/BinReadouts.test.tsx`

Expected: FAIL because the components are absent.

- [ ] **Step 3: Implement `ControlPanel`**

Use native `<input type="range">` controls with these exact ranges:

```tsx
<input aria-label="Hopper position" min={-1} max={1} step={0.05} />
<input aria-label="Skewness" min={-1} max={1} step={0.05} />
<input aria-label="Pearson kurtosis" min={1.8} max={6} step={0.1} />
<input aria-label="Release rate" min={1} max={12} step={1} />
```

Add visible endpoint labels, `<output>` values, Lucide Play/Pause/RotateCcw icons with visible button text, and a segmented Keep/Reset fieldset. Use a native checkbox switch for the post-run overlay with visible “Analysis overlay” copy.

- [ ] **Step 4: Implement `StatsPanel` and `BinReadouts`**

Render total observations, mean bin, standard deviation, observed skewness, and Pearson kurtosis with a shared formatter that returns `—` for `null`. Use `z = (x − μ) / σ`. Each desktop bin readout shows count, percentage to one decimal, and z-score to two decimals. On narrow viewports, each bin becomes a focusable disclosure button whose accessible name contains all three values.

- [ ] **Step 5: Implement accurate educational disclosures**

Use native `<details>` elements for:

- Hopper position shifts where balls enter.
- Skewness describes asymmetry and the direction of the longer tail.
- Kurtosis describes tail weight and outlier propensity; Pearson 3 is mesokurtic.
- z-scores express a bin’s distance from the observed mean in standard deviations.
- “The balls show what happened. The red curve shows what the model expected.”
- Guided mode uses small disclosed impulses because a physical board alone cannot independently create every requested shape.

- [ ] **Step 6: Run component tests**

Run: `npm test -- src/components/ControlPanel.test.tsx src/components/StatsPanel.test.tsx src/components/BinReadouts.test.tsx`

Expected: all label, keyboard, copy, state, undefined-value, and per-bin tests pass.

- [ ] **Step 7: Commit controls and teaching panels**

```bash
git add src/components/ControlPanel* src/components/StatsPanel* src/components/BinReadouts* src/components/EducationPanel.tsx
git commit -m "feat: add accessible experiment analysis UI"
```

---

### Task 9: Compose the finished Frosted Notebook interface

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`
- Create: `src/components/AppErrorBoundary.tsx`
- Create: `src/components/AppErrorBoundary.test.tsx`

**Interfaces:**
- Consumes: hook and all UI/board components.
- Produces: complete responsive application, calm error recovery, and final visual system.

- [ ] **Step 1: Expand the integration test before composition**

Mock the simulation controller and assert that `App` renders the physical board region, control panel, live-analysis panel, eleven bins, mode chip, Run button, total observations, and explanatory content. Assert source order remains controls → board → statistics for narrow screens.

- [ ] **Step 2: Write error-boundary tests**

Render a child that throws and assert visible copy “The board could not start,” a Retry button, and no blank canvas. Clicking Retry remounts the child by changing an internal reset key.

- [ ] **Step 3: Run integration tests and verify failures**

Run: `npm test -- src/App.test.tsx src/components/AppErrorBoundary.test.tsx`

Expected: FAIL because the minimal shell does not compose the product.

- [ ] **Step 4: Compose the application**

Create a compact header with Galton Studio, “Probability made physical,” batch/run status, Reset, and primary Run/Pause/Resume/Refill action. Compose a three-column desktop grid with ControlPanel, BoardCanvas plus BinReadouts, and StatsPanel plus EducationPanel. Wrap simulation content in AppErrorBoundary and add an `aria-live="polite"` region that announces only started, paused, completed, and reset.

- [ ] **Step 5: Implement the Frosted Notebook design tokens**

Define tokens in `:root`:

```css
:root {
  --ink: #18364b;
  --muted: #647f91;
  --paper: #edf6fa;
  --glass: rgba(255, 255, 255, 0.62);
  --glass-border: rgba(255, 255, 255, 0.92);
  --cobalt: #1259a6;
  --teal: #087fa7;
  --theory: #cf3038;
  --focus: #075d96;
  --shadow: 0 24px 72px rgba(38, 79, 104, 0.14);
  color: var(--ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

Implement fine borders, subtle graph paper, clear acrylic panels, restrained shadows, compact labels, 16-pixel body text, 44-pixel controls, and a centre column that receives most viewport space. Keep red exclusive to theoretical analysis and related teaching cues.

- [ ] **Step 6: Implement responsive and reduced-motion CSS**

At `max-width: 980px`, move statistics below the two-column controls/board layout. At `max-width: 720px`, use one column and a sticky compact run strip. Prevent horizontal scrolling, preserve board aspect ratio, and keep bin details usable. Under `prefers-reduced-motion: reduce`, remove nonessential transitions and show the post-run overlay without a fade.

- [ ] **Step 7: Run integration and full test suites**

Run: `npm test`

Expected: all model, physics, renderer, hook, component, error, and integration tests pass.

- [ ] **Step 8: Commit the complete interface**

```bash
git add src/App.tsx src/App.test.tsx src/styles.css src/components/AppErrorBoundary*
git commit -m "feat: compose refined Galton Studio interface"
```

---

### Task 10: Add lifecycle safeguards and run statistical simulation checks

**Files:**
- Create: `src/model/distribution.simulation.test.ts`
- Modify: `src/physics/controller.test.ts`
- Modify: `src/components/BoardCanvas.test.tsx`

**Interfaces:**
- Consumes: completed probability, controller, and renderer modules.
- Produces: regression coverage for directionality, performance guards, visibility pausing, cleanup, and physical-pile integrity.

- [ ] **Step 1: Add large deterministic distribution tests**

For each setting, sample 50,000 target bins from a fixed seed and summarize them. Assert:

- neutral absolute skewness `< 0.08` and Pearson kurtosis within a documented finite-bin tolerance of the neutral model.
- positive skew setting produces skewness at least `0.35` greater than its negative counterpart.
- leptokurtic setting has greater Pearson kurtosis than mesokurtic, which is greater than platykurtic.
- all counts remain within bins `0..10` and percentages sum to 100.

- [ ] **Step 2: Add controller safety regressions**

Assert fixed stepping caps at eight substeps per animation frame, hidden-tab pause does not accumulate a catch-up burst, Reset clears timeouts/listeners, recycled balls never enter statistics, and a settled body remains in `engine.world.bodies` with its original ball id and actual physical transform.

- [ ] **Step 3: Add physical-pile renderer regression**

Provide three sleeping bodies in the same bin at irregular x/y coordinates. Assert `drawBall` receives those exact three coordinate pairs and no regular spacing derived from bin index or count.

- [ ] **Step 4: Run safeguards and fix only demonstrated failures**

Run:

```bash
npm test -- src/model/distribution.simulation.test.ts src/physics/controller.test.ts src/components/BoardCanvas.test.tsx
```

Expected: all statistical directionality, time-step, cleanup, recycling, retained-body, and actual-position tests pass.

- [ ] **Step 5: Commit safeguards**

```bash
git add src/model/distribution.simulation.test.ts src/physics/controller.test.ts src/components/BoardCanvas.test.tsx
git commit -m "test: verify distribution and physics safeguards"
```

---

### Task 11: Document and configure GitHub Pages delivery

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `README.md`
- Modify: `index.html`

**Interfaces:**
- Consumes: successful production build from Tasks 1–10.
- Produces: documented local use and an opt-in GitHub Pages deployment workflow.

- [ ] **Step 1: Add site metadata**

Set the document title to `Galton Studio — Probability Made Physical`, add a concise description, theme color `#edf6fa`, viewport metadata, and no starter icons or placeholder copy.

- [ ] **Step 2: Create the GitHub Pages workflow**

Create `.github/workflows/deploy.yml` using official GitHub actions:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
        id: deployment
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
```

- [ ] **Step 3: Write user-facing project documentation**

Document:

- what the board teaches.
- installation with `npm install` and local use with `npm run dev`.
- tests and production build.
- enabling GitHub Pages with “GitHub Actions” as the source.
- Natural physics versus Guided demonstration disclosure.
- exact descriptive-moment definitions and Pearson-kurtosis convention.
- keyboard and reduced-motion behavior.
- the 100-ball batch and 600-ball retained-body limit.

- [ ] **Step 4: Verify the deployment artifact**

Run: `npm test && npm run build && test -f dist/index.html`

Expected: tests pass, build exits 0, and `dist/index.html` exists with relative asset paths.

- [ ] **Step 5: Commit delivery configuration**

```bash
git add .github/workflows/deploy.yml README.md index.html
git commit -m "docs: add GitHub Pages deployment"
```

---

### Task 12: Perform final interactive and visual verification

**Files:**
- Modify only files with a demonstrated defect from verification.

**Interfaces:**
- Consumes: complete application.
- Produces: verified first release with recorded evidence.

- [ ] **Step 1: Run automated verification from a clean install state**

Run:

```bash
npm ci
npm test
npm run build
```

Expected: install, every test, TypeScript compilation, and Vite build exit 0.

- [ ] **Step 2: Verify the physical lifecycle manually**

At a desktop viewport, confirm:

1. Exactly 100 individually visible balls rest physically behind the closed hopper gate before Run.
2. Run opens and closes the visible metering gate; no ball teleports.
3. Balls bounce from pegs, rails, dividers, and one another.
4. Pause freezes both release and world motion; Resume continues the same state.
5. Every settled ball remains at its irregular physical resting transform.
6. Counts change only after settling.
7. Expected bars and the red curve stay hidden until completion, then fade in without obscuring balls.
8. Refill adds 100 physical balls while keeping prior settled bodies; Reset clears and refills.

- [ ] **Step 3: Verify every statistical mode manually**

Run neutral, negative-skew, positive-skew, platykurtic, and leptokurtic batches. Confirm the visible mode disclosure, expected direction of the physical distribution, updated mean/standard deviation/skewness/kurtosis, per-bin count/percentage/z-score, early-result warning, mixed-regime marker in Keep mode, and automatic clear in Reset mode.

- [ ] **Step 4: Verify accessibility and responsive layouts**

Use keyboard-only interaction for every button, range, switch, bin, and disclosure. Confirm visible focus, useful accessible names, polite run-state announcements, 44-pixel targets, no horizontal scroll, sticky narrow-screen run controls, and immediate overlay appearance under reduced motion.

- [ ] **Step 5: Fix demonstrated defects and rerun affected checks**

For each observed defect, first add the smallest failing automated regression where feasible, then patch the owning focused module, rerun the affected test file, and rerun `npm test && npm run build` before proceeding.

- [ ] **Step 6: Commit verified release state**

```bash
git add -A
git commit -m "fix: complete Galton Studio verification"
```
