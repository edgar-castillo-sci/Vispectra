// ============================================================
// PHASE 06 — MASTER PARSER (v5.0)
// ============================================================
// Function: parseLine(line, plan)
//
// Input:
//   - line: { index, content }
//   - plan: from 05_fixation {
//       pattern:     '_,_,_',
//       commaRoles:  ['dec'|'sep', ...],
//       columnTypes: ['n'|'z'|'i'|'v', ...],
//       numColumns:  number,
//     }
//
// Output: { index, ok, values: (number|null)[], diagnostics }
//
// Algorithm:
//   Walk the pattern left to right, consuming tokens:
//     '_'  → consume number (or mark empty slot if none available)
//     'v'  → consume gap; verify no number is present
//     ','  → consume comma; apply role:
//            'sep' → finalize pending, reset
//            'dec' → fuse pending with next number (skip next '_')
//
// Fusion safety:
//   'dec' requires both raw operands to be plain digits (/^\d+$/).
//   Anything else (signs, exponents) → ok:false + FUSION_UNSAFE.
//
// Trailing gaps are allowed (comments, whitespace). Trailing numbers
// or commas are rejected with EXTRA_TOKENS.
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
    while (tokenIdx < tokens.length && tokens[tokenIdx].type === 'gap') {
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
        // No number available: the slot is empty.
        // This is compatible with patterns that mix `_,_,_` and `_,v,_`
        // rows in the same block (both represent an empty slot).
        pending = { kind: 'empty' };
      }
      patternIdx++;
    } else if (ch === 'v') {
      skipGaps();
      if (tokenIdx < tokens.length && tokens[tokenIdx].type === 'number') {
        return fail('UNEXPECTED_NUMBER_IN_V_SLOT', { patternIdx });
      }
      pending = { kind: 'empty' };
      patternIdx++;
    } else if (ch === ',') {
      if (commaIdx >= commaRoles.length) {
        return fail('COMMA_ROLE_OVERFLOW', { patternIdx });
      }
      const role = commaRoles[commaIdx++];
      skipGaps();
      if (tokenIdx >= tokens.length || tokens[tokenIdx].type !== 'comma') {
        return fail('EXPECTED_COMMA', { patternIdx });
      }
      tokenIdx++; // consume comma

      if (role === 'sep') {
        finalize();
        patternIdx++;
      } else if (role === 'dec') {
        if (!pending || pending.kind !== 'value') {
          return fail('DEC_WITHOUT_LEFT_VALUE', { patternIdx });
        }
        skipGaps();
        if (tokenIdx >= tokens.length || tokens[tokenIdx].type !== 'number') {
          return fail('EXPECTED_NUMBER_AFTER_DEC', { patternIdx });
        }
        const rightRaw = tokens[tokenIdx].raw;
        const leftRaw = pending.raw;
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

        // The next pattern char must be '_' (the underscore that the
        // fused number occupies). Skip it.
        if (
          patternIdx + 1 >= pattern.length ||
          pattern[patternIdx + 1] !== '_'
        ) {
          return fail('DEC_MISSING_RIGHT_PLACEHOLDER', { patternIdx });
        }
        patternIdx += 2; // skip comma AND the underscore
      } else {
        return fail('UNKNOWN_COMMA_ROLE', { patternIdx, role });
      }
    } else {
      return fail('UNKNOWN_PATTERN_CHAR', { patternIdx, ch });
    }
  }

  if (pending !== null) finalize();

  // Trailing gaps (comments, whitespace) are allowed; anything else is not.
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
