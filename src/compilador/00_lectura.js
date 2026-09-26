// ============================================================
// FASE 00 — LECTURA (Terminado)
// ============================================================
// Recibe: un objeto File (del input o del drag & drop).
// Devuelve: el contenido del archivo como string UTF-8,
//           con saltos de línea normalizados y sin BOM.
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

const BOM_UTF8 = '\uFEFF'; //Byte-Order-Mark

export async function leerArchivo(file) {
  const texto = await file.text();
  return normalizarTexto(texto);
}

function normalizarTexto(texto) {
  let textoNormalizado = texto;

  if (textoNormalizado.startsWith(BOM_UTF8)) {
    textoNormalizado = textoNormalizado.slice(BOM_UTF8.length);
  }
  
  textoNormalizado = textoNormalizado
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  return textoNormalizado;
}