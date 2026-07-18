import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EducationPanel } from './EducationPanel';

afterEach(cleanup);

describe('EducationPanel', () => {
  it('discloses the exact quota scope and every material physical correction', () => {
    render(<EducationPanel mode="natural" hasMixedRegimes={false} />);

    expect(screen.getByText(/active binomial PMF creates/i)).toBeInTheDocument();
    expect(screen.getByText(/each fixed-PMF allocation segment/i)).toBeInTheDocument();
    expect(screen.getByText(/bounded hopper-feed velocity correction/i)).toBeInTheDocument();
    expect(screen.getByText(/bounded peg-contact impulses/i)).toBeInTheDocument();
    expect(screen.getByText(/continuous bounded between-row horizontal velocity correction/i))
      .toBeInTheDocument();
    expect(screen.getByText(/steering stops above the collection area/i)).toBeInTheDocument();
  });

  it('discloses the shaped PMF family for shaped distributions', () => {
    render(<EducationPanel mode="guided" hasMixedRegimes={false} />);

    expect(screen.getByText(/active shaped PMF creates/i)).toBeInTheDocument();
    expect(screen.getByText(/bounded peg-contact impulses/i)).toBeInTheDocument();
  });

  it('does not claim a whole-run quota bound for a mixed Keep run', () => {
    render(<EducationPanel mode="guided" hasMixedRegimes />);

    expect(screen.getByText(/does not create a single whole-run quota bound/i)).toBeInTheDocument();
  });
});
