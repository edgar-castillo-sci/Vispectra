// ============================================================
// PHASE 02 — LEXER
// ============================================================
// Function: lex(line)
//
// Input: string (a raw line)
// Output: { structure: string, diagnostics: [diag] }
// ============================================================

export function lex(line) {
  const structure = [];
  const diagnostics = [];
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    // 1. Is it a number? (starts with digit, +, or -)
    if (/[0-9]/.test(char) || char === '+' || char === '-') {
      let hasComma = false;
      let hasDot = false;

      while (i < line.length) {
        const inner = line[i];
        // ¡AQUÍ ESTÁ EL ARREGLO! El guion está escapado: \-
        if (/[0-9eE\+\-]/.test(inner)) {
          i++;
        } else if (inner === '.' || inner === ',') {
          // It's a decimal ONLY if it's between digits (R57)
          if (i + 1 < line.length && /[0-9]/.test(line[i + 1])) {
            if (inner === ',') hasComma = true;
            if (inner === '.') hasDot = true;
            i++;
          } else {
            break; // It's a separator, not part of the number
          }
        } else {
          break; // It's a separator
        }
      }

      if (hasComma && !hasDot) {
        structure.push('c');
      } else {
        structure.push('n');
      }
    }
    // 2. Letters and spaces are ignored
    else if (/[a-zA-Z\s]/.test(char)) {
      i++;
    }
    // 3. Any other character is a column separator
    else {
      structure.push(',');
      i++;
    }
  }

  return { structure: structure.join(''), diagnostics };
}
