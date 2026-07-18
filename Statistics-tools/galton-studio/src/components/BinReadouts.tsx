import type { BinSummary } from '../model/types';

export function formatStatistic(value: number | null, digits = 2): string {
  return value === null || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

export interface BinReadoutsProps {
  bins: readonly BinSummary[];
}

function binAccessibleName({ bin, count, percentage, zScore }: BinSummary): string {
  const noun = count === 1 ? 'ball' : 'balls';
  return `Bin ${bin}: ${count} ${noun}, ${formatStatistic(percentage, 1)}%, z-score ${formatStatistic(zScore)}`;
}

export function BinReadouts({ bins }: BinReadoutsProps) {
  const zScoresUnavailable = bins.some(({ zScore }) => zScore === null || !Number.isFinite(zScore));

  return (
    <section className="bin-readouts" aria-labelledby="bin-readouts-heading">
      <h3 id="bin-readouts-heading">Bin details</h3>
      <div className="bin-readouts__list">
        {bins.map((bin) => (
          <details
            className="bin-readouts__item"
            key={bin.bin}
            role="group"
            aria-label={binAccessibleName(bin)}
          >
            <summary
              role="button"
              aria-label={binAccessibleName(bin)}
              style={{ minBlockSize: 44 }}
            >
              <strong>Bin {bin.bin}</strong>
              <span>{bin.count}</span>
              <span>{formatStatistic(bin.percentage, 1)}%</span>
              <span>z {formatStatistic(bin.zScore)}</span>
            </summary>
            <p>
              This bin contains {bin.count} of the settled balls. Its z-score locates the bin relative
              to the observed mean.
            </p>
          </details>
        ))}
      </div>
      {zScoresUnavailable && (
        <p>Bin z-scores are available once settled balls have a non-zero spread.</p>
      )}
    </section>
  );
}

export function BoardBinReadouts({ bins }: BinReadoutsProps) {
  return (
    <section className="board-bin-readouts" aria-labelledby="board-bin-readouts-heading">
      <h3 id="board-bin-readouts-heading" className="visually-hidden">Values directly beneath the board bins</h3>
      <ol className="board-bin-readouts__desktop" aria-label="Values directly beneath the board bins">
        {bins.map((bin) => (
          <li key={bin.bin} aria-label={binAccessibleName(bin)}>
            <strong>Bin {bin.bin}</strong>
            <span>{bin.count}</span>
            <span>{formatStatistic(bin.percentage, 1)}%</span>
            <span>z {formatStatistic(bin.zScore)}</span>
          </li>
        ))}
      </ol>
      <ol className="board-bin-readouts__mobile" aria-label="Bin details beside the board">
        {bins.map((bin) => (
          <li key={bin.bin}>
            <details>
              <summary
                role="button"
                aria-label={binAccessibleName(bin)}
                style={{ minBlockSize: 44, minInlineSize: 44 }}
              >
                <strong>{bin.bin}</strong>
              </summary>
              <p>
                <span>{bin.count} {bin.count === 1 ? 'ball' : 'balls'}</span>
                <span>{formatStatistic(bin.percentage, 1)}%</span>
                <span>z {formatStatistic(bin.zScore)}</span>
              </p>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
