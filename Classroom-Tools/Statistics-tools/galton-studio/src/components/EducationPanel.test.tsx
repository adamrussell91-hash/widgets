import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EducationPanel } from './EducationPanel';

afterEach(cleanup);

describe('EducationPanel', () => {
  it('explains the experiment in three short topics', () => {
    render(<EducationPanel mode="natural" hasMixedRegimes={false} />);

    expect(screen.getByText('Shape and tails')).toBeInTheDocument();
    expect(screen.getByText('Observed and expected')).toBeInTheDocument();
    expect(screen.getByText('Reading the numbers')).toBeInTheDocument();
    expect(screen.queryByText(/PMF|velocity correction|quota/i)).not.toBeInTheDocument();
  });

  it('explains custom shape controls without technical jargon', () => {
    render(<EducationPanel mode="guided" hasMixedRegimes={false} />);

    expect(screen.getByText(/shape controls change the expected distribution/i)).toBeInTheDocument();
  });

  it('plainly identifies a mixed-settings run', () => {
    render(<EducationPanel mode="guided" hasMixedRegimes />);

    expect(screen.getByText(/includes every group of settings used/i)).toBeInTheDocument();
  });
});
