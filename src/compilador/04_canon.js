// ============================================================
// FASE 04 — CANON (Inferencia de tipos y generalización)
// ============================================================
// Recibe: el IR de 03_ir.
// Devuelve: una clave canónica generalizada con i.
//
// Hace:
//   - R37: mantiene un diccionario de claves canónicas vistas.
//   - R38: si llega una clave nueva que difiere en una posición
//         donde hay n (o un valor), esa posición se promueve a i.
//   - R39: basta una línea con n en esa posición para promover a i.
//   - R40: i valida tanto la versión con valor como la versión sin valor.
//   - R41: ejemplo: ',,,,,' + ',n,,,,' → ',i,,,,,'.
//   - R42: ejemplo: 'n;n,,,,,n' + 'n;n,,n,,,n' → 'n;n,,i,,,n'.
//   - R43: si aparece otra clave que generaliza más, se actualiza.
//
// Reglas de i (ancla):
//   - R29: i = posición que admite: nada, entero sin decimal, o n.
//         NO admite c.
//   - R30: i es una posición en canon, no un valor.
//         Aunque esté vacío, sigue siendo ancla.
//   - R32: i corta la run de comas; la run se divide en fragmentos.
//   - R33: cada fragmento se analiza con paridad local desde el ancla.
//   - R34: la coma adyacente a i es separadora por definición.
//   - R35: en ',,i,...':
//            · si precedido por n o i: ambas comas son separadoras.
//            · si ',' es el carácter inicial: la primera coma se asume
//              decimal (forma c), la segunda es separadora (anclada por i).
//   - R36: múltiples i en una run: cada uno ancla localmente.
//
// Prohibiciones estructurales a nivel canon:
//   - R44: si el canon generalizado contiene in, cn, ci, ic → error.
//         (La detección a nivel línea se hace en 07_semantica.)
//   - R45: entre dos símbolos de valor (n, c, i) siempre un separador.
//   - R46: número de comas variable entre líneas → error.
//         (Fusiona las antiguas R46 y R47.)
//
// NO hace:
//   - No aplica paridad ni conversión c,c,c (eso es 05_congelacion, R24, R26).
//   - No congela (eso es 05_congelacion).
//   - No parsea valores.
//   - No valida columnas reales.
//
// Notas:
//   - R26: la conversión c,c,c se difiere a 05_congelacion.
//   - R27: las comas son invariantes; solo se redefine su uso.
// ============================================================