import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EducationPanel } from './EducationPanel';

afterEach(cleanup);

describe('EducationPanel', () => {
  it('discloses a binomial PMF, balanced target allocation, and physical steering', () => {
    render(<EducationPanel mode="natural" hasMixedRegimes={false} />);

    expect(screen.getByText(/active binomial PMF creates/i)).toBeInTheDocument();
    expect(screen.getByText(/balanced allocation of seeded target bins/i)).toBeInTheDocument();
    expect(screen.getByText(/bounded peg-contact steering/i)).toBeInTheDocument();
  });

  it('discloses the shaped PMF family for shaped distributions', () => {
    render(<EducationPanel mode="guided" hasMixedRegimes={false} />);

    expect(screen.getByText(/active shaped PMF creates/i)).toBeInTheDocument();
    expect(screen.getByText(/bounded peg-contact steering/i)).toBeInTheDocument();
  });
});
