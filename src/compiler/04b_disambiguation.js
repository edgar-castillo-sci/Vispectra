// ============================================================
// PHASE 04b — DISAMBIGUATION (v5.3)
// ============================================================

import { lex } from './02_lexer.js';

const MAX_COMMAS = 20;

export function detectAmbiguities(blocks, lines) {
  const diagnostics = [];
  const enriched = [];

  for (const block of blocks) {
    const structures = block.instances.map(i => lex(lines[i].content).structure);
    const commaCount = countCommas(block.pattern);
    const hasHardSeparator = block.pattern.includes('|');

    if (commaCount === 0 || block.pattern.includes('v')) {
      enriched.push({ ...block, resolutions: [], isAmbiguous: false });
      continue;
    }

    // R98: Si el bloque contiene algún punto decimal ('n'), las comas
    // SOLO pueden ser separadoras. No hay forma de que una coma sea
    // decimal si un valor de la misma fila ya usa punto para decimales.
    const hasN = structures.some(s => s.includes('n'));
    if (hasN) {
      const allSep = Array(commaCount).fill('sep');
      let columns = -1;
      if (structures.length > 0) {
        const result = countColumns(structures[0], allSep);
        if (result.ok) columns = result.columns;
      }
      enriched.push({
        ...block,
        resolutions: [{ id: allSep.join(','), commas: allSep, columns, isDefault: true }],
        isAmbiguous: false,
      });
      continue;
    }

    // Safety: evitar explosión exponencial en bloques patológicos.
    if (commaCount > MAX_COMMAS) {
      const allSep = Array(commaCount).fill('sep');
      let columns = -1;
      if (structures.length > 0) {
        const result = countColumns(structures[0], allSep);
        if (result.ok) columns = result.columns;
      }
      diagnostics.push({
        severity: 'warn',
        code: 'TOO_MANY_COMMAS',
        params: {
          pattern: block.pattern.substring(0, 60) + '...',
          commas: commaCount,
          max: MAX_COMMAS,
          fallback: 'all-sep',
        },
      });
      enriched.push({
        ...block,
        resolutions: [{ id: allSep.join(','), commas: allSep, columns, isDefault: true }],
        isAmbiguous: false,
      });
      continue;
    }

    const resolutions = enumerateResolutions(structures, commaCount, hasHardSeparator);

    let isGarbage = false;
    if (resolutions.length > 0) {
      const defaultRes = resolutions[0];
      let failCount = 0;
      for (const struct of structures) {
        if (!countColumns(struct, defaultRes.commas).ok) failCount++;
      }
      if (failCount > structures.length / 2) isGarbage = true;
    }

    if (isGarbage) {
      enriched.push({ ...block, resolutions: [], isAmbiguous: false });
      continue;
    }

    if (resolutions.length === 0) {
      diagnostics.push({
        severity: 'error',
        code: 'NO_VALID_RESOLUTION',
        params: { pattern: block.pattern },
      });
      enriched.push({ ...block, resolutions: [], isAmbiguous: true });
      continue;
    }

    const hasConsecutiveCommas = block.pattern.includes(',,');
    let isAmbiguous;
    if (resolutions.length === 1) {
      isAmbiguous = hasConsecutiveCommas || !resolutions[0].isDefault;
    } else {
      isAmbiguous = true;
    }

    enriched.push({ ...block, resolutions, isAmbiguous });
  }

  return {
    blocks: enriched,
    hasAmbiguity: enriched.some(b => b.isAmbiguous),
    diagnostics,
  };
}

function countCommas(pattern) {
  let n = 0;
  for (const ch of pattern) if (ch === ',') n++;
  return n;
}

function isParity(commas) {
  for (let i = 0; i < commas.length; i++) {
    const expected = i % 2 === 0 ? 'dec' : 'sep';
    if (commas[i] !== expected) return false;
  }
  return true;
}

function enumerateResolutions(structures, commaCount, hasHardSeparator) {
  if (hasHardSeparator) {
    const allDec = Array(commaCount).fill('dec');
    let columns = -1;
    if (structures.length > 0) {
      const result = countColumns(structures[0], allDec);
      if (result.ok) columns = result.columns;
    }
    return [{ id: allDec.join(','), commas: allDec, columns, isDefault: true }];
  }

  const total = 1 << commaCount;
  const resolutions = [];

  for (let bits = 0; bits < total; bits++) {
    const commas = [];
    for (let k = 0; k < commaCount; k++) {
      commas.push((bits >> k) & 1 ? 'dec' : 'sep');
    }

    let valid = true;
    let columns = -1;

    for (const struct of structures) {
      const result = countColumns(struct, commas);
      if (!result.ok) { valid = false; break; }
      if (columns === -1) columns = result.columns;
      else if (columns !== result.columns) { valid = false; break; }
    }

    if (valid) {
      resolutions.push({ id: commas.join(','), commas, columns, isDefault: false });
    }
  }

  if (resolutions.length === 1) {
    resolutions[0].isDefault = true;
  } else if (resolutions.length > 1) {
    const parity = resolutions.find(r => isParity(r.commas));
    if (parity) parity.isDefault = true;
    else resolutions[0].isDefault = true;
  }

  resolutions.sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    if (a.columns !== b.columns) return b.columns - a.columns;
    return a.id.localeCompare(b.id);
  });

  return resolutions;
}

function countColumns(structure, resolution) {
  let columns = 0;
  let pending = false;
  let pendingHasDot = false;
  let commaIdx = 0;
  let i = 0;

  while (i < structure.length) {
    const ch = structure[i];

    if (ch === 'n' || ch === 'z') {
      if (pending) return { ok: false };
      pending = true;
      pendingHasDot = (ch === 'n');
      i++;
    } else if (ch === 'v') {
      if (pending) return { ok: false };
      columns++;
      i++;
    } else if (ch === '|') {
      if (pending) { columns++; pending = false; }
      i++;
    } else if (ch === ',') {
      if (commaIdx >= resolution.length) return { ok: false };
      const dec = resolution[commaIdx++];
      if (dec === 'sep') {
        columns++;
        pending = false;
        pendingHasDot = false;
        i++;
      } else {
        if (!pending || pendingHasDot) return { ok: false };
        if (i + 1 >= structure.length) return { ok: false };
        if (structure[i + 1] !== 'z') return { ok: false };
        pendingHasDot = true;
        i += 2;
      }
    } else {
      return { ok: false };
    }
  }

  if (pending) columns++;
  return { ok: true, columns };
}
