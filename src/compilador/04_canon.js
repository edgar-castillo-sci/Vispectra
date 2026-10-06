// ============================================================
// FASE 04 — CANON (Inferencia, generalización y expansión)
// ============================================================
// Función: construirCanon(ir, lineas, terciolineas)
//
// Recibe: el IR de 03_ir, todas las líneas del archivo y el tamaño
//         del tercio (terciolineas).
// Devuelve: {
//   canon: string,              // clave generalizada con i
//   cuerpo: {inicio, fin},      // región contigua de datos
//   diagnosticos: [diag]
// }
//
// Hace:
//   - Construye el canon tentativo del tercio central.
//   - Expande desde el centro hacia afuera mientras el canon se
//     sostenga.
//   - Delimita el cuerpo de datos: [inicio, fin].
//   - Los fallos en el tercio central son error; los fallos en los
//     extremos definen el borde del cuerpo (preámbulo o residuo).
//
// Generalización del diccionario (R37–R43):
//   - R37: mantiene un diccionario de claves canónicas vistas.
//   - R38: si llega una clave nueva que difiere en una posición
//         donde hay n (o un valor), esa posición se promueve a i.
//   - R39: basta una línea con n en esa posición para promover a i.
//   - R40: i valida tanto la versión con valor como sin valor.
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
//              decimal (forma c), la segunda es separadora (anclada
//              por i).
//   - R36: múltiples i en una run: cada uno ancla localmente.
//
// Expansión desde el centro (R89–R95):
//   - R89: el canon tentativo se construye del tercio central.
//   - R90: el canon se expande desde el centro hacia afuera: se
//          evalúan las líneas inmediatamente anteriores y posteriores.
//          Si son compatibles, se incorporan y la expansión continúa.
//          Si no, se detiene en ese lado.
//   - R91: la expansión usa `lexear` para obtener la estructura de
//          cada línea y verifica compatibilidad estructural contra el
//          canon tentativo. No invoca `06_parser`, para no crear
//          dependencia hacia adelante.
//   - R92: el cuerpo de datos es la región contigua [inicio, fin]
//          donde el canon se sostiene. Las líneas fuera de ese rango
//          son preámbulo (antes) o residuo (después).
//   - R93: los fallos del canon en el tercio central son error
//          (DIVERGENCIA_CENTRAL). Los fallos en los extremos definen
//          el borde del cuerpo (PREAMBULO_DETECTADO,
//          RESIDUO_DETECTADO).
//   - R94: si el cuerpo resultante es demasiado pequeño, se emite
//          LIMITACION_CUERPO_DATOS (warn).
//   - R95: las cotas de expansión avanzan simétricamente:
//          cota_inferior -= 1 baja hacia 0, cota_superior += 1 sube
//          hacia numlineas.
//
// Prohibiciones estructurales a nivel canon:
//   - R44: si el canon generalizado contiene in, cn, ci, ic → error.
//         (La detección a nivel línea se hace en 07_semantica.)
//   - R45: entre dos símbolos de valor (n, c, i) siempre un separador.
//   - R46: número de comas variable entre líneas → error.
//
// Diagnósticos posibles:
//   - PREAMBULO_DETECTADO (info)
//   - RESIDUO_DETECTADO (info)
//   - DIVERGENCIA_CENTRAL (error)
//   - LIMITACION_CUERPO_DATOS (warn)
//
// NO hace:
//   - No aplica paridad ni conversión c,c,c (eso es 05_fijacion,
//     R24, R26).
//   - No fija el canon (eso es 05_fijacion).
//   - No interpreta valores (eso es 06_parser).
//   - No valida columnas reales (eso es 07_semantica).
//
// Notas:
//   - R26: la conversión c,c,c se difiere a 05_fijacion.
//   - R27: las comas son invariantes; solo se redefine su uso.
// ============================================================

// TODO: implementar.
