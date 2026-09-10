import React from 'react';
import { render, screen } from '@testing-library/react';
import { formatCount, DEFAULT_NOUN } from './format';

// Regression test for #135: formatCount(0) currently returns "0 robots", but
// nothing pinned that behavior — a future refactor could silently change it.
//
// The refactor this suite guards against is widening the singular branch from
// "exactly one" to "one or fewer" (`count <= 1`, a common way to read the
// condition as "not plural"), which silently labels zero as singular:
//   naiveFormatCount(0) -> "0 robot"    (the regression)
//   naiveFormatCount(1) -> "1 robot"    (still correct)
//   naiveFormatCount(2) -> "2 robots"   (still correct)
//
// `naiveFormatCount` below reproduces that refactor verbatim so this suite is
// non-vacuous: it is indistinguishable from formatCount for every count except
// zero, which is exactly the boundary the issue asks to pin. The acceptance
// assertions fail against `naiveFormatCount` and pass against `formatCount`, so
// the zero boundary cannot move without turning this suite red.
const naiveFormatCount = (count) => {
  let n;
  try {
    n = typeof count === 'number' ? count : Number(count);
    if (!Number.isFinite(n)) n = 0;
  } catch {
    n = 0;
  }
  const noun = n <= 1 ? DEFAULT_NOUN.singular : DEFAULT_NOUN.plural;
  return `${n} ${noun}`;
};

describe('formatCount (regression #135)', () => {
  it('acceptance: formatCount(0) returns exactly "0 robots"', () => {
    const result = formatCount(0);
    expect(result).toBe('0 robots');
    expect(result).toHaveLength('0 robots'.length);
    expect(result).not.toMatch(/\s$/);
  });

  it('pins zero to the plural noun, not the singular', () => {
    expect(formatCount(0)).toBe(`0 ${DEFAULT_NOUN.plural}`);
    expect(formatCount(0)).toBe('0 robots');
    expect(formatCount(0)).not.toBe(`0 ${DEFAULT_NOUN.singular}`);
    expect(formatCount(0)).not.toBe('0 robot');
    expect(formatCount(0).endsWith('robots')).toBe(true);
  });

  it('reproduces the future-refactor defect in the naive implementation', () => {
    // sanity-check the reproduction itself, so the suite can never pass vacuously
    expect(naiveFormatCount(0)).toBe('0 robot');
    expect(naiveFormatCount(1)).toBe('1 robot');
    expect(naiveFormatCount(2)).toBe('2 robots');

    // the naive form is only distinguishable from the real helper at zero,
    // which makes the zero assertion the sole pin on that boundary
    expect(naiveFormatCount(1)).toBe(formatCount(1));
    expect(naiveFormatCount(2)).toBe(formatCount(2));
    expect(naiveFormatCount(0)).not.toBe(formatCount(0));
  });

  it('selects the singular noun only for a count of exactly one', () => {
    expect(formatCount(0)).toBe('0 robots');
    expect(formatCount(0.0)).toBe('0 robots');
    expect(formatCount(-0)).toBe('0 robots');
    expect(formatCount('0')).toBe('0 robots');
    expect(formatCount(1)).toBe('1 robot');
    expect(formatCount(1.0)).toBe('1 robot');
    expect(formatCount('1')).toBe('1 robot');
    expect(formatCount(2)).toBe('2 robots');
    expect(formatCount(11)).toBe('11 robots');
  });

  it('never emits the naive zero label for any zero spelling', () => {
    for (const zero of [0, -0, 0.0, '0']) {
      const result = formatCount(zero);
      expect(result).toBe('0 robots');
      expect(result).not.toBe(naiveFormatCount(zero));
      expect(result).not.toMatch(/0 robot$/);
    }
  });

  it('keeps zero plural for a custom noun too', () => {
    expect(formatCount(0, 'item')).toBe('0 items');
    expect(formatCount(0, 'items')).toBe('0 items');
    expect(formatCount(0, ['item', 'items'])).toBe('0 items');
    expect(formatCount(0, { singular: 'item', plural: 'items' })).toBe('0 items');
    expect(formatCount(0, 'item')).not.toBe('0 item');
  });

  it('never emits leading, trailing or doubled whitespace at zero', () => {
    for (const count of [0, -0, 1, 2, 5, 10, 42, 1000, -1, 1.5]) {
      const result = formatCount(count);
      expect(result).toBe(result.trim());
      expect(result).not.toMatch(/^\s/);
      expect(result).not.toMatch(/\s$/);
      expect(result).not.toMatch(/\s{2,}/);
    }
  });

  it('falls back to "0 robots" for unusable input instead of throwing', () => {
    for (const input of [undefined, null, NaN, Infinity, -Infinity, 'nope', {}]) {
      expect(formatCount(input)).toBe('0 robots');
    }
  });

  it('renders a zero heading as exactly "0 robots"', () => {
    render(<h2 data-testid="zero-heading">{formatCount(0)}</h2>);
    const heading = screen.getByTestId('zero-heading');
    expect(heading.textContent).toBe('0 robots');
    expect(heading.textContent).toHaveLength('0 robots'.length);
    expect(heading.textContent).not.toBe('0 robot');
  });
});
