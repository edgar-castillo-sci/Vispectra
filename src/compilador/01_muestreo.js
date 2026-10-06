// ============================================================
// FASE 01 — MUESTREO
// ============================================================
// Función: muestrear(texto, rng = Math.random)
//
// Recibe: el texto completo del archivo (string) y, opcionalmente,
//         un generador aleatorio inyectable (rng).
// Devuelve: {
//   lineas: [{indice, contenido}],   // todas las líneas del archivo
//   terciolineas: number,             // tamaño de cada tercio
//   muestra: [indice],                // índices de las líneas muestreadas
//   diagnosticos: [diag]
// }
//
// Hace:
//   - R9: parte el texto en líneas (lectura de izquierda a derecha).
//   - R75: terciolineas = ceil(numlineas / 3).
//   - R76: si numlineas < 3 → terciolineas = numlineas.
//   - R77: muestrea aleatoriamente terciolineas líneas del tercio
//          central [terciolineas, 2*terciolineas). Los tercios
//          extremos se reservan: el primero como preámbulo, el
//          último como residuo.
//   - Emite un diagnóstico MUESTREO con el total y el tamaño.
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
