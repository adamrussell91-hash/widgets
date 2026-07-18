# Galton Studio — Board page override

This page override supersedes the generated dark showcase direction. The user approved the light **Frosted Notebook** concept and its physical-apparatus hierarchy.

## Visual hierarchy

1. The clear physical Galton apparatus dominates the viewport.
2. Experiment controls and live statistics sit in narrow glass side panels.
3. Analytical bars and the classic-red theoretical curve are hidden until the run completes.

## Palette

- Paper background: `#EDF6FA`
- Glass surface: `rgba(255, 255, 255, 0.62)`
- Glass border: `rgba(255, 255, 255, 0.92)`
- Primary ink: `#18364B`
- Secondary text: `#5E7687`
- Observed teal: `#087FA7`
- Control cobalt: `#1259A6`
- Theoretical red: `#CF3038`
- Focus ring: `#075D96`

Red is reserved for theoretical-model analysis and related explanatory cues. Observed balls and values use teal/cobalt. Both layers must also carry visible text labels, never color alone.

## Materials

- Clear acrylic: restrained white highlights, fine blue-grey edge, minimal shadow.
- Pegs and gate: cool metal radial highlight with a darker lower edge.
- Balls: teal radial gradient with a small white specular highlight; each ball is drawn at its actual Matter.js body transform.
- Graph paper: very low-contrast 20–24px grid, never competing with labels or pegs.

## Typography

- Use the system UI stack for fast, dependable rendering.
- Use tabular numerals for statistics and bin values.
- Body text is at least 16px in the real interface with line height at least 1.5.
- Short uppercase eyebrow labels may be smaller only when supplementary and high contrast.

## Motion and feedback

- Physical ball movement is the only continuous animation.
- UI transitions use opacity/transform for 150–300ms with ease-out entry and ease-in exit.
- The post-run overlay fades in over 220ms; under `prefers-reduced-motion`, it appears immediately.
- No decorative bouncing, parallax, animated ambient blobs, or scroll-jacking.

## Accessibility and responsive rules

- Text contrast meets WCAG 2.1 AA.
- Every interactive control has a persistent label, visible focus, keyboard operation, and a minimum 44×44px target.
- The canvas exposes a live text summary; controls and statistics remain DOM content.
- No horizontal scroll at 375px, 768px, 1024px, or 1440px widths.
- Preserve the apparatus aspect ratio and keep bin labels legible when stacked on narrow screens.
