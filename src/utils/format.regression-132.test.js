import { render, screen } from '@testing-library/react';
import { formatCount } from './format';

// Regression test for #132: formatCount rendered "1 items" for a single item
// because it always appended the plural noun — the noun pair was hard-coded, so
// the function had no way to render a singular label at all.
//
// formatCount now accepts the noun to render (a singular string, a
// [singular, plural] pair, or a { singular, plural } object) and picks the
// singular form only when the count is exactly one:
//   formatCount(1, 'item') -> "1 item"
//   formatCount(2, 'item') -> "2 items"
//
// Behavior for callers that pass no noun is unchanged: the repo's domain label
// is still "robot"/"robots", so formatCount(1) -> "1 robot".
//
// The legacy body reported in the issue is reproduced verbatim below so this
// test fails against the buggy implementation and passes against the fix.
const legacyFormatCount = (count, noun = 'items') => `${count} ${noun} `;

describe('formatCount (regression #132)', () => {
  it('acceptance: formatCount(1) uses the singular noun', () => {
    const result = formatCount(1, 'item');
    expect(result).toBe('1 item');
    expect(result).toHaveLength('1 item'.length);
    expect(result).not.toMatch(/\s$/);
  });

  it('acceptance: formatCount(2) uses the plural noun', () => {
    const result = formatCount(2, 'item');
    expect(result).toBe('2 items');
    expect(result).toHaveLength('2 items'.length);
    expect(result).not.toMatch(/\s$/);
  });

  it('never reproduces the reported defect ("1 items")', () => {
    // the legacy implementation is exactly what the issue reported
    expect(legacyFormatCount(1).trim()).toBe('1 items');
    expect(formatCount(1, 'item')).not.toBe('1 items');
    expect(formatCount(1, 'item')).not.toContain('items');

    for (const count of [0, 1, 2, 5, 10, 42]) {
      expect(formatCount(count, 'item')).not.toBe(legacyFormatCount(count));
      expect(formatCount(count, 'item')).not.toMatch(/\s$/);
    }
  });

  it('selects the singular noun for exactly one and the plural otherwise', () => {
    expect(formatCount(0, 'item')).toBe('0 items');
    expect(formatCount(1, 'item')).toBe('1 item');
    expect(formatCount(1.0, 'item')).toBe('1 item');
    expect(formatCount('1', 'item')).toBe('1 item');
    expect(formatCount(2, 'item')).toBe('2 items');
    expect(formatCount(11, 'item')).toBe('11 items');
    expect(formatCount('2', 'item')).toBe('2 items');
  });

  it('derives regular plurals for a supplied singular noun', () => {
    expect(formatCount(1, 'item')).toBe('1 item');
    expect(formatCount(2, 'item')).toBe('2 items');
    expect(formatCount(2, 'box')).toBe('2 boxes');
    expect(formatCount(2, 'class')).toBe('2 classes');
    expect(formatCount(2, 'city')).toBe('2 cities');
    expect(formatCount(2, 'dish')).toBe('2 dishes');
  });

  it('accepts an explicit [singular, plural] pair and a { singular, plural } object', () => {
    expect(formatCount(1, ['person', 'people'])).toBe('1 person');
    expect(formatCount(3, ['person', 'people'])).toBe('3 people');
    expect(formatCount(1, { singular: 'child', plural: 'children' })).toBe('1 child');
    expect(formatCount(5, { singular: 'child', plural: 'children' })).toBe('5 children');
  });

  it('keeps the default robot label unchanged (singular for one, plural otherwise)', () => {
    expect(formatCount(0)).toBe('0 robots');
    expect(formatCount(1)).toBe('1 robot');
    expect(formatCount(1)).not.toContain('robots');
    expect(formatCount(2)).toBe('2 robots');
    expect(formatCount(5)).toBe('5 robots');
    expect(formatCount(11)).toBe('11 robots');
  });

  it('never emits leading, trailing or doubled whitespace', () => {
    for (const count of [0, 1, 2, 3, 5, 10, 42, 1000, -1, 1.5]) {
      for (const noun of [undefined, 'item', ['person', 'people'], { singular: 'child', plural: 'children' }]) {
        const result = formatCount(count, noun);
        expect(typeof result).toBe('string');
        expect(result).toBe(result.trim());
        expect(result).not.toMatch(/^\s/);
        expect(result).not.toMatch(/\s$/);
        expect(result).not.toMatch(/\s{2,}/);
      }
    }
  });

  it('falls back to the default noun for unusable noun input', () => {
    for (const bad of [null, '', '   ', 123, true, {}, [], ['', '']]) {
      expect(formatCount(1, bad)).toBe('1 robot');
      expect(formatCount(2, bad)).toBe('2 robots');
    }
  });

  it('does not throw when the noun object has throwing getters', () => {
    const evil = {};
    Object.defineProperty(evil, 'singular', { get() { throw new Error('boom'); }, enumerable: true });
    Object.defineProperty(evil, 'plural', { get() { throw new Error('boom'); }, enumerable: true });
    expect(() => formatCount(1, evil)).not.toThrow();
    expect(formatCount(1, evil)).toBe('1 robot');
  });

  it('falls back to 0 for unusable input instead of throwing', () => {
    for (const input of [undefined, null, NaN, Infinity, -Infinity, 'nope', {}, []]) {
      const result = formatCount(input, 'item');
      expect(result).toBe('0 items');
      expect(result).toBe(result.trim());
    }
  });

  it('renders a heading as "1 item" with no trailing space', () => {
    render(<h2 data-testid="count-heading">{formatCount(1, 'item')}</h2>);
    const heading = screen.getByTestId('count-heading');
    expect(heading.textContent).toBe('1 item');
    expect(heading.textContent).toHaveLength('1 item'.length);
    expect(heading.textContent).not.toMatch(/\s$/);
  });
});
