import { formatCount, DEFAULT_NOUN } from './format';

// Regression test for #135: format.js exports `DEFAULT_NOUN` as a frozen
// constant (Object.freeze({ singular: 'robot', plural: 'robots' })), but nothing
// asserted that it is actually immutable. If a future edit dropped the
// Object.freeze — or replaced the constant with a plain object literal — the
// shared default would silently become mutable: a caller could write
// `DEFAULT_NOUN.plural = 'widgets'` and every other caller's default label would
// change with it ("0 widgets" instead of "0 robots"), with no test turning red.
//
// The acceptance criterion from the issue is the first assertion below:
//   expect(Object.isFrozen(DEFAULT_NOUN)).toBe(true)
//
// `unfrozenDefaultNoun` / `naiveFormatCount` below reproduce the defect that
// assertion guards against (an unfrozen shared default a caller can mutate) so
// this suite is non-vacuous: the same assertions that pass against the shipped
// constant fail against the naive, unfrozen copy.
const unfrozenDefaultNoun = { singular: 'robot', plural: 'robots' };

const naiveFormatCount = (count) =>
  `${count} ${count === 1 ? unfrozenDefaultNoun.singular : unfrozenDefaultNoun.plural}`;

describe('DEFAULT_NOUN immutability (regression #135)', () => {
  it('acceptance: DEFAULT_NOUN is frozen', () => {
    expect(Object.isFrozen(DEFAULT_NOUN)).toBe(true);
  });

  it('still exports the default robot noun pair', () => {
    expect(DEFAULT_NOUN).toEqual({ singular: 'robot', plural: 'robots' });
    expect(DEFAULT_NOUN.singular).toBe('robot');
    expect(DEFAULT_NOUN.plural).toBe('robots');
    expect(Object.keys(DEFAULT_NOUN)).toEqual(['singular', 'plural']);
  });

  it('pins the frozen-ness beyond Object.isFrozen: non-extensible with non-writable, non-configurable props', () => {
    expect(Object.isExtensible(DEFAULT_NOUN)).toBe(false);
    for (const key of ['singular', 'plural']) {
      const descriptor = Object.getOwnPropertyDescriptor(DEFAULT_NOUN, key);
      expect(descriptor).toMatchObject({
        writable: false,
        enumerable: true,
        configurable: false,
      });
    }
  });

  it('rejects a caller mutating the shared default, leaving it unchanged', () => {
    // Every attempt below silently succeeds (or, in strict mode, throws) against
    // an unfrozen object; against the shipped constant nothing may change.
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
      delete DEFAULT_NOUN.singular;
    }).toThrow(TypeError);

    // the value is intact regardless of how the mutation was attempted
    expect(DEFAULT_NOUN).toEqual({ singular: 'robot', plural: 'robots' });
    expect(DEFAULT_NOUN.extra).toBeUndefined();
    expect(Object.keys(DEFAULT_NOUN)).toEqual(['singular', 'plural']);
  });

  it('keeps the default label stable after mutation attempts', () => {
    try {
      DEFAULT_NOUN.plural = 'widgets';
    } catch {
      // expected: the property is read-only
    }
    expect(formatCount(0)).toBe('0 robots');
    expect(formatCount(1)).toBe('1 robot');
    expect(formatCount(5)).toBe('5 robots');
  });

  it('reproduces the unguarded defect so the guard cannot pass vacuously', () => {
    // sanity-check the reproduction itself: the naive copy is genuinely mutable
    expect(Object.isFrozen(unfrozenDefaultNoun)).toBe(false);
    expect(() => expect(Object.isFrozen(unfrozenDefaultNoun)).toBe(true)).toThrow();

    // ...and a caller mutating the shared default leaks into every other label,
    // which is exactly the failure the freeze (and its assertion) prevents.
    expect(naiveFormatCount(0)).toBe('0 robots');
    unfrozenDefaultNoun.plural = 'widgets';
    expect(naiveFormatCount(0)).toBe('0 widgets');
    expect(naiveFormatCount(1)).toBe('1 robot');

    // the real constant is unaffected by the naive copy's mutation
    expect(DEFAULT_NOUN.plural).toBe('robots');
    expect(formatCount(0)).toBe('0 robots');
  });
});
