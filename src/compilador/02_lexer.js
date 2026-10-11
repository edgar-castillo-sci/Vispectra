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

export function lexear(linea) {
  const diagnosticos = [];
  const caracteres = limpiar(linea);

  // --- R15: '..' en la línea original ---
  // Si la línea original contiene dos puntos consecutivos, es error
  // seguro: número con dos decimales o número vacío entre puntos.
  // Se revisa la línea original, no `caracteres`, porque tras la
  // limpieza se pierde la información de qué había entre los puntos.
  const tienePuntosConsecutivos = linea.includes('..');

  if (tienePuntosConsecutivos) {
    diagnosticos.push({
      severity: 'error',
      code: 'PUNTOS_CONSECUTIVOS',
      params: {},
    });
  }

  // --- R14: secuencia pura de puntos ---
  // Toda la cadena son puntos (2 o más) y no había '..' en la
  // línea original. Se lee con paridad, pero se advierte.
  if (/^\.{2,}$/.test(caracteres) && !tienePuntosConsecutivos) {
    diagnosticos.push({
      severity: 'warn',
      code: 'SECUENCIA_PUNTOS',
      params: { longitud: caracteres.length },
    });
    const estructura = procesarPuntosConParidad(caracteres);
    return { estructura, diagnosticos };
  }

  const estructura = procesar(caracteres, diagnosticos);
  return { estructura, diagnosticos };
}

// ------------------------------------------------------------
// R7: eliminar dígitos, e, E, +, -, y letras.
//     NO eliminar espacios ni tabs.
// ------------------------------------------------------------
function limpiar(linea) {
  return linea.replace(/[0-9eE+\-a-zA-Z]/g, '');
}

// ------------------------------------------------------------
// R14: una secuencia pura de puntos se lee con el mismo
// algoritmo de paridad que las comas: índices pares → 'n',
// impares → ','.
// ------------------------------------------------------------
function procesarPuntosConParidad(puntos) {
  const salida = [];
  for (let i = 0; i < puntos.length; i++) {
    salida.push(i % 2 === 0 ? 'n' : ',');
  }
  return salida.join('');
}

// ------------------------------------------------------------
// Recorrer `caracteres` de izquierda a derecha y emitir
// `estructura` con símbolos n, c, ,.
// ------------------------------------------------------------
function procesar(caracteres, diagnosticos) {
  const salida = [];
  let i = 0;

  while (i < caracteres.length) {
    const c = caracteres[i];
    const fei = salida.length > 0 ? salida[salida.length - 1] : null;
    const sc = i + 1 < caracteres.length ? caracteres[i + 1] : null;

    if (c === '.') {
      if (fei === 'n' || fei === 'c') {
        // R12: punto tras número → error
        diagnosticos.push({
          severity: 'error',
          code: 'PUNTO_TRAS_NUMERO',
          params: { posicion: i },
        });
      } else {
        // R13: emitir 'n'
        salida.push('n');
      }
      i++;
    } else if (c === ',') {
      if (fei === 'n' || fei === 'c') {
        // R17: coma separadora
        salida.push(',');
        i++;
      } else if ((fei === ',' || fei === null) && (sc === ',' || sc === null)) {
        // R18: run detection
        const inicio = i;
        while (i < caracteres.length && caracteres[i] === ',') {
          salida.push(',');
          i++;
        }
        const longitud = i - inicio;
        diagnosticos.push({
          severity: 'info',
          code: 'RUN_COMAS',
          params: { longitud, posicion: inicio },
        });
      } else if (fei === ',' && sc !== ',' && sc !== null) {
        // R19: cierre de run, separadora
        salida.push(',');
        i++;
      } else if (fei === ',' || fei === null) {
        // R20 extendida: coma decimal (cubre también fei=null, sc≠coma)
        salida.push('c');
        i++;
      } else {
        // Fallback (no debería ocurrir)
        salida.push(',');
        i++;
      }
    } else {
      // Otro separador: espacio, tab, ;, |, ", _, %, etc.
      salida.push(',');
      i++;
    }
  }

  return salida.join('');
}
