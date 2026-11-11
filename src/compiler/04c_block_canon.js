// ============================================================
// PHASE 04c — BLOCK CANON (v5.3)
// ============================================================

import { lex } from './02_lexer.js';

export function buildBlockCanon(block, lines, resolution) {
  const diagnostics = [];
  const commaCount = countCommas(block.pattern);

  let commas;
  if (resolution && resolution.commas) {
    if (resolution.commas.length !== commaCount) {
      diagnostics.push({
        severity: 'error',
        code: 'RESOLUTION_LENGTH_MISMATCH',
        params: { pattern: block.pattern, expected: commaCount, got: resolution.commas.length },
      });
      return { canon: '', columns: [], diagnostics };
    }
    commas = resolution.commas;
  } else {
    commas = Array(commaCount).fill('sep');
  }

  const rowSlots = [];
  for (const lineIndex of block.instances) {
    const structure = lex(lines[lineIndex].content).structure;
    const slots = applyResolution(structure, commas);
    if (slots === null) {
      diagnostics.push({
        severity: 'error',
        code: 'RESOLUTION_MISMATCH',
        params: { pattern: block.pattern, structure },
      });
      return { canon: '', columns: [], diagnostics };
    }
    rowSlots.push(slots);
  }

  const nCols = rowSlots[0].length;
  for (const slots of rowSlots) {
    if (slots.length !== nCols) {
      diagnostics.push({
        severity: 'error',
        code: 'BLOCK_COUNT_MISMATCH',
        params: { pattern: block.pattern, expected: nCols, got: slots.length },
      });
      return { canon: '', columns: [], diagnostics };
    }
  }

  const columns = [];
  for (let j = 0; j < nCols; j++) {
    const types = rowSlots.map(s => s[j]);
    const nonEmpty = types.filter(t => t !== 'v');
    const hasN = nonEmpty.includes('n');
    const hasZ = nonEmpty.includes('z');
    const filled = nonEmpty.length;
    const total = types.length;
    const gapIndices = block.instances.filter((_, idx) => types[idx] === 'v');

    let type;
    if (nonEmpty.length === 0) type = 'v';
    else if (hasN && hasZ) type = 'i';
    else if (hasN) type = 'n';
    else type = 'z';

    columns.push({ type, completeness: { filled, total, gapIndices } });

    if (type === 'i') {
      diagnostics.push({
        severity: 'info',
        code: 'MIXED_NOTATION',
        params: { pattern: block.pattern, column: j },
      });
    }

    if (filled < total) {
      diagnostics.push({
        severity: 'info',
        code: 'COLUMN_GAPS',
        params: { pattern: block.pattern, column: j, gaps: total - filled, total },
      });
    }
  }

  const canon = columns.map(c => c.type).join(',');
  return { canon, columns, diagnostics };
}

function countCommas(pattern) {
  let n = 0;
  for (const ch of pattern) if (ch === ',') n++;
  return n;
}

function applyResolution(structure, commas) {
  const slots = [];
  let i = 0;
  let commaIdx = 0;
  let pending = null;

  while (i < structure.length) {
    const ch = structure[i];

    if (ch === 'n' || ch === 'z') {
      if (pending !== null) return null;
      pending = ch;
      i++;
    } else if (ch === 'v') {
      if (pending !== null) return null;
      pending = 'v';
      i++;
    } else if (ch === '|') {
      slots.push(pending === null ? 'v' : pending);
      pending = null;
      i++;
    } else if (ch === ',') {
      if (commaIdx >= commas.length) return null;
      const dec = commas[commaIdx++];
      if (dec === 'sep') {
        slots.push(pending === null ? 'v' : pending);
        pending = null;
        i++;
      } else {
        if (pending !== 'z') return null;
        if (i + 1 >= structure.length || structure[i + 1] !== 'z') return null;
        pending = 'n';
        i += 2;
      }
    } else {
      return null;
    }
  }

  if (pending !== null) {
    slots.push(pending);
  } else if (structure.length > 0) {
    // Coma/separador trailing → campo vacío final.
    const lastCh = structure[structure.length - 1];
    if (lastCh === '|') {
      slots.push('v');
    } else if (lastCh === ',' && commaIdx > 0 && commas[commaIdx - 1] === 'sep') {
      slots.push('v');
    }
  }

  return slots;
}
