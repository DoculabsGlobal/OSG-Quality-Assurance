/**
 * Extract file extension from a filename.
 * Returns empty string if no valid extension found.
 * @param {string} filename
 * @returns {string} lowercase extension without dot, or ''
 */
export function extractExt(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  const last = parts[parts.length - 1].toLowerCase();
  // Only return if it looks like a real extension (short, no spaces)
  return (last.length <= 5 && !/\s/.test(last)) ? last : '';
}
