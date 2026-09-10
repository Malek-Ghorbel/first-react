import React from 'react';
import { render, screen } from '@testing-library/react';
import { formatCount } from './format';

// Regression test for #127: formatCount appended the noun and a trailing space
// without trimming, so a label rendered as "1 robot " instead of "1 robot".
//
// The legacy body reported in the issue is reproduced verbatim below so this
// suite is non-vacuous: the acceptance assertions fail against
// `legacyFormatCount` and pass against the fixed helper.
const legacyFormatCount = (count) => {
  const noun = count === 1 ? 'robot' : 'robots';
  return `${count} ${noun} `;
};

describe('formatCount (regression #127)', () => {
  it('acceptance: formatCount(1) returns exactly "1 robot"', () => {
    const result = formatCount(1);
    expect(result).toBe('1 robot');
    expect(result).toHaveLength('1 robot'.length);
    expect(result).not.toMatch(/\s$/);
  });

  it('acceptance: formatCount(5) returns exactly "5 robots"', () => {
    const result = formatCount(5);
    expect(result).toBe('5 robots');
    expect(result).toHaveLength('5 robots'.length);
    expect(result).not.toMatch(/\s$/);
  });

  it('reproduces the reported defect in the legacy implementation', () => {
    // sanity-check the reproduction itself, so the suite can never pass vacuously
    expect(legacyFormatCount(1)).toBe('1 robot ');
    expect(legacyFormatCount(5)).toBe('5 robots ');
    expect(legacyFormatCount(1)).not.toBe('1 robot');
    expect(legacyFormatCount(5)).not.toBe('5 robots');
  });

  it('never emits the legacy trailing-space label for any count', () => {
    for (const count of [0, 1, 2, 5, 10, 42, 1000]) {
      const result = formatCount(count);
      expect(result).not.toBe(legacyFormatCount(count));
      expect(result).not.toMatch(/^\s/);
      expect(result).not.toMatch(/\s$/);
      expect(result).not.toMatch(/\s{2,}/);
      expect(result).toBe(result.trim());
    }
  });

  it('selects the singular noun for exactly one and the plural otherwise', () => {
    expect(formatCount(0)).toBe('0 robots');
    expect(formatCount(1)).toBe('1 robot');
    expect(formatCount(1.0)).toBe('1 robot');
    expect(formatCount('1')).toBe('1 robot');
    expect(formatCount(2)).toBe('2 robots');
    expect(formatCount(5)).toBe('5 robots');
    expect(formatCount(11)).toBe('11 robots');
    expect(formatCount(1)).not.toContain('robots');
  });

  it('renders a heading as "1 robot" with no trailing space', () => {
    render(<h2 data-testid="count-heading">{formatCount(1)}</h2>);
    const heading = screen.getByTestId('count-heading');
    expect(heading.textContent).toBe('1 robot');
    expect(heading.textContent).toHaveLength('1 robot'.length);
    expect(heading.textContent).not.toMatch(/\s$/);
  });

  it('keeps the zero fallback for unusable input, still whitespace-free', () => {
    for (const input of [undefined, null, NaN, Infinity, -Infinity, 'nope', {}, []]) {
      const result = formatCount(input);
      expect(result).toBe('0 robots');
      expect(result).toBe(result.trim());
    }
  });
});
