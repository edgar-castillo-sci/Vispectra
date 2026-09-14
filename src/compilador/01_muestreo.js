// ============================================================
// FASE 01 — MUESTREO
// ============================================================
// Recibe: el texto completo del archivo (string).
// Devuelve: { lineas, terciolineas, indices, muestra }
//
// Hace:
//   - Parte el texto en líneas (R9: lectura de izquierda a derecha).
//   - Calcula terciolineas = ceil(numlineas / 3) (R75).
//   - Si numlineas < 3 → terciolineas = numlineas (R76).
//   - Muestrea terciolineas líneas con índice > terciolineas (R77).
//   - Devuelve los índices muestreados ordenados.
//
// NO hace:
//   - No limpia caracteres (eso es 02_lexer).
//   - No construye estructura_interna.
//   - No generaliza nada.
//
// Notas:
//   - R78 (congelación) ocurre después de 04_canon, no aquí.
//   - R79: muestreo adaptativo queda como mejora futura.
// ============================================================