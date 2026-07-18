# Galton Natural Physics and Warm Glass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve exact target distributions while making every visible ball deflection contact-driven and rebuilding the interface as a readable warm-white glass classroom instrument.

**Architecture:** Keep allocation and target routes unchanged. Replace continuous free-flight correction with a collision-only impulse plus a separately gated stuck-contact release state. Recompose the existing React components around a dominant board, progressive-disclosure results, flat canvas rendering, and a palette-driven CSS layer.

**Tech Stack:** React 19, TypeScript 7, Matter.js 0.20, Canvas 2D, Vitest, Testing Library, Vite 8, CSS

---

## File Structure

- `src/physics/controller.ts` — collision guidance, contact memory, and stuck release.
- `src/physics/controller.test.ts` — focused unit evidence for contact-only motion.
- `src/physics/controller.production.test.ts` — full-batch completion and target-match evidence.
- `src/physics/render.ts` — flat warm-white canvas rendering.
- `src/physics/render.test.ts` — exact palette and flat-rendering assertions.
- `src/components/ControlPanel.tsx` — compact plain-language controls and actions.
- `src/components/ControlPanel.test.tsx` — labels, actions, and removed jargon.
- `src/components/BinReadouts.tsx` — semantic detailed-results disclosure.
- `src/components/BinReadouts.test.tsx` — semantic table and readable-value checks.
- `src/components/StatsPanel.tsx` — three primary metrics and short interpretation.
- `src/components/StatsPanel.test.tsx` — metric and copy behavior.
- `src/components/EducationPanel.tsx` — optional concise learning notes.
- `src/components/EducationPanel.test.tsx` — plain-language and disclosure checks.
- `src/App.tsx` — Modern Lab hierarchy and board controls.
- `src/App.test.tsx` — page-level hierarchy and terminology checks.
- `src/styles.css` — warm-white palette, stronger glass, responsive layout, and readable type.
- `src/styles.test.ts` — token, font-size, responsive, and anti-regression assertions.

### Task 1: Replace free-flight steering with contact memory

**Files:**
- Modify: `src/physics/controller.ts`
- Test: `src/physics/controller.test.ts`

- [ ] **Step 1: Write failing tests for contact-only motion**

Add tests which spy on `Body.setVelocity` and `Body.applyForce`, release one ball, position it in open peg-field space, step the controller, and assert no horizontal correction occurs. Add a collision test that sends a real ball/peg collision pair and asserts exactly one bounded route force.

```ts
it('does not steer a released ball during free flight', () => {
  const instance = tracked();
  const ball = releaseOne(instance);
  Body.setPosition(ball, { x: BOARD.width / 2 - 80, y: BOARD.pegTop + 120 });
  Body.setVelocity(ball, { x: 0.4, y: 2 });
  const setVelocity = vi.spyOn(Body, 'setVelocity');

  instance.step(1000 / 120);

  expect(setVelocity.mock.calls.filter(([body]) => body === ball)).toEqual([]);
});
```

- [ ] **Step 2: Verify the new test fails**

Run: `pnpm test -- src/physics/controller.test.ts`

Expected: FAIL because `applyCorrectiveSteering` calls `Body.setVelocity` during free flight.

- [ ] **Step 3: Add explicit contact state and remove corrective steering**

Extend `BallState` with contact memory:

```ts
interface PegContactMemory {
  pegBodyId: number | null;
  startedAtMs: number | null;
  lastSeenAtMs: number | null;
}

interface BallState {
  // existing fields
  pegContact: PegContactMemory;
}
```

Initialize it in `createBall`. Listen to `collisionStart`, `collisionActive`, and `collisionEnd`. Route start/active pairs through `recordPegContact`, route end pairs through `clearPegContact`, delete `applyCorrectiveSteering`, remove its constants and the unused `routeCorridorX` import, and remove its call from `afterFixedStep`.

- [ ] **Step 4: Verify focused tests pass**

Run: `pnpm test -- src/physics/controller.test.ts`

Expected: PASS with no free-flight velocity correction and one route impulse per consumed row.

- [ ] **Step 5: Commit**

```bash
git add src/physics/controller.ts src/physics/controller.test.ts
git commit -m "fix: restrict route guidance to peg contacts"
```

### Task 2: Add bounded stuck-contact release and calibrate completion

**Files:**
- Modify: `src/physics/controller.ts`
- Modify: `src/physics/controller.production.test.ts`
- Test: `src/physics/controller.test.ts`

- [ ] **Step 1: Write failing stuck-release gating tests**

Cover three cases: no release without current peg contact, no release before the dwell threshold, and a small downward force after sustained contact plus low speed.

```ts
expect(releaseForces).toEqual([{ x: expect.any(Number), y: expect.any(Number) }]);
expect(Math.abs(releaseForces[0]!.x)).toBeLessThanOrEqual(0.00001);
expect(releaseForces[0]!.y).toBeGreaterThan(0);
expect(releaseForces[0]!.y).toBeLessThanOrEqual(0.00003);
```

- [ ] **Step 2: Verify stuck-release tests fail**

Run: `pnpm test -- src/physics/controller.test.ts -t "stuck"`

Expected: FAIL because contact-gated release does not exist.

- [ ] **Step 3: Implement the minimal release state machine**

Add constants for a 700ms dwell, low-speed threshold, and bounded force. In `afterFixedStep`, call `releaseIfStuckOnPeg(state)`. It must return early unless the ball is released, above `BOARD.funnelTop`, currently touching a peg, below the speed threshold for the complete dwell, and not settled. Apply one downward force, clear the contact start time, and never call `setPosition` or `setVelocity`.

- [ ] **Step 4: Run production scenarios and tune only physical constants**

Run: `pnpm test -- src/physics/controller.production.test.ts`

Expected: all neutral, skew, kurtosis, and hopper-boundary batches complete within 7,200 frames; every diagnostic has `matchesTarget: true`; no released-body position mutation occurs.

If a scenario fails, tune only `ROUTE_IMPULSE`, restitution, friction, frictionAir, and the stuck-release force within the bounded ranges asserted above. Do not restore continuous steering.

- [ ] **Step 5: Commit**

```bash
git add src/physics/controller.ts src/physics/controller.test.ts src/physics/controller.production.test.ts
git commit -m "fix: release genuinely stuck balls naturally"
```

### Task 3: Flatten the board renderer

**Files:**
- Modify: `src/physics/render.ts`
- Test: `src/physics/render.test.ts`

- [ ] **Step 1: Replace rendering expectations with the approved palette**

Assert the first full-board fill is `#fffefa`, pegs use `#a7abb9`, observed balls use `#376fb7`, the theoretical curve uses `#f68620` with a dash, and no linear/radial gradient is created for balls, pegs, rails, dividers, gate, or floor.

- [ ] **Step 2: Run the renderer test and confirm failure**

Run: `pnpm test -- src/physics/render.test.ts`

Expected: FAIL on the old blue graph paper, metallic gradients, and glossy radial balls.

- [ ] **Step 3: Implement flat rendering**

Use these constants:

```ts
const BOARD_PAPER = '#fffefa';
const MARINE = '#142b51';
const SHALLOW = '#a7abb9';
const WAVE = '#376fb7';
const HIGH_SEA = '#f68620';
const QUIET_HARDWARE = 'rgba(66, 72, 96, 0.58)';
```

Replace graph paper with one warm-white fill and optional extremely faint warm grid. Replace every gradient material helper with solid fills/strokes. Preserve all geometry and body-position calculations exactly.

- [ ] **Step 4: Verify renderer and canvas integration tests**

Run: `pnpm test -- src/physics/render.test.ts src/components/BoardCanvas.test.tsx`

Expected: PASS; all 55 pegs, 11 bins, 12 dividers, and physical ball positions remain represented.

- [ ] **Step 5: Commit**

```bash
git add src/physics/render.ts src/physics/render.test.ts
git commit -m "style: flatten the Galton board rendering"
```

### Task 4: Simplify controls, metrics, and detailed results

**Files:**
- Modify: `src/components/ControlPanel.tsx`
- Modify: `src/components/ControlPanel.test.tsx`
- Modify: `src/components/BinReadouts.tsx`
- Modify: `src/components/BinReadouts.test.tsx`
- Modify: `src/components/StatsPanel.tsx`
- Modify: `src/components/StatsPanel.test.tsx`
- Modify: `src/components/EducationPanel.tsx`
- Modify: `src/components/EducationPanel.test.tsx`

- [ ] **Step 1: Write failing component tests for the approved copy and hierarchy**

Require the descriptions “Where the peak sits,” “How wide the shape is,” “Which side stretches further,” and “How often extremes appear.” Require one primary Drop/Pause/Resume action, a secondary Clear/Refill action, three visible metrics, and a closed “View detailed results” disclosure. Assert that “mesokurtic,” “model-driven physics,” and “bounded velocity correction” are absent from the primary UI.

- [ ] **Step 2: Verify component tests fail**

Run: `pnpm test -- src/components/ControlPanel.test.tsx src/components/BinReadouts.test.tsx src/components/StatsPanel.test.tsx src/components/EducationPanel.test.tsx`

Expected: FAIL on old technical copy and readout structure.

- [ ] **Step 3: Recompose the controls and metrics**

Keep existing callbacks and accessible range behavior. Remove endpoint paragraphs, region grids, “What changed,” the Keep/Reset radio block from the main surface, and the mode label. Preserve change behavior internally with the existing default. Put release rate and reset behavior into an optional settings disclosure if they remain user-facing.

Render the visible metrics as Average bin, Spread, and Balls dropped. Render one sentence from settled state, for example “The balls formed a shape close to the expected model.”

- [ ] **Step 4: Replace the eleven-column strip with a semantic disclosure table**

`BoardBinReadouts` should render a compact bin-number axis only. `BinReadouts` should use:

```tsx
<details className="bin-readouts">
  <summary>View detailed results</summary>
  <table>
    <thead><tr><th>Bin</th><th>Balls</th><th>Percent</th><th>z-score</th></tr></thead>
    <tbody>{bins.map(/* one semantic row per bin */)}</tbody>
  </table>
</details>
```

Keep full accessible names and the unavailable z-score explanation.

- [ ] **Step 5: Verify component tests pass and commit**

Run: `pnpm test -- src/components/ControlPanel.test.tsx src/components/BinReadouts.test.tsx src/components/StatsPanel.test.tsx src/components/EducationPanel.test.tsx`

```bash
git add src/components
git commit -m "refactor: simplify Galton controls and results"
```

### Task 5: Build the stronger warm-white glass layout

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`
- Modify: `src/styles.test.ts`

- [ ] **Step 1: Add failing page and style contract tests**

Require a compact left control rail followed by the live board, a board status, an “Expected shape” toggle, three metrics, and detailed results after the metrics. In `styles.test.ts`, assert base text is at least `16px`, help text at least `13px`, controls at least `44px`, warm-white surface tokens exist, and glass uses both `backdrop-filter: blur(...)` and a translucent fill.

- [ ] **Step 2: Confirm the tests fail**

Run: `pnpm test -- src/App.test.tsx src/styles.test.ts`

Expected: FAIL on the old three-column layout, blue palette, small labels, and weak glass.

- [ ] **Step 3: Recompose `App.tsx` around Modern Lab hierarchy**

Remove “Physical apparatus,” the prediction callout, and the mode-chip language. Use “Live board,” “Ready/Running/Paused/Complete,” “Observed balls,” and “Expected shape.” Keep all hook actions and error handling unchanged.

- [ ] **Step 4: Replace CSS tokens and component styling**

Define:

```css
:root {
  --marine: #142b51;
  --shallow: #a7abb9;
  --high-sea: #f68620;
  --wave: #376fb7;
  --shore: #eae7da;
  --sand: #f0cfac;
  --warm-white: #fffdf8;
  --glass: rgba(255, 255, 255, 0.72);
  --glass-border: rgba(255, 255, 255, 0.96);
  --glass-inner-border: rgba(20, 43, 81, 0.08);
  --shadow-panel: 0 24px 70px rgba(20, 43, 81, 0.10);
}
```

Apply `backdrop-filter: blur(30px) saturate(125%)`, a bright outer edge, a quiet inset border, and the broad shadow to the control panel, board shell, and metric cards. Keep the canvas opaque warm white. Set body text to 16px, help text to 13px, labels/values to 15–16px, actions to 16px with 44px minimum height, and metric values to 30–34px.

- [ ] **Step 5: Add responsive and motion rules**

At 980px stack controls above the board; at 620px wrap metrics and make the detailed table horizontally scrollable. Preserve visible focus rings, 44px targets, 200% zoom reflow, and `prefers-reduced-motion` for interface transitions.

- [ ] **Step 6: Verify page/style tests and commit**

Run: `pnpm test -- src/App.test.tsx src/styles.test.ts`

```bash
git add src/App.tsx src/App.test.tsx src/styles.css src/styles.test.ts
git commit -m "style: apply warm glass Modern Lab interface"
```

### Task 6: Full regression, build, publish, and live verification

**Files:**
- Verify: all `src/**/*.test.ts` and `src/**/*.test.tsx`
- Verify: `.github/workflows/pages.yml`
- Verify: production GitHub Pages deployment

- [ ] **Step 1: Run the complete suite**

Run: `pnpm test`

Expected: all test files pass, including allocation, distribution simulation, production physics, components, styles, and build-entry tests.

- [ ] **Step 2: Run the production build**

Run: `pnpm build`

Expected: TypeScript and Vite finish successfully and emit the production bundle.

- [ ] **Step 3: Inspect the diff for accidental artifacts**

Run: `git status --short && git diff --check && git diff --stat HEAD~5..HEAD`

Expected: no whitespace errors; `.superpowers/` remains uncommitted; only intended source, test, spec, and plan files are included.

- [ ] **Step 4: Push the committed branch**

Run: `git push origin main`

Expected: GitHub accepts the new commits and starts the Pages workflow.

- [ ] **Step 5: Verify deployment and the live asset**

Use GitHub CLI to wait for the Pages workflow conclusion, then request the live nested URL and its current JavaScript asset. Confirm the asset contains the new warm-white tokens/copy and no longer contains `Model-driven physics` or the continuous steering constants.

- [ ] **Step 6: Report the live URL**

Return: `https://adamrussell91-hash.github.io/widgets/Classroom-Tools/Statistics-tools/galton-studio/`

