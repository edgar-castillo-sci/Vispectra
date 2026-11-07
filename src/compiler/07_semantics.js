// ============================================================
// PHASE 07 — SEMANTICS (v5.0)
// ============================================================
// Function: verify(parsed, plan)
//
// Input:
//   - parsed: { index, ok, values, diagnostics } from 06_parser
//   - plan:   { pattern, commaRoles, columnTypes, numColumns }
//
// Output: { index, ok, values, diagnostics }
//
// Does:
//   - If parsed.ok is false, propagates as-is.
//   - Validates values.length === plan.numColumns (defensive).
//   - Validates each non-null value is a finite number.
//   - Rejects values in a 'v' column (defensive).
//
// Does NOT:
//   - Emit MISSING_VALUE (gaps are aggregated in 04c as COLUMN_GAPS).
//   - Enforce Number.isInteger on 'z' columns (exponents like 1e-2
//     are 'z' by raw, non-integer by value — both valid).
//   - Interpret units, ranges, or physical meaning.
// ============================================================

export function verify(parsed, plan) {
  if (!parsed.ok) return parsed;

  const { index, values } = parsed;
  const { columnTypes, numColumns } = plan;
  const diagnostics = [];

  if (values.length !== numColumns) {
    diagnostics.push({
      severity: 'error',
      code: 'SEMANTIC_COUNT_MISMATCH',
      params: { index, expected: numColumns, got: values.length },
    });
    return { index, ok: false, values, diagnostics };
  }

  let hasError = false;

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    const type = columnTypes[i];

    if (val === null) continue;

    if (typeof val !== 'number' || !Number.isFinite(val)) {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_NUMERIC_VALUE',
        params: { index, column: i, value: String(val) },
      });
      hasError = true;
      continue;
    }

    if (type === 'v') {
      diagnostics.push({
        severity: 'error',
        code: 'VALUE_IN_EMPTY_COLUMN',
        params: { index, column: i },
      });
      hasError = true;
    }
  }

  return { index, ok: !hasError, values, diagnostics };
}
