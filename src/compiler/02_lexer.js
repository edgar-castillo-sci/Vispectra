// ============================================================
// FASE 02 — LEXER
// ============================================================
// Recibe: una línea cruda (string).
// Devuelve: { estructura: string, diagnosticos: [diag] }
//
// Hace:
//   - R7: elimina dígitos, e, E, +, -, y letras.
//         NO elimina espacios ni tabs.
//   - R8: concatena los caracteres restantes en `caracteres`.
//   - R9: lee de izquierda a derecha, índice por índice.
//   - R10: fei = último carácter emitido a estructura_interna.
//   - R11: sc = siguiente carácter en `caracteres`.
//
// Reglas del punto:
//   - R12: '.' y fei ∈ tipos_num → log + error.
//   - R13: '.' y fei ∉ tipos_num o null → concatenar 'n'.
//   - R14: secuencia pura de puntos (sin '..' en la línea original)
//          → paridad + advertencia severa.
//   - R15: '..' en la línea original → error.
//   - R16: puntos separados por otros caracteres → independientes.
//
// Reglas de la coma:
//   - R17: fei ∈ tipos_num → coma separadora. Emitir ','.
//   - R18: (fei = ',' o null) y (sc = ',' o null) → run detection.
//   - R19: fei = ',' y sc ∉ {',', null} → cierre de run, separadora.
//   - R20: fei = ',' y (sc = null o sc ∉ {',', '.'}) → coma decimal.
//   - R21: las ramas de la coma deben estar al mismo nivel, no anidadas.
//   - R22: la coma es el único carácter que puede ser valor o estructura.
//
// Run detection:
//   - R23: run de L comas se captura en `comas`.
//         (La paridad y conversión se aplican en 05_fijacion.)
//
// Notas:
//   - R25: la paridad asume que la run empieza con decimal;
//          el parser maestro (06) la corrige. Aquí solo se documenta.
//   - R27: comas invariantes entre líneas; solo se redefine su uso.
//   - R28: alrededor de n e i, solo separadores de columna.
//
// NO hace:
//   - No aplica paridad (eso es 05_fijacion, R24, R26).
//   - No generaliza con i (eso es 04_canon).
//   - No fija (eso es 05_fijacion).
//   - No parsea valores (eso es 06_parser).
//   - No valida columnas (eso es 07_semantica).
//
// Fuera de alcance (R84–R88):
//   - R84: notación de miles (1.234,56) → no soportado.
//   - R87: unidades pegadas a números (250nm) → no soportado.
// ============================================================

export function lex(line) {
  const diagnostics = [];
  const characters = limpiar(line);

  // --- R15: '..' en la línea original ---
  const hasConsecutiveDots = line.includes('..');

  if (hasConsecutiveDots) {
    diagnostics.push({
      severity: 'error',
      code: 'CONSECUTIVE_DOTS',
      params: {},
    });
  }

  // --- R14: secuencia pura de puntos ---
  if (/^\.{2,}$/.test(characters) && !hasConsecutiveDots) {
    diagnostics.push({
      severity: 'warn',
      code: 'DOT_SEQUENCE',
      params: { length: characters.length },
    });
    const structure = procesarPuntosConParidad(characters);
    return { structure, diagnostics };
  }

  const structure = procesar(characters, diagnostics);
  return { structure, diagnostics };
}

function limpiar(line) {
  return line.replace(/[0-9eE+\-a-zA-Z]/g, '');
}

function procesarPuntosConParidad(puntos) {
  const output = [];
  for (let i = 0; i < puntos.length; i++) {
    output.push(i % 2 === 0 ? 'n' : ',');
  }
  return output.join('');
}

function procesar(characters, diagnostics) {
  const output = [];
  let i = 0;

  while (i < characters.length) {
    const c = characters[i];
    const fei = output.length > 0 ? output[output.length - 1] : null;
    const sc = i + 1 < characters.length ? characters[i + 1] : null;

    if (c === '.') {
      if (fei === 'n' || fei === 'c') {
        diagnostics.push({
          severity: 'error',
          code: 'DOT_AFTER_NUMBER',
          params: { position: i },
        });
      } else {
        output.push('n');
      }
      i++;
    } else if (c === ',') {
      if (fei === 'n' || fei === 'c') {
        output.push(',');
        i++;
      } else if ((fei === ',' || fei === null) && (sc === ',' || sc === null)) {
        const start = i;
        while (i < characters.length && characters[i] === ',') {
          output.push(',');
          i++;
        }
        const length = i - start;
        diagnostics.push({
          severity: 'info',
          code: 'COMMA_RUN',
          params: { length, position: start },
        });
      } else if (fei === ',' && sc !== ',' && sc !== null) {
        output.push(',');
        i++;
      } else if (fei === ',' || fei === null) {
        output.push('c');
        i++;
      } else {
        output.push(',');
        i++;
      }
    } else {
      output.push(',');
      i++;
    }
  }

  return output.join('');
}
