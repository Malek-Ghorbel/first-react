// Shared formatting helpers.
//
// fix #110: formatCount used to append a trailing space after the noun, so
// headings rendered as "0 robots ". The count text must be exact with no
// trailing whitespace and must use the singular noun for a count of one.
// fix #121: the same trailing-space defect was reported again; the label is
// assembled from its parts and trimmed, so the guarantee holds unconditionally.
// fix #123: the trailing-space defect was reported once more ("1 robot "). The
// label is now built with exactly one separator *between* the number and the
// noun and nothing is ever appended after the noun, so the emitted string has
// no leading or trailing whitespace by construction (not merely by trimming).
// fix #125: same defect reported again. The construction is unchanged, but the
// label is now assembled by *joining* its parts instead of concatenating them
// and then calling trim() — the noun is the last part, so there is no code path
// that can append a separator or space after it.
// fix #127: the trailing-space defect was reported once more ("1 robot "). The
// join is kept, but the emitted label is now normalized with trim() as well, so
// the "no leading/trailing whitespace" contract is enforced unconditionally at
// the point of return rather than depending on how the parts are assembled.
// fix #130: the label was still "1 items" for a single item, because the noun
// pair was hard-coded ("robot"/"robots") and the function always reached for a
// plural noun it had baked in — there was no plural *support*, only one fixed
// label. formatCount now accepts the noun to render (a singular string, a
// [singular, plural] pair, or {singular, plural}) and picks the singular form
// only when the count is exactly one, so formatCount(1, 'item') -> "1 item" and
// formatCount(2, 'item') -> "2 items". The default noun stays the repo's domain
// label ("robot"/"robots"), so every existing caller and test is unaffected.
// Pluralization for 0/1/5 is locked by src/utils/format.regression-127.test.js
// and src/utils/format.regression-130.test.js.

/**
 * The noun pair rendered when no noun is supplied: the app counts robots.
 * Kept as a frozen constant so callers can reuse it and so the default label is
 * defined in exactly one place.
 */
export const DEFAULT_NOUN = Object.freeze({ singular: 'robot', plural: 'robots' });

/**
 * Derive the plural form of a regular English singular noun.
 *
 * - "item"  -> "items"
 * - "box"   -> "boxes"
 * - "class" -> "classes"
 * - "city"  -> "cities"
 *
 * Irregular nouns can be supplied explicitly as a [singular, plural] pair or a
 * { singular, plural } object.
 *
 * @param {string} singular
 * @returns {string}
 */
function pluralize(singular) {
  const word = String(singular).trim();
  if (word === '') return word;
  if (/(?:s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

/**
 * Derive the singular form of a regular English plural noun (used only when a
 * caller supplies a plural without a singular).
 *
 * - "items"  -> "item"
 * - "boxes"  -> "box"
 * - "cities" -> "city"
 *
 * @param {string} plural
 * @returns {string}
 */
function singularize(plural) {
  const word = String(plural).trim();
  if (word === '') return word;
  if (/ies$/i.test(word)) return `${word.slice(0, -3)}y`;
  if (/(?:ses|xes|zes|ches|shes)$/i.test(word)) return word.slice(0, -2);
  if (/s$/i.test(word)) return word.slice(0, -1);
  return word;
}

/**
 * Resolve the { singular, plural } noun pair to render.
 *
 * Accepts a singular string ("item"), a [singular, plural] pair, or a
 * { singular, plural } object. Anything unusable falls back to DEFAULT_NOUN so
 * the label is always renderable.
 *
 * @param {string|string[]|{singular?: string, plural?: string}} [noun]
 * @returns {{singular: string, plural: string}}
 */
function resolveNoun(noun) {
  try {
    if (noun == null) return DEFAULT_NOUN;

    if (typeof noun === 'string') {
      const singular = noun.trim();
      if (singular === '') return DEFAULT_NOUN;
      return { singular, plural: pluralize(singular) };
    }

    if (Array.isArray(noun)) {
      const singular = noun[0] == null ? '' : String(noun[0]).trim();
      const plural = noun[1] == null ? '' : String(noun[1]).trim();
      if (singular === '' && plural === '') return DEFAULT_NOUN;
      if (singular === '') return { singular: singularize(plural), plural };
      if (plural === '') return { singular, plural: pluralize(singular) };
      return { singular, plural };
    }

    if (typeof noun === 'object') {
      const singular = noun.singular == null ? '' : String(noun.singular).trim();
      const plural = noun.plural == null ? '' : String(noun.plural).trim();
      if (singular === '' && plural === '') return DEFAULT_NOUN;
      if (singular === '') return { singular: singularize(plural), plural };
      if (plural === '') return { singular, plural: pluralize(singular) };
      return { singular, plural };
    }
  } catch {
    // Unusable noun (throwing getter, exotic object) -> default label.
  }
  return DEFAULT_NOUN;
}

/**
 * Format a numeric count together with its noun.
 *
 * - formatCount(0) -> "0 robots"
 * - formatCount(1) -> "1 robot"
 * - formatCount(5) -> "5 robots"
 * - formatCount(1, 'item') -> "1 item"
 * - formatCount(2, 'item') -> "2 items"
 *
 * fix #115 / fix #117: the singular noun is selected for a count of exactly
 * one, and the label is assembled by joining its parts with a single space.
 * The separator is only ever inserted *between* parts, so a result can never
 * carry leading or trailing whitespace (headings must not render as
 * "1 robots " or "1 robot ").
 *
 * fix #130: the noun is no longer hard-coded. A caller may pass the noun to
 * render — a singular string, a [singular, plural] pair, or a
 * { singular, plural } object — and the singular form is used only for a count
 * of exactly one, so a single item renders as "1 item", never "1 items".
 *
 * Non-numeric or non-finite input is treated as 0 so callers always get a
 * usable label.
 *
 * @param {number} count
 * @param {string|string[]|{singular?: string, plural?: string}} [noun]
 * @returns {string}
 */
export function formatCount(count, noun) {
  let n;
  try {
    n = typeof count === 'number' ? count : Number(count);
    if (!Number.isFinite(n)) n = 0;
  } catch {
    n = 0;
  }
  // fix #119: pick the noun first, then join. The singular form is selected
  // only for a count of exactly one; every other count (including 0) keeps the
  // plural. Joining the parts with a single separator means the label can never
  // carry leading or trailing whitespace.
  // fix #130: the noun pair is resolved from the optional argument (defaulting
  // to the repo's "robot"/"robots" label) instead of being hard-coded.
  const { singular, plural } = resolveNoun(noun);
  const label = n === 1 ? singular : plural;
  // fix #125: assemble the label by joining its parts with a single separator.
  // The separator only ever lands *between* the count and the noun, and the
  // noun is the last part, so no trailing space can be emitted — the guarantee
  // is structural ("1 robot", never "1 robot "), not a trim() afterthought.
  // fix #127: normalize at the point of return as well, so callers always get a
  // whitespace-free label ("1 robot", "5 robots") regardless of how this body
  // is refactored later.
  return [String(n), label].join(' ').trim();
}

export default formatCount;
