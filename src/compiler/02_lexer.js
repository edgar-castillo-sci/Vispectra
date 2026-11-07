// ============================================================
// PHASE 02 — LEXER (v5.2)
// ============================================================
// Alphabet:
//   'n' — number with decimal point
//   'z' — number without decimal point
//   ',' — literal comma
//   '|' — hard column separator (;, space, tab, etc.)
// ============================================================

import { tokenize } from './tokenizer.js';

export function lex(line) {
  const tokens = tokenize(line);
  const structure = [];

  for (const tok of tokens) {
    if (tok.type === 'number') {
      structure.push(tok.hasDot ? 'n' : 'z');
    } else if (tok.type === 'comma') {
      structure.push(',');
    } else if (tok.type === 'separator') {
      structure.push('|');
    }
  }

  // 1. Ignorar separadores al inicio (ej. texto antes del primer número)
  while (structure.length > 0 && structure[0] === '|') {
    structure.shift();
  }
  while (structure.length > 0 && structure[0] === ',') {
    structure.shift();
  }

  // 2. Ignorar separadores al final (ej. los ";;;;;;;;" de tus filas)
  while (structure.length > 0 && structure[structure.length - 1] === '|') {
    structure.pop();
  }
  while (structure.length > 0 && structure[structure.length - 1] === ',') {
    structure.pop();
  }

  return { structure: structure.join(''), diagnostics: [] };
}
