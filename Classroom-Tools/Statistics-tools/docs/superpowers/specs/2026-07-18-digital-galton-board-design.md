# Digital Galton Board — Design Specification

Date: 18 July 2026  
Status: Approved design, pending written-spec review

## 1. Product purpose

Build a polished browser-based Galton board for highly gifted secondary-school students. The tool should make probability distributions feel physical before explaining them statistically: students first see real-looking balls released from a hopper, collide with pegs, and settle in collection bins; the app then reveals how the resulting pile relates to counts, proportions, z-scores, skewness, and kurtosis.

The app will be a static React/Vite project with no server or database. It must build cleanly for GitHub Pages and remain usable as a local website.

## 2. Core teaching principle

The physical apparatus is the primary visual. Analytics are secondary layers.

Every ball is an individual rigid body for its entire lifecycle:

1. It is visibly stored in the hopper before release.
2. It passes through a physical release gate.
3. It falls under gravity and collides with pegs, side rails, bin dividers, and other balls.
4. It remains an individually rendered ball after settling.

The final pile must never be replaced by a decorative grid, pre-rendered histogram, or snapped arrangement. Translucent analytical bars and the red theoretical curve may be drawn over the physical balls only after a run completes.

## 3. Intended experience

### Before a run

- The transparent hopper visibly contains the upcoming batch of 100 balls.
- The complete apparatus is visible: hopper, gate, acrylic face, side rails, ten staggered peg rows, funnels, eleven collection bins, screws, and labels.
- The theoretical curve and analytical bars are hidden.
- Controls are enabled and show mathematically neutral defaults.
- A short prompt invites the student to predict the shape before running.

### During a run

- The Run button becomes Pause; Resume is available after pausing.
- Balls leave the hopper at the selected rate.
- Physics continues smoothly while the viewport is active.
- A ball affects the statistics only after it has settled in a bin.
- Total count, per-bin count, percentage, z-score, and descriptive statistics update incrementally.
- The theoretical curve and analytical bars remain hidden so the physical outcome stays visually dominant.

### After a run

- The last ball settles before the run is marked complete.
- Translucent expected-frequency bars fade in behind or around the physical pile without obscuring individual balls.
- A thin classic-red theoretical distribution curve fades in above the bins.
- A concise “Observed versus expected” explanation appears.
- The learner can hide or show the analysis overlay.
- The physical balls remain visible and interactive only as simulation bodies; the overlay never substitutes for them.
- The primary action becomes **Refill 100 balls**. Refilling keeps the settled physical balls and cumulative statistics; Reset starts a fresh experiment.

## 4. Visual direction

Use the approved **Frosted Notebook** direction, refined into a premium scientific instrument:

- Pearl-white translucent glass surfaces over a very faint graph-paper field.
- Cobalt and teal for controls, live balls, focus, and observed values.
- Classic red exclusively for the theoretical curve, z-score accents, and observed-versus-expected teaching cues.
- Fine one-pixel borders, restrained shadows, compact typography, and generous breathing room.
- A large central apparatus with narrow control and statistics side panels.
- No oversized cards, heavy dashboard chrome, emoji icons, or decorative illustration.
- The apparatus should feel like clear acrylic, brushed metal, and glass rather than a flat digital diagram.

The final product should be more detailed and refined than the approved concept mockups. Physical depth comes from highlights, occlusion, restrained shadows, and material contrast—not visual clutter.

## 5. Layout and responsive behavior

### Desktop and large tablet

Use a three-column layout:

- Left: experiment controls.
- Centre: physical board, occupying most of the viewport.
- Right: live descriptive statistics and short explanations.

Keep the primary controls and Run button visible without scrolling at a typical laptop viewport. The board should receive the largest share of width and height.

### Narrow tablet and phone

- Preserve the board’s aspect ratio and physical legibility.
- Stack controls above the board and statistics below it.
- Keep Run/Pause and total count in a sticky compact control row.
- Avoid horizontal scrolling.
- Keep every touch target at least 44 by 44 CSS pixels.

## 6. Controls

### Primary controls

1. **Run / Pause / Resume** — releases the visible batch and controls the active simulation.
2. **Reset** — clears active and settled balls, statistics, and overlays, then refills the hopper with 100 balls.
3. **Hopper position** — moves the physical hopper left or right. Neutral is centred.
4. **Skewness** — ranges from negative through symmetric to positive.
5. **Kurtosis** — ranges from platykurtic through mesokurtic to leptokurtic. The neutral midpoint is Pearson kurtosis 3.
6. **Release rate** — provides Observe, Explore, and Fast regions while showing a numeric balls-per-second value.
7. **On parameter change: Keep / Reset** — a labelled two-state switch, defaulting to Keep.
8. **Analysis overlay** — available after a completed run to show or hide theoretical bars and the red curve.

The hopper-position, skewness, and kurtosis controls remain separate because they describe different properties. Every control has a persistent label, numeric readout, named endpoints, keyboard support, and a short explanation available through a “Why?” disclosure.

Each batch contains 100 balls. After a completed batch, **Refill 100 balls** allows another batch to be added to the same physical and statistical experiment. To preserve smooth performance and legible bins, the first version supports up to 600 settled balls before asking the learner to reset.

### Parameter-change behavior

- In **Keep** mode, settled balls remain physical and included in the cumulative statistics. Balls already released retain the model parameters they had at release. New balls use the changed settings. A small marker states that the cumulative result contains more than one parameter regime.
- In **Reset** mode, changing hopper position, skewness, or kurtosis stops the current run, clears the board and statistics, hides the overlay, and refills the hopper using the new settings.

## 7. Physics and distribution model

### Rigid-body simulation

Use a real-time 2D rigid-body engine, expected to be Matter.js, with a custom renderer. The custom renderer is required so the balls, acrylic, pegs, hopper, and overlays share one refined visual language.

- Gravity acts continuously on released balls.
- Pegs, rails, the gate, bin dividers, and the floor are static collision bodies.
- Balls collide with the apparatus and with one another.
- Restitution, friction, air resistance, density, sleep thresholds, and release spacing are tuned to feel like a tabletop Galton board.
- Use a fixed physics timestep with substeps so balls do not tunnel through pegs or dividers during frame drops.
- Sleeping settled balls remain rigid bodies and can be reawakened by later collisions.
- The renderer uses the actual body transforms. It never draws balls from a synthetic pile layout.

### Natural and guided modes

At centred hopper, zero skew, and mesokurtic settings, the app operates in **Natural physics** mode. Outcomes emerge from collisions and small seeded variations in release position and velocity.

When skewness or kurtosis moves away from neutral, the app enters **Guided demonstration** mode. It remains a rigid-body simulation, but small lateral impulses applied at eligible peg contacts bias the long-run distribution. The UI must disclose this change with a visible mode chip and a concise explanation: a physical board alone cannot independently produce every requested skewness and kurtosis shape.

For reliable classroom demonstrations, each guided ball receives a target region sampled from a bounded target probability mass function. The target family uses a two-piece exponential-power distribution:

- The shape parameter controls tail weight and peak concentration, giving platykurtic, mesokurtic, and leptokurtic forms.
- Left and right scale parameters control negative or positive skew.
- Hopper position shifts the location independently.

The sampled region influences only small contact impulses; gravity, collisions, bounce, and final settling remain physically simulated. Guidance strength is capped so trajectories still look plausible and can vary from run to run.

The expected-frequency overlay uses the ideal binomial model in neutral Natural physics mode and the bounded target probability mass function in Guided demonstration mode. When Keep mode combines multiple parameter regimes, the overlay becomes the release-count-weighted mixture of those regimes and is labelled **Combined expected model**.

### Reproducibility

Use a seedable pseudorandom generator internally. A run gets a seed when the hopper is filled, and Reset creates a new seed. The implementation retains the seed for deterministic automated checks without adding another first-version UI control.

## 8. Apparatus geometry

- Ten staggered peg rows produce eleven labelled collection bins.
- The hopper is transparent and large enough to show the waiting batch as individual balls.
- A visible release gate opens and closes as balls are emitted.
- Side rails guide outlying balls toward the collection area.
- Small funnels between the last peg row and bins reduce ambiguous boundary landings.
- Bin walls are tall enough to contain the batch without overlapping statistical labels.
- The board scales as one coordinated geometry so collision bodies and rendering stay aligned at every supported viewport.

## 9. Statistical definitions

Treat the settled balls in the current board as the complete observed dataset. If ball `i` settles in bin `x_i`, use the following descriptive moments:

- Count: `N` settled balls.
- Bin percentage: `100 × n_j / N` for bin `j`.
- Mean: `μ = (1/N) Σ x_i`.
- Variance: `σ² = (1/N) Σ (x_i − μ)²`.
- Standard deviation: `σ = √σ²`.
- Bin z-score: `z_j = (j − μ) / σ`.
- Observed skewness: `γ₁ = m₃ / m₂^(3/2)`.
- Pearson kurtosis: `β₂ = m₄ / m₂²`, with mesokurtic reference value 3.

Here `m_k = (1/N) Σ (x_i − μ)^k`.

The interface labels these as descriptive statistics for the balls currently observed, not unbiased population estimators. This avoids mixing estimator corrections into the initial lesson while keeping the mathematics explicit.

### Undefined and small-sample states

- Before any ball settles, show em dashes and “Collecting data.”
- At zero standard deviation, z-scores, skewness, and kurtosis are undefined; display an em dash with a short reason.
- Avoid interpreting skewness or kurtosis at very small counts. Numeric values may appear once defined, accompanied by “Early result—expect instability” until at least 30 balls have settled.

## 10. Per-bin presentation

Each bin/column exposes:

- Bin number or midpoint.
- Settled-ball count.
- Percentage of all settled balls.
- Z-score of that bin relative to the current observed mean and standard deviation.

On desktop, concise values sit directly beneath the bins. On narrow screens, tapping or keyboard-focusing a bin opens a compact detail popover. Color is never the only way a value or state is communicated.

## 11. Explanatory content

Use concise, accurate language suitable for gifted secondary students:

- A short “What changed?” sentence reacts to parameter adjustments.
- Optional “Why?” disclosures explain hopper position, skewness, kurtosis, the red theoretical curve, and z-scores.
- Guided mode explicitly distinguishes natural physical behavior from teaching interventions.
- The post-run comparison states: “The balls show what happened. The red curve shows what the model expected.”
- Formulas use familiar notation and are paired with plain-language interpretations.

Do not over-simplify skewness as merely “which side is higher.” Explain it in terms of asymmetry and the direction of the longer tail. Explain kurtosis primarily as tail weight and outlier propensity, not only peak height.

## 12. State architecture

Keep four layers separate:

1. **Experiment configuration** — hopper position, skew, kurtosis, release rate, change behavior, seed, and run status.
2. **Physics world** — apparatus bodies, active balls, settled balls, sleeping state, and collision events.
3. **Statistical model** — settled bin values, incremental moments, counts, percentages, z-scores, and expected bin probabilities.
4. **Presentation** — responsive layout, disclosures, mode chips, overlay visibility, focus, and reduced-motion behavior.

Data flows in one direction:

`controls → experiment configuration → release model → physics world → settled-ball event → statistics → UI and post-run overlay`

The physics engine must not read visual layout state directly. Apparatus geometry is generated from a shared board-dimensions model used by both collision-body creation and rendering.

## 13. Performance and lifecycle behavior

- Target smooth 60 fps on a current mid-range laptop and usable performance on modern tablets.
- Limit the number of simultaneously falling balls; faster release rates increase throughput without releasing the entire hopper at once.
- Allow settled bodies to sleep.
- Keep no more than 600 settled rigid bodies in the first version; request a reset before another refill at that limit.
- Resize the renderer without recreating settled-ball positions unnecessarily.
- Pause release and physics when the browser tab is hidden; resume safely when visible.
- Respect `prefers-reduced-motion` by reducing interface transitions while preserving the essential physics demonstration.
- Avoid frame-rate-dependent statistics or release timing.

## 14. Accessibility

- Meet WCAG 2.1 AA contrast for text and controls.
- Provide visible focus states and full keyboard operation for buttons, sliders, switches, bins, and disclosures.
- Provide text equivalents for simulation state and the distribution summary.
- Do not rely on red/blue alone; label observed and theoretical layers.
- Use live-region announcements sparingly for run started, paused, completed, and reset. Do not announce every ball.
- Maintain 16-pixel minimum body text in the actual app, even if concept mockups use scaled-down representations.

## 15. Error handling and safeguards

- If the physics engine cannot initialise, show a calm inline error with a retry action rather than a blank canvas.
- Prevent parameter values outside their supported ranges.
- Prevent a second run from double-scheduling releases.
- Pause both release scheduling and world stepping when the learner chooses Pause; Resume continues from the same physical state.
- Classify a ball only after it is inside one bin, below the bin-entry threshold, and slow enough to be considered settled for a short dwell period.
- If a ball becomes stuck outside all bins, gently recycle it to the hopper and exclude it from statistics, with a diagnostic counter available in development builds.
- Stop and cancel timers cleanly on reset or component teardown.

## 16. Verification strategy

### Automated checks

- Unit tests for counts, percentages, mean, variance, standard deviation, z-scores, skewness, kurtosis, undefined states, and incremental updates.
- Deterministic tests for seeded target distributions and parameter mappings.
- Tests that neutral parameters disable guidance.
- Tests for Keep versus Reset parameter-change behavior.
- Tests that a ball is counted exactly once after satisfying the settling rule.
- Component tests for control labels, keyboard behavior, overlay staging, mode disclosure, and reduced-motion preferences.
- Production build verification for the GitHub Pages base path.

### Simulation checks

- With a fixed seed, confirm that the same run produces the same release perturbations and guidance targets.
- Run sufficiently large neutral, negatively skewed, positively skewed, platykurtic, and leptokurtic trials and confirm the observed moments move in the intended direction.
- Confirm balls remain real physics bodies after settling and are never replaced by rendered grid positions.
- Confirm no tunnelling through pegs, walls, or dividers at the fastest supported release rate.

### Visual checks

- Inspect before-run, during-run, paused, completed, guided-mode, reset, small-sample, and undefined-statistic states.
- Verify desktop, tablet, and phone layouts.
- Confirm the red curve and analytical bars are hidden before and during a run and fade in only after completion.
- Confirm the analytical overlay never obscures the physical balls or bin boundaries.

## 17. Out of scope for the first version

- User accounts, cloud persistence, classroom rosters, or a backend.
- Saving runs across devices.
- CSV export, assignment authoring, or teacher dashboards.
- Three-dimensional rendering.
- Audio effects.
- Comparing multiple boards side by side.

These can be considered later without changing the core simulation and statistics boundaries.

## 18. Acceptance criteria

The first version is complete when:

1. A learner can see a filled hopper, run or pause the board, and watch individually simulated balls bounce and settle into physical bins.
2. Settled balls remain real rigid bodies in visibly irregular physical piles.
3. Every bin reports count, percentage, and z-score; the app reports total, mean, standard deviation, observed skewness, and Pearson kurtosis.
4. Separate hopper-position, skewness, and kurtosis controls visibly change new outcomes.
5. Natural and guided modes are clearly distinguished.
6. Keep/Reset behavior on parameter changes works as labelled.
7. The red theoretical curve and translucent analytical bars appear only after the run and can be toggled.
8. The interface matches the refined Frosted Notebook direction and remains responsive, accessible, smooth, and GitHub Pages compatible.
