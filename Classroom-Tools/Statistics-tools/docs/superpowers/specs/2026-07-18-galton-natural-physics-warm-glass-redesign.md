# Galton Studio: Natural Physics and Warm Glass Redesign

**Date:** 2026-07-18  
**Status:** Approved for implementation  
**Product:** Galton Studio classroom statistics simulation

## Problem

The distribution engine now produces the requested statistical result, but two parts of the experience remain unacceptable:

1. The route-correction physics is visibly artificial. Balls can turn in open air, hover against pegs, miss lower peg contacts, or remain stuck for many seconds.
2. The interface is visually heavy, overly technical, difficult to scan, and poorly suited to high-school students. The detailed bin readout wraps badly and dominates the results.

The redesign must preserve the statistically guaranteed result without making the hidden guidance visible.

## Users and Learning Goal

The primary user is a high-school student or teacher using the simulation individually or on a classroom projector.

The essential learning sequence is:

1. Change the centre, spread, skew, or tails.
2. Drop a set of balls.
3. Observe the physical paths and final shape.
4. Compare the observed result with the expected shape.
5. Open detailed statistics only when needed.

The board and its motion are the primary content. Controls and explanation support the experiment rather than compete with it.

## Physics Design

### Statistical guarantee

Keep the existing target-quota allocation and preassigned route model. This is required so later skew and kurtosis controls produce the intended distribution reliably.

### Contact-only direction changes

Remove all continuous horizontal steering between peg contacts. A ball's horizontal velocity must not be modified simply because its current position differs from its planned route.

Route influence may occur only when the physics engine reports a real collision between that ball and a peg. The collision response may apply a small bounded lateral impulse in the route's required direction. The impulse must preserve downward motion and remain small enough that the visible collision still reads as an ordinary deflection.

### Natural free fall

Between collisions, balls move only under the normal physics forces already present: gravity, momentum, air resistance, and collisions with physical board geometry. No `setVelocity` correction may bend the path in open air.

### Stuck-ball release

A release is allowed only after sustained evidence that a ball is genuinely stuck:

- its speed remains below a small threshold for a bounded interval;
- it remains in contact with a peg or nearby board geometry during that interval; and
- it is still above the bins.

The release applies a small downward impulse with at most a tiny lateral component away from the contact normal. It must not teleport the ball or assign a large velocity. Release state resets as soon as the ball resumes normal motion.

### Collision tuning

Tune restitution, friction, air friction, ball radius, peg radius, peg spacing, and the contact impulse together. Lower pegs must use the same physical collision rules and collision geometry as upper pegs. Debug-only contact markers and route traces should be available during development to confirm that visible direction changes coincide with collision events.

### Physics acceptance criteria

- No visible direction change occurs without a collision or wall contact.
- No ball remains attached to a peg for more than the stuck-release threshold.
- Balls visibly contact lower pegs when their geometric paths intersect them.
- No teleportation or large corrective velocity change occurs.
- The final bin allocation still matches the planned quota exactly after all balls settle.
- Skew and tails controls continue to produce their target distribution families.

## Visual Direction

### Overall character

Use the approved **Modern Lab** layout with a warm-white, premium scientific-instrument character. The design should feel calm, precise, contemporary, and suitable for a classroom—not clinical software, a generic dashboard, or a decorative toy.

### Palette

Use the supplied marine palette selectively:

- **Warm white:** page, board, and primary surface background (`#fffdf8` to white)
- **Marine `#142b51`:** primary text, important structure, small brand mark
- **Wave `#376fb7`:** observed balls and interactive control state
- **High Sea `#f68620`:** primary action and expected distribution curve
- **Shallow `#a7abb9`:** flat pegs and quiet hardware
- **Orca `#424860`:** only where a slightly stronger neutral is needed, at reduced opacity
- **Sand `#f0cfac`:** subtle explanatory or insight tint
- **Horizon `#dbe2f0`:** rare supporting tint only; it must not become the page or board canvas
- **Depth `#0a1536`:** not used for large containers or harsh black surfaces

Orange is the accent. It should attract attention to the main action and theoretical curve, not decorate unrelated controls.

### Glass treatment

Increase the glass treatment significantly on interface surfaces while preserving readability:

- translucent warm-white fills;
- strong but soft backdrop blur;
- a bright one-pixel top/edge highlight;
- a quiet internal border for definition;
- broad, low-opacity shadows rather than dark drop shadows;
- visible layering between the control rail, board shell, and metric cards.

Glass is not applied to the physical board canvas itself. The canvas remains crisp, warm white, and high legibility. Text contrast must remain WCAG AA despite transparency.

### Flat board rendering

Remove all metallic, embossed, glossy, radial-gradient, and bevel effects from balls, pegs, rails, and bin dividers.

- Balls are flat Wave-blue circles.
- Pegs are flat Shallow-grey circles.
- Rails and dividers are quiet, low-contrast neutral shapes.
- The expected curve is a flat dashed High Sea-orange line.

Physical realism comes from motion and collision timing, not fake 3D shading.

### Typography and readability

Increase text sizes from the approved mock-up before implementation:

- base interface text: at least 16px on desktop and mobile;
- secondary/help text: at least 13px;
- control labels and values: at least 15px;
- result metric values: approximately 28–34px;
- buttons: at least 16px and 44px high;
- board labels: at least 12px where space permits.

Use a clean system sans-serif for interface text. A restrained editorial serif may be used only for the main panel heading and large metric numerals. Avoid uppercase paragraphs and excessive letter spacing.

### Layout and hierarchy

Desktop uses a narrow left control rail and a dominant board area. The primary action is **Drop 100 balls**. Clear/reset is secondary. The board header contains only status and small view toggles.

Below the board, show three essential readings:

- Average bin
- Spread
- Balls dropped

Add one short plain-language interpretation. Detailed bin counts and technical statistics move into an expandable results region or drawer.

On smaller screens, controls stack above the board, metrics wrap cleanly, and the detailed table scrolls or reflows without individual values wrapping into illegible fragments.

## Copy Direction

Use short, literal labels:

- Centre — “Where the peak sits”
- Spread — “How wide the shape is”
- Skew — “Which side stretches further”
- Tails — “How often extremes appear”
- Expected shape
- Observed balls
- View detailed results

Remove phrases such as “mesokurtic reference,” “model-driven physics,” “seeded largest-remainder target quotas,” and “bounded velocity correction” from the primary interface. If technically useful, place definitions in an optional teacher/technical note.

## Accessibility

- All controls have programmatic labels and keyboard operation.
- Focus indicators are clearly visible.
- Colour is never the only distinction: observed balls are solid marks and the expected model is a dashed line.
- Respect `prefers-reduced-motion` for interface transitions; ball physics continues because it is the core content, with pause and slow-motion controls available.
- Touch targets are at least 44 by 44 pixels.
- Text and controls remain legible at 200% browser zoom.
- Detailed statistics use semantic table markup.

## Verification

Implementation is complete only after:

1. Unit tests cover contact-only route impulses, absence of free-flight steering, and stuck-release gating.
2. Statistical tests verify exact target quotas for centre, spread, skew, and tails presets.
3. Integration tests complete full drops without stranded balls.
4. Responsive checks cover 375px, 768px, 1024px, and 1440px widths.
5. Accessibility checks cover keyboard navigation, focus, contrast, semantic results markup, and reduced-motion behavior.
6. A production build succeeds and the deployed GitHub Pages asset is verified rather than assuming deployment completed.

