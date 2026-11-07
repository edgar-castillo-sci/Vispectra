// ============================================================
// PHASE 03 — IR (Intermediate Representation) v5.0
// ============================================================
// Function: buildIR(structures)
//
// Input: array of {index, structure}, one per sampled line.
// Output: {
//   totalCount: number,           // number of sampled lines
//   frequencies: {string: int},   // how many times each structure appears
//   lengths: [int],               // length of each unique structure
//   diagnostics: [diag]
// }
//
// Does:
//   - Groups and counts literal structures.
//   - Detects pathological heterogeneity.
//   - Prepares data for 04_canon.
//
// Does NOT:
//   - Generalize, interpret, or resolve commas.
//   - Store per-line structures (that's O(N); frequencies is O(unique)).
// ============================================================

export function buildIR(structures) {
  const diagnostics = [];

  const totalCount = structures.length;
  const frequencies = {};
  const lengths = [];

  for (const { structure } of structures) {
    if (frequencies[structure] === undefined) {
      frequencies[structure] = 1;
      lengths.push(structure.length);
    } else {
      frequencies[structure] += 1;
    }
  }

  const uniqueCount = Object.keys(frequencies).length;
  if (totalCount > 5 && uniqueCount === totalCount) {
    diagnostics.push({
      severity: 'warn',
      code: 'HETEROGENEOUS_STRUCTURES',
      params: { uniqueCount, total: totalCount },
    });
  }

  return { totalCount, frequencies, lengths, diagnostics };
}
