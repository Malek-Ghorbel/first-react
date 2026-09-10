import { formatCount, DEFAULT_NOUN } from './format';

// Regression test for #135 (fallback coverage): format.js exports
// `DEFAULT_NOUN` frozen, but the freeze only protects callers if the constant is
// genuinely immutable *and* it is the object every default label is built from.
//
// The other #135 suites pin the no-argument default path. `resolveNoun` has far
// more paths that hand the shared default back to the caller: a missing noun,
// null, an empty/whitespace-only string, an empty pair, an empty object, and any
// unusable noun (a throwing member getter). Every one of them returns
// DEFAULT_NOUN itself. If a future edit dropped Object.freeze (or replaced the
// constant with a plain literal), a single caller could write
// `DEFAULT_NOUN.plural = 'widgets'` once and silently rewrite the fallback label
// every other caller renders ("0 widgets" instead of "0 robots") — with no test
// turning red. This file makes that regression fail loudly.
//
// Non-vacuity: `unfrozenDefaultNoun` / `naiveFormatCount` below are the exact
// defect (an unfrozen shared default reachable from the same fallback paths), so
// the assertions fail against the naive pair and pass against the shipped code.

const FALLBACK_INPUTS = [
  ['no noun at all', undefined],
  ['null', null],
  ['an empty string', ''],
  ['a whitespace-only string', '   '],
  ['an empty [singular, plural] pair', []],
  ['a blank [singular, plural] pair', ['', '']],
  ['an empty noun object', {}],
  ['a noun object with blank members', { singular: '', plural: '' }],
  [
    'a noun object whose member getter throws',
    {
      get singular() {
        throw new Error('unusable noun');
      },
    },
  ],
];

const unfrozenDefaultNoun = { singular: 'robot', plural: 'robots' };

const naiveFormatCount = (count) => {
  const n = Number.isFinite(Number(count)) ? Number(count) : 0;
  const noun = n === 1 ? unfrozenDefaultNoun.singular : unfrozenDefaultNoun.plural;
  return `${n} ${noun}`;
};

const expectFallbackLabels = (format) => {
  expect(format(0)).toBe('0 robots');
  expect(format(1)).toBe('1 robot');
  expect(format(5)).toBe('5 robots');
};

describe('DEFAULT_NOUN immutability across every fallback path (regression #135)', () => {
  it('acceptance: DEFAULT_NOUN is frozen', () => {
    expect(Object.isFrozen(DEFAULT_NOUN)).toBe(true);
  });

  it('still exports the default robot noun pair', () => {
    expect(DEFAULT_NOUN).toEqual({ singular: 'robot', plural: 'robots' });
    expect(DEFAULT_NOUN.singular).toBe('robot');
    expect(DEFAULT_NOUN.plural).toBe('robots');
  });

  it.each(FALLBACK_INPUTS)(
    'renders the default noun for %s',
    (_description, noun) => {
      // each of these paths resolves to DEFAULT_NOUN itself, so the label must
      // match the frozen constant's members exactly ("0 robots", "1 robot").
      expect(formatCount(0, noun)).toBe(`0 ${DEFAULT_NOUN.plural}`);
      expect(formatCount(1, noun)).toBe(`1 ${DEFAULT_NOUN.singular}`);
      expect(formatCount(5, noun)).toBe(`5 ${DEFAULT_NOUN.plural}`);
    }
  );

  it('rejects a caller mutating the shared default instead of leaking it into every fallback label', () => {
    // A caller that tries to change the shared default must fail, not silently
    // rewrite the label of every other caller's fallback path.
    expect(() => {
      DEFAULT_NOUN.plural = 'widgets';
    }).toThrow(TypeError);
    expect(() => {
      DEFAULT_NOUN.singular = 'widget';
    }).toThrow(TypeError);
    expect(() => {
      DEFAULT_NOUN.extra = 'injected';
    }).toThrow(TypeError);
    expect(() => {
      delete DEFAULT_NOUN.plural;
    }).toThrow(TypeError);

    // the constant is intact...
    expect(DEFAULT_NOUN).toEqual({ singular: 'robot', plural: 'robots' });
    expect(Object.keys(DEFAULT_NOUN)).toEqual(['singular', 'plural']);

    // ...and so is every fallback label, including for a noun that is unusable.
    for (const [, noun] of FALLBACK_INPUTS) {
      expect(formatCount(0, noun)).toBe('0 robots');
      expect(formatCount(1, noun)).toBe('1 robot');
      expect(formatCount(5, noun)).toBe('5 robots');
    }
  });

  it('reproduces the unguarded defect so the guard cannot pass vacuously', () => {
    // the naive default is genuinely mutable...
    expect(Object.isFrozen(unfrozenDefaultNoun)).toBe(false);
    expect(() => expect(Object.isFrozen(unfrozenDefaultNoun)).toBe(true)).toThrow();

    // ...so a single caller mutation rewrites every fallback label built from it,
    // which is exactly what Object.freeze on DEFAULT_NOUN prevents.
    expectFallbackLabels(naiveFormatCount);
    unfrozenDefaultNoun.plural = 'widgets';
    expect(naiveFormatCount(0)).toBe('0 widgets');
    expect(naiveFormatCount(5)).toBe('5 widgets');
    expect(naiveFormatCount(1)).toBe('1 robot');

    // the shipped constant is unaffected by the naive copy's mutation
    expect(DEFAULT_NOUN.plural).toBe('robots');
    expectFallbackLabels(formatCount);
    expect(formatCount(0, '')).toBe('0 robots');
    expect(formatCount(0, {})).toBe('0 robots');
  });
});
