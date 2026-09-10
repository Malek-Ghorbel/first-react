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
// Pluralization for 0/1/5 is locked by src/utils/format.regression-127.test.js.
// fix #132: the noun itself was hard-coded ("robot"/"robots"), so the function
// appended the plural noun for any caller that needed a different label and a
// single item rendered as "1 items". formatCount now accepts the noun to render
// (a singular string, a [singular, plural] pair, or a { singular, plural }
// object) and selects the singular form only when the count is exactly one, so
// formatCount(1, 'item') -> "1 item" and formatCount(2, 'item') -> "2 items".
// The default noun stays the repo's domain label ("robot"/"robots"), so every
// existing caller keeps the exact behavior it has today.
// fix #136: a string noun supplied in its plural form ("items") — the wording
// the issue uses — was used verbatim as the label, so a count of one still
// rendered "1 items". A string noun is now singularized when, and only when,
// pluralizing the derived singular reproduces the supplied word, so
// formatCount(1, 'items') -> "1 item" while already-singular nouns ("item",
// "class", "bus", "status") and every existing caller stay exactly as they are.
// Pluralization for the default label is locked by
// src/utils/format.regression-127.test.js and src/utils/format.regression-132.test.js;
// the plural-string noun is locked by src/utils/format.regression-136.test.js.

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

// Nouns that end in "s" but are already singular ("class", "bus", "status",
// "analysis", "news", "series", "species"). They must be rendered exactly as
// supplied, never run through singularize().
// fix #136: this guard keeps a single-word noun that merely looks plural from
// being rewritten ("bus" must never become "bu").
const SINGULAR_S_WORDS = /(?:ss|us|is|as|news|series|species)$/i;

/**
 * Pick the singular form of a noun supplied as a single string.
 *
 * fix #136: the issue phrases the noun in its plural form ("items"), so a
 * string noun may be either singular ("item") or plural ("items"). A word is
 * only singularized when pluralizing the derived form reproduces the supplied
 * word exactly — and when the word is not a known singular that merely ends in
 * "s" — so already-singular nouns are rendered untouched and only genuine
 * regular plurals are rewritten:
 *
 * - "item"  -> "item"
 * - "items" -> "item"
 * - "boxes" -> "box"
 * - "cities" -> "city"
 * - "class" -> "class"
 * - "bus"   -> "bus"
 *
 * @param {string} word
 * @returns {string}
 */
function singularFromString(word) {
  if (word === '' || SINGULAR_S_WORDS.test(word)) return word;
  if (!/s$/i.test(word)) return word;
  const candidate = singularize(word);
  if (candidate !== '' && candidate !== word && pluralize(candidate) === word) {
    return candidate;
  }
  return word;
}

/**
 * Resolve the { singular, plural } noun pair to render.
 *
 * Accepts a singular string ("item"), a plural string ("items", whose singular
 * form is derived), a [singular, plural] pair, or a { singular, plural } object.
 * Anything unusable falls back to DEFAULT_NOUN so the label is always
 * renderable.
 *
 * @param {string|string[]|{singular?: string, plural?: string}} [noun]
 * @returns {{singular: string, plural: string}}
 */
function resolveNoun(noun) {
  try {
    if (noun == null) return DEFAULT_NOUN;

    if (typeof noun === 'string') {
      const word = noun.trim();
      if (word === '') return DEFAULT_NOUN;
      // fix #136: a string noun may arrive in its plural form ("items") — that
      // is how the issue phrases the label. Derive the singular so a count of
      // one renders "1 item" instead of "1 items"; singular input is unchanged.
      const singular = singularFromString(word);
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
 * - formatCount(1, 'items') -> "1 item"
 *
 * fix #115 / fix #117: the singular noun is selected for a count of exactly
 * one, and the label is assembled by joining its parts with a single space.
 * The separator is only ever inserted *between* parts, so a result can never
 * carry leading or trailing whitespace (headings must not render as
 * "1 robots " or "1 robot ").
 *
 * fix #132: the noun is no longer hard-coded. A caller may pass the noun to
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
  // fix #132: the noun pair is resolved from the optional argument (defaulting
  // to the repo's "robot"/"robots" label) instead of being hard-coded, so a
  // single item is labelled "1 item" rather than "1 items".
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
