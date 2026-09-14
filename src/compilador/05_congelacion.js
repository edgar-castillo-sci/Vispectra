// ============================================================
// FASE 05 — CONGELACIÓN
// ============================================================
// Recibe: el canon generalizado de 04_canon.
// Devuelve: el canon congelado como array de tokens.
//
// Hace:
//   - R26: aplica la conversión c,c,c solo después de que
//         aparecieron todas las i y todas las n.
//   - R24: aplica paridad base a las runs de comas:
//         índices pares (0,2,4…) → c; impares (1,3,5…) → ','.
//   - R78: congela el canon después de la generalización (04_canon).
//   - Convierte la cadena de canon en un array de tokens
//     recorrible por el parser maestro.
//
// NO hace:
//   - No generaliza más (eso ya se hizo en 04_canon).
//   - No parsea valores de la línea (eso es 06_parser).
//   - No valida columnas (eso es 07_semantica).
//   - No aplica la corrección de paridad que hace 06_parser (R25).
//
// Notas:
//   - El canon congelado es inmutable: no cambia entre líneas.
//   - Si el canon cambia, hay que re-congelar (no debería pasar).
// ============================================================