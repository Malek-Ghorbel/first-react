import { render, screen } from '@testing-library/react';
import { formatCount } from './format';

// Regression test for #136: formatCount rendered "1 items" for a count of one.
//
// The noun is supplied the way the issue phrases it — as the plural word
// ("items") — and that word was used verbatim as the label, so the plural noun
// was appended regardless of the count:
//   formatCount(1, 'items') -> "1 items"   (wrong)
//   formatCount(2, 'items') -> "2 items"   (right, but for the wrong reason)
//
// A string noun that is a regular plural ("items", "boxes", "cities") is now
// singularized for a count of exactly one, while already-singular nouns
// ("item", "class", "status") and single-word nouns that merely end in "s" are
// rendered exactly as supplied.
//
// The legacy body reported in the issue is reproduced verbatim below so this
// suite is non-vacuous: the acceptance assertions fail against
// `legacyFormatCount` and pass against the fixed helper.
const legacyFormatCount = (count, noun = 'items') => `${count} ${noun}`;

describe('formatCount (regression #136)', () => {
  it('acceptance: formatCount(1) uses the singular noun', () => {
    const result = formatCount(1, 'items');
    expect(result).toBe('1 item');
    expect(result).toHaveLength('1 item'.length);
    expect(result).not.toMatch(/\s$/);
  });

  it('acceptance: formatCount(2) uses the plural noun', () => {
    const result = formatCount(2, 'items');
    expect(result).toBe('2 items');
    expect(result).toHaveLength('2 items'.length);
    expect(result).not.toMatch(/\s$/);
  });

  it('never reproduces the reported defect ("1 items")', () => {
    // the legacy implementation is exactly what the issue reported
    expect(legacyFormatCount(1)).toBe('1 items');
    expect(formatCount(1, 'items')).not.toBe(legacyFormatCount(1));
    expect(formatCount(1, 'items')).not.toContain('items');

    // every count other than one already agreed with the legacy label; only the
    // singular count differs, and only in the noun it renders
    for (const count of [0, 2, 5, 10, 42]) {
      const result = formatCount(count, 'items');
      expect(result).toBe(legacyFormatCount(count));
      expect(result).not.toMatch(/\s$/);
    }
  });

  it('selects the singular noun for exactly one and the plural otherwise', () => {
    expect(formatCount(0, 'items')).toBe('0 items');
    expect(formatCount(1, 'items')).toBe('1 item');
    expect(formatCount(1.0, 'items')).toBe('1 item');
    expect(formatCount('1', 'items')).toBe('1 item');
    expect(formatCount(2, 'items')).toBe('2 items');
    expect(formatCount(11, 'items')).toBe('11 items');
    expect(formatCount('2', 'items')).toBe('2 items');
    expect(formatCount(2, 'items')).not.toContain('itemses');
  });

  it('derives the singular form of other regular plurals', () => {
    expect(formatCount(1, 'boxes')).toBe('1 box');
    expect(formatCount(2, 'boxes')).toBe('2 boxes');
    expect(formatCount(1, 'cities')).toBe('1 city');
    expect(formatCount(2, 'cities')).toBe('2 cities');
    expect(formatCount(1, 'dishes')).toBe('1 dish');
    expect(formatCount(2, 'dishes')).toBe('2 dishes');
    expect(formatCount(1, 'classes')).toBe('1 class');
    expect(formatCount(2, 'classes')).toBe('2 classes');
    expect(formatCount(1, 'robots')).toBe('1 robot');
    expect(formatCount(2, 'robots')).toBe('2 robots');
  });

  it('leaves already-singular nouns untouched, including single words ending in "s"', () => {
    expect(formatCount(1, 'item')).toBe('1 item');
    expect(formatCount(2, 'item')).toBe('2 items');
    expect(formatCount(1, 'class')).toBe('1 class');
    expect(formatCount(2, 'class')).toBe('2 classes');
    expect(formatCount(1, 'bus')).toBe('1 bus');
    expect(formatCount(2, 'bus')).toBe('2 buses');
    expect(formatCount(1, 'status')).toBe('1 status');
    expect(formatCount(1, 'news')).toBe('1 news');
    expect(formatCount(1, 'series')).toBe('1 series');
  });

  it('keeps the explicit pair and object forms unchanged', () => {
    expect(formatCount(1, ['person', 'people'])).toBe('1 person');
    expect(formatCount(3, ['person', 'people'])).toBe('3 people');
    expect(formatCount(1, { singular: 'child', plural: 'children' })).toBe('1 child');
    expect(formatCount(5, { singular: 'child', plural: 'children' })).toBe('5 children');
    expect(formatCount(1, { plural: 'items' })).toBe('1 item');
    expect(formatCount(2, { plural: 'items' })).toBe('2 items');
  });

  it('keeps the default robot label unchanged (singular for one, plural otherwise)', () => {
    expect(formatCount(0)).toBe('0 robots');
    expect(formatCount(1)).toBe('1 robot');
    expect(formatCount(2)).toBe('2 robots');
    expect(formatCount(5)).toBe('5 robots');
    expect(formatCount(11)).toBe('11 robots');
  });

  it('never emits leading, trailing or doubled whitespace', () => {
    for (const count of [0, 1, 2, 3, 5, 10, 42, 1000, -1, 1.5]) {
      for (const noun of [undefined, 'item', 'items', ['person', 'people'], { singular: 'child', plural: 'children' }]) {
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

  it('falls back to 0 for unusable input instead of throwing', () => {
    for (const input of [undefined, null, NaN, Infinity, -Infinity, 'nope', {}, []]) {
      const result = formatCount(input, 'items');
      expect(result).toBe('0 items');
      expect(result).toBe(result.trim());
    }
  });

  it('renders a heading as "1 item" with no trailing space', () => {
    render(<h2 data-testid="count-heading">{formatCount(1, 'items')}</h2>);
    const heading = screen.getByTestId('count-heading');
    expect(heading.textContent).toBe('1 item');
    expect(heading.textContent).toHaveLength('1 item'.length);
    expect(heading.textContent).not.toMatch(/\s$/);
  });
});
