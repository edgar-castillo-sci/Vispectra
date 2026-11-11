// ============================================================
// PHASE 04 — CANON (v5.4)
// ============================================================

import { lex } from './02_lexer.js';

export function buildCanon(ir, lines, centralBlock) {
  const diagnostics = [];

  const entries = Object.entries(ir.frequencies).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return { canonLiteral: '', body: centralBlock, blocks: [], diagnostics };
  }

  const canonLiteral = entries[0][0];
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
  let p = structure.replace(/[nz]/g, '_');
  // Trailing separator implies an extra empty slot at the end.
  // (e.g. '_,_,_' with trailing ',' becomes '_,_,_,_').
  if (p.endsWith(',') || p.endsWith('|')) {
    p += '_';
  }
  return p;
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
  if (!pattern.includes(',')) return false;
  if (pattern.includes('v')) return false;
  const hasZ = structures.some((s) => s.includes('z'));
  const hasN = structures.some((s) => s.includes('n'));
  return hasZ && !hasN;
}
