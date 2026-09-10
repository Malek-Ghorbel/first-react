// Shared formatting helpers.
//
// fix #110: formatCount used to append a trailing space after the noun, so
// headings rendered as "0 robots ". The count text must be exact with no
// trailing whitespace and must use the singular noun for a count of one.

/**
 * Format a numeric count together with its noun.
 *
 * - formatCount(0) -> "0 robots"
 * - formatCount(1) -> "1 robot"
 * - formatCount(5) -> "5 robots"
 *
 * fix #115: the singular noun is selected for a count of exactly one, and the
 * label is built from a single space separator plus an explicit trim, so the
 * result never carries leading or trailing whitespace (headings must not
 * render as "1 robots " or "1 robot ").
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
  const noun = n === 1 ? 'robot' : 'robots';
  return `${n} ${noun}`.trim();
}

export default formatCount;
