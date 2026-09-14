// ============================================================
// FASE 07 — SEMÁNTICA (Validación)
// ============================================================
// Recibe: los valores parseados de una línea, las columnas,
//         el canon congelado, y el índice de línea.
// Devuelve: nada (modifica las columnas) o un error.
//
// Hace:
//   - Valida que los valores cumplan el canon.
//   - R31: detecta que i no tiene valor.
//         (La inyección de 0 es en 08_codegen.)
//   - R30: i es una posición en canon, no un valor.
//   - R34: la coma adyacente a i es separadora por definición.
//
// Prohibiciones estructurales a nivel línea:
//   - R44: si una línea individual produce in, cn, ci, ic → error.
//         (La detección a nivel canon se hace en 04_canon.)
//   - R45: entre dos símbolos de valor siempre un separador.
//   - R46: número de comas variable entre líneas → error.
//         (Fusiona las antiguas R46 y R47.)
//
// Política de ambigüedad:
//   - R70: no adivinar en silencio.
//   - R71: si hay mezcla de notaciones → alertar, mostrar interpretación,
//          recomendar normalizar.
//   - R72: modo estricto (aborta) y modo permisivo (parsea, marca
//          sospechosas).
//   - R73: si la ambigüedad persiste → error o consulta al usuario.
//   - R74: degradación a intervención del usuario en versiones futuras.
//
// NO hace:
//   - No parsea (eso es 06_parser).
//   - No inyecta 0 (eso es 08_codegen).
//   - No llena columnas (eso es 08_codegen).
//   - No emite logs (eso es 09_diagnostico).
//
// Notas:
//   - R72: el modo (estricto/permisivo) se decide en la configuración.
// ============================================================