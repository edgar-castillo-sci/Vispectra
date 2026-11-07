// ============================================================
// PHASE 02 — LEXER (v5.0, on top of shared tokenizer)
// ============================================================
// Function: lex(line)
//
// Input: string (a raw line)
// Output: { structure: string, diagnostics: [diag] }
//
// Alphabet:
//   'n' — number with decimal point
//   'z' — number without decimal point
//   'v' — explicit empty slot (gap between two commas)
//   ',' — literal comma
//
// Mapping (from token stream):
//   number with dot    → 'n'
//   number without dot → 'z'
//   comma              → ','
//   gap between commas → 'v'
//   gap between values → ','   (a spacer acts as a separator)
//   gap at edge        → skipped (decorative)
//   gap adjacent to comma (only one side) → skipped (decorative)
// ============================================================

import { tokenize } from './tokenizer.js';

export function lex(line) {
  const tokens = tokenize(line);
  const structure = [];

  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t];

    if (tok.type === 'number') {
      structure.push(tok.hasDot ? 'n' : 'z');
    } else if (tok.type === 'comma') {
      structure.push(',');
    } else if (tok.type === 'gap') {
      const prev = t > 0 ? tokens[t - 1].type : null;
      const next = t < tokens.length - 1 ? tokens[t + 1].type : null;

      if (prev === 'comma' && next === 'comma') {
        structure.push('v');
      } else if (
        prev !== 'comma' &&
        next !== 'comma' &&
        prev !== null &&
        next !== null
      ) {
        structure.push(',');
      }
      // else: decorative gap, skip
    }
  }

  // Drop one trailing comma (formatting artifact)
  if (structure.length > 0 && structure[structure.length - 1] === ',') {
    structure.pop();
  }

  return { structure: structure.join(''), diagnostics: [] };
}
