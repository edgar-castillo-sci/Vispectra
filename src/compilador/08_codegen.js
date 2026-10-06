// ============================================================
// FASE 08 — CODEGEN (Llenado de columnas)
// ============================================================
// Funciones: crearColumnas(numColumn), inyectar(valores, columnas)
//
// crearColumnas(numColumn)
//   Recibe: número de columnas.
//   Devuelve: array de arrays vacíos (columnas sin valores).
//
// inyectar(valores, columnas)
//   Recibe: [number | null], [[number]].
//   Devuelve: nada (muta columnas).
//
// Hace:
//   - crearColumnas: crea numColumn listas vacías.
//   - inyectar: convierte null a 0, avanza el índice de columna solo
//     cuando se produce un valor, y empuja el valor en la columna
//     correspondiente.
//
// Reglas:
//   - R31: i sin valor (null) → inyecta 0.
//   - R52: c + separador distinto de ',' (null) → inyecta 0.
//   - R53: i → si el parser devolvió null → inyecta 0.
//   - R54: doble separador → inyecta 0 en la columna intermedia.
//   - R55: el índice de columna avanza solo cuando se produce un valor.
//   - R56: cada símbolo de canon consume un token, un separador, o
//     nada (solo i vacío).
//
// NO hace:
//   - No interpreta (eso es 06_parser).
//   - No valida (eso es 07_semantica).
//
// Contrato de mutación:
//   Esta fase es la ÚNICA que muta `columnas`. Ninguna otra fase
//   toca la estructura. La política de valores faltantes (0 por
//   defecto) se decide aquí.
//
// Notas:
//   - numColumn = contarColumnas(canonFijo), definido en 05_fijacion.
// ============================================================

// TODO: implementar.
