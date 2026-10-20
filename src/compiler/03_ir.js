// ============================================================
// PHASE 03 — IR (Intermediate Representation)
// ============================================================
// Function: buildIR(structures)
//
// Input: array of {index, structure}, one per sampled line.
// Output: {
//   perLine: [string],           // structure string per line
//   frequencies: {string: int},  // how many times each structure appears
//   lengths: [int],              // length of each structure string
//   diagnostics: [diag]
// }
//
// Does:
//   - Groups and counts the internal structures.
//   - Detects repeated structures.
//   - Prepares data for canon generalization (04_canon).
//
// Possible diagnostics:
//   - HETEROGENEOUS_STRUCTURES (warn) if all structures are
//     different and there is no clear pattern.
//
// Does NOT:
//   - Generalize with i (that is 04_canon).
//   - Interpret values (that is 06_parser).
//   - Validate anything (that is 07_semantics).
// ============================================================

export function buildIR(structures) {
  const diagnostics = [];

  // 1. Extract the pure structure strings per line
  const perLine = structures.map(s => s.structure);

  // 2. Calculate lengths for each structure
  const lengths = perLine.map(s => s.length);

  // 3. Count frequencies of each unique structure
  const frequencies = {};
  for (const structure of perLine) {
    frequencies[structure] = (frequencies[structure] || 0) + 1;
  }

  // 4. Emit a warning if every single line has a different structure
  // (ignoring very small samples where this is expected).
  const uniqueCount = Object.keys(frequencies).length;
  if (perLine.length > 5 && uniqueCount === perLine.length) {
    diagnostics.push({
      severity: 'warn',
      code: 'HETEROGENEOUS_STRUCTURES',
      params: { uniqueCount, total: perLine.length },
    });
  }

  return { perLine, frequencies, lengths, diagnostics };
}
