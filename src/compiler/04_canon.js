// ============================================================
// PHASE 04 — CANON (Inference, generalization, and expansion)
// ============================================================
// Function: buildCanon(ir, lines, centralBlock)
//
// Input: IR from 03_ir, all lines in the file, and the central
//        block {start, end}.
// Output: {
//   canon: string,              // generalized key with 'i'
//   body: {start, end},         // contiguous data region
//   diagnostics: [diag]
// }
//
// Does:
//   - Builds the tentative canon from the central block.
//   - Expands from the center outwards as long as the canon holds.
//   - Delimits the data body: [start, end].
//
// Rules: R37–R46, R89–R95.
// ============================================================

import { lex } from './02_lexer.js';

export function buildCanon(ir, lines, centralBlock) {
  const diagnostics = [];
  let canon = '';
  let body = { start: centralBlock.start, end: centralBlock.end };

  // 1. Generalization (R37-R43)
  const entries = Object.entries(ir.frequencies).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    diagnostics.push({ severity: 'warn', code: 'EMPTY_SAMPLE', params: {} });
    return { canon, body, diagnostics };
  }

  // Start with the most frequent structure
  canon = entries[0][0];

  // Compare with the other structures and promote to 'i' if they differ
  for (let i = 1; i < entries.length; i++) {
    const structure = entries[i][0];
    let newCanon = '';
    const maxLen = Math.max(canon.length, structure.length);

    for (let j = 0; j < maxLen; j++) {
      const c1 = canon[j] || ' ';
      const c2 = structure[j] || ' ';

      if (c1 === c2) {
        newCanon += c1;
      } else if (c1 === ',' && c2 === ' ') {
        newCanon += ',';
      } else if (c1 === ' ' && c2 === ',') {
        newCanon += ',';
      } else {
        // If they differ and it's not a trailing separator, it's a variable slot
        newCanon += 'i';
      }
    }
    canon = newCanon;
  }

  // 2. Prohibitions (R44)
  if (/in|cn|ci|ic/.test(canon)) {
    diagnostics.push({
      severity: 'error',
      code: 'STRUCTURAL_PROHIBITION',
      params: { canon },
    });
  }

  // 3. Expansion (R89-R95)
  // Helper to check if a structure is compatible with the canon
  const matchesCanon = (structure) => {
    const maxLen = Math.max(structure.length, canon.length);
    for (let i = 0; i < maxLen; i++) {
      const c = canon[i] || ' ';
      const s = structure[i] || ' ';
      if (c === 'i') continue; // 'i' matches anything (n, c, comma, or empty)
      if (c !== s) return false;
    }
    return true;
  };

  // Expand downwards (Preamble)
  let currentStart = centralBlock.start - 1;
  while (currentStart >= 0) {
    const structure = lex(lines[currentStart].content).structure;
    if (matchesCanon(structure)) {
      body.start = currentStart;
      currentStart--;
    } else {
      break;
    }
  }
  if (body.start < centralBlock.start) {
    diagnostics.push({
      severity: 'info',
      code: 'PREAMBLE_DETECTED',
      params: { start: body.start }
    });
  }

  // Expand upwards (Residue)
  let currentEnd = centralBlock.end;
  while (currentEnd < lines.length) {
    const structure = lex(lines[currentEnd].content).structure;
    if (matchesCanon(structure)) {
      body.end = currentEnd + 1; // end is exclusive
      currentEnd++;
    } else {
      break;
    }
  }
  if (body.end > centralBlock.end) {
    diagnostics.push({
      severity: 'info',
      code: 'RESIDUE_DETECTED',
      params: { end: body.end }
    });
  }

  // 4. Body Limitation check (R94)
  if (body.end - body.start < centralBlock.end - centralBlock.start) {
    diagnostics.push({
      severity: 'warn',
      code: 'BODY_LIMITATION',
      params: { start: body.start, end: body.end },
    });
  }

  return { canon, body, diagnostics };
}
