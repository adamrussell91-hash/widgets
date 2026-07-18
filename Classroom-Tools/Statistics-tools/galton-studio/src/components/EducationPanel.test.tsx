import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EducationPanel } from './EducationPanel';

afterEach(cleanup);

describe('EducationPanel', () => {
  it('discloses balanced target allocation and physical steering for every distribution', () => {
    render(<EducationPanel mode="natural" hasMixedRegimes={false} />);

    expect(screen.getByText(/balanced allocation of seeded target bins/i)).toBeInTheDocument();
    expect(screen.getByText(/bounded peg-contact steering/i)).toBeInTheDocument();
  });
});
