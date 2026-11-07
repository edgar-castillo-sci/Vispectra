// ============================================================
// PHASE 04 — CANON (v5.0)
// ============================================================
// Function: buildCanon(ir, lines, centralBlock)
//
// Input: IR from 03_ir (totalCount, frequencies, lengths),
//        all lines, central block.
// Output: {
//   canonLiteral: string,           // dominant literal pattern
//   body: { start, end },
//   blocks: [
//     {
//       pattern: string,            // '_,_,_' shape (n/z → _, v and , preserved)
//       instances: [int],           // line indices
//       hasAmbiguity: boolean,      // needs editor
//     },
//   ],
//   diagnostics: [diag],
// }
//
// Does:
//   - Computes the dominant literal pattern from the sample.
//   - Expands the body from the center while structures match
//     any pattern seen in the sample.
//   - Groups ALL body lines into blocks by comma pattern.
//
// Ambiguity:
//   A block is ambiguous if:
//     - its pattern contains at least one comma,
//     - it contains no 'v' (explicit empty slots disambiguate),
//     - at least one row contains 'z' (integer),
//     - no row contains 'n' (dot-decimal disambiguates).
//
// Does NOT:
//   - Resolve ambiguity (04b does).
//   - Build abstract column canon (04c does).
// ============================================================

import { lex } from './02_lexer.js';

export function buildCanon(ir, lines, centralBlock) {
  const diagnostics = [];

  const entries = Object.entries(ir.frequencies).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return { canonLiteral: '', body: centralBlock, blocks: [], diagnostics };
  }

  const canonLiteral = entries[0][0];

  // Reference patterns for body expansion (all distinct patterns in sample).
  const samplePatterns = new Set(entries.map(([struct]) => patternOf(struct)));

  const lexLine = (i) => lex(lines[i].content).structure;
  const matchesSample = (i) => {
    const struct = lexLine(i);
    if (struct === '') return false;
    return samplePatterns.has(patternOf(struct));
  };

  let start = centralBlock.start;
  let end = centralBlock.end;

  while (start > 0 && matchesSample(start - 1)) start--;
  while (end < lines.length && matchesSample(end)) end++;

  // Re-scan ALL body lines to group into blocks (not just sample).
  const bodyRows = [];
  for (let i = start; i < end; i++) {
    const struct = lexLine(i);
    if (struct === '') continue;
    bodyRows.push({ index: i, structure: struct });
  }

  const blocks = groupIntoBlocks(bodyRows);

  return { canonLiteral, body: { start, end }, blocks, diagnostics };
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function patternOf(structure) {
  return structure.replace(/[nz]/g, '_');
}

function groupIntoBlocks(rows) {
  const groups = new Map();

  for (const { index, structure } of rows) {
    const pattern = patternOf(structure);
    if (!groups.has(pattern)) {
      groups.set(pattern, { pattern, instances: [], structures: [] });
    }
    const g = groups.get(pattern);
    g.instances.push(index);
    g.structures.push(structure);
  }

  return Array.from(groups.values())
    .sort((a, b) => b.instances.length - a.instances.length)
    .map((g) => ({
      pattern: g.pattern,
      instances: g.instances,
      hasAmbiguity: isAmbiguous(g.pattern, g.structures),
    }));
}

function isAmbiguous(pattern, structures) {
  // Si no hay comas originales, no es ambiguo
  if (!pattern.includes(',')) return false;

  // Si hay comas, verificamos si hay números enteros (z)
  // Si solo hay n, la coma no puede ser decimal (ya hay punto).
  const hasZ = structures.some((s) => s.includes('z'));
  const hasN = structures.some((s) => s.includes('n'));

  return hasZ && !hasN;
}
