import React from 'react';
import { render, screen } from '@testing-library/react';
import { formatCount } from './format';

// Regression test for #110: formatCount returned a trailing space for every
// value ("0 robots ", "1 robot "), so headings rendered with stray whitespace.
describe('formatCount (regression #110)', () => {
  it('returns "0 robots" with no trailing space', () => {
    const result = formatCount(0);
    expect(result).toBe('0 robots');
    expect(result).not.toMatch(/\s$/);
  });

  it('returns "1 robot" (singular) with no trailing space', () => {
    const result = formatCount(1);
    expect(result).toBe('1 robot');
    expect(result).not.toMatch(/\s$/);
  });

  it('returns "5 robots" (plural) with no trailing space', () => {
    const result = formatCount(5);
    expect(result).toBe('5 robots');
    expect(result).not.toMatch(/\s$/);
  });

  it('never emits leading, trailing or doubled whitespace', () => {
    for (const count of [0, 1, 2, 3, 10, 99]) {
      const result = formatCount(count);
      expect(result).toBe(result.trim());
      expect(result).not.toMatch(/\s{2,}/);
    }
  });

  it('uses the plural noun for every count except one', () => {
    expect(formatCount(0)).toBe('0 robots');
    expect(formatCount(1)).toBe('1 robot');
    expect(formatCount(2)).toBe('2 robots');
    expect(formatCount(11)).toBe('11 robots');
  });

  it('renders a heading with no trailing space', () => {
    render(<h2 data-testid="count-heading">{formatCount(0)}</h2>);
    expect(screen.getByTestId('count-heading').textContent).toBe('0 robots');
  });

  it('falls back to 0 for unusable input instead of throwing', () => {
    expect(formatCount(undefined)).toBe('0 robots');
    expect(formatCount('not-a-number')).toBe('0 robots');
    expect(formatCount(NaN)).toBe('0 robots');
  });
});
