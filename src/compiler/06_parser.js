// ============================================================
// PHASE 06 — MASTER PARSER (v5.1)
// ============================================================
// Function: parseLine(line, plan)
//
// Pattern characters:
//   '_' → number slot
//   'v' → explicit empty slot (gap between separators)
//   '|' → hard column separator (;, space, tab)
//   ',' → literal comma (can be 'sep' or 'dec')
// ============================================================

import { tokenize } from './tokenizer.js';

export function parseLine(line, plan) {
  const { index, content } = line;
  const { pattern, commaRoles, numColumns } = plan;
  const diagnostics = [];

  const fail = (code, params = {}) => {
    diagnostics.push({
      severity: 'error',
      code,
      params: { index, ...params },
    });
    return { index, ok: false, values: [], diagnostics };
  };

  const tokens = tokenize(content);
  const values = [];

  let tokenIdx = 0;
  let commaIdx = 0;
  let patternIdx = 0;

  // pending: null | { kind: 'value', value, raw } | { kind: 'empty' }
  let pending = null;

  const skipGaps = () => {
    // Omitimos los "separator" y "gap" temporales para buscar el siguiente token real
    while (tokenIdx < tokens.length && tokens[tokenIdx].type === 'separator') {
      tokenIdx++;
    }
  };

  const finalize = () => {
    if (pending && pending.kind === 'value') values.push(pending.value);
    else values.push(null);
    pending = null;
  };

  while (patternIdx < pattern.length) {
    const ch = pattern[patternIdx];

    if (ch === '_') {
      skipGaps();
      if (tokenIdx < tokens.length && tokens[tokenIdx].type === 'number') {
        pending = {
          kind: 'value',
          value: tokens[tokenIdx].value,
          raw: tokens[tokenIdx].raw,
        };
        tokenIdx++;
      } else {
        pending = { kind: 'empty' };
      }
      patternIdx++;
    }
    else if (ch === 'v') {
      skipGaps();
      if (tokenIdx < tokens.length && tokens[tokenIdx].type === 'number') {
        return fail('UNEXPECTED_NUMBER_IN_V_SLOT', { patternIdx });
      }
      pending = { kind: 'empty' };
      patternIdx++;
    }
    else if (ch === '|') {
      // Separador duro (;, espacio, tab)
      skipGaps();
      if (tokenIdx < tokens.length && tokens[tokenIdx].type === 'separator') {
        tokenIdx++; // Consumir el separador
      }
      finalize();
      patternIdx++;
    }
    else if (ch === ',') {
      // Coma original (puede ser decimal o separadora)
      if (commaIdx >= commaRoles.length) {
        return fail('COMMA_ROLE_OVERFLOW', { patternIdx });
      }
      const role = commaRoles[commaIdx++];

      skipGaps();

      // Buscamos el token de coma explícito
      if (tokenIdx >= tokens.length || tokens[tokenIdx].type !== 'comma') {
        return fail('EXPECTED_COMMA', { patternIdx });
      }
      tokenIdx++; // Consumir la coma

      if (role === 'sep') {
        finalize();
        patternIdx++;
      }
      else if (role === 'dec') {
        if (!pending || pending.kind !== 'value') {
          return fail('DEC_WITHOUT_LEFT_VALUE', { patternIdx });
        }

        skipGaps();
        if (tokenIdx >= tokens.length || tokens[tokenIdx].type !== 'number') {
          return fail('EXPECTED_NUMBER_AFTER_DEC', { patternIdx });
        }

        const rightRaw = tokens[tokenIdx].raw;
        const leftRaw = pending.raw;

        // Validación de fusión (solo dígitos puros)
        if (!/^\d+$/.test(leftRaw) || !/^\d+$/.test(rightRaw)) {
          return fail('FUSION_UNSAFE', { left: leftRaw, right: rightRaw });
        }

        const fused = parseFloat(`${leftRaw}.${rightRaw}`);
        pending = {
          kind: 'value',
          value: fused,
          raw: `${leftRaw}.${rightRaw}`,
        };
        tokenIdx++;

        // El siguiente carácter en el patrón debe ser '_' (la mitad derecha del decimal)
        if (
          patternIdx + 1 >= pattern.length ||
          pattern[patternIdx + 1] !== '_'
        ) {
          return fail('DEC_MISSING_RIGHT_PLACEHOLDER', { patternIdx });
        }
        patternIdx += 2; // Saltamos la coma y el guion bajo
      }
      else {
        return fail('UNKNOWN_COMMA_ROLE', { patternIdx, role });
      }
    }
    else {
      return fail('UNKNOWN_PATTERN_CHAR', { patternIdx, ch });
    }
  }

  if (pending !== null) finalize();

  // Los separadores al final de la línea se ignoran
  skipGaps();
  if (tokenIdx < tokens.length) {
    return fail('EXTRA_TOKENS', {
      remaining: tokens.length - tokenIdx,
      tokenType: tokens[tokenIdx].type,
    });
  }

  if (values.length !== numColumns) {
    return fail('COLUMN_COUNT_MISMATCH', {
      expected: numColumns,
      got: values.length,
    });
  }

  return { index, ok: true, values, diagnostics };
}
