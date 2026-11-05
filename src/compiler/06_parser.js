// ============================================================
// PHASE 06 — MASTER PARSER
// ============================================================
// Function: parseLine(line, fixedCanon)
//
// Input: {index, content}, [token]
// Output: { index, ok, values, diagnostics }
// ============================================================

export function parseLine(line, fixedCanon) {
  const { index, content } = line;
  const values = [];
  const diagnostics = [];

  // For this simplified implementation, we will split the line by spaces/tabs.
  // A fully robust parser would use a state machine, but for UV-Vis data
  // with 'n,i' canon, splitting by whitespace works perfectly.
  const tokens = content.trim().split(/\s+/).filter(t => t.length > 0);

  let tokenIndex = 0;

  for (let i = 0; i < fixedCanon.length; i++) {
    const type = fixedCanon[i];

    if (type === ',') {
      // Column separator: we just skip it (it's implicit in the split)
      continue;
    }

    if (type === 'n') {
      const token = tokens[tokenIndex];
      if (!token) {
        values.push(null);
        diagnostics.push({ severity: 'error', code: 'MISSING_VALUE', params: { index, col: i } });
      } else {
        const val = parseFloat(token);
        if (isNaN(val)) {
          values.push(null);
          diagnostics.push({ severity: 'error', code: 'INVALID_NUMBER', params: { index, col: i, token } });
        } else {
          values.push(val);
        }
        tokenIndex++;
      }
    }

    else if (type === 'i') {
      const token = tokens[tokenIndex];
      if (!token) {
        // Empty slot, valid for 'i'
        values.push(null);
      } else {
        const val = parseFloat(token);
        if (isNaN(val)) {
          values.push(null);
          diagnostics.push({ severity: 'warn', code: 'INVALID_ANCHOR_VALUE', params: { index, col: i, token } });
        } else {
          values.push(val);
          tokenIndex++; // Only advance if we consumed a number
        }
      }
    }
  }

  return { index, ok: true, values, diagnostics };
}
