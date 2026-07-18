import { describe, expect, it } from 'vitest';
import styles from './styles.css?raw';

function relativeLuminance(hex: string): number {
  const channels = hex.match(/[\da-f]{2}/gi)!.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

describe('responsive visual-system safeguards', () => {
  it('switches layouts before their minimum columns can clip', () => {
    expect(styles).toContain('@media (max-width: 1010px)');
    expect(styles).toContain('@media (max-width: 730px)');
    expect(styles).not.toContain('overflow-x: hidden');
  });

  it('keeps secondary and recovery copy at WCAG AA contrast on white', () => {
    const muted = '#536f80';
    const contrast = (1.05) / (relativeLuminance(muted) + 0.05);

    expect(styles).toContain(`--muted: ${muted}`);
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });

  it('separates adjacent educational disclosure targets by at least eight pixels', () => {
    expect(styles).toMatch(/\.education-panel\s*\{[^}]*gap:\s*var\(--space-2\)/s);
    expect(styles).toContain('--space-2: 8px');
  });

  it('keeps desktop bin values beneath the apparatus and swaps to focusable details on phones', () => {
    expect(styles).toMatch(/\.board-bin-readouts__desktop\s*\{[^}]*display:\s*grid/s);
    expect(styles).toMatch(/\.board-bin-readouts__mobile\s*\{[^}]*display:\s*none/s);
    expect(styles).toMatch(/\.bin-readouts\s*\{[^}]*display:\s*none/s);
    expect(styles).toMatch(/@media \(max-width: 1010px\)[\s\S]*\.board-bin-readouts__desktop\s*\{[^}]*display:\s*none/s);
    expect(styles).toMatch(/@media \(max-width: 1010px\)[\s\S]*\.board-bin-readouts__mobile\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(8, minmax\(44px, 1fr\)\)/s);
    expect(styles).toMatch(/@media \(max-width: 730px\)[\s\S]*\.board-bin-readouts__mobile\s*\{[^}]*grid-template-columns:\s*repeat\(5, minmax\(44px, 1fr\)\)/s);
    expect(styles).toMatch(/\.board-bin-readouts__mobile summary\s*\{[^}]*min-block-size:\s*44px[^}]*min-inline-size:\s*44px/s);
  });

  it('keeps all three release-rate regions inside a constrained control column', () => {
    expect(styles).toMatch(/\.control-panel__regions\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s);
    expect(styles).toMatch(/\.control-panel__regions li\s*\{[^}]*min-inline-size:\s*0[^}]*text-align:\s*center/s);
  });

  it('keeps core educational copy at the 16-pixel body-text minimum', () => {
    for (const selector of [
      '.board-bin-readouts li',
      '.control-panel__regions li',
      '.prediction-prompt',
      '.prediction-prompt strong',
      '.control-panel__change-summary h3',
      '.control-panel__change-summary p',
    ]) {
      const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(styles).toMatch(new RegExp(`${escapedSelector}\\s*\\{[^}]*font-size:\\s*1rem`, 's'));
    }
  });
});
