// ============================================================
// PHASE 08 — CODEGEN (v5.0)
// ============================================================
// Functions: createColumns(numColumns), inject(values, columns)
//
// createColumns(numColumns) → [[], [], ...]
//   Creates an array of numColumns empty arrays.
//
// inject(values, columns) → void (mutates columns)
//   Pushes each value to its corresponding column.
//   Values are preserved as-is: numbers stay numbers, null stays null.
//   null means "empty slot in this row" and is NOT converted to 0.
//
// This phase is the ONLY one that mutates columns by design.
// Contract: receives values already parsed (06) and verified (07),
// pushes them, returns nothing. No interpretation, no validation.
//
// Row-level orchestration (skipping failed rows, pushing nulls to keep
// alignment, etc.) lives in main.js, not here.
// ============================================================

export function createColumns(numColumns) {
  if (!Number.isInteger(numColumns) || numColumns < 1) {
    throw new Error(`createColumns: invalid numColumns: ${numColumns}`);
  }
  return Array.from({ length: numColumns }, () => []);
}

export function inject(values, columns) {
  if (!Array.isArray(values) || !Array.isArray(columns)) {
    throw new Error('inject: values and columns must be arrays');
  }
  if (values.length !== columns.length) {
    throw new Error(
      `inject: length mismatch (values=${values.length}, columns=${columns.length})`
    );
  }
  for (let i = 0; i < values.length; i++) {
    columns[i].push(values[i]);
  }
}
