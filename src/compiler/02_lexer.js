// ============================================================
// PHASE 02 — LEXER (v5.4)
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

  // 1. Ignorar separadores al inicio (texto antes del primer número)
  while (structure.length > 0 && structure[0] === '|') structure.shift();
  while (structure.length > 0 && structure[0] === ',') structure.shift();

  // 2. Ignorar separadores duros al final (relleno decorativo ';;;;;;;;')
  while (structure.length > 0 && structure[structure.length - 1] === '|') {
    structure.pop();
  }

  // 3. Comas trailing: se PRESERVAN.
  //    - Si el archivo tiene policy='preserve', la coma representa una
  //      columna vacía al final y debe contarse.
  //    - Si la policy es 'trim', 01b ya las eliminó ANTES del lexer.
  //    - Si es 'none', no hay comas trailing para preservar.
  //    En los tres casos, el lexer las deja tal cual.

  return { structure: structure.join(''), diagnostics: [] };
}
