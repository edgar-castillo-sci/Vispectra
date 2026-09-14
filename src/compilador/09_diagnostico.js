// ============================================================
// FASE 09 — DIAGNÓSTICO (Errores y logs)
// ============================================================
// Recibe: mensajes de las fases anteriores.
// Devuelve: un objeto log con métodos info, warn, error, todos.
//
// Hace:
//   - R60: error si fei ∈ tipos_num y llega un punto.
//   - R61: error si aparece in, cn, ci, ic.
//   - R62: error si el número de comas varía entre líneas.
//   - R63: error si el canon no se cumple en una línea.
//   - R64: error si hay '..' dentro de otra secuencia.
//   - R65: advertencia severa si hay secuencia pura de puntos.
//   - R66: log al detectar secuencia de comas continuas.
//   - R67: log si los separadores varían entre filas pero el
//          número es consistente.
//   - R68: log de error de sintaxis con recomendación de normalizar.
//   - R69: recomendación explícita de normalizar antes de operar.
//
// Política de ambigüedad (referencia):
//   - R70: no adivinar en silencio.
//   - R71: si hay mezcla de notaciones → alertar.
//   - R72: modo estricto / permisivo.
//   - R73: si la ambigüedad persiste → error o consulta al usuario.
//   - R74: intervención del usuario en versiones futuras.
//
// NO hace:
//   - No decide la lógica de parsing.
//   - No modifica datos.
//   - Solo registra y reporta.
//
// Notas:
//   - Es transversal: lo usan todas las fases.
//   - En la UI, estos logs se muestran en un panel lateral.
// ============================================================