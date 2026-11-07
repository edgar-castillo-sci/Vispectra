// ============================================================
// SERVICES — COLUMNS
// ============================================================
// Pure functions for column manipulation. No DOM, no side effects.
// ============================================================

/**
 * Removes duplicate columns (same length, values within epsilon).
 * Returns { unique, originalIndices } where originalIndices[i] is
 * the original index of unique[i].
 */
export function deduplicateColumns(columns, epsilon = 1e-6) {
  const unique = [];
  const originalIndices = [];

  for (let i = 0; i < columns.length; i++) {
    let isDuplicate = false;

    for (let j = 0; j < unique.length; j++) {
      const a = columns[i];
      const b = unique[j];

      if (a.length !== b.length) continue;

      let match = true;
      for (let k = 0; k < a.length; k++) {
        const av = a[k];
        const bv = b[k];

        // Both null → match
        if (av === null && bv === null) continue;
        // One null, one not → no match
        if (av === null || bv === null) { match = false; break; }
        // Numeric comparison
        if (Math.abs(Number(av) - Number(bv)) > epsilon) { match = false; break; }
      }

      if (match) { isDuplicate = true; break; }
    }

    if (!isDuplicate) {
      unique.push(columns[i]);
      originalIndices.push(i);
    }
  }

  return { unique, originalIndices };
}
