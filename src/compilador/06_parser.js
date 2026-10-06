// ============================================================
// FASE 06 — PARSER MAESTRO
// ============================================================
// Función: interpretarLinea(linea, canonFijo)
//
// Recibe: {indice, contenido} y el canon fijo (array de tokens).
// Devuelve: {
//   indice: number,
//   ok: boolean,
//   valores: [number | null],   // null indica ausencia
//   diagnosticos: [diag]
// }
// Si ok: false, valores no se usa.
//
// Diagnósticos posibles:
//   - CANON_MISMATCH (error)
//   - COMA_INESPERADA (error)
//
// Hace:
//   - R48: canon indica qué buscar y en qué orden, izquierda a derecha.
//   - R49: n → busca float con punto decimal.
//   - R50: c → busca float con coma decimal y lo convierte a punto.
//   - R51: c + encuentra coma → error por conflicto con algoritmo c,c,c.
//   - R52: c + encuentra separador distinto de ',' → detecta ausencia
//         y devuelve null (la inyección de 0 es en 08_codegen).
//   - R53: i → busca entero, n, o nada. Si nada → devuelve null
//         (la inyección de 0 es en 08_codegen).
//   - R54: separador → lo consume. Si el siguiente símbolo de canon
//         también es separador → devuelve null en la columna intermedia
//         (la inyección de 0 es en 08_codegen).
//   - R55: el índice de columna avanza solo cuando se produce un valor,
//         no con cada símbolo de canon.
//   - R56: cada símbolo de canon consume un token, un separador,
//         o nada (solo i vacío).
//
// Sintaxis de tokens (R1–R6):
//   - R1: todo token numérico se parsea como real.
//   - R2: token_n = [+-]? dígitos ( '.' dígitos? )? ( [eE] [+-]? dígitos )?
//   - R3: token_c = [+-]? dígitos ( ',' dígitos? )? ( [eE] [+-]? dígitos )?
//   - R4: token_c consume la coma solo si va seguida de dígitos.
//   - R5: el punto es siempre decimal, nunca separador de columna.
//   - R6: la notación científica se trata como unidad indivisible.
//
// Clasificación local de comas:
//   - Precedencia: el canon manda. Cuando el canon dice c o ',',
//     el parser obedece al canon y valida. Si la línea no cuadra → error (R63).
//   - R57: para cada coma en la línea original:
//            si está entre dígitos → decimal; si no → separadora.
//   - R58: clasificación local y directa. Sin paridad ni fase.
//   - R59: el parser maestro tiene la línea original, así que puede aplicarla.
//   - R57–R59 se usan SOLO cuando el canon dice i, para decidir si ese i
//     se resuelve como n, entero o vacío.
//
// NO hace:
//   - No generaliza (eso es 04_canon).
//   - No valida columnas (eso es 07_semantica).
//   - No inyecta 0 (eso es 08_codegen).
//   - No llena columnas (eso es 08_codegen).
//   - No emite logs (eso es 09_diagnostico).
//
// Fuera de alcance (R84–R88):
//   - R85: valores faltantes literales (NaN, ---, >3.0) → no soportado.
//   - R87: unidades pegadas a números → no soportado.
//   - R88: comentarios al final de línea → no soportado.
// ============================================================

// TODO: implementar.
