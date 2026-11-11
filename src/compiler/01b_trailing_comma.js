// ============================================================
// PHASE 01b — TRAILING COMMA POLICY
// ============================================================
// Function: detectTrailingCommaPolicy(lines, centralBlock)
//
// Input:
//   - lines: all lines from 01_sampling
//   - centralBlock: { start, end }
//
// Output: {
//   lines: [{index, content}],  // possibly normalized
//   policy: 'preserve' | 'trim' | 'none',
//   diagnostics: [diag],
// }
//
// Rules:
//   - All data lines end with ','  -> 'preserve' (trailing comma = empty column)
//   - No data line ends with ','   -> 'none' (no trailing)
//   - Mixed                        -> 'trim' (normalize: strip trailing commas)
//
// If 'trim', the function returns a new lines array with trailing commas
// removed. Otherwise, the same lines array is returned.
// ============================================================

export function detectTrailingCommaPolicy(lines, centralBlock) {
  const diagnostics = [];
  const { start, end } = centralBlock;

  let withTrailing = 0;
  let withoutTrailing = 0;
  let empty = 0;

  for (let i = start; i < end; i++) {
    const trimmed = lines[i].content.trimEnd();
    if (!trimmed) { empty++; continue; }
    if (trimmed.endsWith(',')) withTrailing++;
    else withoutTrailing++;
  }

  let policy;
  if (withTrailing === 0) policy = 'none';
  else if (withoutTrailing === 0) policy = 'preserve';
  else policy = 'trim';

  diagnostics.push({
    severity: 'info',
    code: 'TRAILING_COMMA_POLICY',
    params: { policy, withTrailing, withoutTrailing, empty },
  });

  let normalizedLines = lines;
  if (policy === 'trim') {
    normalizedLines = lines.map((line) => ({
      index: line.index,
      content: line.content.replace(/,+\s*$/, ''),
    }));
  }

  return { lines: normalizedLines, policy, diagnostics };
}
