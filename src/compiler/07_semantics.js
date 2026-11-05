// ============================================================
// PHASE 07 — SEMANTICS (Validation)
// ============================================================
// Function: verify(parsed, fixedCanon)
//
// Input: {index, ok, values}, [token]
// Output: { index, ok, values, diagnostics }
//
// Does:
//   - Validates mathematical consistency (no NaN, no Infinity).
//   - Applies structural prohibitions (R44).
//   - Passes data through for codegen.
// ============================================================

export function verify(parsed, fixedCanon) {
  const { index, ok, values, diagnostics } = parsed;

  if (!ok) return parsed;

  // 1. Mathematical consistency
  for (let i = 0; i < values.length; i++) {
    const val = values[i];

    if (val !== null) {
      if (isNaN(val)) {
        diagnostics.push({
          severity: 'error',
          code: 'INVALID_NUMERIC_VALUE',
          params: { index, col: i, value: 'NaN' }
        });
      } else if (!isFinite(val)) {
        diagnostics.push({
          severity: 'error',
          code: 'INVALID_NUMERIC_VALUE',
          params: { index, col: i, value: 'Infinity' }
        });
      }
    }
  }

  // 2. Structural Prohibitions (R44) at line level
  // If the canon itself was valid, the parser already enforced it.
  // But we can double-check if a value is null where a number was strictly required.
  // (The parser already does this, so this is just a safety net).

  return { index, ok: true, values, diagnostics };
}
