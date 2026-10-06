// ============================================================
// FASE 08 — CODEGEN (Llenado de columnas)
// ============================================================
// Recibe: el número de columnas (num_column) y los valores
//         validados (con null donde falta dato).
// Devuelve: las columnas llenas.
//
// Hace:
//   - Crea num_column listas (column0, column1, ..., columnN).
//   - R31: si i no tiene valor (null) → inyecta 0 a la columna.
//   - R52: c + separador distinto de ',' (null) → inyecta 0.
//   - R53: i → si el parser devolvió null → inyecta 0.
//   - R54: si el parser devolvió null por doble separador →
//          inyecta 0 en la columna intermedia.
//   - R55: el índice de columna avanza solo cuando se produce un valor.
//   - R56: cada símbolo de canon consume un token, un separador,
//          o nada (solo i vacío).
//
// NO hace:
//   - No parsea (eso es 06_parser).
//   - No valida (eso es 07_semantica).
//   - No emite logs (eso es 09_diagnostico).
//
// Notas:
//   - num_column = num_noalf + 1 (definido en 05_fijacion).
//   - La política de valores faltantes (0, NaN, vacío) se decide aquí.
//     Por defecto: 0 (según R31, R52, R53, R54).
// ============================================================