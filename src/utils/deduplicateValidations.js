/**
 * Deduplicate parsed validation results by consumer name.
 * When duplicates exist, keeps the version with fewer failures.
 * On tie, keeps the most recently updated version.
 *
 * @param {object[]} parsed - array of { doc, stats, content } objects
 * @returns {object[]} deduplicated array
 */
export function deduplicateValidations(parsed) {
  const groups = {};

  parsed.forEach(p => {
    const name = p.doc.name || '';
    const match = name.match(/QA Validation\s*-\s*(.+)/i);
    const key = match ? match[1].trim().toUpperCase() : name.toUpperCase();

    if (!groups[key]) {
      groups[key] = p;
    } else {
      const existingFails = groups[key].stats ? groups[key].stats.fail : 999;
      const newFails = p.stats ? p.stats.fail : 999;

      if (newFails < existingFails) {
        groups[key] = p;
      } else if (newFails === existingFails) {
        const ed = new Date(groups[key].doc.updated_at || 0).getTime();
        const nd = new Date(p.doc.updated_at || 0).getTime();
        if (nd > ed) groups[key] = p;
      }
    }
  });

  return Object.values(groups);
}
