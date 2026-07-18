import { describe, expect, it } from 'vitest';
import appEntry from '../index.html?raw';

describe('production build entry', () => {
  it('compiles the current React source instead of a stale generated bundle', () => {
    expect(appEntry).toContain('src="/src/main.tsx"');
    expect(appEntry).not.toMatch(/src="\.\/assets\/index-[^"]+\.js"/);
  });
});
