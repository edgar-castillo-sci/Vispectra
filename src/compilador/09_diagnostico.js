// ============================================================
// FASE 09 — DIAGNÓSTICO (Acumulador)
// ============================================================
// Función: crearLog()
//
// Recibe: nada.
// Devuelve: un acumulador con métodos:
//   - agregar(diagnostico)
//   - todos()
//   - porSeveridad(severidad)
//   - hayErrores()
//
// Hace:
//   - Acumular diagnósticos con la forma {severity, code, params}.
//   - Permitir consultarlos por severidad o en bloque.
//
// NO hace:
//   - No traduce. Los códigos son identificadores estables; la
//     traducción vive en i18n.js y locales/.
//   - No formatea. No genera strings para el usuario.
//   - No muestra. La UI decide qué hacer con los diagnósticos.
//   - No decide la lógica de parsing.
//   - No modifica datos.
//
// Reglas (qué diagnósticos se emiten, no cómo se acumulan):
//   - R60: error si fei ∈ tipos_num y llega un punto.
//   - R61: error si aparece in, cn, ci, ic.
//   - R62: error si el número de comas varía entre líneas.
//   - R63: error si el canon no se cumple en una línea.
//   - R64: error si hay '..' dentro de otra secuencia.
//   - R65: advertencia severa si hay secuencia pura de puntos.
//   - R66: log al detectar secuencia de comas continuas.
//   - R67: log si los separadores varían entre filas.
//   - R68: log de error de sintaxis con recomendación de normalizar.
//   - R69: recomendación de normalizar antes de operar.
//
// Política de ambigüedad (referencia, no implementación aquí):
//   - R70: no adivinar en silencio.
//   - R71: si hay mezcla de notaciones → alertar.
//   - R72: modo estricto / permisivo.
//   - R73: si la ambigüedad persiste → error o consulta al usuario.
//   - R74: intervención del usuario en versiones futuras.
//
// Forma de un diagnóstico:
//   {
//     severity: 'info' | 'warn' | 'error',
//     code: 'MIXED_NOTATION',
//     params: { linea: 47, columna: 2, valor: '0,7' }
//   }
//
// Notas:
//   - Este acumulador es la única pieza de 09. Las fases emiten
//     diagnósticos en su salida y main.js los recolecta con
//     recolectar().
//   - El acumulador es mutable por diseño: se pasa a lo largo del
//     pipeline y las fases (o main.js) agregan entradas.
// ============================================================

export function crearLog() {
  const entradas = [];

  return {
    // Añade un diagnóstico al acumulador.
    agregar(diagnostico) {
      entradas.push(diagnostico);
    },

    // Devuelve todos los diagnósticos acumulados, en orden de inserción.
    todos() {
      return entradas;
    },

    // Devuelve los diagnósticos de una severidad específica.
    porSeveridad(severidad) {
      return entradas.filter(e => e.severity === severidad);
    },

    // Devuelve true si hay al menos un diagnóstico de severidad 'error'.
    hayErrores() {
      return entradas.some(e => e.severity === 'error');
    },
  };
}