// ============================================================
// i18n — Internacionalización
// ============================================================
// Función: t(code, params)
//
// Recibe: un código de diagnóstico (string) y un objeto de
//         parámetros para interpolación.
// Devuelve: el string localizado correspondiente.
//
// Hace:
//   - Busca `code` en `locales/{idiomaActual}.js`.
//   - Interpola `{param}` con los valores de `params`.
//   - Si el código no existe en el locale, devuelve el código
//     crudo (falla visible, no silenciosa).
//
// NO hace:
//   - No traduce fuera de los diccionarios de locales/.
//   - No formatea fechas, números ni plurales.
//   - No vive dentro del compilador; lo consume la UI.
//
// Estado: pendiente. Se implementará junto con el primer
// diagnóstico real del compilador.
// ============================================================

export function t(code, params = {}) {
  // TODO: implementar
  return code;
}

