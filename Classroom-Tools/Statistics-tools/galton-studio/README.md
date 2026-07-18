# Galton Studio

Galton Studio is an interactive probability laboratory for gifted secondary students and their teachers. It turns a Galton board into a visible experiment: watch real simulated balls move from the hopper, collide with pegs, and settle into physical bins while the observed counts, percentages, z-scores, and descriptive statistics update.

The controls make distribution shape something students can investigate rather than simply memorise. Move the hopper, introduce positive or negative skew, compare lighter- and heavier-tailed distributions, and then compare the observed piles with the red theoretical model that appears after a run is complete.

## Run it locally

You need [Node.js 22](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local address printed in the terminal. The other project commands are:

```sh
pnpm test       # run the automated checks once
pnpm build      # create the production site in dist/
pnpm preview    # inspect the production build locally
```

## Publish with GitHub Pages

This repository includes an opt-in GitHub Actions workflow. It tests and builds the app on every push to `main`, then publishes the `dist` folder. Nothing is published until the repository owner enables Pages.

1. Put the project in a GitHub repository and push it to the `main` branch.
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push another change to `main`, or open **Actions → Deploy Galton Studio to GitHub Pages** and choose **Run workflow**.

The Vite build uses relative asset paths, so the same build works for a user site or a project site without changing a repository-name setting.

## How to interpret the experiment

### Model-driven physics

Every distribution is model-driven and physically animated. The active probability mass function (PMF) allocates balanced seeded targets across each batch, including the centred, symmetric reference PMF and shaped PMFs requested through skewness or kurtosis controls. Real Matter.js bodies then collide with the physical board while bounded peg-contact steering keeps them on routes to those targets.

Observed variation is in each ball's path and arrival order. Full-batch target quotas are intentionally kept close to the active PMF expectation, making the comparison reliable enough for classroom discussion rather than claiming that an unmodified physical board would independently produce every requested distribution shape.

If parameters change while **Keep** is selected, the displayed expected model combines regimes, weighted by how many balls were released under each one. **Reset** instead starts a clean experiment with the new settings.

### Descriptive statistics

All displayed moments describe the settled balls as a population. The population standard deviation is

```text
σ = √(Σ(x − μ)² / N)
```

so the variance divides by `N`, not `N − 1`. Bin z-scores use `z = (x − μ) / σ`. The kurtosis readout follows the **Pearson convention**, where a mesokurtic reference distribution has kurtosis 3; it does not report excess kurtosis, whose corresponding reference would be 0. Statistics that require non-zero spread are shown as unavailable when every observation is in the same bin.

### Batches and retained balls

Each hopper refill contains 100 real simulated balls. Completed piles can be retained and another 100-ball batch added until the board reaches its 600-ball retained-body cap. Use **Start over** to clear the retained balls and begin again.

## Keyboard and motion preferences

All controls can be reached with <kbd>Tab</kbd>. Use <kbd>Enter</kbd> or <kbd>Space</kbd> to activate a focused button, and <kbd>Space</kbd> to toggle a focused switch or radio choice. Focused sliders respond to the arrow keys in their labelled step sizes, and the expandable explanation headings follow the browser's standard keyboard behaviour. A polite screen-reader announcement reports experiment actions and completion, while the canvas has a concise text alternative with the current settled count.

When the operating system requests reduced motion, interface transitions are shortened and the completed theoretical overlay appears without a fade. The ball physics remains visible because following the physical paths is the central lesson.

## Technology

Galton Studio is a static React, TypeScript, Vite, and Matter.js app. It has no server or database, which keeps GitHub Pages hosting straightforward.
