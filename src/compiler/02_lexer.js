// ============================================================
// PHASE 02 — LEXER (v5.3)
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

  // 2. Ignorar separadores duros al final (ej. los ";;;;;;;;" de algunas filas)
  while (structure.length > 0 && structure[structure.length - 1] === '|') {
    structure.pop();
  }

  // 3. Ignorar comas trailing.
  //
  // Muchas herramientas añaden una coma al final de cada fila como
  // artefacto decorativo. Tratarla como campo vacío obliga a modificar
  // el pattern en 04_canon/05_fixation para mantener consistencia,
  // lo cual se hará en la fase 01b_trailing_comma (v0.2.0).
  //
  // Consecuencia actual: archivos como CNNi.csv pierden su última
  // columna ("Remark"), que suele estar vacía. Aceptable como limitación
  // temporal.
  while (structure.length > 0 && structure[structure.length - 1] === ',') {
    structure.pop();
  }

  return { structure: structure.join(''), diagnostics: [] };
}
