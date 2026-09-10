// Shared formatting helpers.
//
// fix #110: formatCount used to append a trailing space after the noun, so
// headings rendered as "0 robots ". The count text must be exact with no
// trailing whitespace and must use the singular noun for a count of one.
// fix #121: the same trailing-space defect was reported again; the label is
// assembled from its parts and trimmed, so the guarantee holds unconditionally.

/**
 * Format a numeric count together with its noun.
 *
 * - formatCount(0) -> "0 robots"
 * - formatCount(1) -> "1 robot"
 * - formatCount(5) -> "5 robots"
 *
 * fix #115 / fix #117: the singular noun is selected for a count of exactly
 * one, and the label is assembled by joining its parts with a single space.
 * The separator is only ever inserted *between* parts, so a result can never
 * carry leading or trailing whitespace (headings must not render as
 * "1 robots " or "1 robot ").
 *
 * Non-numeric or non-finite input is treated as 0 so callers always get a
 * usable label.
 *
 * @param {number} count
 * @returns {string}
 */
export function formatCount(count) {
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
  const noun = n === 1 ? 'robot' : 'robots';
  // fix #121: the issue reported a label that "appends the noun and a trailing
  // space without trimming" ("1 robot "). The separator is only inserted
  // *between* parts and the assembled label is trimmed, so the returned string
  // is guaranteed to have no leading or trailing whitespace — headings
  // therefore render exactly "1 robot" and "5 robots".
  return [String(n), noun].join(' ').trim();
}

export default formatCount;
