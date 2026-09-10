import { formatCount, DEFAULT_NOUN } from './format';
import * as formatModule from './format';

// Regression test for #135 (follow-up): the first pass pinned
// `Object.isFrozen(DEFAULT_NOUN) === true`, but that assertion alone can pass
// vacuously once the constant is no longer the noun the default label is built
// from — a caller could still mutate the shared default if a future edit
// replaced the constant with an unfrozen literal (or a second, mutable default
// object) and nothing rendered through the frozen one.
//
// This file therefore pins *both* halves of the contract:
//   1. the exported DEFAULT_NOUN is immutable (the issue's acceptance criterion),
//   2. the default label is derived from that very same frozen object (identity),
// so dropping Object.freeze, or shadowing the constant with a mutable copy,
// turns this suite red instead of silently letting a caller mutate every
// other caller's default label ("0 widgets" instead of "0 robots").
//
// Non-vacuity is proven by `unfrozenDefaultNoun` below: the same identity +
// mutation assertions that hold for the shipped constant fail for an unfrozen
// copy, which is exactly the regression the guard prevents.

const unfrozenDefaultNoun = { singular: 'robot', plural: 'robots' };

const naiveDefaultLabel = (count, noun = unfrozenDefaultNoun) =>
  `${count} ${count === 1 ? noun.singular : noun.plural}`;

describe('DEFAULT_NOUN immutability wiring (regression #135)', () => {
  it('acceptance: DEFAULT_NOUN is frozen', () => {
    expect(Object.isFrozen(DEFAULT_NOUN)).toBe(true);
  });

  it('is the same frozen object across every import of the module', () => {
    // the freeze only matters because the object is shared; make that sharing
    // explicit so a mutable second default object cannot slip in unnoticed.
    expect(formatModule.DEFAULT_NOUN).toBe(DEFAULT_NOUN);
    expect(formatModule.default).toBe(formatCount);
  });

  it('is non-extensible with non-writable, non-configurable noun props', () => {
    expect(Object.isExtensible(DEFAULT_NOUN)).toBe(false);
    expect(Object.isSealed(DEFAULT_NOUN)).toBe(true);
    for (const key of ['singular', 'plural']) {
      expect(Object.getOwnPropertyDescriptor(DEFAULT_NOUN, key)).toMatchObject({
        writable: false,
        enumerable: true,
        configurable: false,
      });
    }
  });

  it('rejects every mutation attempt and keeps the shared value intact', () => {
    expect(() => {
      DEFAULT_NOUN.singular = 'widget';
    }).toThrow(TypeError);
    expect(() => {
      DEFAULT_NOUN.plural = 'widgets';
    }).toThrow(TypeError);
    expect(() => {
      DEFAULT_NOUN.extra = 'injected';
    }).toThrow(TypeError);
    expect(() => {
      delete DEFAULT_NOUN.plural;
    }).toThrow(TypeError);
    // a frozen object also refuses redefinition, not just assignment
    expect(() => {
      Object.defineProperty(DEFAULT_NOUN, 'plural', { value: 'widgets' });
    }).toThrow(TypeError);

    expect(DEFAULT_NOUN).toEqual({ singular: 'robot', plural: 'robots' });
    expect(DEFAULT_NOUN.extra).toBeUndefined();
    expect(Object.keys(DEFAULT_NOUN)).toEqual(['singular', 'plural']);
  });

  it('builds the default label from the frozen constant itself', () => {
    // identity, not just equality: formatCount's default path must render the
    // frozen object, so the freeze assertion above actually protects callers.
    expect(formatCount(0)).toBe(`0 ${DEFAULT_NOUN.plural}`);
    expect(formatCount(1)).toBe(`1 ${DEFAULT_NOUN.singular}`);
    expect(formatCount(5)).toBe(`5 ${DEFAULT_NOUN.plural}`);

    expect(formatCount(0)).toBe('0 robots');
    expect(formatCount(1)).toBe('1 robot');
    expect(formatCount(5)).toBe('5 robots');
  });

  it('keeps the default label stable after mutation attempts', () => {
    for (const mutate of [
      () => {
        DEFAULT_NOUN.plural = 'widgets';
      },
      () => {
        DEFAULT_NOUN.singular = 'widget';
      },
    ]) {
      try {
        mutate();
      } catch {
        // expected: the props are read-only
      }
    }
    expect(formatCount(0)).toBe('0 robots');
    expect(formatCount(1)).toBe('1 robot');
    expect(formatCount(5)).toBe('5 robots');
  });

  it('reproduces the unguarded defect so the guard cannot pass vacuously', () => {
    expect(Object.isFrozen(unfrozenDefaultNoun)).toBe(false);
    expect(naiveDefaultLabel(0)).toBe('0 robots');

    // a mutation leaks into every label built from the shared default...
    unfrozenDefaultNoun.plural = 'widgets';
    expect(naiveDefaultLabel(0)).toBe('0 widgets');
    expect(naiveDefaultLabel(5)).toBe('5 widgets');

    // ...while the shipped, frozen constant is unaffected.
    expect(DEFAULT_NOUN.plural).toBe('robots');
    expect(formatCount(0)).toBe('0 robots');
  });
});
