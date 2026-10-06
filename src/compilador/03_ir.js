// ============================================================
// FASE 03 — IR (Representación Intermedia)
// ============================================================
// Función: construirIR(estructuras)
//
// Recibe: array de {indice, estructura}, una por línea muestreada.
// Devuelve: {
//   porLinea: [string],           // estructura_interna por línea
//   frecuencias: {string: int},   // cuántas veces aparece cada estructura
//   longitudes: [int],            // longitud de cada estructura
//   diagnosticos: [diag]
// }
//
// Hace:
//   - Agrupa y cuenta las estructuras internas.
//   - Detecta estructuras repetidas.
//   - Prepara los datos para la generalización de 04_canon.
//
// Diagnósticos posibles:
//   - ESTRUCTURAS_HETEROGENEAS (warn) si todas las estructuras son
//     distintas y no hay patrón claro.
//
// NO hace:
//   - No generaliza con i (eso es 04_canon).
//   - No interpreta valores (eso es 06_parser).
//   - No valida nada (eso es 07_semantica).
//
// Notas:
//   - R9, R10, R11 ya se aplicaron en 02_lexer; aquí solo se agrupan.
//   - Este IR es intermedio: aún no es el canon fijo.
// ============================================================
