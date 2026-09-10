import React from 'react';
import { render, screen } from '@testing-library/react';
import { formatCount } from './format';

// Regression test for #119: formatCount rendered the wrong noun form for a
// count of one and left a trailing space on the label, so a heading with a
// single item rendered as "1 robots " instead of "1 robot".
//
// The legacy body is reproduced verbatim below so this suite is non-vacuous:
// it must fail against `${count} robots ` and pass against the fixed helper.
const legacyFormatCount = (count) => `${count} robots `;

describe('formatCount (regression #119)', () => {
  it('acceptance: formatCount(1) returns exactly "1 robot"', () => {
    expect(formatCount(1)).toBe('1 robot');
  });

  it('acceptance: formatCount(0) returns exactly "0 robots"', () => {
    expect(formatCount(0)).toBe('0 robots');
  });

  it('never reproduces the reported defect', () => {
    // the legacy implementation is exactly what the issue reported
    expect(legacyFormatCount(1)).toBe('1 robots ');
    expect(legacyFormatCount(0)).toBe('0 robots ');

    for (const count of [0, 1, 2, 5, 10]) {
      const result = formatCount(count);
      expect(result).not.toBe(legacyFormatCount(count));
      expect(result).not.toMatch(/\s$/);
    }
    // even after trimming, the legacy singular label stays wrong ("1 robots")
    expect(legacyFormatCount(1).trim()).toBe('1 robots');
    expect(legacyFormatCount(1).trim()).not.toBe(formatCount(1));
    expect(formatCount(1)).not.toContain('robots');
  });

  it('uses the singular noun only for a count of exactly one', () => {
    expect(formatCount(1)).toBe('1 robot');
    expect(formatCount(1.0)).toBe('1 robot');
    expect(formatCount('1')).toBe('1 robot');
    expect(formatCount(0)).toBe('0 robots');
    expect(formatCount(2)).toBe('2 robots');
    expect(formatCount(11)).toBe('11 robots');
    expect(formatCount('2')).toBe('2 robots');
  });

  it('never emits leading, trailing or doubled whitespace', () => {
    for (const count of [0, 1, 2, 3, 5, 10, 42, 1000, -1, 1.5]) {
      const result = formatCount(count);
      expect(result).toBe(result.trim());
      expect(result).not.toMatch(/^\s/);
      expect(result).not.toMatch(/\s$/);
      expect(result).not.toMatch(/\s{2,}/);
    }
  });

  it('renders a heading as "1 robot" with no trailing space', () => {
    render(<h2 data-testid="count-heading">{formatCount(1)}</h2>);
    const heading = screen.getByTestId('count-heading');
    expect(heading.textContent).toBe('1 robot');
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
