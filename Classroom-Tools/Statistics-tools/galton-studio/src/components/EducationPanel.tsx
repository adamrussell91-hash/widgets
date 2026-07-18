import type { PhysicsMode } from '../model/types';

export interface EducationPanelProps {
  mode: PhysicsMode;
  hasMixedRegimes: boolean;
}

export function EducationPanel({ mode, hasMixedRegimes }: EducationPanelProps) {
  const pmfFamily = mode === 'natural' ? 'centred, symmetric PMF' : 'shaped PMF';

  return (
    <section className="education-panel" aria-labelledby="interpretation-heading">
      <h3 id="interpretation-heading">Interpret the experiment</h3>

      <details>
        <summary role="button" style={{ minBlockSize: 44 }}>What does hopper position change?</summary>
        <p>Hopper position shifts where balls enter the peg field.</p>
      </details>
      <details>
        <summary role="button" style={{ minBlockSize: 44 }}>How should I read skewness?</summary>
        <p>
          Skewness measures asymmetry. Its sign indicates the direction of the longer tail:
          negative points left, while positive points right.
        </p>
      </details>
      <details>
        <summary role="button" style={{ minBlockSize: 44 }}>How should I read Pearson kurtosis?</summary>
        <p>
          Pearson kurtosis compares tail weight and the propensity for outliers. Pearson 3 is
          mesokurtic; larger values indicate heavier tails and greater outlier propensity.
        </p>
      </details>
      <details>
        <summary role="button" style={{ minBlockSize: 44 }}>What is a z-score?</summary>
        <p>
          z = (x − μ) / σ. A bin’s z-score is its distance from the observed mean, measured in
          observed standard deviations.
        </p>
      </details>
      <details>
        <summary role="button" style={{ minBlockSize: 44 }}>Observed results and the expected model</summary>
        <p>The balls show what happened. The red curve shows what the model expected.</p>
        {hasMixedRegimes && (
          <p>
            The Combined expected model weights each set of parameters by the number of balls
            released under it.
          </p>
        )}
      </details>
      <details open>
        <summary role="button" style={{ minBlockSize: 44 }}>Why is this model-driven physics?</summary>
        <p>
          The active {pmfFamily} creates a balanced allocation of seeded target bins for each batch.
        </p>
        <p>
          Physical Matter.js bodies collide with the board; bounded peg-contact steering keeps them on
          their assigned routes.
        </p>
        <p>
          Paths and arrival order vary, while full-batch quotas are intentionally kept close to the
          model expectation for classroom reliability.
        </p>
      </details>
    </section>
  );
}
