// ============================================================
// PHASE 04b — DISAMBIGUATION (v5.0)
// ============================================================
// Function: detectAmbiguities(blocks, lines)
//
// Input:
//   - blocks from 04_canon
//   - all lines (to re-lex real structures per block)
//
// Output: {
//   blocks: [
//     {
//       pattern: string,            // '_,_,_' (abstract)
//       instances: [int],
//       resolutions: [
//         { id, commas: ['sep'|'dec'], columns, isDefault }
//       ],
//       isAmbiguous: boolean,
//     },
//   ],
//   hasAmbiguity: boolean,
//   diagnostics: [diag],
// }
//
// Rules for `dec` validity:
//   - Both neighbors must be 'z' (no dot yet).
//   - No adjacent commas around a 'dec'.
//   - Cannot follow another 'dec' in the same number.
//   - All rows in the block must yield the SAME column count.
// ============================================================

import { lex } from './02_lexer.js';

const MAX_COMMAS = 12; // 2^12 = 4096 max combinations

export function detectAmbiguities(blocks, lines) {
  const diagnostics = [];
  const enriched = [];

  for (const block of blocks) {
    const structures = block.instances.map(i => lex(lines[i].content).structure);
    const commaCount = countCommas(block.pattern);

    // Trivial cases: no commas, or explicit empty slots.
    if (commaCount === 0 || block.pattern.includes('v')) {
      enriched.push({ ...block, resolutions: [], isAmbiguous: false });
      continue;
    }

    if (commaCount > MAX_COMMAS) {
      diagnostics.push({
        severity: 'error',
        code: 'BLOCK_TOO_COMPLEX',
        params: { pattern: block.pattern, commas: commaCount },
      });
      enriched.push({ ...block, resolutions: [], isAmbiguous: true });
      continue;
    }

    const resolutions = enumerateResolutions(structures, commaCount);

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

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

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

function enumerateResolutions(structures, commaCount) {
  const resolutions = [];
  const total = 1 << commaCount;

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
      resolutions.push({
        id: commas.join(','),
        commas,
        columns,
        isDefault: false,
      });
    }
  }

  // Assign default
  if (resolutions.length === 1) {
    resolutions[0].isDefault = true;
  } else if (resolutions.length > 1) {
    const parity = resolutions.find(r => isParity(r.commas));
    if (parity) parity.isDefault = true;
    else resolutions[0].isDefault = true;
  }

  // Sort: default first, then by columns desc, then lexicographic.
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
    } else if (ch === ',') {
      if (commaIdx >= resolution.length) return { ok: false };
      const dec = resolution[commaIdx++];
      if (dec === 'sep') {
        columns++;
        pending = false;
        pendingHasDot = false;
        i++;
      } else {
        // dec: must have a 'z' on the right and no dot on the left.
        if (!pending || pendingHasDot) return { ok: false };
        if (i + 1 >= structure.length) return { ok: false };
        if (structure[i + 1] !== 'z') return { ok: false };
        pendingHasDot = true;
        i += 2; // consume the next 'z'
      }
    } else {
      return { ok: false };
    }
  }

  if (pending) columns++;
  return { ok: true, columns };
}
