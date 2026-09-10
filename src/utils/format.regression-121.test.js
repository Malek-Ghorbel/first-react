import React from 'react';
import { render, screen } from '@testing-library/react';
import { formatCount } from './format';

// Regression test for #121: formatCount appended the noun and a trailing space
// without trimming, so a heading rendered as "1 robot " instead of "1 robot".
//
// The legacy body reported in the issue is reproduced verbatim below so this
// suite is non-vacuous: it fails against `${count} robot ` / `${count} robots `
// and passes against the fixed helper.
const legacyFormatCount = (count) => `${count} robot `;

describe('formatCount (regression #121)', () => {
  it('acceptance: formatCount(1) returns exactly "1 robot"', () => {
    expect(formatCount(1)).toBe('1 robot');
  });

  it('acceptance: formatCount(5) returns exactly "5 robots"', () => {
    expect(formatCount(5)).toBe('5 robots');
  });

  it('never reproduces the reported defect', () => {
    // the legacy implementation is exactly what the issue reported
    expect(legacyFormatCount(1)).toBe('1 robot ');
    expect(legacyFormatCount(5)).not.toBe('5 robots');

    for (const count of [0, 1, 2, 5, 10, 42]) {
      const result = formatCount(count);
      expect(result).not.toBe(legacyFormatCount(count));
      expect(result).not.toMatch(/\s$/);
    }
    // trimming the legacy label still leaves the un-trimmed shape behind for
    // every count other than one, while the fix is singular only for one
    expect(legacyFormatCount(5).trim()).toBe('5 robot');
    expect(formatCount(5)).toBe('5 robots');
  });

  it('never emits leading, trailing or doubled whitespace', () => {
    const counts = [0, 1, 2, 3, 5, 10, 42, 1000, -1, 1.5, '1', '5', ' 2 '];
    for (const count of counts) {
      const result = formatCount(count);
      expect(typeof result).toBe('string');
      expect(result).toBe(result.trim());
      expect(result).not.toMatch(/^\s/);
      expect(result).not.toMatch(/\s$/);
      expect(result).not.toMatch(/\s{2,}/);
    }
  });

  it('selects the singular noun only for a count of exactly one', () => {
    expect(formatCount(1)).toBe('1 robot');
    expect(formatCount(1.0)).toBe('1 robot');
    expect(formatCount('1')).toBe('1 robot');
    expect(formatCount(0)).toBe('0 robots');
    expect(formatCount(2)).toBe('2 robots');
    expect(formatCount(11)).toBe('11 robots');
  });

  it('renders a heading with no trailing space', () => {
    render(<h2 data-testid="count-heading">{formatCount(1)}</h2>);
    const heading = screen.getByTestId('count-heading');
    expect(heading.textContent).toBe('1 robot');
    expect(heading.textContent).not.toMatch(/\s$/);
    expect(heading.textContent).toHaveLength('1 robot'.length);
  });

  it('keeps the zero fallback for unusable input, still whitespace-free', () => {
    for (const input of [undefined, null, NaN, Infinity, -Infinity, 'nope', {}, []]) {
      const result = formatCount(input);
      expect(result).toBe('0 robots');
      expect(result).toBe(result.trim());
    }
  });
});
