// ============================================================
// PHASE 05 — FIXATION (v5.0)
// ============================================================
// Function: fixCanon(blockCanon, resolution, pattern)
//
// Input:
//   - blockCanon: from 04c { canon, columns }
//   - resolution: from 04b { id, commas } (chosen or default)
//   - pattern: block's pattern ('_,_,_' etc.)
//
// Output: {
//   plan: {
//     pattern:     string,          // '_,_,_'
//     commaRoles:  ['dec'|'sep'],   // one per comma in pattern
//     columnTypes: ['n'|'z'|'i'|'v'], // from blockCanon.columns
//     numColumns:  number,
//   } | null,
//   diagnostics: [diag],
// }
//
// Does:
//   - Validates that resolution.commas length matches the pattern's
//     comma count.
//   - Validates that blockCanon.columns is present and non-empty.
//   - Packages the three inputs into a single `plan` object.
//
// Does NOT:
//   - Re-derive column counts (04c already did).
//   - Apply parity (04b already did).
//   - Interpret values (that's 06_parser).
//
// The `plan` is the parser's executable spec: it carries the
// structural skeleton (pattern), the comma semantics (commaRoles),
// and the expected output shape (columnTypes, numColumns).
// ============================================================

export function fixCanon(blockCanon, resolution, pattern) {
  const diagnostics = [];
  const commaCount = countCommas(pattern);

  if (!resolution || !Array.isArray(resolution.commas) ||
      resolution.commas.length !== commaCount) {
    diagnostics.push({
      severity: 'error',
      code: 'RESOLUTION_LENGTH_MISMATCH',
      params: {
        pattern,
        expected: commaCount,
        got: resolution?.commas?.length ?? 0,
      },
    });
    return { plan: null, diagnostics };
  }

  if (!blockCanon || !Array.isArray(blockCanon.columns) ||
      blockCanon.columns.length === 0) {
    diagnostics.push({
      severity: 'error',
      code: 'MISSING_BLOCK_CANON',
      params: { pattern },
    });
    return { plan: null, diagnostics };
  }

  const columnTypes = blockCanon.columns.map(c => c.type);

  return {
    plan: {
      pattern,
      commaRoles: [...resolution.commas],
      columnTypes,
      numColumns: columnTypes.length,
    },
    diagnostics,
  };
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function countCommas(pattern) {
  let n = 0;
  for (const ch of pattern) if (ch === ',') n++;
  return n;
}
