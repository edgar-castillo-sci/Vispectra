// ============================================================
// FASE 03 — IR (Representación Intermedia)
// ============================================================
// Recibe: array de estructura_interna (una por línea muestreada).
// Devuelve: un objeto IR con:
//   - porLinea: array de strings (estructura_interna).
//   - frecuencias: cuántas veces aparece cada estructura.
//   - longitudes: longitud de cada estructura.
//
// Hace:
//   - Ensambla las estructuras internas en una representación única.
//   - Detecta estructuras repetidas.
//   - Prepara los datos para la generalización de 04_canon.
//
// NO hace:
//   - No generaliza con i (eso es 04_canon).
//   - No parsea valores.
//   - No valida nada.
//
// Notas:
//   - R9, R10, R11 ya se aplicaron en 02_lexer; aquí solo se agrupan.
//   - Este IR es intermedio: aún no es el canon congelado.
// ============================================================