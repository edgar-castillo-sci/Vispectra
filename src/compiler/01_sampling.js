// ============================================================
// FASE 01 — MUESTREO
// ============================================================
// Función: muestrear(texto, rng = Math.random)
//
// Recibe: el texto completo del archivo (string) y, opcionalmente,
//         un generador aleatorio inyectable (rng).
// Devuelve: {
//   lineas: [{indice, contenido}],   // todas las líneas del archivo
//   bloqueCentral: {inicio, fin},     // intervalo semiabierto [inicio, fin)
//   muestra: [indice],                // índices de las líneas muestreadas
//   diagnosticos: [diag]
// }
//
// Hace:
//   - R9: parte el texto en líneas (lectura de izquierda a derecha).
//   - R75: bloqueCentral.inicio = round(numlineas / 3)
//          bloqueCentral.fin    = min(numlineas,
//                                   max(inicio + 1,
//                                       round(2 * numlineas / 3)))
//   - R77: muestrea aleatoriamente todas las líneas del bloque central
//          [inicio, fin). Los extremos se reservan: el primero como
//          preámbulo, el último como residuo.
//   - Emite un diagnóstico MUESTREO con el total y el bloque.
//
// Justificación de las cotas:
//   El bloque central no es un tercio exacto. Se define por dos
//   márgenes heurísticos: se asume que el preámbulo y el residuo
//   juntos no superan 2/3 del archivo, y que el 1/3 restante es
//   zona segura de datos. Las cotas round(n/3) y round(2n/3) son
//   una apuesta razonable; si el archivo real tiene preámbulo o
//   residuo más grandes, la expansión desde el centro (R90) los
//   detectará empíricamente.
//
// Diagnósticos posibles:
//   - MUESTREO (info).
//
// NO hace:
//   - No limpia caracteres (eso es 02_lexer).
//   - No construye estructura_interna.
//   - No generaliza nada.
//
// Notas:
//   - R78 (fijación) ocurre después de 04_canon, no aquí.
//   - R79: el rng es inyectable para permitir tests reproducibles.
// ============================================================

export function sample(text, rng = Math.random) {
  const diagnostics = [];

  const lines = text
    .split('\n')
    .map((content, index) => ({ index, content }));

  const numlines = lines.length;

  const start = Math.round(numlines / 3);
  const end = Math.min(
    numlines,
    Math.max(start + 1, Math.round(2 * numlines / 3))
  );
  const centralBlock = { start, end };

  const centralIndices = [];
  for (let i = start; i < end; i++) {
    centralIndices.push(i);
  }

  const sampleIndices = muestrearSinRepeticion(centralIndices, centralIndices.length, rng);
  sampleIndices.sort((a, b) => a - b);

  diagnostics.push({
    severity: 'info',
    code: 'SAMPLING',
    params: {
      total: numlines,
      centralBlock: `${start}-${end}`,
      sampled: sampleIndices.length,
    },
  });

  return { lines, centralBlock, sample: sampleIndices, diagnostics };
}


// ------------------------------------------------------------
// Auxiliar local: muestrea k elementos de `array` sin repetición,
// usando Fisher-Yates parcial con el rng inyectable (R79).
// ------------------------------------------------------------
function muestrearSinRepeticion(array, k, rng) {
  const copia = [...array];

  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (copia.length - i));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia.slice(0, k);
}

