// ============================================================
// FASE 00 — LECTURA
// ============================================================
// Recibe: un objeto File (del input o del drag & drop).
// Devuelve: el contenido del archivo como string UTF-8.
//
// Hace:
//   - Leer el archivo como texto.
//   - Normalizar saltos de línea (\r\n → \n).
//   - Detectar y eliminar BOM si existe.
//
// NO hace:
//   - No parte en líneas (eso es 01_muestreo).
//   - No filtra encabezados.
//   - No interpreta nada del contenido.
//
// Fuera de alcance (R84–R88):
//   - R86: filas partidas en varias líneas → no soportado.
//   - Encoding distinto de UTF-8 → no soportado (por ahora).
// ============================================================