// ============================================================
// PHASE 05 — FIXATION
// ============================================================
// Functions: fixCanon(canon), countColumns(fixedCanon)
//
// Input: string (generalized canon)
// Output: { fixedCanon: [token], diagnostics: [diag] }
// ============================================================

export function fixCanon(canon) {
  const fixedCanon = [];
  const diagnostics = [];
  let i = 0;

  while (i < canon.length) {
    const char = canon[i];

    if (char === ',') {
      // Find the whole run of commas
      let runLength = 0;
      while (i + runLength < canon.length && canon[i + runLength] === ',') {
        runLength++;
      }

      if (runLength === 1) {
        // A single comma between values is a column separator, not a decimal.
        const prev = fixedCanon[fixedCanon.length - 1];
        const next = canon[i + 1];
        const isBetweenValues =
          (prev === 'n' || prev === 'c' || prev === 'i') &&
          (next === 'n' || next === 'c' || next === 'i');

        if (isBetweenValues) {
          fixedCanon.push(',');
        } else {
          fixedCanon.push('c');
        }
      } else {
        // For runs of 2 or more commas, apply parity (R24)
        for (let k = 0; k < runLength; k++) {
          if (k % 2 === 0) {
            fixedCanon.push('c');
          } else {
            fixedCanon.push(',');
          }
        }
      }
      i += runLength;
    } else {
      // It's an 'n', 'c', or 'i'
      fixedCanon.push(char);
      i++;
    }
  }

  // R44: Structural prohibitions check (in, cn, ci, ic)
  const canonString = fixedCanon.join('');
  if (/in|cn|ci|ic/.test(canonString)) {
    diagnostics.push({
      severity: 'error',
      code: 'STRUCTURAL_PROHIBITION',
      params: { canon: canonString },
    });
  }

  return { fixedCanon, diagnostics };
}

export function countColumns(fixedCanon) {
  let count = 0;
  for (const token of fixedCanon) {
    if (token === 'n' || token === 'c' || token === 'i') {
      count++;
    }
  }
  return count;
}
