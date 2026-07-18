import { describe, expect, it } from 'vitest';
import { createRng } from './prng';

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    const first = createRng(42);
    const second = createRng(42);

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });
});
