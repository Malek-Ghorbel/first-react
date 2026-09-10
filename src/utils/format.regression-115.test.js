import React from 'react';
import { render, screen } from '@testing-library/react';
import { formatCount } from './format';

// Regression test for #115: formatCount always used the plural noun and
// appended a trailing space (it built `${count} robots `), so a heading with a
// single item rendered as "1 robots " instead of "1 robot".
//
// The legacy buggy label is reproduced below so the test fails if that shape
// ever comes back.
const legacyBuggyLabel = (count) => `${count} robots `;

describe('formatCount (regression #115)', () => {
  it('acceptance: formatCount(1) returns exactly "1 robot"', () => {
    expect(formatCount(1)).toBe('1 robot');
  });

  it('acceptance: formatCount(5) returns exactly "5 robots"', () => {
    expect(formatCount(5)).toBe('5 robots');
  });

  it('acceptance: no trailing whitespace in any result', () => {
    for (const count of [0, 1, 2, 5, 10, 42]) {
      const result = formatCount(count);
      expect(result).not.toMatch(/\s$/);
      expect(result).toBe(result.trim());
    }
  });

  it('reproduces the reported defect: result never matches the legacy label', () => {
    for (const count of [0, 1, 2, 5]) {
      expect(formatCount(count)).not.toBe(legacyBuggyLabel(count));
    }
    // the legacy implementation is exactly what the issue reported
    expect(legacyBuggyLabel(1)).toBe('1 robots ');
    expect(formatCount(1)).not.toBe('1 robots ');
    expect(formatCount(1)).not.toContain('robots');
  });

  it('selects singular for exactly one and plural everywhere else', () => {
    expect(formatCount(1)).toBe('1 robot');
    expect(formatCount(1.0)).toBe('1 robot');
    expect(formatCount('1')).toBe('1 robot');
    expect(formatCount(0)).toBe('0 robots');
    expect(formatCount(2)).toBe('2 robots');
    expect(formatCount(11)).toBe('11 robots');
  });

  it('renders a heading as "1 robot" with no trailing space', () => {
    render(<h2 data-testid="count-heading">{formatCount(1)}</h2>);
    const heading = screen.getByTestId('count-heading');
    expect(heading.textContent).toBe('1 robot');
    expect(heading.textContent).not.toMatch(/\s$/);
  });

  it('keeps the fallback for unusable input without whitespace', () => {
    expect(formatCount(undefined)).toBe('0 robots');
    expect(formatCount(null)).toBe('0 robots');
    expect(formatCount(NaN)).toBe('0 robots');
    expect(formatCount('not-a-number')).toBe('0 robots');
    expect(formatCount(Infinity)).toBe('0 robots');
  });
});
