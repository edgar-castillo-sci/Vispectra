export function lex(line) {
  const structure = [];
  const diagnostics = [];
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (/[0-9]/.test(char) || char === '+' || char === '-') {
      let hasComma = false;
      let hasDot = false;
      while (i < line.length) {
        const inner = line[i];
        if (/[0-9eE\+\-]/.test(inner)) {
          i++;
        } else if (inner === '.' || inner === ',') {
          if (i + 1 < line.length && /[0-9]/.test(line[i + 1])) {
            if (inner === ',') hasComma = true;
            if (inner === '.') hasDot = true;
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      structure.push(hasComma && !hasDot ? 'c' : 'n');
    }
    // ¡EL ARREGLO! Los espacios y tabs son separadores
    else if (/[ \t]/.test(char)) {
      // Solo añadimos una coma si la última estructura no era ya una coma
      if (structure.length > 0 && structure[structure.length - 1] !== ',') {
        structure.push(',');
      }
      i++;
    }
    // Letras (se ignoran)
    else if (/[a-zA-Z]/.test(char)) {
      i++;
    }
    // Cualquier otra cosa es separador
    else {
      if (structure.length > 0 && structure[structure.length - 1] !== ',') {
        structure.push(',');
      }
      i++;
    }
  }

  return { structure: structure.join(''), diagnostics };
}
