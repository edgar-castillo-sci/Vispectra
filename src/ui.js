// ============================================================
// FASE 10 — UI HÍBRIDA (futuro)
// ============================================================
// Recibe: el resultado del compilador y las columnas.
// Devuelve: la configuración de roles de columnas.
//
// Hace:
//   - R80: si se detectan más de 2 columnas, la UI pregunta al usuario
//          qué significa cada una.
//   - R81: roles posibles: longitud de onda, absorbancia, transmitancia,
//          absorbancia adicional, otro parámetro, ignorar.
//   - R82: según la respuesta, se aplican las operaciones correspondientes
//          (normalización, suavizado, baseline, picos).
//   - R83: ni automatización absoluta ni control absoluto: el parser
//          deduce lo que puede, pregunta cuando no.
//
// NO hace:
//   - No parsea.
//   - No valida.
//   - Solo interactúa con el usuario y aplica la configuración elegida.
//
// Notas:
//   - Esta fase no forma parte del compilador en sí.
//     Vive en la capa de UI, después de que el compilador termina.
// ============================================================