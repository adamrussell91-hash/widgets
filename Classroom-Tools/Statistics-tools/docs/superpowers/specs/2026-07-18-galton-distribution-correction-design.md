# Galton Studio Distribution Correction — Design Specification

Date: 18 July 2026  
Status: Approved design

## 1. Problem

Galton Studio currently draws the correct theoretical probability curve but does not use that probability model to determine neutral-mode ball outcomes. Neutral balls are left entirely to deterministic Matter.js collisions, so successive left/right movements are correlated rather than independent. A completed neutral batch can therefore look nearly uniform and place many balls in extreme bins even though the overlay shows a ten-step binomial distribution.

The existing distribution simulation tests sample the theoretical probability mass function directly. They do not run balls through the physical controller, so they cannot detect disagreement between the requested distribution and the bins where bodies actually settle.

## 2. Goal

Every completed batch must closely reproduce the probability mass function selected by the hopper-position, skewness, and kurtosis controls while retaining individual Matter.js bodies, visible peg collisions, gravity, and physical settling.

For a 100-ball neutral batch, the observed pile must consistently resemble the symmetric ten-step binomial model. Skewness must move mass in the requested direction, and kurtosis must reliably change centre and tail concentration. A seed must reproduce both target allocation and physical routes.

## 3. Chosen approach

Use one PMF-driven physical simulation path for every distribution mode.

At the start of a batch, convert the active PMF into integer target-bin quotas using the largest-remainder method:

1. Multiply each bin probability by the number of balls being allocated.
2. Assign the integer floor of every expected count.
3. Give the remaining balls to bins with the largest fractional remainders.
4. Break exact remainder ties with the seeded PRNG.
5. Seed-shuffle the resulting target-bin list before assigning it to balls.

This produces counts that sum exactly to the batch size and differ from the requested expected count by less than one ball per bin. Seeded shuffling prevents visibly artificial runs in which neighbouring targets arrive together.

Genuine independent sampling was rejected because a 100-ball classroom demonstration can still deviate substantially from its theoretical curve. Untouched Matter.js physics was rejected because its collision outcomes are correlated and cannot reliably express arbitrary skewness or kurtosis.

## 4. Physical routing

Each allocated target bin is converted into a reachable ten-row route. A route contains exactly `targetBin` right choices and `10 - targetBin` left choices, seed-shuffled across the rows.

When a released ball first contacts a peg in a new row, the controller applies a bounded horizontal impulse in that row's planned direction. Repeated contacts in the same row do not consume another decision. Gravity, Matter.js collision resolution, ball-to-ball contacts, rails, funnels, dividers, and the settling classifier continue to determine the body's continuous motion.

The impulse strength must be calibrated by automated integration tests. It must be strong enough for the body to enter its planned branch reliably without teleporting the body, setting its position, replacing it with a decorative ball, or disabling physical collisions.

The controller may apply bounded corrective steering toward the next reachable route point between peg rows if a collision pushes a ball away from its route. Corrective steering must stop once the ball reaches the collection area. A ball is counted only by the existing physical settling classifier.

## 5. Settings and regime changes

- Newly loaded or refilled batches receive targets from the settings active when they are loaded.
- In **Keep** mode, targets and routes already assigned to released balls never change.
- When distribution settings change, targets for all unreleased balls are regenerated from the new PMF using the remaining hopper count.
- The regime history continues to record the PMF active when each ball crosses the gate, so the expected overlay remains a released-ball-weighted mixture.
- In **Reset** mode, the existing reset lifecycle creates a fresh seed, batch allocation, and physical world.

The active PMF is the single source of truth for neutral, skewed, and kurtotic outcomes. The previous distinction between unguided neutral outcomes and targeted guided outcomes is removed from the simulation path. The interface must describe this honestly as a model-driven physical simulation rather than claim that neutral results come from untouched rigid-body collisions.

## 6. Data model

Ball metadata gains:

- `targetBin`: the allocated final bin;
- `route`: ten seeded left/right decisions;
- `nextRouteRow`: the next unconsumed peg row;
- any minimal steering state needed to prevent duplicate decisions within a row.

Peg metadata gains its row index so collision handling can consume route decisions deterministically without inferring a row from floating-point coordinates.

Quota construction and route construction remain pure functions outside the Matter.js controller. They accept a PMF, count, and seeded RNG and return deterministic results suitable for focused unit tests.

## 7. Failure handling

- Invalid or non-normalized PMFs are normalized through the existing distribution boundary before allocation.
- Integer quotas must always sum to the requested ball count.
- Targets must remain within bins `0..10`.
- Routes must always contain ten decisions and exactly `targetBin` right decisions.
- A physically lost ball retains its allocated target and route when recycled so recycling cannot distort the batch distribution.
- If a ball reaches a non-target collection bin despite steering, the integration test must fail; the controller must not silently relabel the physical result or teleport the settled body.

## 8. Testing strategy

Implementation follows test-driven development.

### Pure model tests

- Neutral 100-ball quotas match the largest-remainder allocation of `Binomial(10, 0.5)`.
- Quotas sum exactly to arbitrary requested counts.
- Every quota differs from its expected count by less than one ball, apart from deterministic tie allocation.
- The same seed produces the same shuffled targets and routes.
- Different seeds change assignment order and may move only tied largest-remainder seats between equally ranked bins; every quota remains within one ball of its expected count.
- Every route has ten decisions and its number of right decisions equals its target bin.

### Controller tests

- Every released ball has a target and route in neutral and shaped modes.
- A peg row consumes at most one route decision.
- Recycling preserves target and route.
- Keep-mode changes preserve released routes and regenerate unreleased allocations.
- Reset creates a fresh allocation.

### End-to-end physics regression tests

Run complete physical batches with fixed seeds and assert settled-bin counts against allocated target counts. Cover:

- centred neutral distribution;
- negative and positive skew;
- platykurtic and leptokurtic settings;
- fastest supported release rate;
- a mid-run Keep-mode settings change;
- recycling of an out-of-bounds ball.

The regression must exercise `GaltonController`, Matter.js stepping, and the real settling classifier. Sampling the PMF without running physical bodies is not sufficient.

## 9. Acceptance criteria

1. Every 100-ball batch settles all 100 real bodies.
2. Settled counts match the seeded target quotas for all supported distribution settings tested.
3. Neutral, skew, and kurtosis controls visibly and statistically produce their requested shapes.
4. No released or settled ball is teleported, replaced, or counted in a bin other than its physical resting bin.
5. Seeds reproduce allocation, route order, and final settled counts.
6. Existing pause, resume, reset, refill, Keep, overlay, statistics, accessibility, and GitHub Pages behaviour remains intact.
7. The full test suite and production build pass without warnings or errors.

## 10. Out of scope

- A user-facing seed control.
- Changing the number of peg rows or bins.
- Replacing Matter.js or the custom renderer.
- Decorative histogram piles or post-settlement position correction.
- Statistical inference or confidence-interval features.
