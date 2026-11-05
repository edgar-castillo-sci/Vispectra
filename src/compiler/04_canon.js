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
// ============================================================

import { lex } from './02_lexer.js';

export function buildCanon(ir, lines, centralBlock) {
  const diagnostics = [];
  let canon = '';
  let body = { start: centralBlock.start, end: centralBlock.end };

  const entries = Object.entries(ir.frequencies).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return { canon, body, diagnostics };

  const sampleSize = ir.perLine.length;
  const threshold = Math.max(1, Math.floor(sampleSize * 0.05));
  const validEntries = entries.filter(([structure]) => structure.trim() !== '');

  if (validEntries.length === 0) return { canon, body, diagnostics };

  canon = validEntries[0][0];

  for (let i = 1; i < validEntries.length; i++) {
    const structure = validEntries[i][0];
    const count = validEntries[i][1];

    if (count < threshold) break;

    let newCanon = '';
    const maxLen = Math.max(canon.length, structure.length);

    for (let j = 0; j < maxLen; j++) {
      const c1 = canon[j] || ' ';
      const c2 = structure[j] || ' ';

      if (c1 === c2) {
        newCanon += c1;
      } else if (c1 === ',' && c2 === ' ') {
        newCanon += ','; // Preserve separator if one line is shorter
      } else if (c1 === ' ' && c2 === ',') {
        newCanon += ',';
      } else {
        newCanon += 'i'; // Variable value
      }
    }
    canon = newCanon;
  }

  const matchesCanon = (structure) => {
    const maxLen = Math.max(structure.length, canon.length);
    for (let i = 0; i < maxLen; i++) {
      const c = canon[i] || ' ';
      const s = structure[i] || ' ';
      if (c === 'i') continue;
      if (c !== s) return false;
    }
    return true;
  };

  let currentStart = centralBlock.start - 1;
  while (currentStart >= 0) {
    if (matchesCanon(lex(lines[currentStart].content).structure)) {
      body.start = currentStart--;
    } else break;
  }

  let currentEnd = centralBlock.end;
  while (currentEnd < lines.length) {
    if (matchesCanon(lex(lines[currentEnd].content).structure)) {
      body.end = ++currentEnd;
    } else break;
  }

  return { canon, body, diagnostics };
}
