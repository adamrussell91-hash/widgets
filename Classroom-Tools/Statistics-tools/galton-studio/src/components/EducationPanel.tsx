import type { PhysicsMode } from '../model/types';

export interface EducationPanelProps {
  mode: PhysicsMode;
  hasMixedRegimes: boolean;
}

export function EducationPanel({ mode, hasMixedRegimes }: EducationPanelProps) {
  return (
    <section className="education-panel" aria-labelledby="interpretation-heading">
      <h3 id="interpretation-heading">Quick guide</h3>

      <details>
        <summary role="button" style={{ minBlockSize: 44 }}>Shape and tails</summary>
        <p>Shape leans the result left or right. Tail weight changes how often balls reach the edges.</p>
      </details>
      <details>
        <summary role="button" style={{ minBlockSize: 44 }}>Observed and expected</summary>
        <p>The blue balls show what happened. The orange line shows the shape the settings predict.</p>
        {hasMixedRegimes && <p>The expected line includes every group of settings used in this run.</p>}
      </details>
      <details>
        <summary role="button" style={{ minBlockSize: 44 }}>Reading the numbers</summary>
        <p>Mean is the centre. Spread shows how far balls fan out. Skew shows which side has the longer tail.</p>
        {mode === 'guided' && <p>Your shape controls change the expected distribution.</p>}
      </details>
    </section>
  );
}
