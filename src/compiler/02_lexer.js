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

  // 2. Ignorar separadores duros al final (ej. los ";;;;;;;;" de tus filas)
  //    Los '|' son decorativos: muchos instrumentos rellenan con separadores
  //    para "alinear" visualmente o por artefactos de exportación.
  while (structure.length > 0 && structure[structure.length - 1] === '|') {
    structure.pop();
  }

  // 3. PRESERVAR comas trailing: en CSV, "a,b,c," significa 4 campos
  //    (el último vacío). NO se eliminan. El parser (countColumns /
  //    applyResolution) sabe contar la columna vacía final.
  //
  //    Nota: si algún archivo tiene comas trailing decorativas (no
  //    representan un campo), se obtendrá 1 columna extra vacía. El
  //    usuario puede deseleccionarla en el panel de Y-Series.
  //    Detección de política a nivel archivo (01b_trailing_comma)
  //    planificada para v0.2.0.

  return { structure: structure.join(''), diagnostics: [] };
}
