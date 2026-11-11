// ============================================================
// SERVICES — COLUMNS
// ============================================================
// Pure functions for column manipulation. No DOM, no side effects.
// ============================================================

/**
 * Removes duplicate columns (same length, values within epsilon).
 *
 * Rules:
 *   - Empty columns (all null) are never collapsed. Each keeps its
 *     own index so the user sees the real column count.
 *   - Non-empty columns are compared pairwise. A column identical to
 *     another (within epsilon) is collapsed.
 *
 * Returns { unique, originalIndices } where originalIndices[i] is
 * the original index of unique[i].
 */
export function deduplicateColumns(columns, epsilon = 1e-6) {
  const unique = [];
  const originalIndices = [];

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const isColEmpty = col.every(v => v === null || v === undefined);

    if (isColEmpty) {
      unique.push(col);
      originalIndices.push(i);
      continue;
    }

    let isDuplicate = false;

    for (let j = 0; j < unique.length; j++) {
      const other = unique[j];

      if (other.length !== col.length) continue;

      // Don't compare against empty columns (they were preserved as-is)
      const otherEmpty = other.every(v => v === null || v === undefined);
      if (otherEmpty) continue;

      let match = true;
      for (let k = 0; k < col.length; k++) {
        const av = col[k];
        const bv = other[k];

        if (av === null && bv === null) continue;
        if (av === null || bv === null) { match = false; break; }
        if (Math.abs(Number(av) - Number(bv)) > epsilon) { match = false; break; }
      }

      if (match) { isDuplicate = true; break; }
    }

    if (!isDuplicate) {
      unique.push(col);
      originalIndices.push(i);
    }
  }

  return { unique, originalIndices };
}
